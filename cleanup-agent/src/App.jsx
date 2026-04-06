import { useState, useEffect, useCallback } from "react";
import {
  getDiskOverview,
  scanDisk,
  runCleanup,
  smartCleanup,
  checkOllama,
  getCleanupLog,
  clearCleanupLog,
  zipBackup,
  estimateCleanupSize,
  checkFirstRun,
  analyzeDrive,
} from "./api";
import { TABS, MANUAL_ACTIONS, formatSize } from "./constants";
import { useToast } from "./hooks/useToast";
import { useApiKeys } from "./hooks/useApiKeys";
import { useDeepScan } from "./hooks/useDeepScan";
import { useChat } from "./hooks/useChat";
import { useSchedule } from "./hooks/useSchedule";
import DashboardTab from "./tabs/DashboardTab";
import CleanupTab from "./tabs/CleanupTab";
import DeepScanTab from "./tabs/DeepScanTab";
import ChatTab from "./tabs/ChatTab";
import HistoryTab from "./tabs/HistoryTab";
import SettingsTab from "./tabs/SettingsTab";
import DriveModal from "./components/DriveModal";
import SetupModal from "./components/SetupModal";
/* CSS import order: tokens → base → shared primitives → component styles */
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/modal.css";
import "./styles/utilities.css";
import "./styles/sidebar.css";
import "./styles/toast.css";
import "./styles/dashboard.css";
import "./styles/cleanup.css";
import "./styles/deepscan.css";
import "./styles/drivemodal.css";
import "./styles/chat.css";
import "./styles/settings.css";

