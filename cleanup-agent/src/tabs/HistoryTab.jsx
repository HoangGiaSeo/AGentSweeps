export default function HistoryTab({ logEntries, handleClearLog }) {
  return (
    <div className="page">
      <div className="section-header" style={{ marginBottom: 20 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Lịch sử dọn dẹp</h1>
        {logEntries.length > 0 && (
          <button className="btn btn-small btn-danger" onClick={handleClearLog}>
            Xóa lịch sử
          </button>
        )}
      </div>

      {logEntries.length > 0 ? (
        <section className="section">
          <div className="history-list">
            {logEntries.slice().reverse().map((entry, i) => (
              <div key={i} className="history-item">
                <span className="history-time">{entry.timestamp}</span>
                <span className="history-action">{entry.action}</span>
                <span className="history-details">{entry.details}</span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <h3>Chưa có lịch sử</h3>
          <p>Các hành động dọn dẹp sẽ hiển thị ở đây sau khi thực thi.</p>
        </div>
      )}
    </div>
  );
}
