# AGent Sweeps — AI Dev Disk Cleaner

[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/HoangGiaSeo.agent-sweeps?label=Marketplace&color=0078d4&style=flat-square)](https://marketplace.visualstudio.com/items?itemName=HoangGiaSeo.agent-sweeps)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/HoangGiaSeo.agent-sweeps?label=Installs&color=107c41&style=flat-square)](https://marketplace.visualstudio.com/items?itemName=HoangGiaSeo.agent-sweeps)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/HoangGiaSeo.agent-sweeps?label=Rating&color=6264a7&style=flat-square)](https://marketplace.visualstudio.com/items?itemName=HoangGiaSeo.agent-sweeps)
[![License](https://img.shields.io/github/license/HoangGiaSeo/AGentSweeps?style=flat-square)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/HoangGiaSeo/AGentSweeps?style=flat-square)](https://github.com/HoangGiaSeo/AGentSweeps/releases/latest)

**AI-powered disk cleaner cho developer** — dọn npm/pip/cargo/docker cache ngay trong VS Code sidebar. Hỗ trợ AI chat miễn phí với Ollama (local), OpenAI, Gemini, Anthropic.

---

## ⚡ Cài đặt — 7 cách, chọn 1

### Cách 1 · One-Click (Nhanh nhất)
> **[→ Click đây để cài ngay trong VS Code](vscode:extension/HoangGiaSeo.agent-sweeps)**

Hoặc mở trang landing page: **https://hoanggiaseo.github.io/AGentSweeps**

---

### Cách 2 · Windows PowerShell (1 dòng, tự động hoàn toàn)
```powershell
iwr -useb https://raw.githubusercontent.com/HoangGiaSeo/AGentSweeps/main/install.ps1 | iex
```
Script tự kiểm tra VS Code, tự tải nếu thiếu, tự cài extension.

---

### Cách 3 · Linux / macOS / WSL (1 dòng)
```bash
curl -fsSL https://raw.githubusercontent.com/HoangGiaSeo/AGentSweeps/main/install.sh | bash
```

---

### Cách 4 · VS Code CLI
```bash
code --install-extension HoangGiaSeo.agent-sweeps
```

---

### Cách 5 · VS Code Marketplace Search
`Ctrl+Shift+X` → tìm **AGent Sweeps** → Install

---

### Cách 6 · GitHub Codespaces / Dev Container
Extension tự động cài khi mở repo này trong Codespaces — không cần làm gì thêm.
```bash
gh codespace create --repo HoangGiaSeo/AGentSweeps
```

---

### Cách 7 · Cài từ file .vsix (Offline)
Tải `.vsix` tại [Releases](https://github.com/HoangGiaSeo/AGentSweeps/releases/latest) rồi:
```bash
code --install-extension agent-sweeps-0.2.0.vsix
```
Hoặc `Ctrl+Shift+P` → **Extensions: Install from VSIX**

---

## ✨ Tính năng

| Tab | Chức năng |
|-----|-----------|
| 📊 **Dashboard** | Tổng quan dung lượng tất cả ổ đĩa + trạng thái AI |
| 🧹 **Cleanup** | Quét smart/deep + dọn 12 loại cache + ước tính dung lượng |
| 💬 **Chat AI** | Chat với Ollama (miễn phí), OpenAI, Gemini, Anthropic |
| 📋 **History** | Log đầy đủ mọi thao tác dọn dẹp |
| ⚙️ **Settings** | Quản lý API keys cho các AI provider |

### 12 loại cache được hỗ trợ
`npm` · `pip` · `cargo` · `gradle` · `VS Code` · `Docker` · `temp files` · `Windows Temp` · `Prefetch` · `Windows Update` · `Crash Dumps` · `Thumbnail Cache`

### AI Providers
- 🟡 **Ollama**  (`gemma3:4b`, `llama3`, `mistral`...)
- 🟢 **OpenAI** — GPT-4o, GPT-4o-mini
- 🔵 **Google Gemini** — Gemini 2.0 Flash, 1.5 Pro
- 🟠 **Anthropic** — Claude Sonnet

---

## 🔧 Dùng Ollama miễn phí

```bash
# 1. Tải Ollama tại https://ollama.com
# 2. Khởi động server
ollama serve
# 3. Tải model (chỉ cần 1 lần, ~2.5GB)
ollama pull gemma3:4b
```

---

## 🚀 Phát triển

```bash
git clone https://github.com/HoangGiaSeo/AGentSweeps.git
cd AGentSweeps/agent-sweeps-vscode
npm install
npm run compile
# Nhấn F5 trong VS Code để chạy thử
```

### Release mới
```bash
# Từ thư mục gốc
node release.mjs patch   # 0.2.0 → 0.2.1
node release.mjs minor   # 0.2.0 → 0.3.0
node release.mjs major   # 0.2.0 → 1.0.0
```
Script tự bump version → commit → tag → push → GitHub Actions tự publish lên Marketplace.

---

## 📁 Cấu trúc

```
AGentSweeps/
├── agent-sweeps-vscode/     # VS Code Extension (TypeScript)
│   ├── src/
│   │   ├── commands/        # diskCommands, aiCommands, settingsCommands...
│   │   ├── webview/         # webviewContent.ts — toàn bộ UI
│   │   └── extension.ts     # entry point
│   └── media/icon.png
├── cleanup-agent/           # Tauri desktop app (nguồn gốc)
├── caidat/                  # File installer .msi
├── docs/                    # GitHub Pages landing page
├── install.ps1              # PowerShell auto-installer
├── install.sh               # Bash auto-installer
└── release.mjs              # Release automation script
```

---
## 📜 License

MIT © [HoangGiaSeo](https://github.com/HoangGiaSeo)
