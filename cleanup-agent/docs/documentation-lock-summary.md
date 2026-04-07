# Documentation Lock Summary

**Version:** v0.1.0  
**Locked:** 2026-04-07 (EXEC-05 Documentation Lock → refreshed EXEC-07)
**Status:** LOCKED ✅ — EXEC-07 FULL PASS (CTO verdict 2026-04-07)

---

## Purpose

This document declares the system state as of the EXEC-05 Documentation Lock wave. It is the canonical source-of-truth summary for any engineer onboarding to this codebase after EXEC-05. All claims here are verifiable against actual source files.

---

## System Identity

| Property | Value |
|----------|-------|
| Application | AGent WinWin (dev-cleanup-agent) |
| Version | v0.1.0 |
| Stack | Tauri 2 + React 18 + Vite 8 + Rust (stable/MSVC) |
| Platform | Windows (MSVC toolchain) |
| Repository | `https://github.com/HoangGiaSeo/AGentSweeps.git` |
| Branch | `main` |
| HEAD at lock | `7a77572` (EXEC-07 verdict commit) |
| HEAD at EXEC-07 content | `57ab566` |
| HEAD at EXEC-05 lock | `bd7cbdd` |
| Build date | 2026-04-07 |

---

## Architecture Summary

The system is a desktop AI-assisted disk cleanup agent with:

- A **React shell** (`App.jsx`, 260 LOC) that orchestrates domain hooks and routes tab renders
- **6 domain hooks** that own all feature state and IPC calls  
- **`useChat.js` augmented with tool orchestration (EXEC-06):** 5 pure-function helper modules in `src/hooks/chatTools/`; 2 read-only tools (`disk_overview`, `cleanup_log`); locked V1 keyword allowlist; mandatory redaction pipeline; freshness cache policy
- **13 CSS files** with a single `tokens.css` source of truth for 26 custom properties
- A **Tauri IPC bridge** exposing 27 Rust commands across 11 modules
- **Rust backend** providing disk scanning, cleanup whitelisting, AI integration, settings persistence, scheduling, and deep scan
- **48 Rust unit tests** covering cleanup whitelisting and deep scan path safety
- **71 Vitest unit tests** covering Agentic Chat V1 trigger policy, freshness, redaction, and context composition

---

## Documentation Files (EXEC-07 Refresh)

| File | Description | Status |
|------|-------------|--------|
| `docs/system-build-history.md` | Full wave history (pre-wave → EXEC-06R); verdict, runtime, debt delta per wave | **Updated EXEC-07** |
| `docs/current-system-map.md` | Layer-by-layer system map with source-of-truth file per domain; Agentic Chat V1 section added | **Updated EXEC-07** |
| `docs/frontend-state-ownership-map.md` | All state atoms, hooks, computed values, IPC calls, cross-domain callbacks; `useChat` fully expanded including tool path owners | **Updated EXEC-07** |
| `docs/backend-command-runtime-map.md` | All 27 Tauri commands with Rust file, api.js export, and caller hook | Unchanged (no new commands) |
| `docs/design-system-ownership-map.md` | 26 canonical tokens, 13 CSS files, retired alias history, button system; `chat.css` ToolBubble scope added | **Updated EXEC-07** |
| `docs/open-debt-register.md` | 30 tracked debts: 19 closed, 0 open, 11 noted; D01 closed EXEC-06R; D02–D06 added EXEC-06 | **Updated EXEC-07** |
| `docs/gate-baselines.md` | 8 verified gates (Gate 8 vitest added EXEC-06); regression thresholds updated; run history extended | **Updated EXEC-07** |
| `docs/agentic-chat-runtime-map.md` | Tool-augmented chat runtime map: tool registry, trigger policy, data sources, redaction/freshness owner, UI owner, provider safety | **New EXEC-07** |
| `docs/documentation-lock-summary.md` | This file — system state declaration and docs index | **Updated EXEC-07** |

---

## Gate Status at Lock (EXEC-07 Refresh)

