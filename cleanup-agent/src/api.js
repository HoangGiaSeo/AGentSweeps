import { invoke } from "@tauri-apps/api/core";

export const getDiskOverview = () => invoke("get_disk_overview");

export const scanDisk = (mode = "smart") => invoke("scan_disk", { mode });

export const runCleanup = (actions) => invoke("run_cleanup", { actions });

export const askAI = (prompt) => invoke("ask_ai", { prompt });

export const chatAI = (messages, model = "llama3") =>
  invoke("chat_ai", { messages, model });

export const smartCleanup = (data) => invoke("smart_cleanup", { data });

export const checkOllama = () => invoke("check_ollama");

export const getCleanupLog = () => invoke("get_cleanup_log");

export const clearCleanupLog = () => invoke("clear_cleanup_log");

export const getApiKeys = () => invoke("get_api_keys");

export const saveApiKey = (provider, key, enabled) =>
  invoke("save_api_key", { provider, key, enabled });

export const removeApiKey = (provider) => invoke("remove_api_key", { provider });

export const testApiKey = (provider, key) =>
  invoke("test_api_key", { provider, key });

export const chatExternal = (provider, key, messages, model) =>
  invoke("chat_external", { provider, key, messages, model });

export const getSchedule = () => invoke("get_schedule");

export const saveSchedule = (config) => invoke("save_schedule", { config });

export const checkAndRunSchedule = () => invoke("check_and_run_schedule");

export const zipBackup = (actionTypes) => invoke("zip_backup", { actionTypes });

export const estimateCleanupSize = (actionTypes) =>
  invoke("estimate_cleanup_size", { actionTypes });

export const checkOllamaSetup = () => invoke("check_ollama_setup");
export const ensureOllamaRunning = () => invoke("ensure_ollama_running");
export const startModelPull = (model) => invoke("start_model_pull", { model });
export const checkFirstRun = () => invoke("check_first_run");
export const completeSetup = () => invoke("complete_setup");

export const deepScanDrive = (options) => invoke("deep_scan_drive", { options });
export const deepCleanItems = (paths) => invoke("deep_clean_items", { paths });
