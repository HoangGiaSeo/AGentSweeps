import { useState, useEffect } from "react";
import { getApiKeys, saveApiKey, removeApiKey, testApiKey } from "../api";

export function useApiKeys({ addToast }) {
  const [apiKeys, setApiKeys] = useState({});
  const [apiKeyInputs, setApiKeyInputs] = useState({});
  const [apiTestResults, setApiTestResults] = useState({});
  const [apiTesting, setApiTesting] = useState({});

  useEffect(() => {
    getApiKeys().then((keys) => setApiKeys(keys || {})).catch(() => {});
  }, []);

  const handleSaveApiKey = async (providerId) => {
    const key = (apiKeyInputs[providerId] || "").trim();
    if (!key) { addToast("Vui lòng nhập API Key", "warning"); return; }
    try {
      await saveApiKey(providerId, key, true);
      const updated = await getApiKeys();
      setApiKeys(updated || {});
      setApiKeyInputs((prev) => ({ ...prev, [providerId]: "" }));
      addToast(`Đã lưu API Key ${providerId}`, "success");
    } catch (e) { addToast("Lỗi lưu API Key: " + e, "error"); }
  };

  const handleRemoveApiKey = async (providerId) => {
    try {
      await removeApiKey(providerId);
      const updated = await getApiKeys();
      setApiKeys(updated || {});
      setApiTestResults((prev) => ({ ...prev, [providerId]: null }));
      addToast(`Đã xóa API Key ${providerId}`, "info");
    } catch (e) { addToast("Lỗi xóa API Key: " + e, "error"); }
  };

  const handleTestApiKey = async (providerId) => {
    const entry = apiKeys[providerId];
    if (!entry?.key) { addToast("Chưa có API Key để kiểm tra", "warning"); return; }
    setApiTesting((prev) => ({ ...prev, [providerId]: true }));
    try {
      const result = await testApiKey(providerId, entry.key);
      setApiTestResults((prev) => ({ ...prev, [providerId]: { ok: true, msg: result } }));
      addToast(result, "success");
    } catch (e) {
      setApiTestResults((prev) => ({ ...prev, [providerId]: { ok: false, msg: e } }));
      addToast(String(e), "error");
    }
    setApiTesting((prev) => ({ ...prev, [providerId]: false }));
  };

  const handleToggleApiKey = async (providerId, enabled) => {
    const entry = apiKeys[providerId];
    if (!entry?.key) return;
    try {
      await saveApiKey(providerId, entry.key, enabled);
      const updated = await getApiKeys();
      setApiKeys(updated || {});
    } catch (e) { addToast("Lỗi cập nhật: " + e, "error"); }
  };

  return {
    apiKeys,
    apiKeyInputs,
    setApiKeyInputs,
    apiTestResults,
    apiTesting,
    handleSaveApiKey,
    handleRemoveApiKey,
    handleTestApiKey,
    handleToggleApiKey,
  };
}
