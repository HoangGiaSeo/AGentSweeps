<#
.SYNOPSIS
    Auto-installer for AGent Sweeps VS Code Extension
.DESCRIPTION
    Kiểm tra VS Code đã cài chưa, nếu chưa thì tải và cài, rồi cài extension.
    Chạy: iwr -useb https://raw.githubusercontent.com/HoangGiaSeo/AGentSweeps/main/install.ps1 | iex
#>

$ErrorActionPreference = "Stop"
$EXT_ID = "HoangGiaSeo.agent-sweeps"
$EXT_NAME = "AGent Sweeps"

Write-Host "`n  $EXT_NAME — Auto Installer`n" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

# --- Check VS Code ---
$code = Get-Command "code" -ErrorAction SilentlyContinue
if (-not $code) {
    Write-Host "  [!] VS Code chưa được cài hoặc chưa có trong PATH." -ForegroundColor Yellow
    Write-Host "      Đang mở trang tải VS Code..." -ForegroundColor Yellow
    Start-Process "https://code.visualstudio.com/Download"
    Write-Host ""
    Write-Host "  Sau khi cài xong, chạy lại lệnh này:" -ForegroundColor White
    Write-Host "  iwr -useb https://raw.githubusercontent.com/HoangGiaSeo/AGentSweeps/main/install.ps1 | iex" -ForegroundColor Cyan
    exit 1
}

Write-Host "  [✓] VS Code found: $($code.Source)" -ForegroundColor Green

# --- Install extension ---
Write-Host "  [→] Cài extension '$EXT_ID'..." -ForegroundColor White
try {
    & code --install-extension $EXT_ID --force 2>&1 | Out-Null
    Write-Host "  [✓] Cài đặt thành công!" -ForegroundColor Green
} catch {
    # Fallback: download .vsix từ GitHub Releases
    Write-Host "  [!] Marketplace fail, thử tải .vsix từ GitHub..." -ForegroundColor Yellow
    $release = Invoke-RestMethod "https://api.github.com/repos/HoangGiaSeo/AGentSweeps/releases/latest"
    $asset = $release.assets | Where-Object { $_.name -like "*.vsix" } | Select-Object -First 1
    if ($asset) {
        $vsixPath = "$env:TEMP\$($asset.name)"
        Invoke-WebRequest $asset.browser_download_url -OutFile $vsixPath
        & code --install-extension $vsixPath --force
        Remove-Item $vsixPath -Force
        Write-Host "  [✓] Cài từ .vsix thành công!" -ForegroundColor Green
    } else {
        Write-Host "  [✗] Không tìm thấy release. Vui lòng cài thủ công." -ForegroundColor Red
        Start-Process "https://marketplace.visualstudio.com/items?itemName=$EXT_ID"
        exit 1
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "  $EXT_NAME đã sẵn sàng! Mở VS Code và tìm icon 🗑️ trên thanh bên trái." -ForegroundColor Cyan
Write-Host ""
