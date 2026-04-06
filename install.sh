#!/usr/bin/env bash
# AGent Sweeps — Full Auto Installer (Linux / macOS / WSL)
# Cài: VS Code + AGent Sweeps extension + Ollama + model gemma3:4b
# Chạy: curl -fsSL https://raw.githubusercontent.com/HoangGiaSeo/AGentSweeps/main/install.sh | bash

set -euo pipefail

EXT_ID="HoangGiaSeo.agent-sweeps"
EXT_NAME="AGent Sweeps"
REPO="HoangGiaSeo/AGentSweeps"
OLLAMA_MODEL="gemma3:4b"

GREEN="\033[0;32m"; YELLOW="\033[1;33m"; RED="\033[0;31m"; CYAN="\033[0;36m"; GRAY="\033[0;90m"; NC="\033[0m"
ok()   { echo -e "  ${GREEN}[✓]${NC} $*"; }
step() { echo -e "  ${CYAN}[→]${NC} $*"; }
warn() { echo -e "  ${YELLOW}[!]${NC} $*"; }
fail() { echo -e "  ${RED}[✗]${NC} $*"; }

echo ""
echo -e "  ${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "  ${CYAN}║   $EXT_NAME — Full Auto Installer     ║${NC}"
echo -e "  ${CYAN}╚══════════════════════════════════════╝${NC}"
echo -e "  ${GRAY}Sẽ cài: VS Code  ➜  AGent Sweeps  ➜  Ollama  ➜  Model AI${NC}"
echo ""

OS="$(uname -s)"
ARCH="$(uname -m)"

# ═══════════════════════════════════════
# BƯỚC 1: Kiểm tra / Cài VS Code
# ═══════════════════════════════════════
echo -e "  ${GRAY}─── Bước 1/4: VS Code ─────────────────${NC}"

CODE_BIN=""
for b in code code-insiders codium; do
  if command -v "$b" &>/dev/null; then CODE_BIN="$b"; break; fi
done

if [ -n "$CODE_BIN" ]; then
  ok "VS Code tìm thấy: $CODE_BIN"
else
  warn "VS Code chưa cài — đang cài tự động..."
  if [ "$OS" = "Darwin" ]; then
    # macOS — dùng brew nếu có, không thì hướng dẫn
    if command -v brew &>/dev/null; then
      step "Cài qua Homebrew..."
      brew install --cask visual-studio-code
      CODE_BIN="code"
      ok "VS Code đã cài qua brew!"
    else
      warn "Cài Homebrew trước: /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
      warn "Sau đó: brew install --cask visual-studio-code && chạy lại script này"
    fi
  elif [ "$OS" = "Linux" ]; then
    # Detect distro
    if command -v apt-get &>/dev/null; then
      step "Cài qua apt (Ubuntu/Debian)..."
      curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | sudo gpg --dearmor -o /usr/share/keyrings/microsoft-archive-keyring.gpg
      echo "deb [arch=amd64,arm64,armhf signed-by=/usr/share/keyrings/microsoft-archive-keyring.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list > /dev/null
      sudo apt-get update -q
      sudo apt-get install -y code
      CODE_BIN="code"
      ok "VS Code đã cài!"
    elif command -v dnf &>/dev/null; then
      step "Cài qua dnf (Fedora/RHEL)..."
      sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc
      sudo sh -c 'echo -e "[code]\nname=Visual Studio Code\nbaseurl=https://packages.microsoft.com/yumrepos/vscode\nenabled=1\ngpgcheck=1\ngpgkey=https://packages.microsoft.com/keys/microsoft.asc" > /etc/yum.repos.d/vscode.repo'
      sudo dnf install -y code
      CODE_BIN="code"
      ok "VS Code đã cài!"
    else
      warn "Distro không nhận dạng được. Tải VS Code tại https://code.visualstudio.com/Download"
    fi
  else
    # WSL — hướng dẫn cài trên Windows host
    warn "Trong WSL: cài VS Code trên Windows host tại https://code.visualstudio.com/Download"
    warn "VS Code Windows tự tích hợp với WSL qua Remote extension."
  fi
fi

# ═══════════════════════════════════════
# BƯỚC 2: Cài AGent Sweeps Extension
# ═══════════════════════════════════════
echo ""
echo -e "  ${GRAY}─── Bước 2/4: AGent Sweeps Extension ──${NC}"

