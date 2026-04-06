import { useRef, useEffect, useState } from "react";
import { AI_PROVIDERS, CHAT_SUGGESTIONS } from "../constants";

function ToolBubble({ toolResults }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="chat-tool-bubble">
      <div className="chat-tool-header" onClick={() => setExpanded((e) => !e)}>
        <div className="chat-tool-header-left">
          🔧 Agent đã thu thập {toolResults.length} nguồn dữ liệu thực tế
        </div>
        <span className="chat-tool-toggle">{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div className="chat-tool-items">
          {toolResults.map((r, i) => (
            <div key={i}>
              <div className="chat-tool-item-label">{r.label}</div>
              <div className="chat-tool-item-content">{r.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatTab({
  chatMessages,
  chatInput,
  setChatInput,
  chatLoading,
  toolStatus,
  chatProvider,
  setChatProvider,
  chatModel,
  setChatModel,
  chatExternalModel,
  setChatExternalModel,
  chatReady,
  ollamaStatus,
  apiKeys,
  sendChatMessage,
  clearChat,
}) {
  const chatEndRef = useRef(null);
  const chatInputRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatLoading]);

  return (
    <div className="page chat-page">
      <div className="chat-header">
        <div className="chat-header-left">
          <h1 className="page-title" style={{ marginBottom: 0 }}>💬 Trò chuyện với Agent</h1>
          <span className={`chat-status ${chatProvider === "ollama" ? (ollamaStatus?.running ? "online" : "offline") : (apiKeys[chatProvider]?.enabled ? "online" : "offline")}`}>
            {chatProvider === "ollama"
              ? (ollamaStatus?.running ? "Agent Online" : "Offline")
              : `${AI_PROVIDERS.find((p) => p.id === chatProvider)?.name || chatProvider}`}
          </span>
        </div>
        <div className="chat-header-actions">
          {/* Provider switcher — chỉ hiện provider đã có API key hoặc Ollama */}
          <select
            className="chat-provider-select"
            value={chatProvider}
            onChange={(e) => {
              const newProvider = e.target.value;
              setChatProvider(newProvider);
              if (newProvider !== "ollama") {
                const p = AI_PROVIDERS.find((ap) => ap.id === newProvider);
                setChatExternalModel(p?.defaultModel || "");
              }
            }}
          >
            <option value="ollama">🦙 Ollama (Local)</option>
            {AI_PROVIDERS.filter((p) => apiKeys[p.id]?.key && apiKeys[p.id]?.enabled).map((p) => (
              <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
            ))}
          </select>

          {/* Model selector */}
          {chatProvider === "ollama" ? (
            ollamaStatus?.models?.length > 1 && (
              <select
                className="chat-model-select"
                value={chatModel}
                onChange={(e) => setChatModel(e.target.value)}
              >
                {ollamaStatus.models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )
          ) : (
            <select
              className="chat-model-select"
              value={chatExternalModel}
              onChange={(e) => setChatExternalModel(e.target.value)}
            >
              {AI_PROVIDERS.find((p) => p.id === chatProvider)?.models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}

          {chatMessages.length > 0 && (
            <button className="btn btn-tiny" onClick={clearChat}>
              🗑️ Xóa hội thoại
            </button>
          )}
        </div>
      </div>

      <div className="chat-body">
        {chatMessages.length === 0 && !chatLoading ? (
          <div className="chat-welcome">
            <div className="chat-welcome-icon"><img src="/fish-icon.png" alt="AI" className="fish-icon-large" /></div>
            <h2>Agent WinWin</h2>
            <p>Tối ưu hệ thống, dọn rác, giải phóng dung lượng..!</p>
            {!chatReady && (
              <div className="chat-offline-notice">
                <p>⚠️ {chatProvider === "ollama" ? "Ollama chưa chạy. Đại ca hãy khởi động Agent hoặc kết nối API Key trong Cài đặt nha!" : "API Key chưa được thiết lập. Đại ca vào Cài đặt để thêm nha!"}</p>
                {chatProvider === "ollama" && <code>ollama serve</code>}
              </div>
            )}
            <div className="chat-suggestions">
              <p className="chat-suggestions-label">Gợi ý câu hỏi:</p>
              <div className="chat-suggestion-grid">
                {CHAT_SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    className="chat-suggestion-btn"
                    onClick={() => sendChatMessage(s)}
                    disabled={!chatReady}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="chat-messages">
            {chatMessages.map((msg, i) => {
              if (msg.role === "tool") {
                return <ToolBubble key={i} toolResults={msg.toolResults} />;
              }
              return (
                <div
                  key={i}
                  className={`chat-bubble ${msg.role === "user" ? "chat-user" : "chat-ai"} ${msg.error ? "chat-error" : ""}`}
                >
                  <div className="chat-bubble-avatar">
                    {msg.role === "user" ? "👤" : <img src="/fish-icon-32.png" alt="AI" className="fish-avatar" />}
                  </div>
                  <div className="chat-bubble-content">
                    <div className="chat-bubble-role">
                      {msg.role === "user" ? "Bạn" : "Agent"}
                    </div>
                    <div className="chat-bubble-text">{msg.content}</div>
                  </div>
                </div>
              );
            })}
            {chatLoading && (
              <div className="chat-bubble chat-ai">
                <div className="chat-bubble-avatar"><img src="/fish-icon-32.png" alt="AI" className="fish-avatar" /></div>
                <div className="chat-bubble-content">
                  <div className="chat-bubble-role">Agent</div>
                  {toolStatus ? (
                    <div className="chat-tool-status">{toolStatus}</div>
                  ) : (
                    <div className="chat-typing">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      <div className="chat-input-bar">
        <input
          ref={chatInputRef}
          type="text"
          className="chat-input"
          placeholder={chatReady ? "Nhập tin nhắn..." : "Chưa kết nối AI — vào Cài đặt để thiết lập..."}
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendChatMessage();
            }
          }}
          disabled={chatLoading || !chatReady}
        />
        <button
          className="chat-send-btn"
          onClick={() => sendChatMessage()}
          disabled={chatLoading || !chatInput.trim() || !chatReady}
        >
          {chatLoading ? "⏳" : "➤"}
        </button>
      </div>
    </div>
  );
}
