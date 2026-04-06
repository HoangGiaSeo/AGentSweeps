# [EXEC-04] CSS Token Audit

**Date:** 2026-04-07  
**Scope:** `src/styles/*.css` — all 11 CSS files  
**Auditor:** Automated scan via `Select-String` + manual confirmation

---

## 1. Canonical Token Inventory (tokens.css `:root`)

| Token | Value | Category |
|-------|-------|----------|
| `--bg-dark` | `#0c0c1d` | Background |
| `--bg-sidebar` | `#111128` | Background |
| `--bg-card` | `#161633` | Background |
| `--bg-card-hover` | `#1c1c42` | Background |
| `--bg-input` | `#0f0f2a` | Background |
| `--border` | `#2a2a50` | Border |
| `--border-light` | `#353565` | Border |
| `--text` | `#d0d0e8` | Text |
| `--text-dim` | `#8888aa` | Text |
| `--text-bright` | `#f0f0ff` | Text |
| `--accent` | `#6c8cff` | Color |
| `--accent-hover` | `#8cacff` | Color |
| `--accent-bg` | `rgba(108,140,255,0.12)` | Color |
| `--green` | `#4caf50` | Color |
| `--green-bg` | `rgba(76,175,80,0.12)` | Color |
| `--yellow` | `#ffb74d` | Color |
| `--yellow-bg` | `rgba(255,183,77,0.12)` | Color |
| `--red` | `#ef5350` | Color |
| `--red-bg` | `rgba(239,83,80,0.12)` | Color |
| `--purple` | `#b388ff` | Color |
| `--purple-bg` | `rgba(179,136,255,0.12)` | Color |
| `--blue` | `#3b82f6` | Color *(NEW — EXEC-04)* |
| `--blue-hover` | `#2563eb` | Color *(NEW — EXEC-04)* |
| `--radius` | `10px` | Spacing |
| `--radius-sm` | `6px` | Spacing |
| `--transition` | `0.2s ease` | Animation |

**Total: 26 canonical tokens** (was 24 before EXEC-04)

---

## 2. Undefined Tokens — Pre-EXEC-04 Inventory

These tokens were referenced across source files but had no definition in `tokens.css`:

| Undefined Token | Files Using It | Count | Canonical Fix |
|----------------|---------------|-------|---------------|
| `--surface` | chat.css, cleanup.css, settings.css | 12 | → `--bg-card` |
| `--surface-hover` | settings.css | 1 | → `--bg-card-hover` |
| `--card-bg` | cleanup.css, settings.css | 3 | → `--bg-card` |
| `--blue` | chat.css, cleanup.css, settings.css, utilities.css | 11 | → **defined** `--blue: #3b82f6` |
| `--blue-hover` | chat.css, utilities.css | 2 | → **defined** `--blue-hover: #2563eb` |
| `--border-color` | deepscan.css, drivemodal.css | 9 | → `--border` |
| `--text-primary` | deepscan.css, drivemodal.css | 14 | → `--text-bright` |
| `--text-secondary` | deepscan.css | 2 | → `--text-dim` |
| `--text-muted` | deepscan.css, drivemodal.css | 23 | → `--text-dim` |
| `--bg-hover` | deepscan.css, drivemodal.css | 6 | → `--bg-card-hover` |

**Total undefined: 10 token names, ~83 individual var() references**

---

## 3. Mapping Rationale

| Undefined | Canonical | Semantic Reasoning |
|----------|-----------|-------------------|
| `--surface` | `--bg-card` | Both denote elevated surface background (#161633) |
| `--surface-hover` | `--bg-card-hover` | Hover state of surface (#1c1c42) |
| `--card-bg` | `--bg-card` | Direct synonym in old naming convention |
| `--blue` | *(defined as new)* | Informational/link color; `rgba(59,130,246,...)` used in hardcoded values confirms #3b82f6 |
| `--blue-hover` | *(defined as new)* | Paired hover shade; #2563eb is standard darker hover |
| `--border-color` | `--border` | Semantic equivalent (#2a2a50); drivemodal fallback was rgba(255,255,255,0.1) |
| `--text-primary` | `--text-bright` | "Primary text" = highest-contrast text (#f0f0ff) |
| `--text-secondary` | `--text-dim` | "Secondary text" = reduced-emphasis text (#8888aa) |
| `--text-muted` | `--text-dim` | "Muted text" = dim text (#8888aa) |
| `--bg-hover` | `--bg-card-hover` | Row hover background = card hover state (#1c1c42) |

---

## 4. Post-Fix Verification

```
$ Select-String -Path *.css -Pattern "var\(--(surface|card-bg|surface-hover|border-color|text-primary|text-secondary|text-muted|bg-hover)"
→ 0 matches
```

**All 10 undefined token names: RESOLVED**  
**Residual undefined tokens: 0**
