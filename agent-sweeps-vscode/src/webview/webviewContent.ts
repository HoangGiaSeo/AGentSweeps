import * as vscode from "vscode";

export function getWebviewContent(webview: vscode.Webview, _extensionUri: vscode.Uri): string {
  const nonce = getNonce();
  const csp = `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';`;

  return /* html */ `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>AGent Sweeps</title>
<style>
  :root {
    --bg: var(--vscode-editor-background);
    --fg: var(--vscode-editor-foreground);
    --border: var(--vscode-panel-border);
    --btn-bg: var(--vscode-button-background);
    --btn-fg: var(--vscode-button-foreground);
    --btn-hover: var(--vscode-button-hoverBackground);
    --input-bg: var(--vscode-input-background);
    --input-fg: var(--vscode-input-foreground);
    --input-border: var(--vscode-input-border);
    --card-bg: var(--vscode-editorWidget-background);
    --green: #4caf50; --yellow: #ff9800; --red: #f44336;
    --accent: var(--vscode-focusBorder);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--vscode-font-family); font-size: 13px; color: var(--fg); background: var(--bg); overflow-x: hidden; }
  .sidebar { display: flex; flex-direction: column; height: 100vh; }
  .nav { display: flex; border-bottom: 1px solid var(--border); overflow-x: auto; }
  .nav-btn { flex: 1; min-width: 60px; padding: 8px 4px; background: none; border: none; color: var(--fg); cursor: pointer; font-size: 11px; text-align: center; border-bottom: 2px solid transparent; opacity: 0.7; transition: all .15s; white-space: nowrap; }
  .nav-btn.active { opacity: 1; border-bottom-color: var(--accent); color: var(--accent); }
  .nav-btn:hover { opacity: 1; background: var(--card-bg); }
  .content { flex: 1; overflow-y: auto; padding: 12px; }
  .page { display: none; } .page.active { display: block; }
  .page-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
  .section { margin-bottom: 16px; }
  .section-title { font-size: 12px; font-weight: 600; opacity: 0.7; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid var(--border); }
  .btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; background: var(--btn-bg); color: var(--btn-fg); border: none; border-radius: 3px; cursor: pointer; font-size: 12px; font-family: inherit; transition: background .15s; }
  .btn:hover { background: var(--btn-hover); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn.btn-sm { padding: 4px 8px; font-size: 11px; }
  .btn.btn-danger { background: var(--red); }
  .btn.btn-secondary { background: var(--card-bg); color: var(--fg); border: 1px solid var(--border); }
  .btn.btn-secondary:hover { background: var(--border); }
  .disk-grid { display: flex; flex-direction: column; gap: 8px; }
  .disk-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 4px; padding: 10px; }
  .disk-header { display: flex; justify-content: space-between; margin-bottom: 6px; font-weight: 600; }
  .disk-bar-track { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
  .disk-bar-fill { height: 100%; border-radius: 3px; transition: width .3s; }
  .disk-bar-fill.good { background: var(--green); }
  .disk-bar-fill.warning { background: var(--yellow); }
  .disk-bar-fill.critical { background: var(--red); }
  .disk-details { display: flex; gap: 10px; font-size: 11px; opacity: 0.8; flex-wrap: wrap; }
  .status-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 4px; padding: 10px; margin-bottom: 8px; }
  .status-card.online { border-left: 3px solid var(--green); }
  .status-card.offline { border-left: 3px solid var(--red); }
  .status-row { display: flex; align-items: center; gap: 8px; }
  .scan-item { display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 3px; margin-bottom: 4px; }
  .scan-item label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; }
  .scan-badge { font-size: 11px; padding: 2px 6px; border-radius: 10px; background: var(--border); }
  .scan-badge.dev { background: #1a3a5c; color: #7ec8e3; }
  .scan-badge.system { background: #3a1a1a; color: #e37c7c; }
  .scan-badge.docker { background: #1a2a3a; color: #7cacde; }
  .size-label { font-size: 11px; opacity: 0.7; }
  .chat-container { display: flex; flex-direction: column; height: calc(100vh - 80px); }
  .chat-messages { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
  .chat-bubble { max-width: 90%; padding: 8px 10px; border-radius: 8px; font-size: 12px; line-height: 1.5; word-wrap: break-word; }
  .chat-bubble.user { background: var(--btn-bg); color: var(--btn-fg); align-self: flex-end; border-bottom-right-radius: 2px; }
  .chat-bubble.assistant { background: var(--card-bg); border: 1px solid var(--border); align-self: flex-start; border-bottom-left-radius: 2px; }
  .chat-bubble.system-msg { font-size: 11px; opacity: 0.6; align-self: center; font-style: italic; }
  .chat-input-row { display: flex; gap: 6px; padding: 8px 0 0; border-top: 1px solid var(--border); }
  .chat-input { flex: 1; background: var(--input-bg); color: var(--input-fg); border: 1px solid var(--input-border); border-radius: 3px; padding: 6px 8px; font-size: 12px; font-family: inherit; resize: none; }
  .chat-input:focus { outline: none; border-color: var(--accent); }
  .provider-row { display: flex; gap: 6px; margin-bottom: 8px; align-items: center; flex-wrap: wrap; }
  .select { background: var(--input-bg); color: var(--input-fg); border: 1px solid var(--input-border); border-radius: 3px; padding: 4px 6px; font-size: 12px; font-family: inherit; }
  .key-row { display: flex; gap: 6px; margin-bottom: 6px; align-items: center; }
  .key-input { flex: 1; background: var(--input-bg); color: var(--input-fg); border: 1px solid var(--input-border); border-radius: 3px; padding: 5px 8px; font-size: 12px; font-family: inherit; }
  .key-input:focus { outline: none; border-color: var(--accent); }
  .log-item { padding: 6px 8px; background: var(--card-bg); border-left: 3px solid var(--border); border-radius: 0 3px 3px 0; margin-bottom: 4px; font-size: 11px; }
  .log-item.ok { border-left-color: var(--green); }
  .log-item.fail { border-left-color: var(--red); }
  .log-time { opacity: 0.6; font-size: 10px; }
  .hint { font-size: 11px; opacity: 0.65; margin-top: 6px; line-height: 1.5; }
  .badge-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
  .badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; border: 1px solid var(--border); cursor: pointer; transition: all .15s; }
  .badge.active { background: var(--btn-bg); color: var(--btn-fg); border-color: transparent; }
  .spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .toast { position: fixed; bottom: 16px; right: 16px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 4px; padding: 10px 14px; font-size: 12px; z-index: 999; animation: fadein .2s; max-width: 240px; }
  .toast.success { border-left: 3px solid var(--green); }
  .toast.error { border-left: 3px solid var(--red); }
  @keyframes fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .result-item { padding: 6px 8px; background: var(--card-bg); border-radius: 3px; margin-bottom: 4px; font-size: 11px; display: flex; gap: 8px; }
  .result-icon { font-size: 13px; }
  a { color: var(--accent); }
  input[type="checkbox"] { cursor: pointer; }
  .empty-state { text-align: center; padding: 24px 0; opacity: 0.5; font-size: 12px; }
</style>
</head>
<body>
<div class="sidebar">
  <!-- Navigation -->
  <div class="nav">
    <button class="nav-btn active" onclick="showTab('dashboard')">📊<br/>Tổng quan</button>
    <button class="nav-btn" onclick="showTab('cleanup')">🧹<br/>Dọn dẹp</button>
    <button class="nav-btn" onclick="showTab('chat')">💬<br/>Chat AI</button>
    <button class="nav-btn" onclick="showTab('history')">📋<br/>Lịch sử</button>
    <button class="nav-btn" onclick="showTab('settings')">⚙️<br/>Cài đặt</button>
  </div>

  <div class="content">
    <!-- DASHBOARD TAB -->
    <div id="tab-dashboard" class="page active">
      <div class="page-title">📊 Tổng quan hệ thống</div>

      <div class="section">
        <div class="section-title">Dung lượng ổ đĩa</div>
        <div id="disk-overview"><div class="empty-state">Đang tải...</div></div>
      </div>

      <div class="section">
        <div class="section-title">Trạng thái AI Agent</div>
        <div id="agent-status" class="status-card offline">
          <div class="status-row">
            <span id="status-icon">🔴</span>
            <span id="status-text">Đang kiểm tra...</span>
          </div>
        </div>
        <div class="hint">Để dùng AI miễn phí, cài Ollama tại <a href="#">ollama.com</a> rồi chạy <code>ollama serve</code></div>
      </div>

      <div class="section">
        <button class="btn" onclick="loadDashboard()">🔄 Làm mới</button>
        <button class="btn btn-secondary" style="margin-left:6px" onclick="showTab('cleanup')">🧹 Quét ngay</button>
      </div>
    </div>

    <!-- CLEANUP TAB -->
    <div id="tab-cleanup" class="page">
      <div class="page-title">🧹 Dọn dẹp Cache</div>

      <div class="section">
        <div class="section-title">Chế độ quét</div>
        <div class="badge-row">
          <span class="badge active" id="mode-smart" onclick="setScanMode('smart')">⚡ Smart</span>
          <span class="badge" id="mode-deep" onclick="setScanMode('deep')">🔍 Deep</span>
        </div>
        <button class="btn" onclick="doScan()" id="btn-scan">
          <span id="scan-icon">🔍</span> Quét ổ đĩa
        </button>
      </div>

      <div id="scan-results" class="section" style="display:none">
        <div class="section-title">Kết quả quét <span id="scan-count"></span></div>
        <div id="scan-items"></div>
        <div style="margin-top:10px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <button class="btn" onclick="selectAll()">Chọn tất cả</button>
          <button class="btn btn-secondary" onclick="unselectAll()">Bỏ chọn</button>
          <span id="estimate-label" class="size-label" style="margin-left:4px;"></span>
        </div>
        <div style="margin-top:8px;">
          <button class="btn btn-danger" onclick="doCleanup()" id="btn-clean">🗑️ Xóa đã chọn</button>
        </div>
      </div>

      <div id="cleanup-results" class="section" style="display:none">
        <div class="section-title">Kết quả dọn dẹp</div>
        <div id="cleanup-items"></div>
      </div>
    </div>

    <!-- CHAT TAB -->
    <div id="tab-chat" class="page">
      <div class="provider-row">
        <select class="select" id="chat-provider" onchange="updateModelList()">
          <option value="ollama">🟡 Ollama (local)</option>
          <option value="openai">🟢 OpenAI</option>
          <option value="gemini">🔵 Gemini</option>
          <option value="anthropic">🟠 Anthropic</option>
        </select>
        <select class="select" id="chat-model">
          <option value="gemma3:4b">gemma3:4b</option>
          <option value="llama3">llama3</option>
          <option value="mistral">mistral</option>
        </select>
        <button class="btn btn-secondary btn-sm" onclick="clearChat()">🗑️</button>
      </div>

      <div class="chat-container">
        <div class="chat-messages" id="chat-messages">
          <div class="chat-bubble system-msg">👋 Xin chào đại ca! Tôi là Agi — trợ lý dọn dẹp máy tính. Hỏi gì cũng được!</div>
        </div>
        <div class="chat-input-row">
          <textarea class="chat-input" id="chat-input" rows="2" placeholder="Hỏi Agi..." onkeydown="chatKeydown(event)"></textarea>
          <button class="btn" id="btn-send" onclick="sendChat()">➤</button>
        </div>
      </div>
    </div>

    <!-- HISTORY TAB -->
    <div id="tab-history" class="page">
      <div class="page-title">📋 Lịch sử dọn dẹp</div>
      <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
        <button class="btn btn-secondary btn-sm" onclick="loadHistory()">🔄 Làm mới</button>
        <button class="btn btn-danger btn-sm" onclick="clearHistory()">🗑️ Xóa lịch sử</button>
      </div>
      <div id="history-items"><div class="empty-state">Chưa có lịch sử dọn dẹp</div></div>
    </div>

    <!-- SETTINGS TAB -->
    <div id="tab-settings" class="page">
      <div class="page-title">⚙️ Cài đặt API Keys</div>

      <div class="section">
        <div class="section-title">OpenAI</div>
        <div class="key-row">
          <input class="key-input" type="password" id="key-openai" placeholder="sk-..." />
          <button class="btn btn-sm" onclick="saveKey('openai', 'gpt-4o-mini')">Lưu</button>
          <button class="btn btn-secondary btn-sm" onclick="removeKey('openai')">Xóa</button>
        </div>
        <div style="font-size:11px; opacity:0.6;">Lấy key tại platform.openai.com/api-keys</div>
      </div>

      <div class="section">
        <div class="section-title">Google Gemini</div>
        <div class="key-row">
          <input class="key-input" type="password" id="key-gemini" placeholder="AIza..." />
          <button class="btn btn-sm" onclick="saveKey('gemini', 'gemini-2.0-flash')">Lưu</button>
          <button class="btn btn-secondary btn-sm" onclick="removeKey('gemini')">Xóa</button>
        </div>
        <div style="font-size:11px; opacity:0.6;">Lấy key tại aistudio.google.com/apikey</div>
      </div>

      <div class="section">
        <div class="section-title">Anthropic</div>
        <div class="key-row">
          <input class="key-input" type="password" id="key-anthropic" placeholder="sk-ant-..." />
          <button class="btn btn-sm" onclick="saveKey('anthropic', 'claude-sonnet-4-20250514')">Lưu</button>
          <button class="btn btn-secondary btn-sm" onclick="removeKey('anthropic')">Xóa</button>
        </div>
        <div style="font-size:11px; opacity:0.6;">Lấy key tại console.anthropic.com/settings/keys</div>
      </div>

      <div class="section">
        <div class="section-title">Ollama (miễn phí)</div>
        <div class="hint">Chạy AI hoàn toàn offline trên máy bạn.<br/>1. Tải tại <strong>ollama.com</strong><br/>2. Chạy: <code>ollama serve</code><br/>3. Tải model: <code>ollama pull gemma3:4b</code></div>
        <div style="margin-top:8px; display:flex; gap:6px;">
          <button class="btn btn-sm" onclick="testOllama()">🔍 Kiểm tra Ollama</button>
        </div>
        <div id="ollama-test-result" style="margin-top:6px; font-size:11px;"></div>
      </div>
    </div>
  </div>
</div>

<!-- Toast -->
<div id="toast" class="toast" style="display:none"></div>

<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
let scanMode = 'smart';
let scanData = [];
let chatMessages = [];
let apiKeys = {};
let chatModels = {
  ollama: ['gemma3:4b','llama3','mistral','qwen2.5:3b','phi3'],
  openai: ['gpt-4o-mini','gpt-4o','gpt-3.5-turbo'],
  gemini: ['gemini-2.0-flash','gemini-1.5-pro','gemini-1.5-flash'],
  anthropic: ['claude-sonnet-4-20250514','claude-3-5-haiku-20241022']
};

// ---- Tab navigation ----
function showTab(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  const idx = ['dashboard','cleanup','chat','history','settings'].indexOf(id);
  document.querySelectorAll('.nav-btn')[idx].classList.add('active');
  if (id === 'history') loadHistory();
  if (id === 'settings') loadApiKeys();
}

// ---- Dashboard ----
function loadDashboard() {
  vscode.postMessage({ command: 'getDiskOverview' });
  vscode.postMessage({ command: 'checkOllama' });
}

function renderDiskOverview(data) {
  const el = document.getElementById('disk-overview');
  if (!data || data.length === 0) { el.innerHTML = '<div class="empty-state">Không tìm thấy ổ đĩa</div>'; return; }
  el.innerHTML = data.map(d => {
    const cls = d.used_percent > 90 ? 'critical' : d.used_percent > 70 ? 'warning' : 'good';
    const clr = d.used_percent > 90 ? '#f44336' : d.used_percent > 70 ? '#ff9800' : '#4caf50';
    return \`<div class="disk-card">
      <div class="disk-header"><span>\${d.drive}</span><span style="color:\${clr}">\${d.used_percent}%</span></div>
      <div class="disk-bar-track"><div class="disk-bar-fill \${cls}" style="width:\${Math.min(d.used_percent,100)}%"></div></div>
      <div class="disk-details"><span>Đã dùng: \${d.used_display}</span><span>Còn trống: \${d.free_display}</span><span>Tổng: \${d.total_display}</span></div>
    </div>\`;
  }).join('');
}

function renderOllamaStatus(data) {
  const card = document.getElementById('agent-status');
  const icon = document.getElementById('status-icon');
  const text = document.getElementById('status-text');
  if (data.running) {
    card.className = 'status-card online';
    icon.textContent = '🟢';
    text.textContent = 'AI Agent (Ollama) đã kết nối';
  } else {
    card.className = 'status-card offline';
    icon.textContent = '🔴';
    text.textContent = 'AI Agent chưa kết nối — cài Ollama để dùng AI miễn phí';
  }
}

// ---- Cleanup ----
function setScanMode(m) {
  scanMode = m;
  ['smart','deep'].forEach(id => {
    document.getElementById('mode-'+id).classList.toggle('active', id === m);
  });
}

function doScan() {
  const btn = document.getElementById('btn-scan');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Đang quét...';
  document.getElementById('scan-results').style.display = 'none';
  document.getElementById('cleanup-results').style.display = 'none';
  vscode.postMessage({ command: 'scanDisk', mode: scanMode });
}

function renderScanResults(data) {
  scanData = data;
  const btn = document.getElementById('btn-scan');
  btn.disabled = false;
  btn.innerHTML = '🔍 Quét ổ đĩa';

  const section = document.getElementById('scan-results');
  const items = document.getElementById('scan-items');
  const count = document.getElementById('scan-count');

  section.style.display = 'block';
  count.textContent = '(' + data.length + ' mục)';

  items.innerHTML = data.map((item, i) => \`
    <div class="scan-item">
      <label>
        <input type="checkbox" id="chk-\${i}" onchange="updateEstimate()" />
        <span class="scan-badge \${item.category}">\${item.category}</span>
        \${item.name}
      </label>
      <span class="size-label">\${item.size_display}</span>
    </div>
  \`).join('');

  updateEstimate();
}

function selectAll() { scanData.forEach((_,i) => { document.getElementById('chk-'+i).checked = true; }); updateEstimate(); }
function unselectAll() { scanData.forEach((_,i) => { document.getElementById('chk-'+i).checked = false; }); updateEstimate(); }

function getSelectedActions() {
  return scanData
    .filter((item, i) => document.getElementById('chk-'+i)?.checked)
    .map(item => ({ action_type: getActionType(item.name), enabled: true }))
    .filter(a => a.action_type);
}

function getActionType(name) {
  const map = {
    'npm cache': 'npm_cache', 'pip cache': 'pip_cache', 'Cargo cache': 'cargo_cache',
    'Gradle cache': 'gradle_cache', 'VS Code Cache': 'vscode_cache', 'Temp files': 'temp_files',
    'Windows Prefetch': 'prefetch', 'Windows Temp': 'windows_temp',
    'Windows Update Cache': 'windows_update', 'Docker data': 'docker_prune',
    'Crash Dumps': 'crash_dumps', 'Thumbnail Cache': 'thumbnail_cache',
  };
  return map[name] || '';
}

function updateEstimate() {
  const types = scanData.filter((_,i) => document.getElementById('chk-'+i)?.checked).map(i => getActionType(i.name)).filter(Boolean);
  if (types.length === 0) { document.getElementById('estimate-label').textContent = ''; return; }
  vscode.postMessage({ command: 'estimateCleanupSize', actionTypes: types });
}

function doCleanup() {
  const actions = getSelectedActions();
  if (!actions.length) { showToast('Chưa chọn mục nào', 'error'); return; }
  const sizeLabel = document.getElementById('estimate-label').textContent;
  vscode.postMessage({ command: 'showConfirmCleanup', count: actions.length, sizeDisplay: sizeLabel });
}

function executeCleanup(actions) {
  const btn = document.getElementById('btn-clean');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Đang xóa...';
  vscode.postMessage({ command: 'runCleanup', actions });
}

function renderCleanupResults(data) {
  const btn = document.getElementById('btn-clean');
  btn.disabled = false;
  btn.innerHTML = '🗑️ Xóa đã chọn';

  const section = document.getElementById('cleanup-results');
  const items = document.getElementById('cleanup-items');
  section.style.display = 'block';

  const ok = data.filter(r => r.success).length;
  items.innerHTML = data.map(r => \`
    <div class="result-item">
      <span class="result-icon">\${r.success ? '✅' : '❌'}</span>
      <div><strong>\${r.action}</strong><br/><span style="opacity:.7">\${r.message}</span></div>
    </div>
  \`).join('');

  showToast('Xong: ' + ok + '/' + data.length + ' thành công', ok > 0 ? 'success' : 'error');
}

// ---- Chat ----
function updateModelList() {
  const provider = document.getElementById('chat-provider').value;
  const select = document.getElementById('chat-model');
  const models = chatModels[provider] || ['default'];
  select.innerHTML = models.map(m => \`<option value="\${m}">\${m}</option>\`).join('');
}

function clearChat() {
  chatMessages = [];
  document.getElementById('chat-messages').innerHTML = '<div class="chat-bubble system-msg">👋 Chat mới bắt đầu. Hỏi Agi đi đại ca!</div>';
}

function chatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
}

function sendChat() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  const provider = document.getElementById('chat-provider').value;
  const model = document.getElementById('chat-model').value;

  chatMessages.push({ role: 'user', content: text });
  appendChatBubble('user', text);
  input.value = '';

  const typing = appendChatBubble('assistant', '<span class="spinner"></span> Agi đang suy nghĩ...');
  document.getElementById('btn-send').disabled = true;

  vscode.postMessage({ command: 'chatAI', messages: chatMessages, provider, model });
  window._typingEl = typing;
}

function appendChatBubble(role, html) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-bubble ' + role;
  div.innerHTML = html;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function handleChatReply(text) {
  chatMessages.push({ role: 'assistant', content: text });
  if (window._typingEl) {
    window._typingEl.innerHTML = text.replace(/\\n/g, '<br/>');
    window._typingEl = null;
  }
  document.getElementById('btn-send').disabled = false;
}

function handleChatError(err) {
  if (window._typingEl) {
    window._typingEl.innerHTML = '❌ ' + err;
    window._typingEl.style.borderLeftColor = 'var(--red)';
    window._typingEl = null;
  }
  document.getElementById('btn-send').disabled = false;
}

// ---- History ----
function loadHistory() {
  vscode.postMessage({ command: 'getCleanupLog' });
}

function renderHistory(data) {
  const el = document.getElementById('history-items');
  if (!data || data.length === 0) { el.innerHTML = '<div class="empty-state">Chưa có lịch sử dọn dẹp</div>'; return; }
  el.innerHTML = data.map(entry => \`
    <div class="log-item \${entry.success ? 'ok' : 'fail'}">
      <div>\${entry.success ? '✅' : '❌'} <strong>\${entry.action}</strong> — \${entry.message}</div>
      <div class="log-time">\${new Date(entry.timestamp).toLocaleString('vi-VN')}</div>
    </div>
  \`).join('');
}

function clearHistory() {
  vscode.postMessage({ command: 'clearCleanupLog' });
  document.getElementById('history-items').innerHTML = '<div class="empty-state">Đã xóa lịch sử</div>';
  showToast('Đã xóa lịch sử', 'success');
}

// ---- Settings ----
function loadApiKeys() {
  vscode.postMessage({ command: 'getApiKeys' });
}

function renderApiKeys(keys) {
  apiKeys = keys;
  ['openai','gemini','anthropic'].forEach(p => {
    const input = document.getElementById('key-' + p);
    if (input && keys[p]) input.placeholder = '••••••••••••' + (keys[p].key || '').slice(-4);
  });
}

function saveKey(provider, model) {
  const input = document.getElementById('key-' + provider);
  const key = input.value.trim();
  if (!key) { showToast('Nhập API key trước', 'error'); return; }
  vscode.postMessage({ command: 'saveApiKey', provider, key, enabled: true });
  input.value = '';
  showToast('Đã lưu key ' + provider, 'success');
}

function removeKey(provider) {
  vscode.postMessage({ command: 'removeApiKey', provider });
  const input = document.getElementById('key-' + provider);
  if (input) { input.value = ''; input.placeholder = ''; }
  showToast('Đã xóa key ' + provider, 'success');
}

function testOllama() {
  const el = document.getElementById('ollama-test-result');
  el.textContent = 'Đang kiểm tra...';
  vscode.postMessage({ command: 'checkOllama' });
  window._testingOllama = true;
}

// ---- Toast ----
let toastTimer;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type;
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = 'none'; }, 3000);
}

// ---- Message handler ----
window.addEventListener('message', event => {
  const msg = event.data;
  switch (msg.command) {
    case 'diskOverview': renderDiskOverview(msg.data); break;
    case 'ollamaStatus':
      renderOllamaStatus(msg.data);
      if (window._testingOllama) {
        const el = document.getElementById('ollama-test-result');
        if (el) el.textContent = msg.data.running ? '✅ Ollama đang chạy bình thường' : '❌ Không kết nối được Ollama';
        window._testingOllama = false;
      }
      break;
    case 'scanResult': renderScanResults(msg.data); break;
    case 'cleanupResult': renderCleanupResults(msg.data); break;
    case 'estimateResult':
      document.getElementById('estimate-label').textContent = msg.data > 0 ? 'Ước tính: ' + formatSize(msg.data) : '';
      break;
    case 'confirmResult':
      if (msg.data) executeCleanup(getSelectedActions());
      break;
    case 'chatReply': handleChatReply(msg.data); break;
    case 'chatError': handleChatError(msg.data); break;
    case 'cleanupLog': renderHistory(msg.data); break;
    case 'logCleared': break;
    case 'apiKeys': renderApiKeys(msg.data); break;
    case 'apiKeySaved': break;
    case 'apiKeyRemoved': break;
    case 'firstRun': break;
    case 'setupComplete': break;
    case 'error': showToast(msg.data, 'error'); break;
  }
});

// ---- Helpers ----
function formatSize(bytes) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' B';
}

// ---- Init ----
loadDashboard();
updateModelList();
</script>
</body>
</html>`;
}

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}
