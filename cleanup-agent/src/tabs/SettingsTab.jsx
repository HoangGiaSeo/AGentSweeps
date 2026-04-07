import { AI_PROVIDERS, MANUAL_ACTIONS } from "../constants";
import { openUrl } from "../api";

export default function SettingsTab({
  apiKeys,
  apiKeyInputs,
  setApiKeyInputs,
  apiTestResults,
  apiTesting,
  handleSaveApiKey,
  handleRemoveApiKey,
  handleTestApiKey,
  handleToggleApiKey,
}) {
  return (
    <div className="page">
      <h1 className="page-title">Cài đặt</h1>

      {/* API Key Providers */}
      <section className="section">
        <h2 className="section-title">🔑 Kết nối AI bên ngoài (API Key)</h2>
        <p className="section-desc">
          Kết nối các nhà cung cấp AI cloud theo nhu cầu của bạn.
        </p>
        <div className="api-provider-grid">
          {AI_PROVIDERS.map((provider) => {
            const entry = apiKeys[provider.id];
            const hasKey = !!entry?.key;
            const isEnabled = !!entry?.enabled;
            const testResult = apiTestResults[provider.id];
            const isTesting = apiTesting[provider.id];

            return (
              <div key={provider.id} className={`api-provider-card ${hasKey ? (isEnabled ? "connected" : "disabled") : ""}`}>
                <div className="api-provider-header">
                  <div className="api-provider-title">
                    <span className="api-provider-icon">{provider.icon}</span>
                    <div>
                      <span className="api-provider-name">{provider.name}</span>
                      <span className="api-provider-desc">{provider.desc}</span>
                    </div>
                  </div>
                  {hasKey && (
                    <label className="api-toggle">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => handleToggleApiKey(provider.id, e.target.checked)}
                      />
                      <span className="api-toggle-slider" />
                    </label>
                  )}
                </div>

                {hasKey ? (
                  <div className="api-key-connected">
                    <div className="api-key-display">
                      <span className="api-key-masked">
                        {entry.key.substring(0, 8)}{"•".repeat(12)}
                      </span>
                      <span className={`api-key-status ${isEnabled ? "active" : "inactive"}`}>
                        {isEnabled ? "✓ Đang bật" : "Đã tắt"}
                      </span>
                    </div>
                    {testResult && (
                      <div className={`api-test-result ${testResult.ok ? "test-ok" : "test-fail"}`}>
                        {testResult.msg}
                      </div>
                    )}
                    <div className="api-key-actions">
                      <button
                        className="btn btn-tiny"
                        onClick={() => handleTestApiKey(provider.id)}
                        disabled={isTesting}
                      >
                        {isTesting ? "⏳ Đang kiểm tra..." : "🔍 Kiểm tra kết nối"}
                      </button>
                      <button
                        className="btn btn-tiny btn-danger"
                        onClick={() => handleRemoveApiKey(provider.id)}
                      >
                        🗑️ Xóa Key
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="api-key-input-group">
                    <input
                      type="password"
                      className="api-key-input"
                      placeholder={provider.placeholder}
                      value={apiKeyInputs[provider.id] || ""}
                      onChange={(e) =>
                        setApiKeyInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveApiKey(provider.id);
                      }}
                    />
                    <button
                      className="btn btn-small btn-primary"
                      onClick={() => handleSaveApiKey(provider.id)}
                      disabled={!apiKeyInputs[provider.id]?.trim()}
                    >
                      Lưu
                    </button>
                  </div>
                )}

                <a
                  className="api-provider-link"
                  href={provider.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      await openUrl(provider.url);
                    } catch {
                      // Rust backend not ready yet — copy URL to clipboard as fallback
                      try {
                        await navigator.clipboard.writeText(provider.url);
                        alert(`Đã sao chép link vào clipboard:\n${provider.url}\n\nVui lòng dán (Ctrl+V) vào trình duyệt để mở.`);
                      } catch {
                        alert(`Vui lòng mở link thủ công trong trình duyệt:\n${provider.url}`);
                      }
                    }
                  }}
                >
                  🔗 Lấy API Key tại {provider.urlLabel}
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* Cleanup Actions List */}
      <section className="section">
        <h2 className="section-title">Hành động dọn dẹp</h2>
        <div className="settings-group">
          {MANUAL_ACTIONS.map((a) => (
            <div key={a.type} className="setting-row">
              <div className="setting-info">
                <span className="setting-label">{a.label}</span>
                <span className="setting-desc">{a.desc}</span>
              </div>
              <span className={`setting-status online`}>Bật</span>
            </div>
          ))}
        </div>
      </section>

      {/* App Info */}
      <section className="section">
        <h2 className="section-title">Tác Giả Hoàng Duy Nghĩa 097221 5678 </h2>
        <div className="settings-group">
          <div className="setting-row">
            <span className="setting-label"> Phiên bản </span>
            <span className="text-dim">0.1.0</span>
          </div>
          <div className="setting-row">
            <span className="setting-label">Stack</span>
            <span className="text-dim">Tauri 2 + React + Rust + 5 Agent + OpenAI + Gemini + Anthropic</span>
          </div>
          <div className="setting-row">
            <span className="setting-label">Bảo mật</span>
            <span className="text-dim">API Key lưu local — không gửi đến bên thứ ba ngoài provider</span>
          </div>
        </div>
      </section>
    </div>
  );
}
