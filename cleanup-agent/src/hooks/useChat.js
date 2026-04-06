import { useState, useEffect, useRef } from "react";
import { chatAI, chatExternal, ensureOllamaRunning, getDiskOverview, getCleanupLog } from "../api";
import { AI_PROVIDERS } from "../constants";
import { AGENT_TOOLS } from "./chatTools/toolRegistry";
import { detectTools, isForceRefresh } from "./chatTools/intentDetector";
import { evaluateDiskCacheDecision, evaluateFreshFetchFallback } from "./chatTools/freshnessPolicy";
import { formatRedactedLog, containsPathLikeContent } from "./chatTools/redactionPipeline";
import { composeDiskContext, composeLogContext, buildEnrichedMessage } from "./chatTools/contextComposer";

export function useChat({ ollamaStatus, apiKeys }) {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatModel, setChatModel] = useState("gemma3:4b");
  const [chatProvider, setChatProvider] = useState("ollama");
  const [chatExternalModel, setChatExternalModel] = useState("");
  const [toolStatus, setToolStatus] = useState("");

  /* Internal disk cache — managed independently, not coupled to App.jsx shell state */
  const diskCacheRef = useRef({ data: null, capturedAt: null });

  /* Capture current provider in a ref so async closures stay current */
  const providerRef = useRef(chatProvider);
  useEffect(() => { providerRef.current = chatProvider; }, [chatProvider]);

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

  /**
   * Fetches context for a single tool.
   * Handles freshness policy (disk_overview) and redaction (cleanup_log).
   * Returns null if context cannot be built (error, empty, or safety block).
   *
   * @param {string} toolId
   * @param {boolean} forceRefresh
   * @returns {Promise<{id, label, contextText, freshness}|null>}
   */
  const fetchSingleToolContext = async (toolId, forceRefresh) => {
    const toolDef = AGENT_TOOLS.find((t) => t.id === toolId);
    if (!toolDef) return null;

    if (toolId === "disk_overview") {
      const cacheDecision = evaluateDiskCacheDecision(diskCacheRef.current, forceRefresh);

      if (cacheDecision.decision === "use-cached") {
        const contextText = composeDiskContext(
          diskCacheRef.current.data,
          cacheDecision.freshness,
          diskCacheRef.current.capturedAt
        );
        return { id: toolId, label: toolDef.label, contextText, freshness: cacheDecision.freshness };
      }

      try {
        const freshData = await getDiskOverview();
        diskCacheRef.current = { data: freshData, capturedAt: Date.now() };
        const contextText = composeDiskContext(freshData, "fresh", diskCacheRef.current.capturedAt);
        return { id: toolId, label: toolDef.label, contextText, freshness: "fresh" };
      } catch {
        const fallback = evaluateFreshFetchFallback(diskCacheRef.current);
        if (fallback.decision === "use-stale") {
          const contextText = composeDiskContext(
            diskCacheRef.current.data,
            fallback.freshness,
            diskCacheRef.current.capturedAt
          );
          return { id: toolId, label: toolDef.label, contextText, freshness: fallback.freshness };
        }
        return null;
      }
    }

    if (toolId === "cleanup_log") {
      try {
        const rawEntries = await getCleanupLog();
        const redactedText = formatRedactedLog(rawEntries);
        /* Provider safety gate: block injection if residual path content detected */
        if (providerRef.current !== "ollama" && containsPathLikeContent(redactedText)) {
          return null;
        }
        const contextText = composeLogContext(redactedText);
        return { id: toolId, label: toolDef.label, contextText, freshness: "fresh" };
      } catch {
        return null;
      }
    }

    return null;
  };

  /**
   * Fetches context for all detected tool IDs sequentially.
   * Updates toolStatus display text during fetch.
   *
   * @param {string[]} toolIds
   * @param {string} message — original user message (for force-refresh detection)
   * @returns {Promise<Array>} — array of non-null tool context results
   */
  const fetchAllToolContexts = async (toolIds, message) => {
    const forceRefresh = isForceRefresh(message);
    const results = [];
    for (const toolId of toolIds) {
      const toolDef = AGENT_TOOLS.find((t) => t.id === toolId);
      if (toolDef) setToolStatus(toolDef.statusText);
      const result = await fetchSingleToolContext(toolId, forceRefresh);
      if (result) results.push(result);
    }
    setToolStatus("");
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
      /* 1. Detect tools from locked V1 allowlist */
      const toolIds = detectTools(content);

      /* 2. Fetch tool context — empty array if no tools matched or all failed */
      let toolResults = [];
      if (toolIds.length > 0) {
        toolResults = await fetchAllToolContexts(toolIds, content);
      }

      /* 3. Insert tool bubble message (UI only) and build enriched user content */
      let enrichedContent = content;
      if (toolResults.length > 0) {
        setChatMessages((prev) => [...prev, { role: "tool", toolResults }]);
        enrichedContent = buildEnrichedMessage(content, toolResults);
      }

      /* 4. Build AI payload — filter out role:"tool" messages, inject enriched content */
      const historyForAI = newMessages.filter((m) => m.role !== "tool");
      const msgPayload = historyForAI.map((m, idx) => {
        if (idx === historyForAI.length - 1 && m.role === "user") {
          return { role: "user", content: enrichedContent };
        }
        return { role: m.role, content: m.content };
      });

      /* 5. Send to configured AI provider */
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

    setToolStatus("");
    setChatLoading(false);
  };

  const clearChat = () => {
    setChatMessages([]);
    setChatInput("");
    setToolStatus("");
  };

  const chatReady =
    chatProvider === "ollama"
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
    toolStatus,
    sendChatMessage,
    clearChat,
    chatReady,
  };
}
