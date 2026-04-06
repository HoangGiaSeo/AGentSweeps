# [EXEC-01C] CSS Debt Register

**Date:** 2026-04-07  
**Wave:** EXEC-01C — App.css retirement, design-system ownership lock  
**Register scope:** CSS architecture debt accumulated since EXEC-00 audit

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ CLOSED | Debt fully resolved, evidence in this wave or referenced wave |
| ⚠️ REMAINING | Tracked, deferred to a future wave |
| ❌ OPEN | Not yet addressed |

---

## Debt Register

### DEBT-001 — `App.css` God-File

| Field | Value |
|-------|-------|
| **Status** | ✅ **CLOSED — EXEC-01C** |
| **Opened** | EXEC-00 audit |
| **Description** | `App.css` identified as active god-file with 851+ LOC of mixed tokens, resets, components. |
| **Corrected diagnosis** | `App.css` was in fact never imported. The real active god-file was `base.css` (289 LOC — tokens + reset + layout + buttons + modals). EXEC-00 identified the structural problem correctly but pointed at the wrong file. |
| **Resolution** | EXEC-01B: tombstone header added, body demoted to dead-code annotation. EXEC-01C: body deleted. Final state: 9-line tombstone, zero selectors. |
| **Evidence** | `grep "import.*App.css" src/**` → 0 matches. `Measure-Object -Line App.css` → 9 lines. |

---

### DEBT-013 — No CSS Design-Token Source of Truth

| Field | Value |
|-------|-------|
| **Status** | ✅ **CLOSED — EXEC-01B** |
| **Opened** | EXEC-00 audit |
| **Description** | CSS custom properties (`--var`) scattered across multiple files with no single authoritative source. `base.css` had tokens. `App.css` had a duplicate `:root {}`. |
| **Resolution** | EXEC-01B: `src/styles/tokens.css` created (36 LOC). All 36 active CSS custom properties migrated. Base.css `:root {}` removed. |
| **EXEC-01C confirmation** | `grep ":root {" src/styles/**` → exactly 1 match: `tokens.css:11`. DEBT-013 remains closed. |

---

### DEBT-016 — `App.css` Body Not Deleted After Tombstone

| Field | Value |
|-------|-------|
| **Status** | ✅ **CLOSED — EXEC-01C** |
| **Opened** | EXEC-01B (residual debt — tombstone header added but body deferred) |
| **Description** | After EXEC-01B added the tombstone header and demoted all body content, 1633+ LOC of dead CSS selectors, variables, and component rules remained in the file below the tombstone. File total: 1642 LOC. |
| **Resolution** | EXEC-01C: entire file body replaced with 9-line tombstone using `Set-Content`. No selectors, no `:root {}`, no runtime content. |
| **Evidence** | `Measure-Object -Line App.css` → 9 lines. `npx vite build` → 47.99 kB CSS (identical to EXEC-01B — confirms zero selector was active). |

---

### DEBT-014 — Undefined CSS Custom Properties

| Field | Value |
|-------|-------|
| **Status** | ⚠️ **REMAINING — deferred to Wave 02** |
| **Opened** | EXEC-01B (discovered during token migration) |
| **Description** | Seven CSS custom properties are referenced in component CSS files but never defined in `tokens.css` or any active CSS file: `--surface`, `--blue`, `--blue-hover`, `--card-bg`, `--border-color`, `--text-primary`, `--text-muted`. These resolve to empty string at runtime — browsers silently ignore them, falling back to inherited or initial values. |
| **Affected files** | `settings.css` (uses `--surface`), `dashboard.css` (uses `--card-bg`, `--border-color`), component files (use `--text-primary`, `--text-muted`) |
| **Risk** | Low runtime risk (browsers handle gracefully), Medium visual-consistency risk (components may render with unintended fallback colors). |
| **Deferred reason** | Defining these tokens requires visual QA to verify intended values. Out of EXEC-01C scope. |
| **Proposed resolution** | Wave 02: add missing token definitions to `tokens.css`, verify visual output against design intent. |

---

### DEBT-015 — `.btn-tiny` Cascade Override in `settings.css`

| Field | Value |
|-------|-------|
| **Status** | ⚠️ **REMAINING — deferred to Wave 02** |
| **Opened** | EXEC-01B (discovered during utilities.css extraction) |
| **Description** | `settings.css` redefines `.btn-tiny` to override the `utilities.css` definition. The override uses `background: var(--surface)` — an undefined token (see DEBT-014). This creates a cascade dependency: `.btn-tiny` buttons inside the settings view will use a different style than `.btn-tiny` elsewhere, and the background will resolve to empty string. |
| **Risk** | Medium — `.btn-tiny` in settings renders without the intended background until `--surface` is defined. May be invisible/transparent. |
| **Deferred reason** | Resolving this requires DEBT-014 to be fixed first. Cannot evaluate `.btn-tiny` override correctness until `--surface` has a value. |
| **Proposed resolution** | Wave 02: define `--surface` in `tokens.css`, then evaluate whether the override in `settings.css` should be a utility extension or removed. |

---

## Cumulative Debt Summary

| ID | Title | Wave Opened | Current Status |
|----|-------|------------|----------------|
| DEBT-001 | `App.css` god-file | EXEC-00 | ✅ CLOSED (EXEC-01C) |
| DEBT-013 | No token SoT | EXEC-00 | ✅ CLOSED (EXEC-01B) |
| DEBT-016 | `App.css` body not deleted | EXEC-01B | ✅ CLOSED (EXEC-01C) |
| DEBT-014 | Undefined CSS tokens | EXEC-01B | ⚠️ REMAINING → Wave 02 |
| DEBT-015 | `.btn-tiny` cascade override | EXEC-01B | ⚠️ REMAINING → Wave 02 |

**Closed this wave (EXEC-01C):** 2 items (DEBT-001, DEBT-016)  
**Previously closed (EXEC-01B):** 1 item (DEBT-013)  
**Remaining after EXEC-01B+01C:** 2 items (DEBT-014, DEBT-015)  
**Net debt reduction EXEC-00 → EXEC-01C:** −3 closed, +2 discovered (originated in EXEC-01B scope expansion)
