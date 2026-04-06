import { useState, useMemo } from "react";
import "../styles/deepscan.css";

// ── Category human-readable labels ──────────────────────────
const CAT_LABELS = {
  system_junk: "Junk hệ thống",
  dev_cache: "Cache dev",
  app_cache: "Cache ứng dụng",
  browser_cache: "Cache trình duyệt",
  crash_logs: "Crash / Logs",
  log_files: "File log",
  docker: "Docker",
  build_artifact: "Build artifact",
  old_download: "Download cũ",
  large_file: "File lớn",
  node_modules: "node_modules",
  user_junk: "Junk người dùng",
};

const SAFETY_LABELS = {
  safe: "🟢 An toàn",
  caution: "🟡 Cẩn thận",
  protected: "🔴 Bảo vệ",
};

const MIN_SIZE_OPTIONS = [
  { label: "Tất cả", value: 0 },
  { label: "> 1 MB", value: 1 },
  { label: "> 5 MB", value: 5 },
  { label: "> 10 MB", value: 10 },
  { label: "> 50 MB", value: 50 },
  { label: "> 100 MB", value: 100 },
];

// ── Deep-scan result item row ────────────────────────────────
function ItemRow({ item, checked, onToggle }) {
  const isProtected = item.safety_level === "protected";
  return (
    <div className={`deepscan-item ${isProtected ? "protected-item" : ""}`}>
      <div className="item-check">
        {isProtected ? (
          <span title="Không thể xóa — File hệ thống bảo vệ">🔒</span>
        ) : (
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggle(item.path)}
            title={item.path}
          />
        )}
      </div>
      <div className="item-icon" title={CAT_LABELS[item.category] || item.category}>
        {item.icon}
      </div>
      <div className="item-info">
        <div className="item-name" title={item.name}>{item.name}</div>
        <div className="item-path" title={item.path}>{item.path}</div>
        <div className="item-reason">{item.safety_reason}</div>
      </div>
      <div className="item-size">{item.size_display}</div>
      <div className="item-badges">
        <span className={`item-cat-badge cat-${item.category}`}>
          {CAT_LABELS[item.category] || item.category}
        </span>
        {item.last_modified_days >= 0 && (
          <span className="item-age">{item.last_modified_days} ngày trước</span>
        )}
        {item.item_count > 1 && (
          <span className="item-age">{item.item_count.toLocaleString()} files</span>
        )}
      </div>
    </div>
  );
}

