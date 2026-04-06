# [EXEC-00] Debt Register Seed — AGent WinWin

> **Scan date:** 2026-04-06  
> **Purpose:** Establishes the initial technical debt register for ongoing hardening waves.  
> All items are OBSERVED from codebase audit — no runtime testing performed in Wave 00.

---

## Debt Register Table

| ID | Area | Severity | Description | Impact | Deferred Reason | Suggested Future Wave | Owner/System | Blocker Status | Notes |
|----|------|----------|-------------|--------|-----------------|----------------------|--------------|----------------|-------|
| **DEBT-001** | CSS Architecture | CRITICAL | `App.css` (1,864 LOC) was never decomposed after `styles/*.css` module strategy was adopted. 17+ component style sections remain in the file alongside the global design tokens. Causes style drift risk, edit collision, and poor reviewability. | Every UI PR touches App.css; merge conflicts likely in multi-developer scenarios; specificity bugs likely between App.css and styles/*.css | Project grew iteratively; CSS split was deferred as each feature was added | Wave 01b — CSS Architecture Stabilization | Frontend | Not blocked; requires visual regression baseline before start | Start with token extraction as lowest-risk first step |
| **DEBT-002** | Rust Domain Model | CRITICAL | `deep_scan.rs` (851 LOC) mixes 6 distinct responsibilities: data structs, safety classification rules, zone catalog (pure data), 4 scan algorithms, and the delete command. The safety classification function (`classify_path`) — the most critical domain rule in the app — is co-located with I/O scanning code. | Safety rules are difficult to test in isolation; zone catalog changes require Rust edits; delete command accesses safety rules through the same namespace as scan algorithms — low separation | Deep scan was built as a single feature sprint; modularization was deferred | Wave 01 — Rust Command Layer Stabilization | Rust/Backend | Requires unit tests for `classify_path` before split to prevent silent regressions | Split order: types → classify → zones → scan → clean → mod |
| **DEBT-003** | Frontend Architecture | HIGH | `App.jsx` (620 LOC) is a god-component: 26 useState hooks, 8 useEffect blocks, 14+ handler functions, 18+ API calls, full render tree, and all app navigation in a single function component. No context, no reducer, no domain hooks. | Every feature addition touches App.jsx; testability of individual features is near-zero; CleanupTab receiving 30+ props is a direct symptom; future developers must read the entire file to understand any single feature | React application was built iteratively; state management layer was deferred as features were added one by one | Wave 02 — Frontend State Architecture | Frontend | Not blocked individually; however coordinate with DEBT-005 (props explosion) | Extract domain hooks first (not context); context design requires careful boundary analysis |
| **DEBT-004** | Rust Security Boundary | HIGH | `cleanup.rs` mixes security whitelist enforcement with command dispatch, path resolution, size estimation, and zip backup implementation (5 responsibilities). The whitelist guard is in the same file as zip I/O code. A developer adding a zip feature could inadvertently weaken the security boundary. | Security boundary at risk of accidental regression; zip backup implementation crowds reviewability of the whitelist | All cleanup features were added to the same file during feature sprints | Wave 01 — Rust Command Layer Stabilization | Rust/Backend | Not blocked | Extract zip backup first → `backup.rs`; whitelist guard stays in `cleanup.rs` |
| **DEBT-005** | Component Coupling | HIGH | `CleanupTab.jsx` receives 30+ props from `App.jsx`. This is a props explosion anti-pattern indicating that state boundaries are wrong — `CleanupTab` is tightly coupled to App.jsx's internal state shape. Any state restructuring in App.jsx breaks CleanupTab compilation. | Rigid coupling prevents independent development; adding any new cleanup feature requires editing both App.jsx and CleanupTab.jsx | No state management layer; all state lives in App.jsx | Wave 02 — Frontend State Architecture | Frontend | Blocked on DEBT-003 resolution (hooks extraction from App.jsx is prerequisite) | Cannot fix props explosion without first deciding state ownership boundary |
| **DEBT-006** | Frontend Components | MEDIUM | `DeepScanTab.jsx` (512 LOC) contains 3 inline sub-components (`ItemRow`, `SectionPanel`, `formatBytes`) that are not individually extractable, reusable, or unit-testable. Confirmation modal pattern is duplicated (also inline in `App.jsx`). | Sub-components not reusable; duplicate modal implementations will diverge; formatBytes vs formatSize inconsistency risk | Components were added inline during deep-scan feature sprint for speed | Wave 02 — Frontend Component Extraction | Frontend | Not blocked | Extract in order: formatBytes (merge) → ItemRow → SectionPanel → ConfirmModal (shared) |
| **DEBT-007** | CSS Size | MEDIUM | `deepscan.css` (594 LOC) and `drivemodal.css` (514 LOC) are both OVERSIZED. `deepscan.css` mirrors the structural complexity of the also-oversized `DeepScanTab.jsx`. CSS-to-JSX ratio for `drivemodal.css` is 2:1. | Large component CSS files reduce navigability; specificity debugging across 500+ LOC CSS is slow | CSS grew with feature additions; decomposition deferred | Wave 02 — CSS split aligned with JSX extraction | Frontend | Blocked on DEBT-006; do not split CSS before JSX sub-components are extracted | Coordinate: extract JSX components then align CSS to each component file |
| **DEBT-008** | Test Coverage | HIGH | No unit tests exist for any Rust command, including the safety-critical `classify_path()` function. No component tests for React tabs. The deletion path (`deep_clean_items`) has a safety re-check but it is not verified by tests. | A regression in `classify_path` could silently allow deletion of Windows system files; no test safety net for any refactoring in Wave 01 or beyond | Testing was out of scope for initial build phases | Wave 04 — Test Coverage | Rust+Frontend | Highest priority blocker for Wave 01 Rust split; `classify_path` tests MUST exist before deep_scan.rs is split | Start with Rust unit tests using `#[cfg(test)]` blocks in classify.rs after extraction |
| **DEBT-009** | State Management | MEDIUM | Frontend has no global state layer (no Context, no Zustand, no Redux). The `diskOverview` state is read by DashboardTab and written by deep scan cleanup — this cross-domain write is currently handled in App.jsx directly. As features grow, cross-domain state mutations will become increasingly tangled. | State mutation side effects (deep scan cleanup refreshing disk overview) are invisible in component tree; adding new cross-domain state forces further App.jsx growth | Context/state layer deferred during build phase | Wave 02 — Frontend State Architecture | Frontend | Not blocked; design before executing DEBT-003 | Evaluate React Context vs. Zustand; Context sufficient for current scale; re-evaluate at v0.2 |
| **DEBT-010** | Utility Duplication | LOW | `formatBytes` (inline in `DeepScanTab.jsx`) and `formatSize` (`constants.js`) are near-identical byte formatting utilities. If thresholds diverge, users will see inconsistent size display between the Deep Scan tab and the Cleanup tab. | Display inconsistency; silent correctness bug if thresholds diverge | Added inline for speed during DeepScanTab implementation | Wave 02 — alongside DEBT-006 | Frontend | Not blocked | Trivial fix: remove inline `formatBytes`, import `formatSize` from constants.js |
| **DEBT-011** | Data Hardcoding | MEDIUM | The zone catalog in `deep_scan.rs::get_scan_zones()` (30+ hardcoded path tuples) and the category list in `deep_scan.rs::classify_path()` are embedded in Rust source. Adding or modifying a cleanup zone requires a full Rust recompile + app rebuild + re-release. | Product cannot be updated for new cleanup zones without a new release; ops/support cannot adjust zone scope | Catalog was part of the initial feature implementation | Wave 03 or later | Rust/Backend | Deferred; low urgency at current product stage | Consider externalizing zone catalog to a JSON config in AppData at v0.2 |
| **DEBT-012** | Error Handling | LOW | Rust commands return `Vec<CleanupResult>` with `success: bool` and `message: String` for error signaling. No typed error hierarchy. Different commands use different error return shapes (`String`, `Result<T, String>`, custom struct). | Inconsistent error handling makes building a unified error reporting layer difficult; cannot pattern-match error types across commands | Typed error hierarchy was deferred during initial implementation | Wave 03 | Rust/Backend | Not blocked; low urgency | Define common `AppError` enum as foundation when Wave 01 Rust refactor happens |
| **DEBT-013** | CSS Design Tokens | MEDIUM | CSS custom properties (design tokens) are defined in `App.css::root {}` AND partially redefined or extended in `styles/base.css`. Single source of truth for the design system does not exist. | Token drift if two files define overlapping variables; maintaining consistent theming requires knowing which file wins | Token consolidation was not done during the styles/* migration | Wave 01b — CSS Architecture Stabilization | Frontend | Not blocked; prerequisite handled during P0-001 App.css decomposition | Create `styles/tokens.css` as sole `:root {}` owner; import first in main.jsx |
| **DEBT-014** | Rust Module Architecture | LOW | All Rust commands sit in a flat `commands/` directory with no sub-domain grouping. As new features are added, discovering which command belongs to which domain becomes harder. | Navigation friction; no enforced module boundaries at the Rust level | Flat structure was sufficient at current scale | Wave 03 | Rust/Backend | Not blocked | When splitting deep_scan.rs (DEBT-002), use `commands/deep_scan/` sub-directory as the pattern for future domain grouping |
| **DEBT-015** | Documentation | LOW | `README.md` is 16 lines. No architecture decision records (ADR), no API contract documentation for Tauri IPC commands, no onboarding guide for contributors. | New contributors cannot understand system without reading all source files | Documentation deferred during rapid build phase | Wave 04 | Project | Not blocked | After structural stabilization (Wave 02+), generate IPC docs from Tauri command signatures |

---

## Severity Legend

| Severity | Definition |
|----------|------------|
| CRITICAL | Risk of data loss, security regression, or systemic maintainability breakdown |
| HIGH | Significantly impairs testability, reviewability, or future development velocity |
| MEDIUM | Noticeable technical friction; will compound over time |
| LOW | Minor; negligible impact at current scale |

---

## Blocker Dependency Map

```
DEBT-008 (no unit tests)
  ← blocks → DEBT-002 (deep_scan.rs split)
  ← blocks → DEBT-004 (cleanup.rs split, security boundary moves)

DEBT-003 (App.jsx god-component)
  ← blocks → DEBT-005 (props explosion in CleanupTab)

DEBT-006 (DeepScanTab inline sub-components)
  ← blocks → DEBT-007 (deepscan.css split)

DEBT-001 (App.css mega-file)
  ← blocks → DEBT-013 (design token source of truth)
```
