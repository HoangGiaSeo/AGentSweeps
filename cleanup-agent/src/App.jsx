import { useState, useEffect, useCallback } from "react";
import {
  getDiskOverview,
  checkOllama,
  getCleanupLog,
  clearCleanupLog,
  checkFirstRun,
  analyzeDrive,
} from "./api";
import { TABS } from "./constants";
import { useToast } from "./hooks/useToast";
import { useApiKeys } from "./hooks/useApiKeys";
import { useDeepScan } from "./hooks/useDeepScan";
import { useChat } from "./hooks/useChat";
import { useSchedule } from "./hooks/useSchedule";
import { useCleanup } from "./hooks/useCleanup";
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

  const cleanup = useCleanup({
    addToast,
    onDiskRefresh: setDiskOverview,
    onTabChange: setTab,
    onLoadingChange: setLoading,
    ollamaStatus,
  });

  const scheduleBundle = { schedule, setSchedule, scheduleLoading, handleSaveSchedule, toggleScheduleDay, toggleScheduleAction };

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

        {tab === "dashboard" && (
          <DashboardTab
            diskOverview={diskOverview}
            ollamaStatus={ollamaStatus}
            loading={loading}
            loadDashboard={loadDashboard}
            handleScan={cleanup.handleScan}
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
            cleanup={cleanup}
            scheduleBundle={scheduleBundle}
            loading={loading}
            ollamaStatus={ollamaStatus}
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
