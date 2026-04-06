export const TABS = [
  { id: "dashboard", label: "Tổng quan", icon: "📊" },
  { id: "cleanup", label: "Dọn dẹp", icon: "🧹" },
  { id: "chat", label: "Trò chuyện", icon: "💬" },
  { id: "history", label: "Lịch sử", icon: "📋" },
  { id: "settings", label: "Cài đặt", icon: "⚙️" },
];

export const MANUAL_ACTIONS = [
  { type: "npm_cache", label: "npm cache", category: "dev", desc: "Xóa cache npm packages" },
  { type: "pip_cache", label: "pip cache", category: "dev", desc: "Xóa cache Python packages" },
  { type: "cargo_cache", label: "Cargo cache", category: "dev", desc: "Xóa cache Rust packages" },
  { type: "gradle_cache", label: "Gradle cache", category: "dev", desc: "Xóa cache Java/Android builds" },
  { type: "vscode_cache", label: "VS Code cache", category: "dev", desc: "Xóa cache VS Code editor" },
  { type: "docker_prune", label: "Docker prune", category: "docker", desc: "Xóa images/containers/volumes không dùng" },
  { type: "temp_files", label: "Temp files", category: "system", desc: "Xóa file tạm Windows" },
  { type: "windows_temp", label: "Windows Temp", category: "system", desc: "Xóa C:\\Windows\\Temp" },
  { type: "prefetch", label: "Prefetch", category: "system", desc: "Xóa Windows Prefetch data" },
  { type: "windows_update", label: "Windows Update", category: "system", desc: "Xóa cache Windows Update downloads" },
  { type: "crash_dumps", label: "Crash Dumps", category: "system", desc: "Xóa crash dump files" },
  { type: "thumbnail_cache", label: "Thumbnails", category: "system", desc: "Xóa thumbnail cache" },
];

export const AI_PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "🟢",
    desc: "GPT-4o, GPT-4o-mini, GPT-3.5",
    url: "https://platform.openai.com/api-keys",
    urlLabel: "platform.openai.com",
    placeholder: "sk-...",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
    defaultModel: "gpt-4o-mini",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    icon: "🔵",
    desc: "Gemini 1.5 Flash (miễn phí), Gemini 2.0 Flash, Gemini 1.5 Pro",
    url: "https://aistudio.google.com/apikey",
    urlLabel: "aistudio.google.com",
    placeholder: "AIza...",
    models: ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.0-flash", "gemini-1.5-pro"],
    defaultModel: "gemini-1.5-flash",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: "🟠",
    desc: "Claude Sonnet, Claude Haiku",
    url: "https://console.anthropic.com/settings/keys",
    urlLabel: "console.anthropic.com (Anthropic)",
    placeholder: "sk-ant-...",
    models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"],
    defaultModel: "claude-sonnet-4-20250514",
  },
];

export const CHAT_SUGGESTIONS = [
  "Làm sao để giải phóng dung lượng ổ C nhanh nhất?",
  "Những folder nào an toàn để xóa trên Windows?",
  "Cách tắt ứng dụng khởi động cùng Windows?",
  "Máy tính chạy chậm, nên làm gì?",
  "Cách dọn cache trình duyệt Chrome?",
  "Docker chiếm nhiều dung lượng, xử lý thế nào?",
];

export function formatSize(bytes) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + " GB";
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + " KB";
  return bytes + " B";
}
