# [EXEC-01C] CSS Ownership Map

**Date:** 2026-04-07  
**Wave:** EXEC-01C — App.css retirement, design-system ownership lock  
**Status:** LOCKED — sole-owner verified for all domains

---

## Design System Cascade Order

```
src/App.jsx import order (runtime cascade):
1. src/styles/tokens.css       ← :root {} — 36 CSS custom properties
2. src/styles/base.css         ← Global reset + app shell + layout primitives
3. src/styles/modal.css        ← Modal overlay + confirm dialog primitives
4. src/styles/utilities.css    ← .btn-* variants + .text-* color helpers
5. src/styles/sidebar.css      ← Sidebar navigation component
6. src/styles/toast.css        ← Toast notification system
7. src/styles/dashboard.css    ← Dashboard tab
8. src/styles/cleanup.css      ← Cleanup tab
9. src/styles/deepscan.css     ← Deep scan tab
10. src/styles/drivemodal.css  ← Drive selection modal
11. src/styles/chat.css        ← Chat tab
12. src/styles/settings.css    ← Settings + history tabs
-- implicit --
src/styles/setup.css           ← Imported directly by SetupModal.jsx
src/App.css                    ← RETIRED — 9-line tombstone, no selectors
```

---

## Ownership Map by Domain

### Tier 0 — Design Tokens

| Selector / Token | Owner | File | LOC |
|-----------------|-------|------|-----|
| `:root {}` (all `--var` definitions) | `tokens.css` | `src/styles/tokens.css` | 36 |
| `--bg-primary`, `--bg-secondary`, `--bg-tertiary` | `tokens.css` | ↑ | — |
| `--border-primary` | `tokens.css` | ↑ | — |
| `--text-primary`, `--text-secondary`, `--text-muted` | `tokens.css` | ↑ | — |
| `--accent`, `--accent-hover` | `tokens.css` | ↑ | — |
| `--green`, `--green-hover`, `--yellow`, `--red`, `--purple` | `tokens.css` | ↑ | — |
| `--radius-sm`, `--radius-md`, `--radius-lg` | `tokens.css` | ↑ | — |
| `--transition-base` | `tokens.css` | ↑ | — |
| `--card-bg`, `--border-color` *(undefined, DEBT-014)* | `tokens.css` | ↑ | — |
| `--surface`, `--blue`, `--blue-hover` *(undefined, DEBT-014)* | ❌ NONE | — | — |

**Parallel owner: NONE.** `tokens.css` is the sole `:root {}` block in `src/styles/`.

---

### Tier 1 — Shell & Layout

| Selector | Owner | File |
|----------|-------|------|
| `*`, `::before`, `::after` (reset) | `base.css` | `src/styles/base.css` |
| `body` | `base.css` | ↑ |
| `.app` | `base.css` | ↑ |
| `.main-content` | `base.css` | ↑ |
| `.page`, `.page-title`, `.page-subtitle` | `base.css` | ↑ |
| `.loading-overlay`, `.loading-spinner` | `base.css` | ↑ |
| `.section`, `.section-title`, `.section-header`, `.section-badge` | `base.css` | ↑ |
| `.empty-state`, `.empty-state-icon`, `.empty-state-text` | `base.css` | ↑ |
| `.main-content::-webkit-scrollbar` | `base.css` | ↑ |

**Total:** `base.css` 135 LOC — shell only, no tokens, no buttons, no modals.

---

### Tier 2 — Shared Primitives

#### Modal Primitives

| Selector | Owner | File |
|----------|-------|------|
| `.modal-overlay` | `modal.css` | `src/styles/modal.css` |
| `.modal` | `modal.css` | ↑ |
| `.confirm-list`, `.confirm-item`, `.confirm-item-icon`, `.confirm-item-text` | `modal.css` | ↑ |
| `.modal-buttons`, `.modal-button`, `.modal-button-cancel` | `modal.css` | ↑ |

**Total:** `modal.css` 60 LOC. No modal primitives remain in `base.css`.

#### Button & Text Utilities

| Selector | Owner | File |
|----------|-------|------|
| `.btn` (base button) | `utilities.css` | `src/styles/utilities.css` |
| `.btn-scan` | `utilities.css` | ↑ |
| `.btn-small` | `utilities.css` | ↑ |
| `.btn-tiny` | `utilities.css` | ↑ |
| `.btn-ai-large` | `utilities.css` | ↑ |
| `.btn-execute` | `utilities.css` | ↑ |
| `.btn-cancel` | `utilities.css` | ↑ |
| `.btn-danger` | `utilities.css` | ↑ |
| `.text-green`, `.text-yellow`, `.text-red`, `.text-dim` | `utilities.css` | ↑ |
| `.btn-tiny` *(cascade override — DEBT-015)* | `settings.css` | `src/styles/settings.css` |

