<#
.SYNOPSIS
    Auto-installer for AGent Sweeps VS Code Extension + Ollama AI
.DESCRIPTION
    Tự động cài: VS Code (nếu thiếu) + AGent Sweeps extension + Ollama + model gemma3:4b
    Chạy: iwr -useb https://raw.githubusercontent.com/HoangGiaSeo/AGentSweeps/main/install.ps1 | iex
#>

$ErrorActionPreference = "SilentlyContinue"
$EXT_ID    = "HoangGiaSeo.agent-sweeps"
$EXT_NAME  = "AGent Sweeps"
$OLLAMA_MODEL = "gemma3:4b"
$OLLAMA_URL   = "https://ollama.com/download/OllamaSetup.exe"

function Write-Step($msg)  { Write-Host "  [→] $msg" -ForegroundColor White }
function Write-OK($msg)    { Write-Host "  [✓] $msg" -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "  [!] $msg" -ForegroundColor Yellow }
function Write-Fail($msg)  { Write-Host "  [✗] $msg" -ForegroundColor Red }
function Write-Title($msg) { Write-Host "`n$msg" -ForegroundColor Cyan }

Write-Title "  ╔══════════════════════════════════════╗"
Write-Title "  ║   $EXT_NAME — Full Auto Installer     ║"
Write-Title "  ╚══════════════════════════════════════╝"
Write-Host "  Sẽ cài: VS Code  ➜  AGent Sweeps  ➜  Ollama  ➜  Model AI" -ForegroundColor DarkGray
Write-Host ""

# ═══════════════════════════════════════
# BƯỚC 1: Kiểm tra / Cài VS Code
# ═══════════════════════════════════════
Write-Host "  ─── Bước 1/4: VS Code ─────────────────" -ForegroundColor DarkGray

# Refresh PATH từ registry (đề phòng vừa cài xong chưa có trong PATH)
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
            [System.Environment]::GetEnvironmentVariable('Path','User')

$code = Get-Command "code" -ErrorAction SilentlyContinue
if ($code) {
    Write-OK "VS Code đã cài: $($code.Source)"
} else {
    Write-Step "VS Code chưa có — đang tải bộ cài đặt..."
    $vsInstaller = "$env:TEMP\VSCodeSetup.exe"
    $vsUrl = "https://code.visualstudio.com/sha/download?build=stable&os=win32-x64-user"
    try {
        Invoke-WebRequest $vsUrl -OutFile $vsInstaller -UseBasicParsing
        Write-Step "Đang cài VS Code (chế độ im lặng)..."
        Start-Process $vsInstaller -ArgumentList "/VERYSILENT /NORESTART /MERGETASKS=!runcode,addcontextmenufiles,addcontextmenufolders,associatewithfiles,addtopath" -Wait
        Remove-Item $vsInstaller -Force -ErrorAction SilentlyContinue
        # Refresh PATH sau khi cài
        $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
                    [System.Environment]::GetEnvironmentVariable('Path','User')
        $code = Get-Command "code" -ErrorAction SilentlyContinue
        if ($code) { Write-OK "VS Code đã cài xong!" }
        else {
            Write-Warn "VS Code đã cài nhưng cần khởi động lại terminal. Mở terminal mới và chạy lại script."
            # Try common install paths
            $codePaths = @(
                "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd",
                "$env:ProgramFiles\Microsoft VS Code\bin\code.cmd"
            )
            $codePath = $codePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
            if ($codePath) { $env:Path += ";$(Split-Path $codePath)"; $code = Get-Command "code" -ErrorAction SilentlyContinue }
        }
    } catch {
        Write-Fail "Không tải được VS Code. Cài thủ công tại https://code.visualstudio.com"
        Start-Process "https://code.visualstudio.com/Download"
        exit 1
    }
}

# ═══════════════════════════════════════
# BƯỚC 2: Cài AGent Sweeps Extension
# ═══════════════════════════════════════
Write-Host ""
Write-Host "  ─── Bước 2/4: AGent Sweeps Extension ──" -ForegroundColor DarkGray

if ($code) {
    Write-Step "Cài extension từ Marketplace..."
    $result = & code --install-extension $EXT_ID --force 2>&1
    if ($LASTEXITCODE -eq 0 -or ($result -match "successfully installed")) {
        Write-OK "AGent Sweeps extension đã cài!"
    } else {
        Write-Warn "Marketplace không phản hồi, thử tải .vsix từ GitHub Releases..."
        try {
            $release = Invoke-RestMethod "https://api.github.com/repos/HoangGiaSeo/AGentSweeps/releases/latest" -ErrorAction Stop
            $asset = $release.assets | Where-Object { $_.name -like "*.vsix" } | Select-Object -First 1
            if ($asset) {
                $vsixPath = "$env:TEMP\$($asset.name)"
                Invoke-WebRequest $asset.browser_download_url -OutFile $vsixPath -UseBasicParsing
                & code --install-extension $vsixPath --force 2>&1 | Out-Null
                Remove-Item $vsixPath -Force -ErrorAction SilentlyContinue
                Write-OK "Cài từ .vsix thành công!"
            } else {
                Write-Fail "Không có release .vsix — cài thủ công sau tại Marketplace"
            }
        } catch {
            Write-Fail "Không cài được extension. Thử lại sau."
        }
    }
} else {
    Write-Warn "Bỏ qua cài extension — VS Code chưa sẵn trong PATH. Mở VS Code và tìm 'AGent Sweeps' trong Extensions."
}

