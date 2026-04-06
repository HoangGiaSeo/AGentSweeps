import { useState, useMemo } from "react";
import "../styles/drivemodal.css";

const TABS = [
  { id: "folders", label: "📁 Thư mục lớn" },
  { id: "apps",    label: "🕐 Ứng dụng gần đây" },
];

function usageClass(pct) {
  if (pct > 90) return "critical";
  if (pct > 70) return "warning";
  return "good";
}

function freshnessClass(days) {
  if (days === 0) return "fresh-today";
  if (days <= 7)  return "fresh-week";
  if (days <= 30) return "fresh-month";
  return "stale";
}

// ── Folders tab ──────────────────────────────────────────────
function FoldersTab({ topFolders }) {
  if (!topFolders || topFolders.length === 0) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        Không tìm thấy thư mục lớn.
      </div>
    );
  }

  const maxSize = topFolders[0]?.size_bytes || 1;

  return (
    <>
      <div className="dmodal-col-header">
        <span />
        <span>Tên</span>
        <span style={{ textAlign: "center" }}>Tỉ lệ</span>
        <span style={{ textAlign: "right" }}>Kích thước</span>
        <span style={{ textAlign: "right" }}>Số file</span>
      </div>
      {topFolders.map((item, i) => (
        <div key={i} className="dmodal-folder-row" title={item.path}>
          <div className="dmodal-folder-icon">
            {item.item_type === "folder" ? "📁" : "📄"}
          </div>
          <div className="dmodal-folder-name-wrap">
            <div className="dmodal-folder-name">{item.name}</div>
            <div className="dmodal-folder-path">{item.path}</div>
          </div>
          <div className="dmodal-bar-col">
            <div className="dmodal-bar-track">
              <div
                className="dmodal-bar-fill"
                style={{
                  width: `${Math.min((item.size_bytes / maxSize) * 100, 100)}%`,
                  opacity: 0.6 + (item.size_bytes / maxSize) * 0.4,
                }}
              />
            </div>
            <span className="dmodal-bar-pct">
              {item.percent_of_used > 0 ? `${item.percent_of_used}%` : ""}
            </span>
          </div>
          <div className="dmodal-size">{item.size_display}</div>
          <div className="dmodal-count">
            {item.item_type === "folder"
              ? item.item_count.toLocaleString()
              : "—"}
          </div>
        </div>
      ))}
    </>
  );
}

// ── Apps tab ─────────────────────────────────────────────────
function AppsTab({ recentApps }) {
  const [activeCategory, setActiveCategory] = useState("Tất cả");

  const categories = useMemo(() => {
    const seen = new Set();
    const cats = ["Tất cả"];
    recentApps.forEach((a) => {
      if (!seen.has(a.category)) {
        seen.add(a.category);
        cats.push(a.category);
      }
    });
    return cats;
  }, [recentApps]);

  const filtered = useMemo(() => {
    if (activeCategory === "Tất cả") return recentApps;
    return recentApps.filter((a) => a.category === activeCategory);
  }, [recentApps, activeCategory]);

  const hasPrefetch = recentApps.length > 0;

  return (
    <>
      {!hasPrefetch && (
        <div className="dmodal-notice">
          ⚠️ Không tìm thấy dữ liệu Prefetch (C:\Windows\Prefetch) — tính năng theo dõi ứng dụng
          không khả dụng trên hệ thống này.
        </div>
      )}

      {hasPrefetch && (
        <div className="dmodal-cat-filter">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`dmodal-cat-btn ${activeCategory === cat ? "active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
              <span className="dmodal-count-badge">
                {cat === "Tất cả"
                  ? recentApps.length
                  : recentApps.filter((a) => a.category === cat).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {filtered.map((app, i) => (
        <div
          key={i}
          className={`dmodal-app-row ${freshnessClass(app.last_used_days)}`}
        >
          <div className="dmodal-app-icon" title={app.category}>{app.icon}</div>
          <div className="dmodal-app-info">
            <div className="dmodal-app-name">{app.name}</div>
            <div className="dmodal-app-exe">{app.exe_name.toUpperCase()}</div>
          </div>
          <span className="dmodal-cat-badge">{app.category}</span>
          <div className="dmodal-last-used">
            <span className="dmodal-last-used-primary">{app.last_used_display}</span>
            {app.last_used_days > 0 && (
              <span className="dmodal-last-used-days">({app.last_used_days} ngày)</span>
            )}
          </div>
        </div>
      ))}

      {hasPrefetch && filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
          Không có ứng dụng trong danh mục này.
        </div>
      )}
    </>
  );
}

// ── Main component ───────────────────────────────────────────
export default function DriveModal({ disk, report, loading, onClose, onDeepScan }) {
  const [activeTab, setActiveTab] = useState("folders");

  if (!disk) return null;

  const pct = disk.used_percent;
  const cls = usageClass(pct);

  return (
    <div
      className="dmodal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="dmodal-window" onClick={(e) => e.stopPropagation()}>
        {/* ── Header ────────────────────────────────────────── */}
        <div className="dmodal-header">
          <span className="dmodal-drive-badge">{disk.drive.replace("\\", "")}</span>
          <div className="dmodal-drive-stats">
            <div className="dmodal-drive-name">Phân tích ổ đĩa {disk.drive}</div>
            <div className="dmodal-drive-sub">
              <span>Tổng: {disk.total_display}</span>
              <span>Đã dùng: {disk.used_display}</span>
              <span>Còn trống: {disk.free_display}</span>
            </div>
          </div>
          <div className="dmodal-usage-bar-wrap">
            <div className="dmodal-usage-track">
              <div
                className={`dmodal-usage-fill ${cls}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <div className={`dmodal-usage-pct ${cls}`}>{pct}% đã dùng</div>
          </div>
          <button className="dmodal-close-btn" onClick={onClose} title="Đóng">✕</button>
        </div>

        {/* ── Tabs ──────────────────────────────────────────── */}
        <div className="dmodal-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`dmodal-tab-btn ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
              {report && (
                <span className="dmodal-count-badge">
                  {t.id === "folders" ? report.top_count : report.apps_count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Body ──────────────────────────────────────────── */}
        <div className="dmodal-body">
          {loading && (
            <div className="dmodal-loading">
              <div
                className="loading-spinner"
                style={{ width: "36px", height: "36px", borderWidth: "3px" }}
              />
              <span>Đang phân tích ổ {disk.drive} — đang đọc dữ liệu thư mục...</span>
            </div>
          )}

          {!loading && report && activeTab === "folders" && (
            <FoldersTab topFolders={report.top_folders} usedBytesTotal={disk.used_bytes} />
          )}

          {!loading && report && activeTab === "apps" && (
            <AppsTab recentApps={report.recent_apps} />
          )}

          {!loading && !report && (
            <div className="dmodal-loading">
              <span style={{ color: "var(--text-muted)" }}>Không có dữ liệu.</span>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="dmodal-footer">
          <button
            className="dmodal-action-btn secondary"
            onClick={onClose}
          >
            Đóng
          </button>
          <button
            className="dmodal-action-btn primary"
            onClick={() => { onClose(); onDeepScan(); }}
          >
            🔬 Phân tích sâu ổ này
          </button>
        </div>
      </div>
    </div>
  );
}
