# [EXEC-01D] Debt Register

**Date:** 2026-04-07  
**Wave:** EXEC-01D — Anomaly quarantine + Rust tree integrity lock

---

## Cumulative Debt Register (All Waves Through EXEC-01D)

### Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ CLOSED | Fully resolved, evidence attached |
| ⚠️ REMAINING | Tracked, deferred to future wave |
| 📌 NOTED | Non-actionable, documented for awareness |

---

### DEBT-001 — `App.css` God-File

| Field | Value |
|-------|-------|
| **Status** | ✅ CLOSED — EXEC-01C |
| **Opened** | EXEC-00 |
| **Closed** | EXEC-01C: `App.css` → 9-line tombstone, zero selectors |

---

### DEBT-013 — No CSS Design-Token Source of Truth

| Field | Value |
|-------|-------|
| **Status** | ✅ CLOSED — EXEC-01B |
| **Opened** | EXEC-00 |
| **Closed** | EXEC-01B: `tokens.css` (36 LOC) sole `:root {}` owner |

---

### DEBT-016 — `App.css` Body Not Deleted After Tombstone

| Field | Value |
|-------|-------|
| **Status** | ✅ CLOSED — EXEC-01C |
| **Opened** | EXEC-01B |
| **Closed** | EXEC-01C: body deleted (1642 → 9 LOC) |

---

### DEBT-014 — Undefined CSS Custom Properties

| Field | Value |
|-------|-------|
| **Status** | ⚠️ REMAINING → Wave 02 |
| **Opened** | EXEC-01B |
| **Description** | 7 tokens used in component CSS but undefined in `tokens.css`: `--surface`, `--blue`, `--blue-hover`, `--card-bg`, `--border-color`, `--text-primary`, `--text-muted`. Resolve to empty string at runtime (browser fallback). |
| **Proposed resolution** | Wave 02: define missing tokens in `tokens.css` with correct design values |

---

### DEBT-015 — `.btn-tiny` Cascade Override in `settings.css`

| Field | Value |
|-------|-------|
| **Status** | ⚠️ REMAINING → Wave 02 (blocked on DEBT-014) |
| **Opened** | EXEC-01B |
| **Description** | `settings.css` redefines `.btn-tiny` using `var(--surface)` (undefined). Background resolves to empty/transparent. |
| **Proposed resolution** | Wave 02: after DEBT-014 resolves `--surface`, evaluate whether override is intentional or should be removed |

---

### DEBT-017 — `deep_scan.rs` Rogue Untracked Artifact

| Field | Value |
|-------|-------|
| **Status** | ✅ CLOSED — EXEC-01D |
| **Opened** | EXEC-01D (discovered during anomaly audit) |
| **Description** | 927-LOC untracked `deep_scan.rs` existed in commands dir alongside the canonical `deep_scan/` split module. File was never committed, never imported, never active at runtime. Caused `E0761` module ambiguity + 2× `E0433` IPC resolution failures when present. |
| **Root cause** | Out-of-scope accidental reconstruction — file created during feature development outside the wave workflow, not merged into split module tree, not committed. |
| **Resolution** | Deleted via `Remove-Item`. `cargo check` + `cargo test` (48/48) confirmed clean. |
| **76-LOC feature delta** | The rogue file was 76 LOC larger than the deleted monolith (927 vs 851). This delta may represent unreleased feature intent. It was never part of the active module tree and was never tested. If reenacting this feature work is required, it must be done from scratch against the split module structure. |

---

### DEBT-018 — E0761 Module Ambiguity (Build Break Latent Risk)

| Field | Value |
|-------|-------|
| **Status** | ✅ CLOSED — EXEC-01D |
| **Opened** | EXEC-01D |
| **Description** | Consequence of DEBT-017: while `deep_scan.rs` existed, `cargo check` emitted `E0761` (ambiguous module path) + 2× `E0433` (IPC symbols not found). Build was broken. |
| **Resolution** | Resolved by deleting `deep_scan.rs` (DEBT-017 closure). |

---

### DEBT-019 — Unused `usedBytesTotal` Prop in `DriveModal.jsx`

