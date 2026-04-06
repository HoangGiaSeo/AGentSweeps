import { useRef, useEffect } from "react";
import { AI_PROVIDERS, CHAT_SUGGESTIONS } from "../constants";

export default function ChatTab({
  chatMessages,
  chatInput,
  setChatInput,
  chatLoading,
  chatProvider,
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
          {chatProvider !== "ollama" && (
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
            {chatMessages.map((msg, i) => (
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
            ))}
            {chatLoading && (
              <div className="chat-bubble chat-ai">
                <div className="chat-bubble-avatar"><img src="/fish-icon-32.png" alt="AI" className="fish-avatar" /></div>
                <div className="chat-bubble-content">
                  <div className="chat-bubble-role">Agent</div>
                  <div className="chat-typing">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
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
