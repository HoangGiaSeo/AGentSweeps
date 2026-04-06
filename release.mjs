#!/usr/bin/env node
/**
 * release.mjs — Tự động bump version + tạo git tag → trigger publish workflow
 * Dùng: node release.mjs [patch|minor|major]
 * Mặc định: patch (0.1.0 → 0.1.1)
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, "agent-sweeps-vscode/package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

const bumpType = process.argv[2] || "patch";
const [major, minor, patch] = pkg.version.split(".").map(Number);

let newVersion;
if (bumpType === "major") newVersion = `${major + 1}.0.0`;
else if (bumpType === "minor") newVersion = `${major}.${minor + 1}.0`;
else newVersion = `${major}.${minor}.${patch + 1}`;

// Update package.json
pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`📦 Bumped version: ${pkg.version.replace(newVersion, "")}${newVersion}`);

// Git commit + tag
try {
  execSync(`git add agent-sweeps-vscode/package.json`, { stdio: "inherit" });
  execSync(`git commit -m "chore: release v${newVersion}"`, { stdio: "inherit" });
  execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { stdio: "inherit" });
  execSync(`git push origin main --follow-tags`, { stdio: "inherit" });
  console.log(`\n✅ Tag v${newVersion} pushed → GitHub Actions sẽ tự publish lên Marketplace!\n`);
  console.log(`🔗 https://github.com/HoangGiaSeo/AGentSweeps/actions`);
} catch (e) {
  console.error("❌ Git error:", e.message);
  process.exit(1);
}