if [ -n "$CODE_BIN" ]; then
  step "Cài extension từ Marketplace..."
  if $CODE_BIN --install-extension "$EXT_ID" --force 2>/dev/null; then
    ok "AGent Sweeps extension đã cài!"
  else
    warn "Marketplace không phản hồi, thử tải .vsix từ GitHub Releases..."
    DL_CMD=""
    if command -v curl &>/dev/null; then DL_CMD="curl"
    elif command -v wget &>/dev/null; then DL_CMD="wget"; fi

    if [ -n "$DL_CMD" ]; then
      API="https://api.github.com/repos/$REPO/releases/latest"
      if [ "$DL_CMD" = "curl" ]; then
        VSIX_URL=$(curl -fsSL "$API" | grep '"browser_download_url"' | grep '\.vsix' | cut -d'"' -f4 | head -1)
        curl -fsSL -o /tmp/agent-sweeps.vsix "$VSIX_URL"
      else
        VSIX_URL=$(wget -qO- "$API" | grep '"browser_download_url"' | grep '\.vsix' | cut -d'"' -f4 | head -1)
        wget -q -O /tmp/agent-sweeps.vsix "$VSIX_URL"
      fi
      $CODE_BIN --install-extension /tmp/agent-sweeps.vsix --force
      rm -f /tmp/agent-sweeps.vsix
      ok "Cài từ .vsix thành công!"
    else
      fail "Cần cài curl hoặc wget để tải .vsix"
    fi
  fi
else
  warn "Bỏ qua — VS Code chưa sẵn trong PATH."
fi

# ═══════════════════════════════════════
# BƯỚC 3: Kiểm tra / Cài Ollama
# ═══════════════════════════════════════
echo ""
echo -e "  ${GRAY}─── Bước 3/4: Ollama AI Engine ────────${NC}"

if command -v ollama &>/dev/null; then
  ok "Ollama đã cài: $(ollama --version 2>/dev/null || echo 'đã có')"
else
  step "Đang tải và cài Ollama..."
  if [ "$OS" = "Darwin" ] || [ "$OS" = "Linux" ]; then
    curl -fsSL https://ollama.com/install.sh | sh
    ok "Ollama đã cài xong!"
  else
    warn "WSL: cài Ollama trên Windows host tại https://ollama.com/download"
    warn "Hoặc chạy: curl -fsSL https://ollama.com/install.sh | sh (Linux mode trong WSL)"
  fi
fi

# ═══════════════════════════════════════
# BƯỚC 4: Khởi động Ollama + Pull Model
# ═══════════════════════════════════════
echo ""
echo -e "  ${GRAY}─── Bước 4/4: Khởi động AI + Tải Model ${NC}"

if command -v ollama &>/dev/null; then
  # Kiểm tra server đã chạy chưa
  OLLAMA_RUNNING=false
  if curl -fsSL http://localhost:11434 &>/dev/null 2>&1; then
    OLLAMA_RUNNING=true
  fi

  if [ "$OLLAMA_RUNNING" = false ]; then
    step "Khởi động Ollama server nền..."
    nohup ollama serve > /tmp/ollama.log 2>&1 &
    OLLAMA_PID=$!
    sleep 4
    if curl -fsSL http://localhost:11434 &>/dev/null 2>&1; then
      ok "Ollama server đang chạy (PID $OLLAMA_PID) tại http://localhost:11434"
    else
      warn "Server chưa phản hồi — chạy thủ công: ollama serve"
    fi
  else
    ok "Ollama server đang chạy tại http://localhost:11434"
  fi

  # Kiểm tra model
  if ollama list 2>/dev/null | grep -q "${OLLAMA_MODEL%%:*}"; then
    ok "Model '$OLLAMA_MODEL' đã có sẵn."
  else
    step "Đang tải model '$OLLAMA_MODEL' (~2.5 GB)..."
    step "Tiến trình tải:"
    if ollama pull "$OLLAMA_MODEL"; then
      ok "Model '$OLLAMA_MODEL' đã tải xong!"
    else
      warn "Tải model thất bại. Chạy thủ công: ollama pull $OLLAMA_MODEL"
    fi
  fi
else
  warn "Bỏ qua — Ollama chưa cài."
  warn "Sau khi cài: ollama serve && ollama pull $OLLAMA_MODEL"
fi

# ═══════════════════════════════════════
# TỔNG KẾT
# ═══════════════════════════════════════
echo ""
echo -e "  ${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
ok "Cài đặt hoàn tất!"
echo ""
echo -e "  ${NC}Bước tiếp theo:"
echo -e "  ${GRAY}1. Mở VS Code${NC}"
echo -e "  ${GRAY}2. Tìm icon 🗑️ (AGent Sweeps) trên thanh bên trái${NC}"
echo -e "  ${GRAY}3. Chat AI miễn phí với Ollama — không cần API key!${NC}"
echo ""
echo -e "  ${GRAY}Marketplace : https://marketplace.visualstudio.com/items?itemName=$EXT_ID${NC}"
echo -e "  ${GRAY}GitHub      : https://github.com/$REPO${NC}"
echo ""
