# [EXEC-00] File Line Ranking — AGent WinWin

> **Scan date:** 2026-04-06  
> **Guardrail basis:** ASSUMPTION (repo has no documented file-size standard)  
> ≤300 OK | 301–500 WATCH | 501–800 OVERSIZED | >800 CRITICAL  
> **Scope:** `git ls-files` on branch `main`, excluding `src-tauri/target/`, `node_modules/`, all binary assets and lockfiles.

---

## 1. Excluded / EXEMPT Paths

| Path | Reason |
|------|--------|
| `src-tauri/target/**` | Rust build artifacts — not tracked but guarded |
| `src-tauri/Cargo.lock` | Generated dependency lock file (5,644 LOC) |
| `package-lock.json` | Generated npm lockfile (2,784 LOC) |
| `src-tauri/gen/schemas/windows-schema.json` | Generated Tauri JSON schema (2,244 LOC) |
| `src-tauri/gen/schemas/desktop-schema.json` | Generated Tauri JSON schema (2,244 LOC) |
| `src-tauri/gen/schemas/acl-manifests.json` | Generated Tauri ACL manifest (1 line / 64 KB) |
| `src-tauri/gen/schemas/capabilities.json` | Generated capabilities schema |
| `dev-cleanup-agent.exe` | Binary build artifact (90,986 LOC-equivalent) |
| `src-tauri/icons/**` | Binary icon/image assets |
| `src-tauri/Icon.png`, `public/**` | Binary media assets |
| `src/assets/**` | Binary SVG/PNG assets |

---

## 2. Global Top 50 — Handwritten Source Files

> FACT: measured via `Get-Content | Count` on all `git ls-files` results after exclusions.

