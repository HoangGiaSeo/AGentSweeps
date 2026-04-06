import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface ApiKeyEntry {
  provider: string;
  key: string;
  enabled: boolean;
}

export interface AppSettings {
  api_keys: Record<string, ApiKeyEntry>;
  first_run: boolean;
}

function settingsPath(): string {
  return path.join(os.homedir(), ".agent-sweeps-settings.json");
}

export function loadSettings(): AppSettings {
  const p = settingsPath();
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    } catch {
      /* ignore */
    }
  }
  return { api_keys: {}, first_run: true };
}

export function saveSettings(settings: AppSettings): void {
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), "utf-8");
}

export function getApiKeys(): Record<string, ApiKeyEntry> {
  return loadSettings().api_keys;
}

export function saveApiKey(provider: string, key: string, enabled: boolean): void {
  const s = loadSettings();
  s.api_keys[provider] = { provider, key, enabled };
  saveSettings(s);
}

export function removeApiKey(provider: string): void {
  const s = loadSettings();
  delete s.api_keys[provider];
  saveSettings(s);
}

export function checkFirstRun(): boolean {
  return loadSettings().first_run;
}

export function completeSetup(): void {
  const s = loadSettings();
  s.first_run = false;
  saveSettings(s);
}
