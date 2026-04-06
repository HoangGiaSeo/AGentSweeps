#Requires -Version 5.1
<#
.SYNOPSIS
    AGent Sweeps — Full Setup (cài đồng thời VS Code + Extension + Ollama + Model AI)
    Chạy bằng cách double-click setup.bat, hoặc từ PowerShell:
    Set-ExecutionPolicy Bypass -Scope Process; .\setup.ps1
#>

$Host.UI.RawUI.WindowTitle = "AGent Sweeps — Full Auto Setup"
$ErrorActionPreference = "SilentlyContinue"

# =====================================================
# CẤU HÌNH
# =====================================================
$EXT_ID       = "HoangGiaSeo.agent-sweeps"
$EXT_NAME     = "AGent Sweeps"
$OLLAMA_MODEL = "gemma3:4b"
$VSCODE_URL   = "https://code.visualstudio.com/sha/download?build=stable&os=win32-x64-user"
$OLLAMA_URL   = "https://ollama.com/download/OllamaSetup.exe"
$TEMP_DIR     = "$env:TEMP\agent-sweeps-setup"
$LOG_FILE     = "$TEMP_DIR\setup.log"

# =====================================================
# HELPERS — Màu sắc, log
# =====================================================
function Write-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║                                                  ║" -ForegroundColor Cyan
    Write-Host "  ║        AGent Sweeps — Full Auto Setup            ║" -ForegroundColor Cyan
    Write-Host "  ║   VS Code  +  Extension  +  Ollama  +  AI       ║" -ForegroundColor Cyan
    Write-Host "  ║                                                  ║" -ForegroundColor Cyan
    Write-Host "  ╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step($n, $total, $msg) {
    Write-Host "  ┌─ Bước $n/$total " -ForegroundColor DarkCyan -NoNewline
    Write-Host "─────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "  │  $msg" -ForegroundColor White
    Write-Host "  └─────────────────────────────────────────────────" -ForegroundColor DarkGray
}
function Write-OK($msg)   { Write-Host "  [✓] $msg" -ForegroundColor Green }
function Write-Do($msg)   { Write-Host "  [→] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "  [!] $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "  [✗] $msg" -ForegroundColor Red }
function Write-Log($msg)  {
    $ts = Get-Date -Format "HH:mm:ss"
    Add-Content -Path $LOG_FILE -Value "[$ts] $msg" -ErrorAction SilentlyContinue
}

function Show-Progress($activity, $pct) {
    Write-Progress -Activity $activity -PercentComplete $pct -Status "$pct% hoàn thành"
}

function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
                [System.Environment]::GetEnvironmentVariable('Path','User')
}

function Test-OllamaRunning {
    try {
        $r = Invoke-WebRequest "http://localhost:11434" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        return ($r.StatusCode -eq 200)
    } catch { return $false }
}

function Download-File($url, $dest, $label) {
    Write-Do "Đang tải $label..."
    try {
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($url, $dest)
        return $true
    } catch {
        # Fallback: Invoke-WebRequest
        try {
            Invoke-WebRequest $url -OutFile $dest -UseBasicParsing -ErrorAction Stop
            return $true
        } catch {
            Write-Fail "Không tải được $label`: $_"
            Write-Log "FAIL download $label`: $_"
            return $false
        }
    }
}

# =====================================================
# INIT
# =====================================================
New-Item -ItemType Directory -Force -Path $TEMP_DIR | Out-Null
Write-Banner
Write-Log "=== AGent Sweeps Setup bắt đầu $(Get-Date) ==="

# Refresh PATH ngay từ đầu
Refresh-Path

# =====================================================
# PHÂN TÍCH — Kiểm tra trước khi cài
# =====================================================
Write-Host "  Đang kiểm tra hệ thống..." -ForegroundColor DarkGray
$hasVSCode  = [bool](Get-Command "code" -ErrorAction SilentlyContinue)
$hasOllama  = [bool](Get-Command "ollama" -ErrorAction SilentlyContinue)
$ollamaPath = @(
    "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe",
    "$env:ProgramFiles\Ollama\ollama.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $hasOllama -and $ollamaPath) {
    $env:Path += ";$(Split-Path $ollamaPath)"
    Refresh-Path
    $hasOllama = $true
}