| Gate | Status | Value |
|------|--------|-------|
| `cargo check` | ✅ PASS | EXIT:0 |
| `cargo test --lib` | ✅ PASS | 48/48 |
| `npm run build` | ✅ PASS | EXIT:0 (CSS 49.15 kB / JS 260.11 kB) |
| Undefined CSS tokens | ✅ PASS | 0 matches |
| App.jsx LOC | ✅ PASS | 260 LOC |
| Tauri commands registered | ✅ PASS | 27 |
| Actionable open debts | ✅ PASS | 0 |
| Vitest unit tests | ✅ PASS | 71/71 |

**All 8 gates PASS at EXEC-07 refresh point.**

---

## Zone Ownership — Quick Reference

| Zone | Owner File |
|------|-----------|
| App shell state | `src/App.jsx` |
| Cleanup domain | `src/hooks/useCleanup.js` |
| Deep scan domain | `src/hooks/useDeepScan.js` |
| Chat domain + tool orchestration | `src/hooks/useChat.js` |
| Chat tool registry (V1 allowlist) | `src/hooks/chatTools/toolRegistry.js` |
| Chat trigger detection + exclusion | `src/hooks/chatTools/intentDetector.js` |
| Chat freshness policy | `src/hooks/chatTools/freshnessPolicy.js` |
| Chat redaction pipeline | `src/hooks/chatTools/redactionPipeline.js` |
| Chat context composer | `src/hooks/chatTools/contextComposer.js` |
| Tool evidence UI | `src/tabs/ChatTab.jsx` (`ToolBubble`) |
| Schedule domain | `src/hooks/useSchedule.js` |
| API key domain | `src/hooks/useApiKeys.js` |
| Toast utility | `src/hooks/useToast.js` |
| CSS tokens (SoT) | `src/styles/tokens.css` |
| IPC adapter | `src/api.js` |
| Tauri command registry | `src-tauri/src/lib.rs` |
| Cleanup security boundary | `src-tauri/src/commands/cleanup.rs` (`ALLOWED_ACTIONS`) |
| Deep scan safety boundary | `src-tauri/src/commands/deep_scan/classify.rs` |
| Settings persistence | `src-tauri/src/commands/settings.rs` |

---

## What This Lock Means

1. **Source of truth per zone is identified.** No zone has ambiguous ownership — including Agentic Chat V1 tool path (5 chatTools helper modules, each with a single concern).
2. **All architecture decisions from EXEC-00 through EXEC-06R are documented.** A new developer can read `system-build-history.md` to understand why the current architecture exists.
3. **All gate baselines are locked.** Any regression is detectable by re-running the 8 gates in `gate-baselines.md`.
4. **Zero actionable open debts.** The 11 NOTED items are acknowledged and scoped as non-blocking. "0 open" means 0 *actionable* open debts — there are 11 tracked noted items that are intentionally deferred. These are not hidden.
5. **Documentation matches codebase reality.** All claims in this docs set were verified against actual files during EXEC-07 audit.
6. **Agentic Chat V1 is not an autonomous agent.** It is a tool-augmented chat that calls 2 read-only IPC functions and injects redacted context. No destructive commands are accessible from the chat path.
7. **CTO FULL PASS issued 2026-04-07.** Any future wave must begin with Blueprint Review (new capability) or Hardening Wave (audit/cleanup/parity).

---

## Next Wave Guidance

Future feature work can proceed with:
- Domain hook pattern: add state to the owning hook; inject callbacks for cross-domain writes
- New Tauri command: add to `lib.rs` `generate_handler!`, add `api.js` export, add hook call
- New CSS tokens: add to `tokens.css` `:root` first; then use in component CSS; update `design-system-ownership-map.md`
- New debt: add to `reports/cto/wave-{N}/debt-register.md` AND `docs/open-debt-register.md`
- **New chat tool (V2+):** requires new blueprint wave; do NOT add keywords to `toolRegistry.js` inline
- **Agentic Chat expansion:** any new capability must open a blueprint-approved wave; keyword allowlist changes are governed by `toolRegistry.js` invariants
