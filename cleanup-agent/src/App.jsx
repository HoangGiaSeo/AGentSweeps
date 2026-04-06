import { useState, useEffect, useCallback } from "react";
import {
  getDiskOverview,
  scanDisk,
  runCleanup,
  smartCleanup,
  chatAI,
  chatExternal,
  checkOllama,
  getCleanupLog,
  clearCleanupLog,
  getApiKeys,
  saveApiKey,
  removeApiKey,
  testApiKey,
  getSchedule,
  saveSchedule,
  checkAndRunSchedule,
  zipBackup,
  estimateCleanupSize,
  checkFirstRun,
  ensureOllamaRunning,
} from "./api";
import { TABS, MANUAL_ACTIONS, AI_PROVIDERS, formatSize } from "./constants";
import { useToast } from "./hooks/useToast";
import DashboardTab from "./tabs/DashboardTab";
import CleanupTab from "./tabs/CleanupTab";
import ChatTab from "./tabs/ChatTab";
import HistoryTab from "./tabs/HistoryTab";
import SettingsTab from "./tabs/SettingsTab";
import SetupModal from "./components/SetupModal";
import "./styles/base.css";
import "./styles/toast.css";
import "./styles/sidebar.css";
import "./styles/dashboard.css";
import "./styles/cleanup.css";
import "./styles/chat.css";
import "./styles/settings.css";

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [diskOverview, setDiskOverview] = useState([]);
  const [scanData, setScanData] = useState([]);
  const [scanMode, setScanMode] = useState("smart");
  const [aiResult, setAiResult] = useState(null);
  const [cleanupResults, setCleanupResults] = useState([]);
  const [loading, setLoading] = useState("");
  const [selectedActions, setSelectedActions] = useState({});
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [logEntries, setLogEntries] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cleanupMode, setCleanupMode] = useState("ai");
  const [spaceBefore, setSpaceBefore] = useState(0);
  const [spaceAfter, setSpaceAfter] = useState(0);
  const [showSpaceSaved, setShowSpaceSaved] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatModel, setChatModel] = useState("gemma3:4b");
  const [apiKeys, setApiKeys] = useState({});
  const [apiKeyInputs, setApiKeyInputs] = useState({});
  const [apiTestResults, setApiTestResults] = useState({});
  const [apiTesting, setApiTesting] = useState({});
  const [chatProvider, setChatProvider] = useState("ollama");
  const [chatExternalModel, setChatExternalModel] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [schedule, setSchedule] = useState({ enabled: false, days: [], time: "03:00", actions: [], last_run: "" });
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipResult, setZipResult] = useState(null);
  const [sizeEstimates, setSizeEstimates] = useState({});
  const { toasts, addToast } = useToast();

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

  /* ===== API KEYS ===== */
  useEffect(() => {
    getApiKeys().then((keys) => { setApiKeys(keys || {}); }).catch(() => {});
  }, []);

  /* ===== AUTO-SWITCH AI PROVIDER ===== */
  useEffect(() => {
    if (Object.keys(apiKeys).length === 0) return;
    const external = AI_PROVIDERS.find((p) => apiKeys?.[p.id]?.enabled && apiKeys?.[p.id]?.key);
    if (external) {
      setChatProvider(external.id);
      setChatExternalModel((prev) => prev || external.defaultModel || "");
    } else {
      setChatProvider("ollama");
      ensureOllamaRunning().catch(() => {});
    }
  }, [apiKeys]);

  /* ===== SCHEDULE ===== */
  useEffect(() => {
    getSchedule().then((s) => setSchedule(s || { enabled: false, days: [], time: "03:00", actions: [], last_run: "" })).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const result = await checkAndRunSchedule();
        if (result?.ran) {
          addToast(`🕐 ${result.message}`, "success");
          getSchedule().then((s) => setSchedule(s)).catch(() => {});
        }
      } catch (e) { void e; }
    }, 60000);
    return () => clearInterval(interval);
  }, [addToast]);

  const handleSaveSchedule = async () => {
    setScheduleLoading(true);
    try {
      await saveSchedule(schedule);
      addToast("Đã lưu lịch dọn tự động", "success");
    } catch (e) {
      addToast("Lỗi lưu lịch: " + e, "error");
    }
    setScheduleLoading(false);
  };

  const toggleScheduleDay = (day) => {
    setSchedule((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day].sort(),
    }));
  };

  const toggleScheduleAction = (actionType) => {
    setSchedule((prev) => ({
      ...prev,
      actions: prev.actions.includes(actionType) ? prev.actions.filter((a) => a !== actionType) : [...prev.actions, actionType],
    }));
  };

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

  /* ===== API KEY HANDLERS ===== */
  const handleSaveApiKey = async (providerId) => {
    const key = (apiKeyInputs[providerId] || "").trim();
    if (!key) { addToast("Vui lòng nhập API Key", "warning"); return; }
    try {
      await saveApiKey(providerId, key, true);
      const updated = await getApiKeys();
      setApiKeys(updated || {});
      setApiKeyInputs((prev) => ({ ...prev, [providerId]: "" }));
      addToast(`Đã lưu API Key ${providerId}`, "success");
    } catch (e) { addToast("Lỗi lưu API Key: " + e, "error"); }
  };

  const handleRemoveApiKey = async (providerId) => {
    try {
      await removeApiKey(providerId);
      const updated = await getApiKeys();
      setApiKeys(updated || {});
      setApiTestResults((prev) => ({ ...prev, [providerId]: null }));
      addToast(`Đã xóa API Key ${providerId}`, "info");
    } catch (e) { addToast("Lỗi xóa API Key: " + e, "error"); }
  };

  const handleTestApiKey = async (providerId) => {
    const entry = apiKeys[providerId];
    if (!entry?.key) { addToast("Chưa có API Key để kiểm tra", "warning"); return; }
    setApiTesting((prev) => ({ ...prev, [providerId]: true }));
    try {
      const result = await testApiKey(providerId, entry.key);
      setApiTestResults((prev) => ({ ...prev, [providerId]: { ok: true, msg: result } }));
      addToast(result, "success");
    } catch (e) {
      setApiTestResults((prev) => ({ ...prev, [providerId]: { ok: false, msg: e } }));
      addToast(String(e), "error");
    }
    setApiTesting((prev) => ({ ...prev, [providerId]: false }));
  };

  const handleToggleApiKey = async (providerId, enabled) => {
    const entry = apiKeys[providerId];
    if (!entry?.key) return;
    try {
      await saveApiKey(providerId, entry.key, enabled);
      const updated = await getApiKeys();
      setApiKeys(updated || {});
    } catch (e) { addToast("Lỗi cập nhật: " + e, "error"); }
  };

  /* ===== CHAT MODEL — ưu tiên gemma3:4b, bỏ qua embed models ===== */
  useEffect(() => {
    if (!ollamaStatus?.models?.length) return;
    const models = ollamaStatus.models; // Đã được lọc + ưu tiên từ backend
    // Nếu model hiện tại không hợp lệ thì chọn model đầu tiên
    if (!models.includes(chatModel)) {
      setChatModel(models[0]);
    }
  }, [ollamaStatus]);

  const sendChatMessage = async (text) => {
    const content = text || chatInput.trim();
    if (!content) return;
    const userMsg = { role: "user", content };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      let reply;
      const msgPayload = newMessages.map((m) => ({ role: m.role, content: m.content }));
      if (chatProvider !== "ollama" && apiKeys[chatProvider]?.enabled && apiKeys[chatProvider]?.key) {
        reply = await chatExternal(chatProvider, apiKeys[chatProvider].key, msgPayload, chatExternalModel || AI_PROVIDERS.find((p) => p.id === chatProvider)?.defaultModel || "");
      } else {
        reply = await chatAI(msgPayload, chatModel);
      }
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "❌ Lỗi: " + e, error: true }]);
    }
    setChatLoading(false);
  };

  const clearChat = () => { setChatMessages([]); setChatInput(""); };

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
  const chatReady = chatProvider === "ollama"
    ? !!ollamaStatus?.running
    : !!(apiKeys[chatProvider]?.enabled && apiKeys[chatProvider]?.key);

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
          <DashboardTab diskOverview={diskOverview} ollamaStatus={ollamaStatus} loading={loading} loadDashboard={loadDashboard} handleScan={handleScan} />
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

        {tab === "chat" && (
          <ChatTab
            chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput}
            chatLoading={chatLoading} chatModel={chatModel} setChatModel={setChatModel}
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
