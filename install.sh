#!/usr/bin/env bash
# AGent Sweeps — Auto Installer (Linux / macOS / WSL)
# Chạy: curl -fsSL https://raw.githubusercontent.com/HoangGiaSeo/AGentSweeps/main/install.sh | bash

set -e

EXT_ID="HoangGiaSeo.agent-sweeps"
EXT_NAME="AGent Sweeps"
REPO="HoangGiaSeo/AGentSweeps"

echo ""
echo "  $EXT_NAME — Auto Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# --- Detect code binary ---
CODE_BIN=""
for b in code code-insiders codium; do
  if command -v "$b" &>/dev/null; then
    CODE_BIN="$b"
    break
  fi
done

if [ -z "$CODE_BIN" ]; then
  echo "  [!] VS Code không tìm thấy. Tải tại https://code.visualstudio.com/Download"
  # Open browser if possible
  if command -v xdg-open &>/dev/null; then xdg-open "https://code.visualstudio.com/Download"
  elif command -v open &>/dev/null; then open "https://code.visualstudio.com/Download"; fi
  exit 1
fi

echo "  [✓] Tìm thấy: $CODE_BIN"

# --- Try Marketplace first ---
if $CODE_BIN --install-extension "$EXT_ID" --force 2>/dev/null; then
  echo "  [✓] Cài từ Marketplace thành công!"
else
  echo "  [→] Marketplace fail, thử tải .vsix từ GitHub Releases..."

  if ! command -v curl &>/dev/null && ! command -v wget &>/dev/null; then
    echo "  [✗] Cần cài curl hoặc wget. Vui lòng cài thủ công: https://marketplace.visualstudio.com/items?itemName=$EXT_ID"
    exit 1
  fi

  # Get latest release asset URL
  API="https://api.github.com/repos/$REPO/releases/latest"
  if command -v curl &>/dev/null; then
    VSIX_URL=$(curl -fsSL "$API" | grep '"browser_download_url"' | grep '\.vsix' | cut -d'"' -f4 | head -1)
    VSIX_FILE="/tmp/agent-sweeps.vsix"
    curl -fsSL -o "$VSIX_FILE" "$VSIX_URL"
  else
    VSIX_URL=$(wget -qO- "$API" | grep '"browser_download_url"' | grep '\.vsix' | cut -d'"' -f4 | head -1)
    VSIX_FILE="/tmp/agent-sweeps.vsix"
    wget -q -O "$VSIX_FILE" "$VSIX_URL"
  fi

  $CODE_BIN --install-extension "$VSIX_FILE" --force
  rm -f "$VSIX_FILE"
  echo "  [✓] Cài từ .vsix thành công!"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  $EXT_NAME đã sẵn sàng! Mở VS Code và tìm icon 🗑️ trên thanh bên trái."
echo ""