export default function App() {
  /* ── Shell state ─────────────────────────────────────────── */
  const [tab, setTab] = useState("dashboard");
  const [diskOverview, setDiskOverview] = useState([]);
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [loading, setLoading] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [logEntries, setLogEntries] = useState([]);

  /* ── Drive detail modal ──────────────────────────────────── */
  const [driveModalDisk, setDriveModalDisk] = useState(null);
  const [driveModalReport, setDriveModalReport] = useState(null);
  const [driveModalLoading, setDriveModalLoading] = useState(false);

  /* ── Cleanup domain (deferred — useCleanup boundary not clear: DEBT-023) ── */
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

  const { toasts, addToast } = useToast();

  /* ── Domain hooks ────────────────────────────────────────── */
  const {
    apiKeys, apiKeyInputs, setApiKeyInputs, apiTestResults, apiTesting,
    handleSaveApiKey, handleRemoveApiKey, handleTestApiKey, handleToggleApiKey,
  } = useApiKeys({ addToast });

  const {
    deepScanResult, deepScanLoading, deepCleanResults,
    handleDeepScan, handleDeepClean,
  } = useDeepScan({ addToast, onDiskRefresh: setDiskOverview });

  const {
    chatMessages, chatInput, setChatInput, chatLoading,
    chatModel, setChatModel, chatProvider, setChatProvider,
    chatExternalModel, setChatExternalModel, sendChatMessage, clearChat, chatReady,
  } = useChat({ ollamaStatus, apiKeys });

  const {
    schedule, setSchedule, scheduleLoading,
    handleSaveSchedule, toggleScheduleDay, toggleScheduleAction,
  } = useSchedule({ addToast });

  /* ===== DASHBOARD ===== */
  const loadDashboard = useCallback(async () => {
    setLoading("Đang tải thông tin hệ thống...");
    try {
      const [disks, ollama] = await Promise.all([getDiskOverview(), checkOllama()]);
      setDiskOverview(disks);
      setOllamaStatus(ollama);
    } catch (_e) {
      addToast("Không thể tải thông tin hệ thống: " + _e, "error");
    }
    setLoading("");
  }, [addToast]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  /* ===== FIRST-RUN SETUP ===== */
  useEffect(() => {
    checkFirstRun().then((isFirst) => { if (isFirst) setShowSetup(true); }).catch(() => {});
  }, []);

  /* ===== ZIP BACKUP ===== */
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

  /* ===== SCAN & CLEANUP ===== */
  const handleScan = async (mode) => {
    const m = mode || scanMode;
    setScanMode(m);
    setLoading(m === "deep" || m === "analyze" ? "Đang quét sâu hệ thống..." : "Đang quét hệ thống...");
    try {
      const res = await scanDisk(m);
      setScanData(res);
      setAiResult(null);
      setSelectedActions({});
      setCleanupResults([]);
      setShowSpaceSaved(false);
      setCleanupMode("ai");
      setTab("cleanup");
      addToast(`Quét xong! Tìm thấy ${res.length} mục (${formatSize(res.reduce((s, r) => s + r.size_bytes, 0))})`, "success");
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
    setLoading("");
  };

  const triggerAI = async (data) => {
    const scanResults = data || scanData;
    if (scanResults.length === 0) { addToast("Cần quét ổ đĩa trước!", "warning"); return; }
    setLoading("AI đang phân tích hệ thống...");
    try {
      const res = await smartCleanup(JSON.stringify(scanResults));
      setAiResult(res);
      const defaults = {};
      res.actions.forEach((a) => { defaults[a.type] = a.safe; });
      setSelectedActions(defaults);
      setCleanupMode("ai");
      addToast(`AI đề xuất ${res.actions.length} hành động`, "success");
    } catch (e) { addToast("Lỗi AI: " + e, "error"); }
    setLoading("");
  };

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
    setLoading("Đang dọn dẹp hệ thống...");
    try {
      const res = await runCleanup(actions);
      setCleanupResults(res);
      const freeAfterArr = await getDiskOverview();
      const freeAfter = freeAfterArr.find((d) => d.drive === "C:\\")?.free_bytes || 0;
      setDiskOverview(freeAfterArr);
      setSpaceAfter(freeAfter);
      setShowSpaceSaved(true);
      const successCount = res.filter((r) => r.success).length;
      const freed = freeAfter > freeBefore ? freeAfter - freeBefore : 0;
      addToast(
        `Hoàn tất! ${successCount}/${res.length} thành công${freed > 0 ? ` — Giải phóng ${formatSize(freed)}` : ""}`,
        successCount === res.length ? "success" : "warning"
      );
    } catch (e) { addToast("Dọn dẹp thất bại: " + e, "error"); }
    setLoading("");
  };

  /* ===== DRIVE DETAIL MODAL ===== */
  const handleDriveClick = async (disk) => {
    if (driveModalLoading) return;
    setDriveModalDisk(disk);
    setDriveModalReport(null);
    setDriveModalLoading(true);
    try {
      const report = await analyzeDrive(disk.drive, disk.used_bytes);
      setDriveModalReport(report);
    } catch (e) {
      addToast("Lỗi phân tích ổ đĩa: " + e, "error");
    }
    setDriveModalLoading(false);
  };

  const handleDriveModalClose = () => {
    setDriveModalDisk(null);
    setDriveModalReport(null);
  };

  /* ===== HISTORY ===== */
  const loadHistory = useCallback(async () => {
    try {
      const logs = await getCleanupLog();
      setLogEntries(logs);
    } catch {
      addToast("Không thể tải lịch sử", "error");
    }
  }, [addToast]);

  const handleClearLog = async () => {
    await clearCleanupLog();
    setLogEntries([]);
    addToast("Đã xóa lịch sử dọn dẹp", "info");
  };

  useEffect(() => { if (tab === "history") loadHistory(); }, [tab, loadHistory]);

  /* ===== COMPUTED ===== */
  const totalScanned = scanData.reduce((sum, item) => sum + item.size_bytes, 0);
  const selectedCount = Object.values(selectedActions).filter(Boolean).length;
  const spaceFreed = spaceAfter > spaceBefore ? spaceAfter - spaceBefore : 0;

  /* ===== RENDER ===== */
  return (
    <div className="app">
      {showSetup && (
        <SetupModal onComplete={() => setShowSetup(false)} />
      )}
      {/* Toast */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">
              {t.type === "success" ? "✓" : t.type === "error" ? "✕" : t.type === "warning" ? "!" : "i"}
            </span>
            <span className="toast-msg">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon"><img src="/fish-icon-32.png" alt="logo" className="brand-fish" /></span>
          <span className="brand-text">AGent WinWin</span>
        </div>
        {TABS.map((t) => (
          <button key={t.id} className={`sidebar-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
        <div className="sidebar-footer">
          <div className={`ollama-indicator ${ollamaStatus?.running ? "online" : "offline"}`}>
            <span className="indicator-dot" />
            <span className="indicator-text">{ollamaStatus?.running ? "AI Online" : "AI Offline"}</span>
          </div>
          <div className="version-text">v0.1.0</div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <span>{loading}</span>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Xác nhận dọn dẹp</h3>
              <p>Các hành động sau sẽ được thực thi:</p>
              <ul className="confirm-list">
                {Object.entries(selectedActions)
                  .filter(([, enabled]) => enabled)
                  .map(([action]) => {
                    const aiAction = aiResult?.actions.find((a) => a.type === action);
                    const manualAction = MANUAL_ACTIONS.find((a) => a.type === action);
                    return (
                      <li key={action}>
                        <span className="confirm-action">{manualAction?.label || action}</span>
                        {aiAction?.safe === false && <span className="confirm-warn"> (có rủi ro)</span>}
                      </li>
                    );
                  })}
              </ul>
              <p className="confirm-note">Dữ liệu sẽ bị xóa vĩnh viễn và không thể khôi phục.</p>
              <div className="modal-buttons">
                <button className="btn btn-cancel" onClick={() => setShowConfirm(false)}>Hủy bỏ</button>
                <button className="btn btn-danger" onClick={executeCleanup}>Xác nhận &amp; Thực thi</button>
              </div>
            </div>
          </div>
        )}

        {tab === "dashboard" && (
          <DashboardTab
            diskOverview={diskOverview}
            ollamaStatus={ollamaStatus}
            loading={loading}
            loadDashboard={loadDashboard}
            handleScan={handleScan}
            onDriveClick={handleDriveClick}
          />
        )}

        {driveModalDisk && (
          <DriveModal
            disk={driveModalDisk}
            report={driveModalReport}
            loading={driveModalLoading}
            onClose={handleDriveModalClose}
            onDeepScan={() => setTab("deepscan")}
          />
        )}

        {tab === "cleanup" && (
          <CleanupTab
            scanMode={scanMode} setScanMode={setScanMode} scanData={scanData} cleanupMode={cleanupMode} setCleanupMode={setCleanupMode}
            aiResult={aiResult} selectedActions={selectedActions} setSelectedActions={setSelectedActions}
            selectedCount={selectedCount} totalScanned={totalScanned} loading={loading} ollamaStatus={ollamaStatus}
            cleanupResults={cleanupResults} showSpaceSaved={showSpaceSaved} spaceFreed={spaceFreed}
            zipLoading={zipLoading} zipResult={zipResult} sizeEstimates={sizeEstimates}
            handleScan={handleScan} triggerAI={triggerAI} toggleAction={toggleAction}
            selectAll={selectAll} selectNone={selectNone} selectSafe={selectSafe}
            schedule={schedule} setSchedule={setSchedule} scheduleLoading={scheduleLoading}
            handleSaveSchedule={handleSaveSchedule} toggleScheduleDay={toggleScheduleDay} toggleScheduleAction={toggleScheduleAction}
            handleCleanupClick={handleCleanupClick} handleZipBackup={handleZipBackup} handleEstimateSize={handleEstimateSize}
          />
        )}

        {tab === "deepscan" && (
          <DeepScanTab
            scanning={deepScanLoading}
            scanResult={deepScanResult}
            cleanResults={deepCleanResults}
            onScan={handleDeepScan}
            onClean={handleDeepClean}
          />
        )}

        {tab === "chat" && (
          <ChatTab
            chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput}
            chatLoading={chatLoading}
            chatModel={chatModel} setChatModel={setChatModel}
            chatProvider={chatProvider} setChatProvider={setChatProvider}
            chatExternalModel={chatExternalModel} setChatExternalModel={setChatExternalModel}
            chatReady={chatReady} ollamaStatus={ollamaStatus} apiKeys={apiKeys}
            sendChatMessage={sendChatMessage} clearChat={clearChat}
          />
        )}

        {tab === "history" && (
          <HistoryTab logEntries={logEntries} handleClearLog={handleClearLog} />
        )}

        {tab === "settings" && (
          <SettingsTab
            ollamaStatus={ollamaStatus} apiKeys={apiKeys} apiKeyInputs={apiKeyInputs} setApiKeyInputs={setApiKeyInputs}
            apiTestResults={apiTestResults} apiTesting={apiTesting}
            handleSaveApiKey={handleSaveApiKey} handleRemoveApiKey={handleRemoveApiKey}
            handleTestApiKey={handleTestApiKey} handleToggleApiKey={handleToggleApiKey}
          />
        )}
      </main>
    </div>
  );
}