$vscodePaths = @(
    "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd",
    "$env:ProgramFiles\Microsoft VS Code\bin\code.cmd"
)
if (-not $hasVSCode) {
    $vp = $vscodePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($vp) { $env:Path += ";$(Split-Path $vp)"; Refresh-Path; $hasVSCode = $true }
}

Write-Host ""
Write-Host "  Trạng thái hệ thống:" -ForegroundColor White
Write-Host "  ├ VS Code  : $(if ($hasVSCode) { '✓ Đã cài' } else { '✗ Chưa cài — sẽ tự động cài' })" -ForegroundColor $(if ($hasVSCode) { 'Green' } else { 'Yellow' })
Write-Host "  ├ Ollama   : $(if ($hasOllama) { '✓ Đã cài' } else { '✗ Chưa cài — sẽ tự động cài' })" -ForegroundColor $(if ($hasOllama) { 'Green' } else { 'Yellow' })
Write-Host "  └ Extension: sẽ cài/cập nhật từ Marketplace" -ForegroundColor Yellow
Write-Host ""

# Xác nhận tiếp tục
Write-Host "  Nhấn ENTER để bắt đầu cài tất cả, hoặc Ctrl+C để hủy..." -ForegroundColor White
Read-Host | Out-Null
Write-Host ""

# =====================================================
# SONG SONG: Tải VS Code + Ollama đồng thời
# =====================================================
$jobs = @()
$vsInstaller  = "$TEMP_DIR\VSCodeSetup.exe"
$olmInstaller = "$TEMP_DIR\OllamaSetup.exe"

if (-not $hasVSCode -or -not $hasOllama) {
    Write-Host "  ══════════════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host "  Đang tải song song (VS Code + Ollama cùng lúc)..." -ForegroundColor Cyan
    Write-Host "  ══════════════════════════════════════════════════" -ForegroundColor DarkGray
}

# Job tải VS Code (chạy nền)
if (-not $hasVSCode) {
    Write-Do "Bắt đầu tải VS Code (~90 MB) ở nền..."
    $vsJob = Start-Job -ScriptBlock {
        param($url, $dest)
        try {
            $wc = New-Object System.Net.WebClient
            $wc.DownloadFile($url, $dest)
            "OK"
        } catch {
            try {
                Invoke-WebRequest $url -OutFile $dest -UseBasicParsing
                "OK"
            } catch { "FAIL:$_" }
        }
    } -ArgumentList $VSCODE_URL, $vsInstaller
    $jobs += @{ Job = $vsJob; Name = "VS Code"; Path = $vsInstaller }
}

# Job tải Ollama (chạy nền)
if (-not $hasOllama) {
    Write-Do "Bắt đầu tải Ollama (~70 MB) ở nền..."
    $olmJob = Start-Job -ScriptBlock {
        param($url, $dest)
        try {
            $wc = New-Object System.Net.WebClient
            $wc.DownloadFile($url, $dest)
            "OK"
        } catch {
            try {
                Invoke-WebRequest $url -OutFile $dest -UseBasicParsing
                "OK"
            } catch { "FAIL:$_" }
        }
    } -ArgumentList $OLLAMA_URL, $olmInstaller
    $jobs += @{ Job = $olmJob; Name = "Ollama"; Path = $olmInstaller }
}

# Hiển thị progress trong khi đợi cả 2 tải xong
if ($jobs.Count -gt 0) {
    Write-Host ""
    $dots = 0
    while ($jobs | Where-Object { $_.Job.State -eq 'Running' }) {
        $done = ($jobs | Where-Object { $_.Job.State -ne 'Running' }).Count
        $total = $jobs.Count
        $pct = [int]([math]::Min(95, ($dots * 2)))
        Write-Progress -Activity "Đang tải phần mềm..." `
            -Status "  $done/$total hoàn thành  $('' + ('.' * ($dots % 4)))" `
            -PercentComplete $pct
        Start-Sleep -Milliseconds 500
        $dots++
    }
    Write-Progress -Activity "Đang tải phần mềm..." -Completed

    # Kiểm tra kết quả tải
    foreach ($j in $jobs) {
        $result = Receive-Job $j.Job
        Remove-Job $j.Job -Force
        if ($result -eq "OK" -and (Test-Path $j.Path)) {
            Write-OK "Tải $($j.Name) hoàn tất"
        } else {
            Write-Fail "Tải $($j.Name) thất bại: $result"
            Write-Log "FAIL tải $($j.Name): $result"
        }
    }
    Write-Host ""
}

