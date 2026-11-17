# Plan: Claude Export Viewer — V1 spec adoption

Spec: [SPEC.md](../SPEC.md) (V2, approved; folds in PRs #12-#14). Task list: [todo.md](todo.md).

## What this plan is
V1 is already built and merged (PRs #1-#14), so there is nothing to build from scratch. This plan makes the
spec true and checkable: verify each success criterion against the running app, close the gaps found, and
settle the open questions that block later work. No new features.

## Components and dependencies
| Area | Spec criteria | Depends on |
|---|---|---|
| Import and persistence | 1, 7, 9 | none |
| Browse (sort, group, empties, search) | 2, 3, 11 | import |
| Projects, section export, filing | 4, 5, 6 | browse |
| UI behaviour (dialogs, menus) | 8 | none |
| i18n | 10 | none |
| Privacy (no network) | 12 | all |
| Test suite | 13 | all |

## Implementation order
1. Open questions: resolved from the repository or deferred in SPEC.md V2 (done in this turn). Owner can promote any deferred item.
2. Audit each criterion, cheapest first: the ones covered by unit tests, then the ones needing the browser.
3. Fix gaps in small slices, one criterion per branch, test first.
4. Final full pass and spec update.

## Parallel versus sequential
- Parallel: the audits for criteria 2, 3, 5 (pure logic, tests only) and 7 (browser only) touch different files.
- Sequential: any fix touching `src/App.js` or `src/lib/importer.js` goes one at a time. The final pass comes last.

## Risks and mitigations
| Risk | Mitigation |
|---|---|
| Criteria 7 and 9 are browser-only and easy to skip | Written manual checklist, run with real input and the network panel |
| Real export data (`tests/local/`) is needed for criterion 1 counts | Keep it local and gitignored; tests use small synthetic fixtures for the logic |
| Open questions answered late and force rework | Task 1 is a gate: no fix work starts before it |
| Spec drifts from code again | Spec updated in the same PR as any behaviour change, and referenced in the PR body |
| Claude changes its export format | Importer classification stays defensive; unknown shapes are reported, not crashed on |

## Verification checkpoints
- After task 1: spec updated with answers, human re-approves any scope change.
- After audits: a table of criterion, result, evidence. Gaps become tasks.
- After fixes: test page `PASSED` with at least 74 tests, manual checklist all ticked.
- Done: every criterion has a recorded pass; Deferred list reflects any new ideas.

## Out of this plan
Everything in the spec's Out of Scope (Deferred). Cleanup of merged branches is a housekeeping task and needs the owner's approval.
