import { MANUAL_ACTIONS, formatSize } from "../constants";

export default function CleanupTab({
  scanMode,
  setScanMode,
  scanData,
  cleanupMode,
  setCleanupMode,
  aiResult,
  selectedActions,
  setSelectedActions,
  selectedCount,
  totalScanned,
  loading,
  ollamaStatus,
  cleanupResults,
  showSpaceSaved,
  spaceFreed,
  zipLoading,
  zipResult,
  sizeEstimates,
  schedule,
  setSchedule,
  scheduleLoading,
  handleSaveSchedule,
  toggleScheduleDay,
  toggleScheduleAction,
  handleScan,
  triggerAI,
  toggleAction,
  selectAll,
  selectNone,
  selectSafe,
  handleCleanupClick,
  handleZipBackup,
  handleEstimateSize,
}) {
  return (
    <div className="page">
      <h1 className="page-title">Quản lý dọn dẹp</h1>

      {/* Mode + Scan Bar */}
      <div className="mode-bar">
        <div className="mode-group">
          {["smart", "deep", "analyze"].map((m) => (
            <button
              key={m}
              className={`mode-btn ${scanMode === m ? "active" : ""}`}
              onClick={() => setScanMode(m)}
            >
              {m === "smart" ? "⚡ Nhanh" : m === "deep" ? "🔍 Sâu" : "🧠 AI"}
            </button>
          ))}
        </div>
        <button className="btn btn-scan" onClick={() => handleScan()} disabled={!!loading}>
          Quét ngay
        </button>
      </div>

      {/* Scan Results */}
      {scanData.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Kết quả quét ({scanData.length} mục)</h2>
            <span className="section-badge">Tổng: {formatSize(totalScanned)}</span>
          </div>
          {["dev", "system", "docker"].map((cat) => {
            const items = scanData.filter((d) => d.category === cat);
            if (items.length === 0) return null;
            const catSize = items.reduce((s, i) => s + i.size_bytes, 0);
            return (
              <div key={cat} className="category-group">
                <h3 className="category-title">
                  {cat === "dev" ? "🔧 Developer" : cat === "system" ? "💻 Hệ thống" : "🐳 Docker"}
                  <span className="category-size">{formatSize(catSize)}</span>
                </h3>
                <div className="scan-grid">
                  {items.map((item, i) => (
                    <div key={i} className={`scan-card ${item.size_bytes === 0 ? "scan-empty" : ""}`}>
                      <div className="scan-name">{item.name}</div>
                      <div className={`scan-size ${item.size_bytes > 1073741824 ? "size-large" : item.size_bytes > 104857600 ? "size-medium" : ""}`}>
                        {item.size_bytes === 0 ? "Trống" : item.size_display}
                      </div>
                      <div className="scan-path" title={item.path}>{item.path}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Cleanup Mode Toggle */}
      {scanData.length > 0 && (
        <div className="cleanup-mode-bar">
          <button
            className={`cleanup-mode-btn ${cleanupMode === "ai" ? "active" : ""}`}
            onClick={() => setCleanupMode("ai")}
          >
            <img src="/fish-icon-32.png" alt="" className="btn-fish-icon" /> AI Đề xuất
          </button>
          <button
            className={`cleanup-mode-btn ${cleanupMode === "manual" ? "active" : ""}`}
            onClick={() => { setCleanupMode("manual"); setSelectedActions({}); }}
          >
            🔧 Dọn thủ công
          </button>
        </div>
      )}

      {/* AI Mode */}
      {cleanupMode === "ai" && scanData.length > 0 && !aiResult && (
        <div className="ai-prompt-bar">
          <button
            className="btn btn-ai-large"
            onClick={() => triggerAI()}
            disabled={!!loading || !ollamaStatus?.running}
          >
            <img src="/fish-icon-32.png" alt="" className="btn-fish-icon" /> Lấy đề xuất từ AI
          </button>
          {!ollamaStatus?.running && (
            <p className="ai-warning">
              Ollama chưa chạy. Hãy dùng chế độ <strong>Dọn thủ công</strong> hoặc khởi động Ollama.
            </p>
          )}
        </div>
      )}

      {/* AI Recommendations */}
      {cleanupMode === "ai" && aiResult && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title"><img src="/fish-icon-32.png" alt="" className="btn-fish-icon" /> AI Đề xuất</h2>
            <div className="header-actions">
              <button className="btn btn-tiny" onClick={selectAll}>Chọn tất cả</button>
              <button className="btn btn-tiny" onClick={selectSafe}>Chỉ an toàn</button>
              <button className="btn btn-tiny" onClick={selectNone}>Bỏ chọn</button>
              <span className="section-badge">{selectedCount} đã chọn</span>
            </div>
          </div>
          {aiResult.actions.length > 0 ? (
            <div className="ai-actions">
              {aiResult.actions.map((action, i) => (
                <div
                  key={i}
                  className={`action-card ${action.safe ? "safe" : "unsafe"} ${selectedActions[action.type] ? "selected" : ""}`}
                >
                  <label className="action-label">
                    <input
                      type="checkbox"
                      checked={selectedActions[action.type] || false}
                      onChange={() => toggleAction(action.type)}
                    />
                    <div className="action-info">
                      <div className="action-top">
                        <span className="action-type">{action.type}</span>
                        <span className={`badge ${action.safe ? "badge-safe" : "badge-warn"}`}>
                          {action.safe ? "✓ An toàn" : "⚠ Rủi ro"}
                        </span>
                      </div>
                      <p className="action-reason">{action.reason}</p>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <div className="ai-raw">
              <p>AI không thể tạo đề xuất có cấu trúc. Phản hồi gốc:</p>
              <pre>{aiResult.raw_response}</pre>
            </div>
          )}
        </section>
      )}

      {/* Manual Mode */}
      {cleanupMode === "manual" && scanData.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">🔧 Chọn thủ công</h2>
            <div className="header-actions">
              <button className="btn btn-tiny" onClick={selectAll}>Chọn tất cả</button>
              <button className="btn btn-tiny" onClick={selectNone}>Bỏ chọn</button>
              <span className="section-badge">{selectedCount} đã chọn</span>
            </div>
          </div>
          <div className="manual-actions">
            {["dev", "system", "docker"].map((cat) => {
              const items = MANUAL_ACTIONS.filter((a) => a.category === cat);
              return (
                <div key={cat} className="manual-category">
                  <h4 className="manual-cat-title">
                    {cat === "dev" ? "🔧 Developer" : cat === "system" ? "💻 Hệ thống" : "🐳 Docker"}
                  </h4>
                  {items.map((action) => {
                    const scanItem = scanData.find((s) =>
                      s.name.toLowerCase().includes(action.type.replace("_", " ").split("_")[0]) ||
                      action.label.toLowerCase().includes(s.name.toLowerCase().split(" ")[0])
                    );
                    return (
                      <div
                        key={action.type}
                        className={`manual-item ${selectedActions[action.type] ? "selected" : ""}`}
                      >
                        <label className="action-label">
                          <input
                            type="checkbox"
                            checked={selectedActions[action.type] || false}
                            onChange={() => toggleAction(action.type)}
                          />
                          <div className="action-info">
                            <div className="action-top">
                              <span className="action-type">{action.label}</span>
                              {scanItem && scanItem.size_bytes > 0 && (
                                <span className="manual-size">{scanItem.size_display}</span>
                              )}
                            </div>
                            <p className="action-reason">{action.desc}</p>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Execute Bar */}
      {selectedCount > 0 && (
        <div className="execute-bar">
          <div className="execute-bar-left">
            <button
              className="btn btn-execute"
              onClick={handleCleanupClick}
              disabled={!!loading || zipLoading}
            >
              🗑️ Thực thi dọn dẹp ({selectedCount} hành động)
            </button>
            <button
              className="btn btn-zip"
              onClick={handleZipBackup}
              disabled={!!loading || zipLoading}
              title="Nén backup file rác trước khi xóa"
            >
              {zipLoading ? "⏳ Đang nén..." : "📦 Nén backup trước"}
            </button>
            <button
              className="btn btn-estimate"
              onClick={handleEstimateSize}
              disabled={!!loading}
              title="Ước tính dung lượng giải phóng"
            >
              📊 Ước tính
            </button>
          </div>
          {Object.keys(sizeEstimates).length > 0 && (
            <div className="estimate-summary">
              <span className="estimate-label">Ước tính giải phóng:</span>
              <span className="estimate-total">
                {formatSize(Object.values(sizeEstimates).reduce((s, e) => s + (e?.size_bytes ?? 0), 0))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ZIP Result */}
      {zipResult && (
        <section className="section zip-result">
          <div className="zip-result-content">
            <span className="zip-result-icon">📦</span>
            <div>
              <h3 className="zip-result-title">Backup hoàn tất!</h3>
              <p className="zip-result-info">
                {zipResult.file_count} files • Gốc: {zipResult.original_display} → Nén: {zipResult.compressed_display}
                {zipResult.original_size > 0 && (
                  <span className="zip-ratio">
                    {" "}(giảm {Math.round((1 - zipResult.compressed_size / zipResult.original_size) * 100)}%)
                  </span>
                )}
              </p>
              <p className="zip-result-path">📂 {zipResult.zip_path}</p>
            </div>
          </div>
        </section>
      )}

      {/* Space Saved Summary */}
      {showSpaceSaved && (
        <section className="section space-saved">
          <div className="space-saved-content">
            <span className="space-saved-icon">🎉</span>
            <div>
              <h3 className="space-saved-title">Dọn dẹp hoàn tất!</h3>
              <p className="space-saved-amount">
                {spaceFreed > 0
                  ? `Đã giải phóng ${formatSize(spaceFreed)}`
                  : "Hoàn tất (dung lượng giải phóng nhỏ hơn ngưỡng đo)"}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Cleanup Results */}
      {cleanupResults.length > 0 && (
        <section className="section">
          <h2 className="section-title">Kết quả dọn dẹp</h2>
          <div className="results-list">
            {cleanupResults.map((r, i) => (
              <div key={i} className={`result-item ${r.success ? "success" : "failed"}`}>
                <span className="result-icon">{r.success ? "✅" : "❌"}</span>
                <span className="result-action">{r.action}</span>
                <span className="result-msg">{r.message}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-small" onClick={() => handleScan()} style={{ marginTop: 12 }}>
            Quét lại để kiểm tra
          </button>
        </section>
      )}

      {/* Empty State */}
      {scanData.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <h3>Chưa có dữ liệu quét</h3>
          <p>Nhấn "Quét ngay" hoặc chọn "Thao tác nhanh" từ Tổng quan để bắt đầu.</p>
        </div>
      )}

      {/* Auto Scheduler */}
      <section className="section">
        <h2 className="section-title">🕐 Dọn tự động (Lịch trình)</h2>
        <p className="section-desc">
          Cài đặt lịch dọn rác tự động. Ứng dụng cần đang mở để chạy lịch trình.
        </p>

        <div className="schedule-card">
          <div className="schedule-header">
            <span className="schedule-title">Kích hoạt dọn tự động</span>
            <label className="api-toggle">
              <input
                type="checkbox"
                checked={schedule.enabled}
                onChange={(e) => setSchedule((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
              <span className="api-toggle-slider" />
            </label>
          </div>

          <div className={`schedule-body ${schedule.enabled ? "" : "schedule-disabled"}`}>
            <div className="schedule-row">
              <span className="schedule-label">Ngày trong tuần:</span>
              <div className="schedule-days">
                {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label, i) => (
                  <button
                    key={i}
                    className={`schedule-day-btn ${schedule.days.includes(i) ? "active" : ""}`}
                    onClick={() => toggleScheduleDay(i)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="schedule-row">
              <span className="schedule-label">Giờ chạy:</span>
              <input
                type="time"
                className="schedule-time-input"
                value={schedule.time}
                onChange={(e) => setSchedule((prev) => ({ ...prev, time: e.target.value }))}
              />
            </div>

            <div className="schedule-row">
              <span className="schedule-label">Hành động tự động:</span>
              <div className="schedule-actions">
                {MANUAL_ACTIONS.map((a) => (
                  <label key={a.type} className={`schedule-action-chip ${schedule.actions.includes(a.type) ? "active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={schedule.actions.includes(a.type)}
                      onChange={() => toggleScheduleAction(a.type)}
                    />
                    <span>{a.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {schedule.last_run && (
              <div className="schedule-row">
                <span className="schedule-label">Lần chạy gần nhất:</span>
                <span className="schedule-last-run">{schedule.last_run}</span>
              </div>
            )}

            <div className="schedule-footer">
              <button
                className="btn btn-small btn-primary"
                onClick={handleSaveSchedule}
                disabled={scheduleLoading}
              >
                {scheduleLoading ? "Đang lưu..." : "💾 Lưu lịch trình"}
              </button>
              <span className="schedule-summary">
                {schedule.enabled && schedule.days.length > 0 && schedule.actions.length > 0
                  ? `${schedule.actions.length} hành động, ${schedule.days.length} ngày/tuần lúc ${schedule.time}`
                  : "Chưa cấu hình"}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