# =====================================================
# BƯỚC 1: Cài VS Code (nếu cần)
# =====================================================
Write-Step 1 4 "Cài đặt VS Code"

if (-not $hasVSCode) {
    if (Test-Path $vsInstaller) {
        Write-Do "Đang cài VS Code (chế độ im lặng)..."
        $args = "/VERYSILENT /NORESTART /MERGETASKS=!runcode,addcontextmenufiles,addcontextmenufolders,associatewithfiles,addtopath"
        $proc = Start-Process $vsInstaller -ArgumentList $args -Wait -PassThru
        Remove-Item $vsInstaller -Force -ErrorAction SilentlyContinue

        # Refresh PATH
        Refresh-Path
        $vscodePaths | Where-Object { Test-Path $_ } | ForEach-Object {
            $env:Path += ";$(Split-Path $_)"
        }
        Refresh-Path

        if (Get-Command "code" -ErrorAction SilentlyContinue) {
            Write-OK "VS Code đã cài xong!"
            Write-Log "VS Code installed OK"
        } else {
            Write-Warn "VS Code đã cài nhưng cần khởi động lại terminal. Tiếp tục các bước khác..."
            Write-Log "VS Code installed but not in PATH yet"
        }
    } else {
        Write-Fail "File cài đặt VS Code không tìm thấy — cài thủ công tại https://code.visualstudio.com"
        Write-Log "VS Code installer not found"
    }
} else {
    Write-OK "VS Code đã có sẵn — bỏ qua"
}

# =====================================================
# BƯỚC 2: Cài Ollama (nếu cần, chạy song song với Extension)
# =====================================================
Write-Host ""
Write-Step 2 4 "Cài Ollama AI Engine"

$ollamaInstallJob = $null
if (-not $hasOllama) {
    if (Test-Path $olmInstaller) {
        Write-Do "Đang cài Ollama ngầm (song song với Extension)..."
        # Chạy cài Ollama ở background — không block bước cài Extension
        $ollamaInstallJob = Start-Job -ScriptBlock {
            param($installer)
            Start-Process $installer -ArgumentList "/VERYSILENT /NORESTART" -Wait
            "DONE"
        } -ArgumentList $olmInstaller
        Write-OK "Ollama đang cài ngầm ở nền..."
    } else {
        Write-Fail "File cài đặt Ollama không tìm thấy — cài thủ công tại https://ollama.com"
        Write-Log "Ollama installer not found"
    }
} else {
    Write-OK "Ollama đã có sẵn — bỏ qua"
}

# =====================================================
# BƯỚC 3: Cài AGent Sweeps Extension
# (Chạy trong khi Ollama đang cài ngầm ở background)
# =====================================================
Write-Host ""
Write-Step 3 4 "Cài AGent Sweeps Extension"

$codeCmd = Get-Command "code" -ErrorAction SilentlyContinue
if (-not $codeCmd) {
    # Thử tìm thêm trong các path phổ biến
    $vscodePaths | Where-Object { Test-Path $_ } | ForEach-Object {
        $env:Path += ";$(Split-Path $_)"; $env:Path += ";$(Split-Path $_ -Parent)"
    }
    Refresh-Path
    $codeCmd = Get-Command "code" -ErrorAction SilentlyContinue
}

