# Audit: SPEC.md V2 success criteria

Run on `main` at 87a5e43 (after PR #14), 2026-11-17. Browser test page: PASSED 90 before this audit, 92 after the fix.

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Import loads all chats, counts match | Pass | Importer tests (classify, ingest, importFiles, zip). Re-run on the real export: 144 chats, 76 readable, 68 empty ("Show 68 empty chats"). The log says 9 projects, the list shows 5: projects with no name, instructions or documents are hidden by design |
| 2 | Sort across year, time, format | Pass | `newestFirst` and `orderGroups` tests, including mixed formats and bad dates |
| 3 | Empty chats, reasons from the file | Pass | Six `empties` tests cover every reason code |
| 4 | Filing chats and artifacts, survives reload | Pass after fix | Assignment tests existed; reload persistence of the choices (`localStorage` round trip) had no test. Added `prefs` test |
| 5 | Project export, fences safe | Pass | `projectExport` tests: fence outgrows inner backticks, zip round trip, artifacts folder |
| 6 | Section export, safe zip paths | Pass | `sectionExport` tests for memory, artifacts, reflections, path escape. Real file downloads are not covered by tests (stated in PR #14) |
| 7 | Download list help | Pass | `manifest` tests plus browser check in an earlier session |
| 8 | Dialogs and menus | Pass | Real key and mouse input on the real export: import log opens as a modal with focus inside, Escape closes it and returns focus, a backdrop click closes it without clicking through; Export menu closes on Escape (focus back on its button) and on an outside click |
| 9 | Storage only when opted in, Clear removes | Pass after fix | `persist.js` had no tests. Made the DB name a parameter, added a round-trip test that also proves the download list is never written |
| 10 | Language switch | Pass | Parity tests pass. By eye on the real export: German (UI, dates, plural "Nachrichten") and Simplified Chinese (UI, dates, CJK glyphs) switch live and are saved. Spanish, French and Russian were not looked at |
| 11 | Chat search | Pass | `search` test (titles, attachments, case-insensitive, snippet) |
| 12 | No outbound requests | Pass | App load made 47 requests, all to `127.0.0.1:5173`; same host only after loading the real export and browsing. CSP is `default-src 'none'` with `connect-src 'self'` |
| 13 | At least 90 tests | Pass | 92 |

## Gaps found
1. Persistence and preferences untested (criteria 4 and 9). Fixed in #15.
2. Still not done by hand: the real file downloads from the export menus (only the generated content is unit tested), and a visual look at Spanish, French and Russian.