| Rank | Path | Raw LOC | Non-empty LOC | Bytes | Lang | Module | Role | Class | Generated? | Runtime Critical? | Split Reason |
|------|------|---------|--------------|-------|------|--------|------|-------|-----------|------------------|--------------|
| 1 | `src/App.css` | **1,864** | 1,639 | 38,268 | CSS | ui-global | global styles | **CRITICAL** | no | yes | Styles for 12+ components crammed into one file; partial extraction already started to `styles/` but App.css never emptied |
| 2 | `src-tauri/src/commands/deep_scan.rs` | **851** | 789 | 36,174 | Rust | command | domain+infra | **CRITICAL** | no | yes | 6 distinct responsibilities: data structs, safety classification, zone catalog, 4 scan algorithms, delete command |
| 3 | `src/App.jsx` | **620** | 573 | 24,589 | JSX | ui-root | orchestration | **OVERSIZED** | no | yes | God-component: 26 useState, 8 useEffect, all API calls, all handlers, full render tree |
| 4 | `src/styles/deepscan.css` | **594** | 514 | 13,972 | CSS | ui-tab | component styles | **OVERSIZED** | no | no | Single-tab CSS overweight; mixes item rows, badges, modals, empty states, summaries |
| 5 | `src/styles/drivemodal.css` | **514** | 449 | 12,791 | CSS | ui-component | component styles | **OVERSIZED** | no | no | Modal-specific CSS ~2× its component (DriveModal.jsx = 259 LOC) |
| 6 | `src/tabs/DeepScanTab.jsx` | **512** | 480 | 19,257 | JSX | ui-tab | tab component | **OVERSIZED** | no | yes | Contains 3 embedded sub-components (ItemRow, SectionPanel, formatBytes); mixes options UI, results, confirm modal |
| 7 | `src/styles/cleanup.css` | **439** | 381 | 9,015 | CSS | ui-tab | component styles | **WATCH** | no | no | Approaching OVERSIZED; serves CleanupTab which itself is WATCH |
| 8 | `src/styles/settings.css` | **438** | 391 | 8,574 | CSS | ui-tab | component styles | **WATCH** | no | no | Single-tab CSS; currently stable but tracks with feature additions |
| 9 | `src/tabs/CleanupTab.jsx` | **425** | 406 | 17,271 | JSX | ui-tab | tab component | **WATCH** | no | yes | Props explosion: receives 30+ props; render-only but tightly coupled to App.jsx state shape |
| 10 | `src-tauri/src/commands/drive_detail.rs` | **384** | 350 | 11,952 | Rust | command | service | **WATCH** | no | yes | Scan algorithms + app categorizer + prefetch reader + data structs in one file |
| 11 | `src-tauri/src/commands/cleanup.rs` | **369** | 333 | 12,991 | Rust | command | service | **WATCH** | no | yes | 5 concerns: whitelist guard, cmd dispatch, path resolution, size estimation, zip backup |
| 12 | `src-tauri/src/commands/settings.rs` | **320** | 283 | 12,849 | Rust | command | service+infra | **WATCH** | no | yes | API key management + settings persistence + external AI chat dispatch |
| 13 | `src/styles/base.css` | **330** | 289 | 7,063 | CSS | ui-global | design tokens+base | **WATCH** | no | yes | Global CSS variables + reset + shared utilities; growing |
| 14 | `src/styles/chat.css` | 270 | 247 | 6,277 | CSS | ui-tab | component styles | OK | no | no | — |
| 15 | `src/components/DriveModal.jsx` | 259 | 235 | 9,659 | JSX | ui-component | modal component | OK | no | yes | — |
| 16 | `src/styles/dashboard.css` | 191 | 164 | 3,861 | CSS | ui-tab | component styles | OK | no | no | — |
| 17 | `src/tabs/ChatTab.jsx` | 184 | 177 | 7,109 | JSX | ui-tab | tab component | OK | no | yes | — |
| 18 | `src-tauri/src/commands/scan.rs` | 182 | 162 | 6,014 | Rust | command | service | OK | no | yes | — |
| 19 | `src/styles/setup.css` | 166 | 143 | 3,014 | CSS | ui-component | setup modal styles | OK | no | no | — |
| 20 | `src/tabs/SettingsTab.jsx` | 164 | 157 | 6,677 | JSX | ui-tab | tab component | OK | no | no | — |
| 21 | `src/components/SetupModal.jsx` | 203 | 186 | 6,974 | JSX | ui-component | modal component | OK | no | no | — |
| 22 | `src-tauri/src/commands/scheduler.rs` | 122 | 108 | 3,629 | Rust | command | service | OK | no | no | — |
| 23 | `src-tauri/src/commands/system.rs` | 113 | 101 | 3,768 | Rust | command | infra | OK | no | no | — |
| 24 | `src/tabs/DashboardTab.jsx` | 110 | 107 | 4,519 | JSX | ui-tab | tab component | OK | no | yes | — |
| 25 | `src-tauri/src/commands/setup.rs` | 107 | 98 | 3,956 | Rust | command | infra | OK | no | no | — |
| 26 | `src-tauri/src/commands/ai.rs` | 105 | 92 | 3,890 | Rust | command | service | OK | no | yes | — |
| 27 | `src/styles/sidebar.css` | 96 | 83 | 1,912 | CSS | ui-component | component styles | OK | no | no | — |
| 28 | `src-tauri/src/commands/decision.rs` | 79 | 66 | 2,392 | Rust | command | domain | OK | no | yes | — |
| 29 | `src/styles/toast.css` | 80 | 71 | 1,573 | CSS | ui-component | component styles | OK | no | no | — |
| 30 | `src/constants.js` | 75 | 71 | 3,492 | JS | ui-shared | constants | OK | no | yes | — |
| 31 | `src-tauri/src/utils/logger.rs` | 74 | 65 | 2,448 | Rust | utils | infra | OK | no | no | — |
| 32 | `src/api.js` | 56 | 34 | 2,221 | JS | ui-shared | IPC adapter | OK | no | yes | — |
| 33 | `src-tauri/src/lib.rs` | 37 | 36 | 1,527 | Rust | root | entrypoint | OK | no | yes | — |
| 34 | `src-tauri/tauri.conf.json` | 37 | 37 | 838 | JSON | config | config | OK | no | yes | — |
| 35 | `src/tabs/HistoryTab.jsx` | 34 | 33 | 1,288 | JSX | ui-tab | tab component | OK | no | no | — |
| 36 | `package.json` | 30 | 30 | 703 | JSON | config | config | OK | no | yes | — |
| 37 | `eslint.config.js` | 29 | 28 | 758 | JS | config | tooling | OK | no | no | — |
| 38 | `src-tauri/src/utils/disk.rs` | 27 | 25 | 683 | Rust | utils | infra | OK | no | yes | — |
| 39 | `src-tauri/Cargo.toml` | 25 | 21 | 574 | TOML | config | config | OK | no | yes | — |
| 40 | `index.html` | 13 | 13 | 369 | HTML | ui-root | entrypoint | OK | no | yes | — |
| 41 | `src/hooks/useToast.js` | 16 | 13 | 487 | JS | ui-shared | hook | OK | no | no | — |
| 42 | `src/main.jsx` | 10 | 9 | 229 | JSX | ui-root | entrypoint | OK | no | yes | — |
| 43 | `src-tauri/src/commands/mod.rs` | 10 | 10 | 180 | Rust | root | module decl | OK | no | yes | — |
| 44 | `src-tauri/capabilities/default.json` | 8 | 8 | 163 | JSON | config | Tauri config | OK | no | yes | — |
| 45 | `vite.config.js` | 7 | 6 | 161 | JS | config | tooling | OK | no | yes | — |
| 46 | `src-tauri/src/main.rs` | 5 | 4 | 121 | Rust | root | entrypoint | OK | no | yes | — |
| 47 | `src-tauri/src/utils/mod.rs` | 2 | 2 | 32 | Rust | utils | module decl | OK | no | no | — |
| 48 | `src/index.css` | 1 | 1 | 32 | CSS | ui-root | style entry | OK | no | no | — |
| 49 | `src-tauri/build.rs` | 3 | 3 | 42 | Rust | config | build script | OK | no | yes | — |
| 50 | `README.md` | 16 | 9 | 1,027 | MD | docs | documentation | OK | no | no | — |