if ($codeCmd) {
    Write-Do "Đang cài extension '$EXT_ID' từ Marketplace..."
    $extResult = & code --install-extension $EXT_ID --force 2>&1
    if ($LASTEXITCODE -eq 0 -or ($extResult -join '' -match 'successfully installed|already installed')) {
        Write-OK "AGent Sweeps extension đã cài!"
        Write-Log "Extension installed OK"
    } else {
        # Fallback .vsix từ GitHub
        Write-Warn "Marketplace chậm, thử tải .vsix từ GitHub Releases..."
        try {
            $releaseApi = "https://api.github.com/repos/HoangGiaSeo/AGentSweeps/releases/latest"
            $release    = Invoke-RestMethod $releaseApi -ErrorAction Stop
            $asset      = $release.assets | Where-Object { $_.name -like "*.vsix" } | Select-Object -First 1
            if ($asset) {
                $vsixPath = "$TEMP_DIR\agent-sweeps.vsix"
                Invoke-WebRequest $asset.browser_download_url -OutFile $vsixPath -UseBasicParsing
                & code --install-extension $vsixPath --force 2>&1 | Out-Null
                Remove-Item $vsixPath -Force -ErrorAction SilentlyContinue
                Write-OK "Cài từ .vsix thành công!"
                Write-Log "Extension installed from .vsix OK"
            } else {
                Write-Fail "Không tìm thấy .vsix trong Releases"
                Write-Warn "Mở VS Code → Ctrl+Shift+X → Tìm 'AGent Sweeps'"
            }
        } catch {
            Write-Fail "Lỗi cài extension: $_"
            Write-Log "Extension install FAIL: $_"
        }
    }
} else {
    Write-Warn "Không tìm thấy lệnh 'code' trong PATH."
    Write-Warn "Mở VS Code → Ctrl+Shift+X → Tìm 'AGent Sweeps' để cài thủ công."
    Write-Log "code command not found — skip extension install"
}

# =====================================================
# Chờ Ollama cài xong (nếu đang cài ngầm)
# =====================================================
if ($ollamaInstallJob) {
    Write-Host ""
    Write-Do "Đợi Ollama cài xong..."
    $dots = 0
    while ($ollamaInstallJob.State -eq 'Running') {
        Write-Progress -Activity "Đang cài Ollama..." -Status "Vui lòng đợi $('.' * ($dots % 4 + 1))" -PercentComplete ([math]::Min(90, $dots * 5))
        Start-Sleep -Milliseconds 800
        $dots++
    }
    Write-Progress -Activity "Đang cài Ollama..." -Completed
    $olmResult = Receive-Job $ollamaInstallJob
    Remove-Job $ollamaInstallJob -Force
    Remove-Item $olmInstaller -Force -ErrorAction SilentlyContinue

    # Refresh PATH để tìm ollama
    Refresh-Path
    $ollamaPaths = @(
        "$env:LOCALAPPDATA\Programs\Ollama",
        "$env:ProgramFiles\Ollama"
    )
    $ollamaPaths | Where-Object { Test-Path "$_\ollama.exe" } | ForEach-Object { $env:Path += ";$_" }
    Refresh-Path

    if (Get-Command "ollama" -ErrorAction SilentlyContinue) {
        Write-OK "Ollama đã cài xong!"
        Write-Log "Ollama installed OK"
    } else {
        Write-Warn "Ollama đã cài, cần khởi động lại máy để PATH cập nhật."
        Write-Log "Ollama installed but not in PATH yet"
    }
}

# =====================================================
# BƯỚC 4: Khởi động Ollama + Pull Model AI
# =====================================================
Write-Host ""
Write-Step 4 4 "Khởi động AI + Tải Model"

$ollamaCmd = Get-Command "ollama" -ErrorAction SilentlyContinue
if (-not $ollamaCmd) {
    # Thử tìm thêm
    $ollamaPaths = @(
        "$env:LOCALAPPDATA\Programs\Ollama",
        "$env:ProgramFiles\Ollama"
    )
    $ollamaPaths | Where-Object { Test-Path "$_\ollama.exe" } | ForEach-Object { $env:Path += ";$_" }
    Refresh-Path
    $ollamaCmd = Get-Command "ollama" -ErrorAction SilentlyContinue
}

