import { useState, useEffect } from "react";
import { chatAI, chatExternal, ensureOllamaRunning, getDiskOverview, getCleanupLog } from "../api";
import { AI_PROVIDERS, formatSize } from "../constants";

/* ── Agent Tool definitions ─────────────────────────────────── */
const AGENT_TOOLS = [
  {
    id: "disk_overview",
    patterns: [
      "ổ đĩa", "dung lượng", "còn trống", "disk", "storage", "ổ c", "ổ d", "ổ e",
      "bộ nhớ", "hard drive", "không gian", "bao nhiêu gb", "đang đầy", "free space",
      "bao nhiêu chỗ", "còn bao nhiêu", "kiểm tra ổ", "xem ổ",
    ],
    label: "🔍 Đang đọc thông tin ổ đĩa...",
  },
  {
    id: "cleanup_log",
    patterns: [
      "lịch sử", "đã dọn", "log", "đã xóa", "trước đây", "kết quả dọn",
      "đã làm", "lần trước", "history", "đã dọn dẹp", "dọn được gì",
    ],
    label: "📋 Đang đọc lịch sử dọn dẹp...",
  },
];

function formatDiskContext(disks) {
  if (!disks?.length) return "Không có dữ liệu ổ đĩa.";
  const lines = disks.map((d) => {
    const usedPct = d.total > 0 ? Math.round((d.used / d.total) * 100) : 0;
    return `• ${d.name || d.path}: Tổng ${formatSize(d.total)}, Đã dùng ${formatSize(d.used)} (${usedPct}%), Còn trống ${formatSize(d.available)}`;
  });
  return "📊 THÔNG TIN Ổ ĐĨA HIỆN TẠI:\n" + lines.join("\n");
}

function formatLogContext(entries) {
  if (!entries?.length) return "Chưa có lịch sử dọn dẹp nào.";
  const recent = [...entries].slice(-8);
  return "📋 LỊCH SỬ DỌN DẸP (8 lần gần nhất):\n" + recent.join("\n");
}

export function useChat({ ollamaStatus, apiKeys, diskOverview = [] }) {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatModel, setChatModel] = useState("gemma3:4b");
  const [chatProvider, setChatProvider] = useState("ollama");
  const [chatExternalModel, setChatExternalModel] = useState("");
  const [toolStatus, setToolStatus] = useState(null);

  /* Auto-select model when Ollama model list changes */
  useEffect(() => {
    if (!ollamaStatus?.models?.length) return;
    const models = ollamaStatus.models;
    if (!models.includes(chatModel)) {
      setChatModel(models[0]);
    }
  }, [ollamaStatus, chatModel]);

  /* Auto-switch provider when API keys change */
  useEffect(() => {
    if (Object.keys(apiKeys).length === 0) return;
    const external = AI_PROVIDERS.find((p) => apiKeys?.[p.id]?.enabled && apiKeys?.[p.id]?.key);
    if (external) {
      setChatProvider(external.id);
      setChatExternalModel((prev) => {
        const validModels = AI_PROVIDERS.find((p) => p.id === external.id)?.models || [];
        return validModels.includes(prev) ? prev : (external.defaultModel || "");
      });
    } else {
      setChatProvider("ollama");
      ensureOllamaRunning().catch(() => {});
    }
  }, [apiKeys]);

  const detectTools = (message) => {
    const lower = message.toLowerCase();
    return AGENT_TOOLS.filter((tool) =>
      tool.patterns.some((p) => lower.includes(p))
    );
  };

  const fetchToolContext = async (tools) => {
    const results = [];
    for (const tool of tools) {
      setToolStatus(tool.label);
      try {
        if (tool.id === "disk_overview") {
          const data = diskOverview?.length > 0 ? diskOverview : await getDiskOverview();
          results.push({ id: tool.id, label: "Thông tin ổ đĩa", content: formatDiskContext(data) });
        } else if (tool.id === "cleanup_log") {
          const log = await getCleanupLog();
          results.push({ id: tool.id, label: "Lịch sử dọn dẹp", content: formatLogContext(log) });
        }
      } catch {
        /* tool fetch failed — continue without this data */
      }
    }
    setToolStatus(null);
    return results;
  };

  const sendChatMessage = async (text) => {
    const content = text || chatInput.trim();
    if (!content) return;
    const userMsg = { role: "user", content };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      /* 1. Detect intent → fetch live data */
      const tools = detectTools(content);
      const toolResults = tools.length > 0 ? await fetchToolContext(tools) : [];

      /* 2. Inject real data into the user message sent to AI */
      const contextText = toolResults.map((r) => r.content).join("\n\n");
      const enrichedContent = contextText
        ? `${content}\n\n[Dữ liệu thực tế từ hệ thống - hãy dùng thông tin này để trả lời chính xác]\n${contextText}`
        : content;
      const msgPayload = [
        ...newMessages.slice(0, -1),
        { role: "user", content: enrichedContent },
      ].map((m) => ({ role: m.role, content: m.content }));

      /* 3. Show tool result bubble before AI response */
      if (toolResults.length > 0) {
        setChatMessages((prev) => [...prev, { role: "tool", toolResults }]);
      }

      /* 4. Call AI */
      setToolStatus("🤖 Đang gửi đến AI...");
      let reply;
      if (chatProvider !== "ollama" && apiKeys[chatProvider]?.enabled && apiKeys[chatProvider]?.key) {
        reply = await chatExternal(
          chatProvider,
          apiKeys[chatProvider].key,
          msgPayload,
          chatExternalModel || AI_PROVIDERS.find((p) => p.id === chatProvider)?.defaultModel || ""
        );
      } else {
        reply = await chatAI(msgPayload, chatModel);
      }
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "❌ Lỗi: " + e, error: true }]);
    }
    setChatLoading(false);
    setToolStatus(null);
  };

  const clearChat = () => {
    setChatMessages([]);
    setChatInput("");
  };

  const chatReady = chatProvider === "ollama"
    ? !!ollamaStatus?.running
    : !!(apiKeys[chatProvider]?.enabled && apiKeys[chatProvider]?.key);

  return {
    chatMessages,
    chatInput,
    setChatInput,
    chatLoading,
    chatModel,
    setChatModel,
    chatProvider,
    setChatProvider,
    chatExternalModel,
    setChatExternalModel,
    sendChatMessage,
    clearChat,
    chatReady,
    toolStatus,
  };
}