---

## 3. Classification Summary

| Class | Count | Files |
|-------|-------|-------|
| **CRITICAL** | 2 | `App.css`, `deep_scan.rs` |
| **OVERSIZED** | 4 | `App.jsx`, `deepscan.css`, `drivemodal.css`, `DeepScanTab.jsx` |
| **WATCH** | 6 | `cleanup.css`, `settings.css`, `CleanupTab.jsx`, `drive_detail.rs`, `cleanup.rs`, `settings.rs`, `base.css` |
| **OK** | 38+ | All remaining handwritten source |
| **EXEMPT** | 10+ | Generated schemas, lock files, binary assets |

---

## 4. Top Files by Module

### Module: `src-tauri/src/commands/` (Rust commands)

| Rank | File | LOC | Class |
|------|------|-----|-------|
| 1 | `deep_scan.rs` | 851 | CRITICAL |
| 2 | `drive_detail.rs` | 384 | WATCH |
| 3 | `cleanup.rs` | 369 | WATCH |
| 4 | `settings.rs` | 320 | WATCH |
| 5 | `scan.rs` | 182 | OK |
| 6 | `scheduler.rs` | 122 | OK |
| 7 | `system.rs` | 113 | OK |
| 8 | `setup.rs` | 107 | OK |
| 9 | `ai.rs` | 105 | OK |
| 10 | `decision.rs` | 79 | OK |

### Module: `src/tabs/` (React tab components)

| Rank | File | LOC | Class |
|------|------|-----|-------|
| 1 | `DeepScanTab.jsx` | 512 | OVERSIZED |
| 2 | `CleanupTab.jsx` | 425 | WATCH |
| 3 | `ChatTab.jsx` | 184 | OK |
| 4 | `DashboardTab.jsx` | 110 | OK |
| 5 | `SettingsTab.jsx` | 164 | OK |
| 6 | `HistoryTab.jsx` | 34 | OK |

### Module: `src/styles/` (CSS modules)

| Rank | File | LOC | Class |
|------|------|-----|-------|
| 1 | `App.css` *(root, not in styles/)* | 1,864 | CRITICAL |
| 2 | `deepscan.css` | 594 | OVERSIZED |
| 3 | `drivemodal.css` | 514 | OVERSIZED |
| 4 | `cleanup.css` | 439 | WATCH |
| 5 | `settings.css` | 438 | WATCH |
| 6 | `base.css` | 330 | WATCH |
| 7 | `chat.css` | 270 | OK |
| 8 | `dashboard.css` | 191 | OK |
| 9 | `setup.css` | 166 | OK |
| 10 | `sidebar.css` | 96 | OK |

### Module: `src/` (root React)

| Rank | File | LOC | Class |
|------|------|-----|-------|
| 1 | `App.jsx` | 620 | OVERSIZED |
| 2 | `constants.js` | 75 | OK |
| 3 | `api.js` | 56 | OK |

---

## 5. EXEMPT / OBSERVED — Generated Files Noted

| File | LOC | Bytes | Reason EXEMPT | Maintainability Risk |
|------|-----|-------|---------------|---------------------|
| `src-tauri/Cargo.lock` | 5,644 | 137,976 | Auto-generated Rust dep lock | Low — do not edit manually |
| `package-lock.json` | 2,784 | 96,202 | Auto-generated npm lock | Low — do not edit manually |
| `src-tauri/gen/schemas/windows-schema.json` | 2,244 | 113,239 | Tauri-generated schema | Low — regenerated by `tauri build` |
| `src-tauri/gen/schemas/desktop-schema.json` | 2,244 | 113,239 | Tauri-generated schema | Low — regenerated by `tauri build` |
| `src-tauri/gen/schemas/acl-manifests.json` | 1 (minified) | 64,079 | Tauri ACL manifest | Low — do not edit manually |
| `dev-cleanup-agent.exe` | ~90,986 lines | 12,466,176 | Binary executable | Out of scope for hardening |
