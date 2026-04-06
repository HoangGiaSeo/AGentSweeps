import * as vscode from "vscode";
import * as diskCommands from "./commands/diskCommands";
import * as aiCommands from "./commands/aiCommands";
import * as settingsCommands from "./commands/settingsCommands";
import * as loggerCommands from "./commands/loggerCommands";
import { getWebviewContent } from "./webview/webviewContent";

export function activate(context: vscode.ExtensionContext) {
  // Register sidebar webview provider
  const provider = new AgentSweepsViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("agentSweeps.mainView", provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  // Register palette commands
  context.subscriptions.push(
    vscode.commands.registerCommand("agentSweeps.open", () => {
      vscode.commands.executeCommand("agentSweeps.mainView.focus");
    }),

    vscode.commands.registerCommand("agentSweeps.quickScan", async () => {
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: "AGent Sweeps: Đang quét..." },
        async () => {
          const results = await diskCommands.scanDisk("smart");
          const total = results.reduce((s, r) => s + r.size_bytes, 0);
          vscode.window.showInformationMessage(
            `Quét xong: tìm thấy ${diskCommands.formatSize(total)} có thể dọn dẹp`
          );
        }
      );
    }),

    vscode.commands.registerCommand("agentSweeps.quickClean", async () => {
      const confirm = await vscode.window.showWarningMessage(
        "AGent Sweeps: Xóa npm/pip/cargo/temp cache?",
        { modal: true },
        "Xóa ngay"
      );
      if (confirm !== "Xóa ngay") return;

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: "AGent Sweeps: Đang dọn dẹp..." },
        async () => {
          const actions = ["npm_cache", "pip_cache", "cargo_cache", "temp_files"].map((t) => ({
            action_type: t,
            enabled: true,
          }));
          const results = diskCommands.runCleanup(actions);
          for (const r of results) {
            loggerCommands.logAction(r.action, r.success, r.message);
          }
          const ok = results.filter((r) => r.success).length;
          vscode.window.showInformationMessage(`Dọn xong: ${ok}/${results.length} thành công`);
        }
      );
    })
  );
}

export function deactivate() {}

class AgentSweepsViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    webviewView.webview.html = getWebviewContent(webviewView.webview, this.context.extensionUri);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      await this.handleMessage(msg, webviewView.webview);
    });
  }

  private async handleMessage(msg: any, webview: vscode.Webview) {
    const config = vscode.workspace.getConfiguration("agentSweeps");
    const ollamaUrl = config.get<string>("ollamaUrl") || "http://localhost:11434";

    switch (msg.command) {
      case "getDiskOverview": {
        try {
          const data = await diskCommands.getDiskOverview();
          webview.postMessage({ command: "diskOverview", data });
        } catch (e: any) {
          webview.postMessage({ command: "error", data: String(e?.message || e) });
        }
        break;
      }
      case "scanDisk": {
        try {
          const data = await diskCommands.scanDisk(msg.mode || "smart");
          webview.postMessage({ command: "scanResult", data });
        } catch (e: any) {
          webview.postMessage({ command: "error", data: String(e?.message || e) });
        }
        break;
      }
      case "runCleanup": {
        try {
          const results = diskCommands.runCleanup(msg.actions);
          for (const r of results) {
            loggerCommands.logAction(r.action, r.success, r.message);
          }
          webview.postMessage({ command: "cleanupResult", data: results });
        } catch (e: any) {
          webview.postMessage({ command: "error", data: String(e?.message || e) });
        }
        break;
      }
      case "estimateCleanupSize": {
        const size = diskCommands.estimateCleanupSize(msg.actionTypes);
        webview.postMessage({ command: "estimateResult", data: size });
        break;
      }
      case "checkOllama": {
        const running = await aiCommands.checkOllama(ollamaUrl);
        webview.postMessage({ command: "ollamaStatus", data: { running } });
        break;
      }
      case "chatAI": {
        try {
          let reply = "";
          const provider = msg.provider || "ollama";
          if (provider === "ollama") {
            reply = await aiCommands.chatOllama(msg.messages, msg.model, ollamaUrl);
          } else {
            const keys = settingsCommands.getApiKeys();
            const entry = keys[provider];
            if (!entry?.key) throw new Error(`Chưa có API key cho ${provider}`);
            if (provider === "openai") reply = await aiCommands.chatOpenAI(msg.messages, msg.model, entry.key);
            else if (provider === "gemini") reply = await aiCommands.chatGemini(msg.messages, msg.model, entry.key);
            else if (provider === "anthropic") reply = await aiCommands.chatAnthropic(msg.messages, msg.model, entry.key);
          }
          webview.postMessage({ command: "chatReply", data: reply });
        } catch (e: any) {
          webview.postMessage({ command: "chatError", data: String(e?.message || e) });
        }
        break;
      }
      case "getApiKeys": {
        webview.postMessage({ command: "apiKeys", data: settingsCommands.getApiKeys() });
        break;
      }
      case "saveApiKey": {
        settingsCommands.saveApiKey(msg.provider, msg.key, msg.enabled);
        webview.postMessage({ command: "apiKeySaved", data: true });
        break;
      }
      case "removeApiKey": {
        settingsCommands.removeApiKey(msg.provider);
        webview.postMessage({ command: "apiKeyRemoved", data: true });
        break;
      }
      case "getCleanupLog": {
        webview.postMessage({ command: "cleanupLog", data: loggerCommands.getCleanupLog() });
        break;
      }
      case "clearCleanupLog": {
        loggerCommands.clearCleanupLog();
        webview.postMessage({ command: "logCleared", data: true });
        break;
      }
      case "checkFirstRun": {
        webview.postMessage({ command: "firstRun", data: settingsCommands.checkFirstRun() });
        break;
      }
      case "completeSetup": {
        settingsCommands.completeSetup();
        webview.postMessage({ command: "setupComplete", data: true });
        break;
      }
      case "showConfirmCleanup": {
        const answer = await vscode.window.showWarningMessage(
          `Xóa ${msg.count} mục, ước tính ${msg.sizeDisplay}?`,
          { modal: true },
          "Xóa ngay"
        );
        webview.postMessage({ command: "confirmResult", data: answer === "Xóa ngay" });
        break;
      }
    }
  }
}
