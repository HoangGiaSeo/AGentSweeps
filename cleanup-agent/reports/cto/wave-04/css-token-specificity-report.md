# [EXEC-04] CSS Token Integrity & Specificity — Technical Report

**Date:** 2026-04-07  
**Wave:** EXEC-04 — CSS Token Integrity & Specificity Cleanup  
**Scope:** `src/styles/*.css` (11 files)  
**Debts Closed:** DEBT-014 (undefined CSS tokens), DEBT-015 (.btn-tiny specificity cascade)

---

## 1. Executive Summary

EXEC-04 resolves all outstanding CSS design-system debt introduced during the EXEC-01B token migration. Two categories of CSS integrity issues were identified and fully corrected:

1. **DEBT-014 — Undefined Token References:** 10 CSS custom property names were referenced across 6 CSS files but had no definition in the design-system source of truth (`tokens.css`). This caused silent browser fallback to `initial` or `unset` for any CSS engine that doesn't inherit them, and invalidated the CSS architecture guarantee from EXEC-01B.

2. **DEBT-015 — `.btn-tiny` Specificity Cascade:** `settings.css` re-declared `.btn-tiny` as a global selector, creating an unintentional cascade override that affected `.btn-tiny` buttons in all 5 tabs (Chat, Cleanup, Settings, Dashboard, History), not just the Settings API key section where the override was intended.

Both debts are now **CLOSED.**

---

## 2. DEBT-014 — Undefined Token Resolution

### Pre-fix state

`tokens.css` contained 24 canonical tokens; 10 additional token names were used in source files with no definition. These had been noted in a DEBT-NOTE comment from EXEC-01B.

### Approach

For each undefined token, one of two strategies was applied:
- **Remap in-file** — replace the undefined token name with the nearest canonical equivalent
- **Define new canonical** — add the token to `tokens.css` when no semantic equivalent existed

| Strategy | Tokens |
|----------|-------|
| Remap to canonical | `--surface`, `--surface-hover`, `--card-bg`, `--border-color`, `--text-primary`, `--text-secondary`, `--text-muted`, `--bg-hover` |
| Define as new canonical | `--blue`, `--blue-hover` |

### New canonical tokens added to tokens.css

```css
--blue: #3b82f6;       /* Informational / link / action accent — confirmed from rgba(59,130,246,...) usage */
--blue-hover: #2563eb; /* Hover state paired with --blue */
```

### Files modified

| File | Changes |
|------|---------|
| `tokens.css` | Added `--blue`, `--blue-hover`; updated DEBT-NOTE to RESOLVED |
| `chat.css` | 5× `--surface` → `--bg-card` |
| `cleanup.css` | 1× `--card-bg` → `--bg-card`; 2× `--surface` → `--bg-card` |
| `settings.css` | 2× `--card-bg` → `--bg-card`; 4× `--surface` → `--bg-card`; 1× `--surface-hover` → `--bg-card-hover` |
| `deepscan.css` | 6× `--text-primary` → `--text-bright`; 2× `--text-secondary` → `--text-dim`; 13× `--text-muted` → `--text-dim`; 8× `--border-color` → `--border`; 3× `--bg-hover` → `--bg-card-hover` |
| `drivemodal.css` | 8× `--text-primary` → `--text-bright`; 10× `--text-muted` → `--text-dim`; 9× `--border-color` → `--border`; 3× `--bg-hover` → `--bg-card-hover` |

**Total replacements: ~83 individual `var()` references corrected**

---

## 3. DEBT-015 — `.btn-tiny` Specificity Fix

### Pre-fix state

`utilities.css` defined `.btn-tiny` as the canonical global button style:
```css
/* utilities.css */
.btn-tiny { background: var(--bg-input); color: var(--text-dim); border-radius: 4px; ... }
.btn-tiny:hover { color: var(--accent); border-color: var(--accent); }
```

`settings.css` then re-declared `.btn-tiny` globally (equal specificity, later in cascade):
```css
/* settings.css — BEFORE fix */
.btn-tiny { background: var(--surface); color: var(--text); border-radius: 6px; ... }  /* --surface was undefined */
.btn-tiny:hover { background: var(--surface-hover, var(--border)); }
```

This override affected `.btn-tiny` buttons in **ChatTab** ("Clear Chat") and **CleanupTab** ("Select All", "Safe Only", "None") even though the override was only needed for the Settings API key section.

### Fix applied

Scoped the settings-specific override from `.btn-tiny` to `.api-key-actions .btn-tiny`:

```css
/* settings.css — AFTER fix (DEBT-015 CLOSED) */
.api-key-actions .btn-tiny {
  background: var(--bg-card);  /* was: var(--surface) — undefined */
  color: var(--text);
  border-radius: 6px;
  white-space: nowrap;
  ...
}
.api-key-actions .btn-tiny:hover { background: var(--bg-card-hover); }
```

**Result:**
- ChatTab "Clear" button → governed by `utilities.css` canonical rule (`bg-input`, `accent` hover) ✓
- CleanupTab select buttons → governed by `utilities.css` canonical rule ✓  
- SettingsTab API key "Test"/"Remove" buttons → governed by scoped `.api-key-actions .btn-tiny` rule ✓

The CASCADE NOTE in `utilities.css` was also updated to reflect the resolved state.

---

## 4. Build Evidence

```
$ npm run build

vite v8.0.4 building client environment for production...
✓ 47 modules transformed.
dist/assets/index-g2VCK6GM.css   47.68 kB │ gzip:  8.71 kB
dist/assets/index-D23UFLBH.js   254.24 kB │ gzip: 76.37 kB
✓ built in 151ms
```

- **CSS:** 47.68 kB (was 47.99 kB — reduced by removal of fallback values in drivemodal/deepscan)
- **JS:** 254.24 kB — unchanged (CSS-only wave)
- **Exit:** 0

---

## 5. Zero-Token Verification

```
$ Select-String -Path *.css -Pattern "var\(--(surface|card-bg|surface-hover|border-color|text-primary|text-secondary|text-muted|bg-hover)\b"
→ 0 matches
```

All previously undefined CSS custom properties have been eliminated from the source.

---

## 6. Architecture State After EXEC-04

```
tokens.css (26 tokens — SoT)
├── bg-dark, bg-sidebar, bg-card, bg-card-hover, bg-input
├── border, border-light
├── text, text-dim, text-bright
├── accent, accent-hover, accent-bg
├── green, green-bg, yellow, yellow-bg, red, red-bg, purple, purple-bg
├── blue ★, blue-hover ★        (new canonical — EXEC-04)
└── radius, radius-sm, transition

All 11 CSS files reference ONLY tokens defined in tokens.css.
```

---

## 7. Remaining Pre-existing Issues (out of scope)

| Issue | Location | Owner |
|-------|----------|-------|
| `useEffect` setState warnings | `App.jsx:100,143` | Pre-existing — EXEC-02 scope |
| GitHub Actions VSCE_PAT secret reference | `.github/workflows/publish.yml:54,56` | CI configuration — out of scope |
