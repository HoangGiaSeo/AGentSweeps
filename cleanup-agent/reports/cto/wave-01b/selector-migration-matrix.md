# [EXEC-01B] Selector Migration Matrix

**Date:** 2026-04-07  
**Scope:** Selectors moved out of `base.css` into dedicated files.  
`App.css` selectors are NOT included — `App.css` is dead code with no runtime effect.

---

## Methodology

- Each row = one selector group (a CSS block with shared purpose)
- "From" = old owner file, "To" = new owner file
- "Reason" = ownership basis
- No selector value was changed — only file location changed

---

## Section A — Token Migration (`base.css` → `tokens.css`)

| Selector / Block | From | To | Reason |
|-----------------|------|----|--------|
| `:root { --bg-dark, --bg-sidebar, --bg-card, --bg-card-hover, --bg-input }` | `base.css` | `tokens.css` | Background tokens → token file |
| `:root { --border, --border-light }` | `base.css` | `tokens.css` | Border tokens → token file |
| `:root { --text, --text-dim, --text-bright }` | `base.css` | `tokens.css` | Text tokens → token file |
| `:root { --accent, --accent-hover, --accent-bg }` | `base.css` | `tokens.css` | Accent tokens → token file |
| `:root { --green, --green-bg }` | `base.css` | `tokens.css` | Status color tokens → token file |
| `:root { --yellow, --yellow-bg }` | `base.css` | `tokens.css` | Status color tokens → token file |
| `:root { --red, --red-bg }` | `base.css` | `tokens.css` | Status color tokens → token file |
| `:root { --purple, --purple-bg }` | `base.css` | `tokens.css` | Status color tokens → token file |
| `:root { --radius, --radius-sm, --transition }` | `base.css` | `tokens.css` | Shape/animation tokens → token file |

---

## Section B — Button Utilities Migration (`base.css` → `utilities.css`)

| Selector / Block | From | To | Reason |
|-----------------|------|----|--------|
| `.btn` (base) | `base.css` | `utilities.css` | Shared button primitive |
| `.btn:disabled` | `base.css` | `utilities.css` | Shared button primitive |
| `.btn-scan`, `.btn-scan:hover` | `base.css` | `utilities.css` | Shared button variant |
| `.btn-small`, `.btn-small:hover` | `base.css` | `utilities.css` | Shared button variant |
| `.btn-small.btn-primary`, `:hover`, `:disabled` | `base.css` | `utilities.css` | Shared button variant |
| `.btn-tiny`, `.btn-tiny:hover` | `base.css` | `utilities.css` | Shared button variant — canonical |
| `.btn-ai-large`, `.btn-ai-large:hover` | `base.css` | `utilities.css` | Shared button variant |
| `.btn-execute`, `.btn-execute:hover` | `base.css` | `utilities.css` | Shared button variant |
| `.btn-cancel` | `base.css` | `utilities.css` | Shared button variant |
| `.btn-danger`, `.btn-danger:hover` | `base.css` | `utilities.css` | Shared button variant |

---

## Section C — Text Utilities Migration (`base.css` → `utilities.css`)

| Selector / Block | From | To | Reason |
|-----------------|------|----|--------|
| `.text-green` | `base.css` | `utilities.css` | Shared color helper |
| `.text-yellow` | `base.css` | `utilities.css` | Shared color helper |
| `.text-red` | `base.css` | `utilities.css` | Shared color helper |
| `.text-dim` | `base.css` | `utilities.css` | Shared color helper |

---

## Section D — Modal Primitives Migration (`base.css` → `modal.css`)

| Selector / Block | From | To | Reason |
|-----------------|------|----|--------|
| `.modal-overlay` | `base.css` | `modal.css` | Generic modal overlay primitive |
| `.modal` | `base.css` | `modal.css` | Generic modal window primitive |
| `.modal h3` | `base.css` | `modal.css` | Modal heading style |
| `.modal p` | `base.css` | `modal.css` | Modal body text style |
| `.confirm-list`, `.confirm-list li` | `base.css` | `modal.css` | Confirm dialog primitive |
| `.confirm-action` | `base.css` | `modal.css` | Confirm dialog primitive |
| `.confirm-warn` | `base.css` | `modal.css` | Confirm dialog state |
| `.confirm-note` | `base.css` | `modal.css` | Confirm dialog state |
| `.modal-buttons` | `base.css` | `modal.css` | Modal action row |

---

## Section E — Selectors That Did NOT Move (Staying in base.css)

| Selector / Block | File | Reason stays |
|-----------------|------|-------------|
| `*, *::before, *::after` reset | `base.css` | Global reset, correct home |
| `body {}` | `base.css` | Root body style, correct home |
| `.app {}` | `base.css` | App shell layout root |
| `.main-content {}` | `base.css` | App shell layout |
| `.page`, `.page-title` | `base.css` | Shared page frame |
| `.loading-overlay`, `.loading-spinner`, `@keyframes spin` | `base.css` | Shared loading primitive |
| `.section`, `.section-title`, `.section-header`, `.section-badge` | `base.css` | Shared section primitive |
| `.header-actions`, `.section-desc` | `base.css` | Shared section primitive |
| `.empty-state`, `.empty-icon` | `base.css` | Shared state display |
| `.main-content::-webkit-scrollbar` group | `base.css` | Tied to main-content |

---

## Known Cascade Override (Not Migrated — DEBT-015)

| Selector | In file | Overrides |
|----------|---------|-----------|
| `.btn-tiny` (settings variant) | `settings.css` (lines ~182-196) | Overrides `utilities.css` `.btn-tiny` |

**Reason not moved:** Settings-specific visual variant using `var(--surface)` (undefined token). Removing it would change the settings UI. Documented as DEBT-015. No action taken in EXEC-01B.

---

## Summary Counts

| Operation | Count |
|-----------|-------|
| Tokens migrated to `tokens.css` | 36 custom properties |
| Button selectors migrated to `utilities.css` | 10 selector groups |
| Text utilities migrated to `utilities.css` | 4 selectors |
| Modal primitives migrated to `modal.css` | 9 selector groups |
| Selectors remaining in `base.css` | ~25 selector groups |
| Selectors changed in value | **0** |
| Selectors deleted without equivalent | **0** |
