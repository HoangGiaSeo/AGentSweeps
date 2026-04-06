import { useState } from "react";
import { deepScanDrive, deepCleanItems, getDiskOverview } from "../api";
import { formatSize } from "../constants";

export function useDeepScan({ addToast, onDiskRefresh }) {
  const [deepScanResult, setDeepScanResult] = useState(null);
  const [deepScanLoading, setDeepScanLoading] = useState(false);
  const [deepCleanResults, setDeepCleanResults] = useState(null);

  const handleDeepScan = async (options) => {
    setDeepScanLoading(true);
    setDeepCleanResults(null);
    try {
      const result = await deepScanDrive(options);
      setDeepScanResult(result);
      const safe = result.safe_display;
      const caution = result.caution_display;
      addToast(`Quét xong! 🟢 ${safe} an toàn | 🟡 ${caution} cẩn thận`, "success");
    } catch (e) {
      addToast("Lỗi quét sâu: " + e, "error");
    }
    setDeepScanLoading(false);
  };

  const handleDeepClean = async (paths) => {
    try {
      const results = await deepCleanItems(paths);
      setDeepCleanResults(results);
      const success = results.filter((r) => r.success).length;
      const freed = results.reduce((s, r) => s + r.size_freed, 0);
      addToast(
        `Xóa xong ${success}/${results.length} mục — Giải phóng ${formatSize(freed)}`,
        success === results.length ? "success" : "warning"
      );
      setDeepScanResult((prev) => {
        if (!prev) return prev;
        return { ...prev, items: prev.items.filter((i) => !paths.includes(i.path)) };
      });
      getDiskOverview().then(onDiskRefresh).catch(() => {});
    } catch (e) {
      addToast("Lỗi xóa: " + e, "error");
    }
  };

  return {
    deepScanResult,
    deepScanLoading,
    deepCleanResults,
    handleDeepScan,
    handleDeepClean,
  };
}