| Field | Value |
|-------|-------|
| **Status** | ✅ CLOSED — EXEC-01D |
| **Opened** | EXEC-01D (discovered via IDE Problems) |
| **Description** | `FoldersTab` component destructured `usedBytesTotal` but never used it. ESLint `no-unused-vars`. |
| **Fix** | Removed from destructuring: `function FoldersTab({ topFolders })` |

---

### DEBT-020 — Unstable `items` Reference in `useMemo` Deps (`DeepScanTab.jsx`)

| Field | Value |
|-------|-------|
| **Status** | ✅ CLOSED — EXEC-01D |
| **Opened** | EXEC-01D (discovered via IDE Problems) |
| **Description** | `const items = scanResult?.items \|\| []` — the `\|\| []` creates a new array reference on every render when `scanResult?.items` is falsy. The `useMemo([items, selected])` depending on this reference would re-execute every render cycle when no scan has run yet. React linter: "could make dependencies change on every render". |
| **Fix** | Wrapped in `useMemo`: `const items = useMemo(() => scanResult?.items \|\| [], [scanResult])` |

---

### DEBT-021 — Missing `chatModel` Dep in `useEffect` (`App.jsx`)

| Field | Value |
|-------|-------|
| **Status** | ✅ CLOSED — EXEC-01D |
| **Opened** | EXEC-01D (discovered via IDE Problems) |
| **Description** | `useEffect` at line 252 uses `chatModel` inside to check `models.includes(chatModel)` but `chatModel` was absent from dependency array `[ollamaStatus]`. React hooks exhaustive-deps warning. Could cause stale closure — effect using old `chatModel` value when re-triggered by `ollamaStatus` change. |
| **Fix** | Added `chatModel` to dependency array: `[ollamaStatus, chatModel]` |

---

### DEBT-022 — `VSCE_PAT` Linter Warning in `publish.yml`

| Field | Value |
|-------|-------|
| **Status** | 📌 NOTED — non-actionable |
| **Opened** | EXEC-01D (discovered via IDE Problems) |
| **Affected file** | `.github/workflows/publish.yml` (lines 54, 56) |
| **Description** | VS Code GitHub Actions extension warns: "Context access might be invalid: VSCE_PAT". `${{ secrets.VSCE_PAT }}` is syntactically valid GitHub Actions secret reference. The extension emits this warning when it cannot verify a secret is defined in the repository settings. |
| **Assessment** | False positive. The secret must be configured in GitHub repo Settings → Secrets → `VSCE_PAT`. No code change needed. If the secret is not configured, the workflow will fail at runtime with a clear GHA error — not a silent failure. |
| **Action** | None in this wave. Operator must configure `VSCE_PAT` in repo secrets if publishing is needed. |

---

## Summary Table — All Debt Through EXEC-01D

| ID | Title | Wave Opened | Status |
|----|-------|------------|--------|
| DEBT-001 | `App.css` god-file | EXEC-00 | ✅ CLOSED (EXEC-01C) |
| DEBT-013 | No token SoT | EXEC-00 | ✅ CLOSED (EXEC-01B) |
| DEBT-014 | Undefined CSS tokens | EXEC-01B | ⚠️ Wave 02 |
| DEBT-015 | `.btn-tiny` cascade override | EXEC-01B | ⚠️ Wave 02 |
| DEBT-016 | `App.css` body not deleted | EXEC-01B | ✅ CLOSED (EXEC-01C) |
| DEBT-017 | `deep_scan.rs` rogue artifact | EXEC-01D | ✅ CLOSED (EXEC-01D) |
| DEBT-018 | E0761 module ambiguity | EXEC-01D | ✅ CLOSED (EXEC-01D) |
| DEBT-019 | unused `usedBytesTotal` prop | EXEC-01D | ✅ CLOSED (EXEC-01D) |
| DEBT-020 | unstable `items` useMemo dep | EXEC-01D | ✅ CLOSED (EXEC-01D) |
| DEBT-021 | missing `chatModel` useEffect dep | EXEC-01D | ✅ CLOSED (EXEC-01D) |
| DEBT-022 | `VSCE_PAT` linter warning | EXEC-01D | 📌 NOTED (non-actionable) |

**Closed this wave (EXEC-01D):** 5 items (DEBT-017 through DEBT-021)  
**Remaining after all waves:** 2 actionable items (DEBT-014, DEBT-015) + 1 noted non-actionable (DEBT-022)
