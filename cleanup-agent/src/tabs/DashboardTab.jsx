export default function DashboardTab({
  diskOverview,
  ollamaStatus,
  loading,
  loadDashboard,
  handleScan,
}) {
  return (
    <div className="page">
      <h1 className="page-title">Tổng quan hệ thống</h1>

      {diskOverview.length > 0 && (
        <section className="section">
          <h2 className="section-title">Dung lượng ổ đĩa</h2>
          <div className="disk-grid">
            {diskOverview.map((disk, i) => (
              <div key={i} className="disk-card">
                <div className="disk-header">
                  <span className="disk-drive">{disk.drive}</span>
                  <span className={`disk-percent ${disk.used_percent > 90 ? "text-red" : disk.used_percent > 70 ? "text-yellow" : "text-green"}`}>
                    {disk.used_percent}%
                  </span>
                </div>
                <div className="disk-bar-track">
                  <div
                    className={`disk-bar-fill ${
                      disk.used_percent > 90 ? "critical" : disk.used_percent > 70 ? "warning" : "good"
                    }`}
                    style={{ width: `${Math.min(disk.used_percent, 100)}%` }}
                  />
                </div>
                <div className="disk-details">
                  <span>Đã dùng: {disk.used_display}</span>
                  <span>Còn trống: {disk.free_display}</span>
                  <span>Tổng: {disk.total_display}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h2 className="section-title">Trạng thái Agent</h2>
        <div className={`status-card ${ollamaStatus?.running ? "status-online" : "status-offline"}`}>
          <div className="status-header">
            <span className="status-icon">{ollamaStatus?.running ? "🟢" : "🔴"}</span>
            <span className="status-title">
              {ollamaStatus?.running ? "Agent đã kết nối" : "Agent chưa kết nối"}
            </span>
          </div>
          {!ollamaStatus?.running && (
            <div className="help-box">
              <p className="help-title">Cách cài Ollama:</p>
              <ol className="help-steps">
                <li>Tải Ollama tại <strong>ollama.com</strong></li>
                <li>Mở Terminal, gõ: <code>ollama serve</code></li>
                <li>Tải model: <code>ollama pull gemma3:4b</code></li>
                <li>Nhấn "Refresh" bên dưới</li>
              </ol>
            </div>
          )}
          <button className="btn btn-small" onClick={loadDashboard} disabled={!!loading}>
            Refresh
          </button>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Thao tác nhanh</h2>
        <div className="quick-actions">
          <button
            className="action-btn smart"
            onClick={() => handleScan("smart")}
            disabled={!!loading}
          >
            <span className="action-btn-icon">⚡</span>
            <span className="action-btn-title">Dọn nhanh</span>
            <span className="action-btn-desc">Quét nhanh cache dev phổ biến</span>
          </button>
          <button
            className="action-btn deep"
            onClick={() => handleScan("deep")}
            disabled={!!loading}
          >
            <span className="action-btn-icon">🔍</span>
            <span className="action-btn-title">Dọn sâu</span>
            <span className="action-btn-desc">Quét toàn bộ bao gồm Docker, VS Code...</span>
          </button>
          <button
            className="action-btn analyze"
            onClick={() => handleScan("analyze")}
            disabled={!!loading}
          >
            <span className="action-btn-icon">🧠</span>
            <span className="action-btn-title">AI Phân tích</span>
            <span className="action-btn-desc">Quét sâu + Agent đề xuất thông minh</span>
          </button>
        </div>
      </section>
    </div>
  );
}
