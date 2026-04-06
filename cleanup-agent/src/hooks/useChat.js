import { useState, useEffect } from "react";
import { chatAI, chatExternal, ensureOllamaRunning } from "../api";
import { AI_PROVIDERS } from "../constants";

export function useChat({ ollamaStatus, apiKeys }) {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatModel, setChatModel] = useState("gemma3:4b");
  const [chatProvider, setChatProvider] = useState("ollama");
  const [chatExternalModel, setChatExternalModel] = useState("");

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
  };
}