**NOTE (DEBT-015):** `settings.css` redefines `.btn-tiny` for a settings-context override using `var(--surface)`. This is cascade-intentional (not parallel ownership), but `--surface` is undefined in `tokens.css`. Tracked as DEBT-015.

---

### Tier 3 — Navigation

| Selector Group | Owner | File | LOC |
|---------------|-------|------|-----|
| `.sidebar`, `.sidebar-header`, `.sidebar-brand` | `sidebar.css` | `src/styles/sidebar.css` | 83 |
| `.sidebar-tab`, `.sidebar-tab-icon`, `.sidebar-tab-label` | `sidebar.css` | ↑ | — |
| `.sidebar-footer` | `sidebar.css` | ↑ | — |

---

### Tier 4 — Notifications

| Selector Group | Owner | File | LOC |
|---------------|-------|------|-----|
| `.toast-container`, `.toast`, `.toast-content` | `toast.css` | `src/styles/toast.css` | 71 |
| `.toast-success`, `.toast-error`, `.toast-warning`, `.toast-info` | `toast.css` | ↑ | — |
| `.toast-close`, `.toast-message` | `toast.css` | ↑ | — |
| Toast slide-in/out animations | `toast.css` | ↑ | — |

---

### Tier 5 — Application Tabs

| Tab | Owner | File | LOC |
|-----|-------|------|-----|
| Dashboard | `dashboard.css` | `src/styles/dashboard.css` | 164 |
| Cleanup | `cleanup.css` | `src/styles/cleanup.css` | 381 |
| Deep Scan | `deepscan.css` | `src/styles/deepscan.css` | 514 |
| Chat | `chat.css` | `src/styles/chat.css` | 247 |
| Settings + History | `settings.css` | `src/styles/settings.css` | 391 |

---

### Tier 6 — Overlay Components

| Component | Owner | File | LOC |
|-----------|-------|------|-----|
| Drive selection modal (`.dmodal-*`) | `drivemodal.css` | `src/styles/drivemodal.css` | 449 |
| Setup wizard modal (`.setup-*`) | `setup.css` | `src/styles/setup.css` | 143 |

---

### Retired / No Owner

| File | Status |
|------|--------|
| `src/App.css` | **RETIRED** — 9-line tombstone (EXEC-01C), zero selectors |
| `src/index.css` | 1-line comment, zero selectors — stub unchanged since init |

---

## LOC Summary

| File | LOC | Tier |
|------|-----|------|
| `src/App.css` | 9 (tombstone) | RETIRED |
| `src/index.css` | 1 (comment stub) | Init artifact |
| `src/styles/tokens.css` | 36 | Tier 0 |
| `src/styles/base.css` | 135 | Tier 1 |
| `src/styles/modal.css` | 60 | Tier 2 |
| `src/styles/utilities.css` | 100 | Tier 2 |
| `src/styles/sidebar.css` | 83 | Tier 3 |
| `src/styles/toast.css` | 71 | Tier 4 |
| `src/styles/dashboard.css` | 164 | Tier 5 |
| `src/styles/cleanup.css` | 381 | Tier 5 |
| `src/styles/deepscan.css` | 514 | Tier 5 |
| `src/styles/chat.css` | 247 | Tier 5 |
| `src/styles/settings.css` | 391 | Tier 5 |
| `src/styles/drivemodal.css` | 449 | Tier 6 |
| `src/styles/setup.css` | 143 | Tier 6 |
| **Active total** | **2,834** | (excl. tombstone/stub) |

---

## Ownership Guarantee Matrix

| Property | Verified |
|----------|---------|
| Exactly one `:root {}` block | ✅ FACT — `tokens.css` only (grep confirmed) |
| No parallel button owners | ✅ `utilities.css` sole source; `settings.css` is cascade override |
| No parallel modal owners | ✅ `modal.css` sole source; app-specific modals in own files |
| No dangling selectors in `App.css` | ✅ 9-line tombstone — zero selectors |
| Cascade order documented | ✅ App.jsx import block with comments |

**LOCKED as of EXEC-01C. Next unlock event: Wave 02 (DEBT-014 token resolution).**
