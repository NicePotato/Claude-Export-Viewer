# Tasks: spec adoption (V2)

Plan: [plan.md](plan.md). Spec: [../SPEC.md](../SPEC.md).

## Phase A: Gate
- [x] Task 1: Resolve the five open questions (resolved from repo facts or deferred; SPEC.md is V2)
  - Acceptance: each has an answer or an explicit "deferred" in SPEC.md; any scope change is re-approved
  - Verify: SPEC.md Open Questions section empty or marked deferred
  - Files: SPEC.md

## Phase B: Audit (can run in parallel)
- [x] Task 2: Audit criteria 2, 3 and 11 (sorting, empty chats, search)
  - Acceptance: tests cover mixed years, times, formats, bad dates; empty-chat reasons cover every code
  - Verify: test page `PASSED`; list of any missing cases
  - Files: tests/run.js
- [x] Task 3: Audit criteria 4, 5 and 6 (filing, project export, section export)
  - Acceptance: filing survives reload; fence-breaking content, duplicate names, and empty projects exported correctly
  - Verify: tests plus manual check in the browser
  - Files: tests/run.js
- [x] Task 4: Audit criteria 1, 7 and 9 (import, download list, persistence)
  - Acceptance: reference export counts match; download-list file persists nothing; Clear removes all data
  - Verify: manual run with `tests/local/` data; inspect IndexedDB after each step
  - Files: none unless a gap is found
- [x] Task 5: Audit criteria 8 and 10 (dialogs and menus, language switch)
  - Acceptance: Escape, backdrop click, outside click, focus return all work, with real input
  - Verify: manual checklist in the browser
  - Files: none unless a gap is found
- [x] Task 6: Audit criteria 12 and 13 (no outbound requests, test count)
  - Acceptance: zero requests to other hosts during load, import, browse, export
  - Verify: browser network panel, filtered to non-localhost
  - Files: none unless a gap is found

## Checkpoint: audit table
- [x] Task 7: Record results
  - Acceptance: table of criterion, pass or gap, evidence; each gap listed as a new task below
  - Verify: owner reviews the table
  - Files: tasks/audit.md

## Phase C: Fixes (sequential, one branch per gap)
- [x] Task 8: Persistence and prefs tests (branch test/persistence-and-prefs)
  - Acceptance: failing test first, then fix, criterion passes
  - Verify: test page `PASSED`
  - Files: at most about 5 per task

## Phase D: Close
- [ ] Task 9: Final pass and spec update
  - Acceptance: all 13 criteria recorded as passing; SPEC.md reflects any decisions
  - Verify: full test page plus manual checklist
  - Files: SPEC.md, tasks/audit.md
- [ ] Task 10: Housekeeping (needs owner approval to delete)
  - Acceptance: merged branches `fix/sort-by-timestamp`, `fix/empty-chat-date`, `feature/export-manifest-help` removed
  - Verify: `git branch -a`
  - Files: none