if ($ollamaCmd) {
    # Kiểm tra server đã chạy chưa
    if (-not (Test-OllamaRunning)) {
        Write-Do "Khởi động Ollama server..."
        Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
        $waited = 0
        while (-not (Test-OllamaRunning) -and $waited -lt 20) {
            Start-Sleep -Milliseconds 500; $waited++
            Write-Progress -Activity "Đang khởi động Ollama server..." -PercentComplete ([math]::Min(95, $waited * 5))
        }
        Write-Progress -Activity "Đang khởi động Ollama server..." -Completed
        if (Test-OllamaRunning) {
            Write-OK "Ollama server đang chạy tại http://localhost:11434"
            Write-Log "Ollama server started OK"
        } else {
            Write-Warn "Ollama server chưa phản hồi — thử chạy thủ công: ollama serve"
            Write-Log "Ollama server did not respond in time"
        }
    } else {
        Write-OK "Ollama server đang chạy"
    }

    # Kiểm tra model đã có chưa
    $modelList = & ollama list 2>&1
    if (($modelList | Out-String) -match ($OLLAMA_MODEL -replace ':', '.*')) {
        Write-OK "Model '$OLLAMA_MODEL' đã có sẵn — bỏ qua tải."
        Write-Log "Model $OLLAMA_MODEL already present"
    } else {
        Write-Do "Đang tải model '$OLLAMA_MODEL' (~2.5 GB)..."
        Write-Host "  Tiến trình tải hiển thị bên dưới:" -ForegroundColor DarkGray
        Write-Host ""
        & ollama pull $OLLAMA_MODEL
        if ($LASTEXITCODE -eq 0) {
            Write-OK "Model '$OLLAMA_MODEL' đã tải xong!"
            Write-Log "Model $OLLAMA_MODEL pulled OK"
        } else {
            Write-Warn "Tải model thất bại. Chạy thủ công: ollama pull $OLLAMA_MODEL"
            Write-Log "Model pull FAIL exit=$LASTEXITCODE"
        }
    }
} else {
    Write-Warn "Ollama chưa sẵn trong PATH."
    Write-Warn "Khởi động lại máy rồi chạy: ollama pull $OLLAMA_MODEL"
    Write-Log "ollama command not found after install"
}

# =====================================================
# DỌN DẸP
# =====================================================
Remove-Item "$TEMP_DIR\*.exe" -Force -ErrorAction SilentlyContinue

# =====================================================
# TỔNG KẾT
# =====================================================
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║          Cài đặt hoàn tất!                      ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Refresh-Path
$status_vscode  = if (Get-Command "code"   -ErrorAction SilentlyContinue) { "✓ Đã cài" } else { "! Cần khởi động lại" }
$status_ollama  = if (Get-Command "ollama" -ErrorAction SilentlyContinue) { "✓ Đã cài" } else { "! Cần khởi động lại" }
$status_server  = if (Test-OllamaRunning)                                  { "✓ Đang chạy" }  else { "- Chưa chạy" }

Write-Host "  Tóm tắt kết quả:" -ForegroundColor White
Write-Host "  ├ VS Code     : $status_vscode"  -ForegroundColor $(if ($status_vscode  -match '✓') { 'Green' } else { 'Yellow' })
Write-Host "  ├ Extension   : ✓ AGent Sweeps $EXT_ID" -ForegroundColor Green
Write-Host "  ├ Ollama      : $status_ollama"  -ForegroundColor $(if ($status_ollama  -match '✓') { 'Green' } else { 'Yellow' })
Write-Host "  └ AI Server   : $status_server"  -ForegroundColor $(if ($status_server  -match '✓') { 'Green' } else { 'DarkGray' })
Write-Host ""
Write-Host "  Bước tiếp theo:" -ForegroundColor White
Write-Host "  1. Mở VS Code" -ForegroundColor Gray
Write-Host "  2. Tìm icon 🗑️ (AGent Sweeps) trên thanh bên trái" -ForegroundColor Gray
Write-Host "  3. Chat AI miễn phí với Ollama ngay!" -ForegroundColor Gray
Write-Host ""
Write-Host "  Log cài đặt: $LOG_FILE" -ForegroundColor DarkGray
Write-Host ""
Write-Log "=== Setup hoàn tất $(Get-Date) ==="