# ═══════════════════════════════════════
# BƯỚC 3: Kiểm tra / Cài Ollama
# ═══════════════════════════════════════
Write-Host ""
Write-Host "  ─── Bước 3/4: Ollama AI Engine ────────" -ForegroundColor DarkGray

$ollama = Get-Command "ollama" -ErrorAction SilentlyContinue
if ($ollama) {
    Write-OK "Ollama đã cài: $($ollama.Source)"
} else {
    Write-Step "Đang tải Ollama ($OLLAMA_URL)..."
    $ollamaInstaller = "$env:TEMP\OllamaSetup.exe"
    try {
        Invoke-WebRequest $OLLAMA_URL -OutFile $ollamaInstaller -UseBasicParsing
        Write-Step "Đang cài Ollama (chế độ im lặng)... (~1 phút)"
        Start-Process $ollamaInstaller -ArgumentList "/VERYSILENT /NORESTART" -Wait
        Remove-Item $ollamaInstaller -Force -ErrorAction SilentlyContinue

        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
                    [System.Environment]::GetEnvironmentVariable('Path','User')
        $ollama = Get-Command "ollama" -ErrorAction SilentlyContinue

        if (-not $ollama) {
            # Tìm trong đường dẫn mặc định
            $ollamaDefault = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
            if (Test-Path $ollamaDefault) {
                $env:Path += ";$env:LOCALAPPDATA\Programs\Ollama"
                $ollama = Get-Command "ollama" -ErrorAction SilentlyContinue
            }
        }

        if ($ollama) { Write-OK "Ollama đã cài xong!" }
        else { Write-Warn "Ollama đã cài nhưng cần khởi động lại máy để PATH cập nhật." }
    } catch {
        Write-Fail "Không tải được Ollama. Cài thủ công tại https://ollama.com"
        Start-Process "https://ollama.com/download"
    }
}

# ═══════════════════════════════════════
# BƯỚC 4: Khởi động Ollama + Pull Model
# ═══════════════════════════════════════
Write-Host ""
Write-Host "  ─── Bước 4/4: Khởi động AI + Tải Model " -ForegroundColor DarkGray

$ollama = Get-Command "ollama" -ErrorAction SilentlyContinue
if ($ollama) {
    # Kiểm tra Ollama server đã chạy chưa
    $running = $false
    try {
        $resp = Invoke-WebRequest "http://localhost:11434" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        $running = ($resp.StatusCode -eq 200)
    } catch { $running = $false }

    if (-not $running) {
        Write-Step "Khởi động Ollama server..."
        Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 4
        # Kiểm tra lại
        try {
            $resp = Invoke-WebRequest "http://localhost:11434" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
            if ($resp.StatusCode -eq 200) { Write-OK "Ollama server đang chạy tại http://localhost:11434" }
        } catch { Write-Warn "Ollama server chưa phản hồi — có thể cần vài giây thêm." }
    } else {
        Write-OK "Ollama server đang chạy tại http://localhost:11434"
    }

    # Kiểm tra model đã có chưa
    $modelList = & ollama list 2>&1
    if ($modelList -match $OLLAMA_MODEL.Replace(":",".*")) {
        Write-OK "Model '$OLLAMA_MODEL' đã có sẵn — bỏ qua tải."
    } else {
        Write-Step "Đang tải model '$OLLAMA_MODEL' (~2.5 GB, vui lòng chờ)..."
        Write-Host "  Tiến trình tải sẽ hiển thị bên dưới:" -ForegroundColor DarkGray
        & ollama pull $OLLAMA_MODEL
        if ($LASTEXITCODE -eq 0) { Write-OK "Model '$OLLAMA_MODEL' đã tải xong!" }
        else { Write-Warn "Tải model thất bại. Chạy thủ công: ollama pull $OLLAMA_MODEL" }
    }
} else {
    Write-Warn "Bỏ qua Ollama — chưa tìm thấy lệnh 'ollama'. Cài thủ công: https://ollama.com"
    Write-Warn "Sau khi cài, chạy: ollama pull $OLLAMA_MODEL"
}

# ═══════════════════════════════════════
# TỔNG KẾT
# ═══════════════════════════════════════
Write-Host ""
Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-OK "Cài đặt hoàn tất!"
Write-Host ""
Write-Host "  Bước tiếp theo:" -ForegroundColor White
Write-Host "  1. Mở VS Code" -ForegroundColor Gray
Write-Host "  2. Tìm icon 🗑️ (AGent Sweeps) trên thanh bên trái" -ForegroundColor Gray
Write-Host "  3. Chat AI miễn phí với Ollama ngay — không cần API key!" -ForegroundColor Gray
Write-Host ""
Write-Host "  Marketplace : https://marketplace.visualstudio.com/items?itemName=$EXT_ID" -ForegroundColor DarkGray
Write-Host "  GitHub      : https://github.com/HoangGiaSeo/AGentSweeps" -ForegroundColor DarkGray
Write-Host ""