// ── Collapsible section ──────────────────────────────────────
function SectionPanel({ safetyLevel, items, selected, onToggle, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const isProtected = safetyLevel === "protected";
  const totalSize = items.reduce((s, i) => s + i.size_bytes, 0);
  const fmtSize = formatBytes(totalSize);
  const checkedCount = items.filter((i) => selected.has(i.path)).length;

  return (
    <div className="deepscan-section">
      <div className="deepscan-section-header" onClick={() => setOpen((v) => !v)}>
        <div className="section-title-group">
          <span className={`section-safety-dot ${safetyLevel}`} />
          <span className="section-title-text">
            {SAFETY_LABELS[safetyLevel]}
          </span>
          <span className="section-count-badge">{items.length} mục</span>
        </div>
        <div className="section-meta">
          <span>{fmtSize}</span>
          {!isProtected && checkedCount > 0 && (
            <span style={{ color: "var(--accent)" }}>({checkedCount} đã chọn)</span>
          )}
          <span className={`section-toggle-icon ${open ? "open" : ""}`}>▼</span>
        </div>
      </div>

      {open && (
        <>
          {isProtected && (
            <div className="protected-banner">
              🛡️ Các mục này là file hệ thống Windows quan trọng — chỉ hiển thị thông tin, KHÔNG THỂ xóa.
            </div>
          )}
          <div className="deepscan-items">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                checked={selected.has(item.path)}
                onToggle={onToggle}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes >= 1_073_741_824) return (bytes / 1_073_741_824).toFixed(2) + " GB";
  if (bytes >= 1_048_576) return (bytes / 1_048_576).toFixed(2) + " MB";
  if (bytes >= 1_024) return (bytes / 1_024).toFixed(2) + " KB";
  return bytes + " B";
}

// ── Main component ───────────────────────────────────────────
export default function DeepScanTab({
  scanning,
  scanResult,
  cleanResults,
  onScan,
  onClean,
}) {
  const [options, setOptions] = useState({
    include_browser_cache: true,
    include_large_files: true,
    include_old_downloads: true,
    include_dev_artifacts: true,
    min_size_mb: 1,
  });
  const [selected, setSelected] = useState(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const items = useMemo(() => scanResult?.items || [], [scanResult]);
  const safeItems = items.filter((i) => i.safety_level === "safe");
  const cautionItems = items.filter((i) => i.safety_level === "caution");
  const protectedItems = items.filter((i) => i.safety_level === "protected");

  const selectedSize = useMemo(() => {
    return items
      .filter((i) => selected.has(i.path))
      .reduce((s, i) => s + i.size_bytes, 0);
  }, [items, selected]);

  const toggleItem = (path) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectAllSafe = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      safeItems.forEach((i) => next.add(i.path));
      return next;
    });
  };

  const selectAllCaution = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      cautionItems.forEach((i) => next.add(i.path));
      return next;
    });
  };

  const deselectAll = () => setSelected(new Set());

  const handleScan = () => {
    setSelected(new Set());
    onScan(options);
  };

  const handleDeleteClick = () => {
    if (selected.size === 0) return;
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    setShowConfirm(false);
    setCleaning(true);
    await onClean([...selected]);
    setSelected(new Set());
    setCleaning(false);
  };

  const toggleOption = (key) =>
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="deepscan-tab">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="deepscan-header">
        <div className="deepscan-title">🔬 Phân tích ổ đĩa chuyên sâu</div>
        <div className="deepscan-subtitle">
          Quét thông minh để phân biệt file Windows cốt lõi vs. rác có thể xóa an toàn
        </div>
      </div>

      {/* ── Options ───────────────────────────────────────── */}
      <div className="deepscan-options">
        <div className="deepscan-options-row">
          <span className="deepscan-option-label">Phạm vi quét:</span>
          <label className="deepscan-checkbox">
            <input
              type="checkbox"
              checked={options.include_browser_cache}
              onChange={() => toggleOption("include_browser_cache")}
            />
            🌐 Cache trình duyệt
          </label>
          <label className="deepscan-checkbox">
            <input
              type="checkbox"
              checked={options.include_dev_artifacts}
              onChange={() => toggleOption("include_dev_artifacts")}
            />
            🔧 Dev artifacts
          </label>
          <label className="deepscan-checkbox">
            <input
              type="checkbox"
              checked={options.include_old_downloads}
              onChange={() => toggleOption("include_old_downloads")}
            />
            📥 Downloads cũ (30+ ngày)
          </label>
          <label className="deepscan-checkbox">
            <input
              type="checkbox"
              checked={options.include_large_files}
              onChange={() => toggleOption("include_large_files")}
            />
            📦 File lớn (200+ MB)
          </label>
        </div>
        <div className="deepscan-options-row">
          <span className="deepscan-option-label">Cỡ tối thiểu:</span>
          <select
            className="deepscan-size-select"
            value={options.min_size_mb}
            onChange={(e) =>
              setOptions((prev) => ({ ...prev, min_size_mb: Number(e.target.value) }))
            }
          >
            {MIN_SIZE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            className="deepscan-scan-btn"
            onClick={handleScan}
            disabled={scanning || cleaning}
          >
            {scanning ? (
              <>
                <span
                  className="loading-spinner"
                  style={{ width: "14px", height: "14px", borderWidth: "2px" }}
                />
                Đang quét...
              </>
            ) : (
              <>🔍 Bắt đầu quét</>
            )}
          </button>
        </div>
      </div>

      {/* ── Scanning progress ─────────────────────────────── */}
      {scanning && (
        <div className="deepscan-scanning-indicator">
          <span
            className="loading-spinner"
            style={{ width: "16px", height: "16px", borderWidth: "2px" }}
          />
          Đang phân tích ổ C:\ — đang kiểm tra cache, dev artifacts, downloads...
        </div>
      )}

      {/* ── Results ───────────────────────────────────────── */}
      {!scanning && scanResult && (
        <>
          {/* Summary cards */}
          <div className="deepscan-summary">
            <div className="deepscan-summary-card safe">
              <span className="summary-badge safe">🟢 An toàn xóa</span>
              <span className="summary-size">{scanResult.safe_display}</span>
              <span className="summary-desc">{safeItems.length} mục — có thể xóa ngay</span>
            </div>
            <div className="deepscan-summary-card caution">
              <span className="summary-badge caution">🟡 Cẩn thận</span>
              <span className="summary-size">{scanResult.caution_display}</span>
              <span className="summary-desc">{cautionItems.length} mục — kiểm tra trước khi xóa</span>
            </div>
            <div className="deepscan-summary-card protected">
              <span className="summary-badge protected">🔴 Bảo vệ</span>
              <span className="summary-size">{scanResult.protected_info_display}</span>
              <span className="summary-desc">{protectedItems.length} mục — KHÔNG xóa (Windows cốt lõi)</span>
            </div>
          </div>

          {/* Reclaimable banner */}
          {(scanResult.safe_bytes > 0 || scanResult.caution_bytes > 0) && (
            <div className="deepscan-reclaimable">
              <div>
                <div className="reclaimable-label">Tổng có thể giải phóng:</div>
                <div className="reclaimable-size">{scanResult.total_reclaimable_display}</div>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "right" }}>
                {safeItems.length} mục an toàn + {cautionItems.length} mục cần xem xét
              </div>
            </div>
          )}

          {/* Action bar */}
          <div className="deepscan-action-bar">
            <button className="deepscan-select-all-btn" onClick={selectAllSafe}>
              ✅ Chọn tất cả an toàn ({safeItems.length})
            </button>
            <button className="deepscan-select-all-btn" onClick={selectAllCaution}>
              ⚠️ Chọn tất cả cẩn thận ({cautionItems.length})
            </button>
            {selected.size > 0 && (
              <button className="deepscan-deselect-btn" onClick={deselectAll}>
                Bỏ chọn tất cả
              </button>
            )}
            <div className="deepscan-selected-info">
              {selected.size > 0 ? (
                <>
                  Đã chọn: <strong>{selected.size} mục</strong> —{" "}
                  <strong>{formatBytes(selectedSize)}</strong>
                </>
              ) : (
                "Chưa chọn mục nào"
              )}
            </div>
            <button
              className="deepscan-delete-btn"
              onClick={handleDeleteClick}
              disabled={selected.size === 0 || cleaning}
            >
              {cleaning ? (
                <>
                  <span
                    className="loading-spinner"
                    style={{ width: "13px", height: "13px", borderWidth: "2px" }}
                  />
                  Đang xóa...
                </>
              ) : (
                <>🗑️ Xóa đã chọn ({selected.size})</>
              )}
            </button>
          </div>

          {/* Section: Safe */}
          {safeItems.length > 0 && (
            <SectionPanel
              safetyLevel="safe"
              items={safeItems}
              selected={selected}
              onToggle={toggleItem}
              defaultOpen
            />
          )}

          {/* Section: Caution */}
          {cautionItems.length > 0 && (
            <SectionPanel
              safetyLevel="caution"
              items={cautionItems}
              selected={selected}
              onToggle={toggleItem}
              defaultOpen
            />
          )}

          {/* Section: Protected (info only) */}
          {protectedItems.length > 0 && (
            <SectionPanel
              safetyLevel="protected"
              items={protectedItems}
              selected={selected}
              onToggle={toggleItem}
              defaultOpen={false}
            />
          )}

          {items.length === 0 && (
            <div className="deepscan-empty">
              <span className="deepscan-empty-icon">✨</span>
              <span className="deepscan-empty-text">
                Không tìm thấy mục nào vượt ngưỡng kích thước.
                <br />
                Thử giảm bộ lọc cỡ tối thiểu hoặc bật thêm tùy chọn quét.
              </span>
            </div>
          )}
        </>
      )}

      {/* ── Clean results ─────────────────────────────────── */}
      {cleanResults && cleanResults.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--text-muted)",
              marginBottom: "0.5rem",
            }}
          >
            Kết quả dọn dẹp ({cleanResults.filter((r) => r.success).length}/
            {cleanResults.length} thành công):
          </div>
          <div className="deepclean-results">
            {cleanResults.map((r, i) => (
              <div
                key={i}
                className={`deepclean-result-item ${r.success ? "ok" : "fail"}`}
              >
                <span className="deepclean-result-msg">{r.success ? "✓" : "✕"}</span>
                <span className="deepclean-result-path">{r.path}</span>
                <span className="deepclean-result-msg" title={r.message}>
                  {r.success ? r.message : r.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty initial state ────────────────────────────── */}
      {!scanning && !scanResult && (
        <div className="deepscan-empty">
          <span className="deepscan-empty-icon">🔬</span>
          <span className="deepscan-empty-text">
            Nhấn{" "}
            <strong>Bắt đầu quét</strong> để phân tích ổ C:\ và nhận danh sách
            <br />
            những mục có thể xóa an toàn, phân biệt rõ ràng với file Windows.
          </span>
        </div>
      )}

      {/* ── Confirm modal ─────────────────────────────────── */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Xác nhận xóa</h3>
            <p>
              Sắp xóa <strong>{selected.size} mục</strong> (
              <strong>{formatBytes(selectedSize)}</strong>).
              <br />
              Hành động này <strong>không thể hoàn tác</strong>.
            </p>
            <ul className="deep-confirm-list">
              {[...selected].map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p
              style={{
                fontSize: "0.8rem",
                color: "#f59e0b",
                marginTop: "0.5rem",
                background: "rgba(245,158,11,0.08)",
                padding: "0.4rem 0.6rem",
                borderRadius: "0.35rem",
              }}
            >
              💡 Hệ thống sẽ kiểm tra lại lần cuối để đảm bảo không xóa nhầm file Windows.
            </p>
            <div className="modal-buttons">
              <button className="btn btn-cancel" onClick={() => setShowConfirm(false)}>
                Hủy bỏ
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                🗑️ Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
