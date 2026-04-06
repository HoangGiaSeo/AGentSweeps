# Design System Ownership Map

**Version:** v0.1.0  
**Locked:** 2026-04-07 (EXEC-05 Documentation Lock)

---

## Architecture Principle

One `tokens.css` file is the single source of truth for all CSS custom properties. All other CSS files consume tokens from `:root`. No CSS file except `tokens.css` may define `:root` properties.

---

## Token Registry (26 canonical tokens)

Source file: `src/styles/tokens.css` (36 LOC)  
Established: EXEC-01B (extracted from base.css)  
EXEC-04 change: resolved all undefined tokens; added `--blue`, `--blue-hover`

| Token | Value | Category | Added |
|-------|-------|----------|-------|
| `--bg-dark` | `#0c0c1d` | Background | EXEC-01B |
| `--bg-sidebar` | `#111128` | Background | EXEC-01B |
| `--bg-card` | `#161633` | Background | EXEC-01B |
| `--bg-card-hover` | `#1c1c42` | Background | EXEC-01B |
| `--bg-input` | `#0f0f2a` | Background | EXEC-01B |
| `--border` | `#2a2a50` | Border | EXEC-01B |
| `--border-light` | `#353565` | Border | EXEC-01B |
| `--text` | `#d0d0e8` | Text | EXEC-01B |
| `--text-dim` | `#8888aa` | Text | EXEC-01B |
| `--text-bright` | `#f0f0ff` | Text | EXEC-01B |
| `--accent` | `#6c8cff` | Color | EXEC-01B |
| `--accent-hover` | `#8cacff` | Color | EXEC-01B |
| `--accent-bg` | `rgba(108,140,255,0.12)` | Color (alpha) | EXEC-01B |
| `--green` | `#4caf50` | Semantic | EXEC-01B |
| `--green-bg` | `rgba(76,175,80,0.12)` | Semantic (alpha) | EXEC-01B |
| `--yellow` | `#ffb74d` | Semantic | EXEC-01B |
| `--yellow-bg` | `rgba(255,183,77,0.12)` | Semantic (alpha) | EXEC-01B |
| `--red` | `#ef5350` | Semantic | EXEC-01B |
| `--red-bg` | `rgba(239,83,80,0.12)` | Semantic (alpha) | EXEC-01B |
| `--purple` | `#b388ff` | Semantic | EXEC-01B |
| `--purple-bg` | `rgba(179,136,255,0.12)` | Semantic (alpha) | EXEC-01B |
| `--blue` | `#3b82f6` | Color | **EXEC-04** |
| `--blue-hover` | `#2563eb` | Color | **EXEC-04** |
| `--radius` | `10px` | Layout | EXEC-01B |
| `--radius-sm` | `6px` | Layout | EXEC-01B |
| `--transition` | `0.2s ease` | Animation | EXEC-01B |

**Total: 26 tokens**

---

## Retired Aliases (resolved EXEC-04, DEBT-014 closed)

These token names were used in CSS files but never defined in `:root`. All were resolved in EXEC-04.

| Alias Used | Resolved To | Where Fixed |
|------------|-------------|-------------|
| `--surface` | `--bg-card` | cleanup.css, deepscan.css, dashboard.css |
| `--card-bg` | `--bg-card` | (same) |
| `--surface-hover` | `--bg-card-hover` | (same) |
| `--border-color` | `--border` | (same) |
| `--text-primary` | `--text-bright` | (same) |
| `--text-secondary` | `--text-dim` | (same) |
| `--text-muted` | `--text-dim` | (same) |
| `--bg-hover` | `--bg-card-hover` | (same) |

---

## CSS File Inventory (13 files)

App import chain (order in App.jsx):  
`tokens → base → modal → utilities → sidebar → toast → dashboard → cleanup → deepscan → drivemodal → chat → settings → setup`

| File | Layer | Owner / Scope | Notes |
|------|-------|--------------|-------|
| `tokens.css` | Token | Global SoT — `:root` only | 26 custom properties; never edit selector styles here |
| `base.css` | Base | App frame, sidebar layout, page containers | Shell-level layout primitives |
| `modal.css` | Shared | Generic modal overlay + container | Used by SetupModal and DriveModal |
| `utilities.css` | Shared | Button system (`.btn`, `.btn-small`, `.btn-tiny`, `.badge-*`, misc) | `.btn-tiny` added EXEC-04 (DEBT-015 closed) |
| `sidebar.css` | Component | Sidebar nav, nav item, active states | Scoped to `.sidebar`, `.nav-*` |
| `toast.css` | Component | Toast notification UI | Scoped to `.toast-*` |
| `dashboard.css` | Component | Disk card grid, stat blocks | Scoped to `.dashboard-*`, `.disk-*` |
| `cleanup.css` | Component | Cleanup tab panels, progress, results | Scoped to `.cleanup-*` |
| `deepscan.css` | Component | Deep scan results, zone bars | Scoped to `.deep-scan-*`, `.zone-*` |
| `drivemodal.css` | Component | DriveModal inner layout | Scoped to `.drive-modal-*` |
| `chat.css` | Component | Chat message list, bubbles, input | Scoped to `.chat-*` |
| `settings.css` | Component | Settings form, API key rows, schedule | Scoped to `.settings-*` |
| `setup.css` | Component | SetupModal step content | Scoped to `.setup-*` |

**`App.css` status:** RETIRED. 9-LOC tombstone comment only. No active selectors. Not in App.jsx import chain. Created EXEC-01B; confirmed dead EXEC-01C.

---

## Button System (`utilities.css`)

`.btn` is the canonical base class. Variants are modifier classes.

| Class | Size | Use Case |
|-------|------|---------|
| `.btn` | Normal | Primary action buttons |
| `.btn-small` | Small | Secondary actions, confirmations |
| `.btn-tiny` | Tiny | Inline actions (copy, remove, edit) — added EXEC-04 |
| `.btn-primary` | — | Accent color fill |
| `.btn-secondary` | — | Muted / ghost style |
| `.btn-danger` | — | Red destructive action |
| `.btn-success` | — | Green confirm action |

---

## Specificity Contract

- All component CSS files use class selectors only (`.class-name`), no element selectors in components
- No `!important` unless absolutely required for animation override
- No inline styles in JSX — all presentation via `className`
- Tokens are consumed as `var(--token-name)` — never hardcoded hex values in component CSS

---

## Undefined Token Policy (EXEC-04 closure)

**Baseline after EXEC-04:** Zero usages of undefined tokens across entire `src/styles/` directory.  
**Gate:** `grep -r 'var(--' src/styles/ | grep -v 'tokens.css'` output verified against token list.  
**New token procedure:** Add to `tokens.css` `:root` block first; then use in component CSS.
