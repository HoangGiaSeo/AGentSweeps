import { useState } from "react";
import {
  scanDisk,
  runCleanup,
  smartCleanup,
  zipBackup,
  estimateCleanupSize,
  getDiskOverview,
  checkOllama,
} from "../api";
import { MANUAL_ACTIONS, formatSize } from "../constants";

/**
 * useCleanup — cleanup domain hook (EXEC-03)
 *
 * Boundary contract:
 *   Inputs (received via params):
 *     - addToast        — toast injection from useToast (App shell)
 *     - onDiskRefresh   — callback: setDiskOverview (App shell write, not owned here)
 *     - onTabChange     — callback: setTab (App shell write, not owned here)
 *     - onLoadingChange — callback: setLoading (App shell write, not owned here)
 *     - ollamaStatus    — read-only from App shell (loaded by loadDashboard)
 *
 *   Outputs (returned):
 *     - all cleanup domain state atoms + computed + handlers
 *
 *   Cross-domain writes (explicit, no dual ownership):
 *     - onDiskRefresh  called after executeCleanup — App shell owns diskOverview
 *     - onTabChange    called after scan — App shell owns tab
 *     - onLoadingChange called during scan/AI/cleanup — App shell owns loading overlay
 */
export function useCleanup({ addToast, onDiskRefresh, onTabChange, onLoadingChange, ollamaStatus }) {
  /* ── Cleanup domain state ────────────────────────────────── */
  const [scanData, setScanData] = useState([]);
  const [scanMode, setScanMode] = useState("smart");
  const [aiResult, setAiResult] = useState(null);
  const [cleanupResults, setCleanupResults] = useState([]);
  const [selectedActions, setSelectedActions] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [cleanupMode, setCleanupMode] = useState("ai");
  const [spaceBefore, setSpaceBefore] = useState(0);
  const [spaceAfter, setSpaceAfter] = useState(0);
  const [showSpaceSaved, setShowSpaceSaved] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipResult, setZipResult] = useState(null);
  const [sizeEstimates, setSizeEstimates] = useState({});

  /* ── Computed ──────────────────────────────────────────────── */
  const totalScanned = scanData.reduce((sum, item) => sum + item.size_bytes, 0);
  const selectedCount = Object.values(selectedActions).filter(Boolean).length;
  const spaceFreed = spaceAfter > spaceBefore ? spaceAfter - spaceBefore : 0;

  /* ── triggerAI — defined first; called by handleScan ────── */
  const triggerAI = async (data) => {
    const scanResults = data || scanData;
    if (scanResults.length === 0) { addToast("Cần quét ổ đĩa trước!", "warning"); return; }
    onLoadingChange("AI đang phân tích hệ thống...");
    try {
      const res = await smartCleanup(JSON.stringify(scanResults));
      setAiResult(res);
      const defaults = {};
      res.actions.forEach((a) => { defaults[a.type] = a.safe; });
      setSelectedActions(defaults);
      setCleanupMode("ai");
      addToast(`AI đề xuất ${res.actions.length} hành động`, "success");
    } catch (e) { addToast("Lỗi AI: " + e, "error"); }
    onLoadingChange("");
  };

  /* ── Scan ─────────────────────────────────────────────────── */
  const handleScan = async (mode) => {
    const m = mode || scanMode;
    setScanMode(m);
    onLoadingChange(m === "deep" || m === "analyze" ? "Đang quét sâu hệ thống..." : "Đang quét hệ thống...");
    try {
      const res = await scanDisk(m);
      setScanData(res);
      setAiResult(null);
      setSelectedActions({});
      setCleanupResults([]);
      setShowSpaceSaved(false);
      setCleanupMode("ai");
      onTabChange("cleanup");
      addToast(
        `Quét xong! Tìm thấy ${res.length} mục (${formatSize(res.reduce((s, r) => s + r.size_bytes, 0))})`,
        "success"
      );
      if (m === "analyze") {
        const currentOllama = ollamaStatus || await checkOllama();
        if (currentOllama?.running) {
          await triggerAI(res);
        } else {
          addToast("Ollama chưa chạy — chuyển sang chế độ thủ công", "warning");
          setCleanupMode("manual");
        }
      }
    } catch (e) { addToast("Quét thất bại: " + e, "error"); }
    onLoadingChange("");
  };

  /* ── Selection helpers ────────────────────────────────────── */
  const toggleAction = (actionType) => {
    setSelectedActions((prev) => ({ ...prev, [actionType]: !prev[actionType] }));
  };

  const selectAll = () => {
    if (cleanupMode === "ai" && aiResult) {
      const all = {};
      aiResult.actions.forEach((a) => { all[a.type] = true; });
      setSelectedActions(all);
    } else {
      const all = {};
      MANUAL_ACTIONS.forEach((a) => { all[a.type] = true; });
      setSelectedActions(all);
    }
  };

  const selectNone = () => setSelectedActions({});

  const selectSafe = () => {
    if (aiResult) {
      const safe = {};
      aiResult.actions.forEach((a) => { if (a.safe) safe[a.type] = true; });
      setSelectedActions(safe);
    }
  };

  /* ── Cleanup execution ────────────────────────────────────── */
  const handleCleanupClick = () => {
    const enabled = Object.entries(selectedActions).filter(([, v]) => v);
    if (enabled.length === 0) { addToast("Chưa chọn hành động nào!", "warning"); return; }
    setShowConfirm(true);
  };

  const executeCleanup = async () => {
    setShowConfirm(false);
    const actions = Object.entries(selectedActions).map(([key, enabled]) => ({ action_type: key, enabled }));
    const freeBeforeArr = await getDiskOverview();
    const freeBefore = freeBeforeArr.find((d) => d.drive === "C:\\")?.free_bytes || 0;
    setSpaceBefore(freeBefore);
    onLoadingChange("Đang dọn dẹp hệ thống...");
    try {
      const res = await runCleanup(actions);
      setCleanupResults(res);
      const freeAfterArr = await getDiskOverview();
      const freeAfter = freeAfterArr.find((d) => d.drive === "C:\\")?.free_bytes || 0;
      onDiskRefresh(freeAfterArr); /* App shell owns diskOverview — callback, not direct write */
      setSpaceAfter(freeAfter);
      setShowSpaceSaved(true);
      const successCount = res.filter((r) => r.success).length;
      const freed = freeAfter > freeBefore ? freeAfter - freeBefore : 0;
      addToast(
        `Hoàn tất! ${successCount}/${res.length} thành công${freed > 0 ? ` — Giải phóng ${formatSize(freed)}` : ""}`,
        successCount === res.length ? "success" : "warning"
      );
    } catch (e) { addToast("Dọn dẹp thất bại: " + e, "error"); }
    onLoadingChange("");
  };

  /* ── Zip backup ───────────────────────────────────────────── */
  const handleZipBackup = async () => {
    const enabled = Object.entries(selectedActions).filter(([, v]) => v).map(([k]) => k);
    if (enabled.length === 0) { addToast("Chưa chọn hành động nào để nén backup!", "warning"); return; }
    setZipLoading(true);
    setZipResult(null);
    try {
      const result = await zipBackup(enabled);
      setZipResult(result);
      addToast(`📦 Backup xong! ${result.file_count} files (${result.compressed_display})`, "success");
    } catch (e) { addToast("Lỗi nén backup: " + e, "error"); }
    setZipLoading(false);
  };

  /* ── Size estimate ────────────────────────────────────────── */
  const handleEstimateSize = async () => {
    const types = Object.entries(selectedActions).filter(([, v]) => v).map(([k]) => k);
    if (types.length === 0) return;
    try {
      const items = await estimateCleanupSize(types);
      const map = {};
      items.forEach((it) => { map[it.action_type] = it; });
      setSizeEstimates(map);
    } catch (e) { void e; }
  };

  return {
    /* state */
    scanData, scanMode, setScanMode,
    aiResult,
    cleanupMode, setCleanupMode,
    selectedActions, setSelectedActions,
    cleanupResults,
    showConfirm, setShowConfirm,
    showSpaceSaved,
    spaceBefore, spaceAfter,
    zipLoading, zipResult,
    sizeEstimates,
    /* computed */
    totalScanned, selectedCount, spaceFreed,
    /* handlers */
    handleScan, triggerAI,
    toggleAction, selectAll, selectNone, selectSafe,
    handleCleanupClick, executeCleanup,
    handleZipBackup, handleEstimateSize,
  };
}
