# Audit: SPEC.md V2 success criteria

Run on `main` at 87a5e43 (after PR #14), 2026-11-17. Browser test page: PASSED 90 before this audit, 92 after the fix.

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Import loads all chats, counts match | Pass | Importer tests (classify, ingest, importFiles, zip). Reference counts 144 / 76 / 68 were checked on the real export in an earlier session, not re-run here |
| 2 | Sort across year, time, format | Pass | `newestFirst` and `orderGroups` tests, including mixed formats and bad dates |
| 3 | Empty chats, reasons from the file | Pass | Six `empties` tests cover every reason code |
| 4 | Filing chats and artifacts, survives reload | Pass after fix | Assignment tests existed; reload persistence of the choices (`localStorage` round trip) had no test. Added `prefs` test |
| 5 | Project export, fences safe | Pass | `projectExport` tests: fence outgrows inner backticks, zip round trip, artifacts folder |
| 6 | Section export, safe zip paths | Pass | `sectionExport` tests for memory, artifacts, reflections, path escape. Real file downloads are not covered by tests (stated in PR #14) |
| 7 | Download list help | Pass | `manifest` tests plus browser check in an earlier session |
| 8 | Dialogs and menus | Not re-run | Checked with real input in PR #8 and #11; no change since. Manual only |
| 9 | Storage only when opted in, Clear removes | Pass after fix | `persist.js` had no tests. Made the DB name a parameter, added a round-trip test that also proves the download list is never written |
| 10 | Language switch | Partly | Automated parity tests pass (keys, placeholders, plurals, exported Markdown). Non-English UI has not been looked at by a person (stated in PR #14) |
| 11 | Chat search | Pass | `search` test (titles, attachments, case-insensitive, snippet) |
| 12 | No outbound requests | Pass | App load made 47 requests, all to `127.0.0.1:5173`. CSP is `default-src 'none'` with `connect-src 'self'` |
| 13 | At least 90 tests | Pass | 92 |

## Gaps found
1. Persistence and preferences untested (criteria 4 and 9). Fixed in this audit.
2. Not re-run by hand: criterion 8 interaction, a full import-to-export network pass with the real export, and a visual pass of the non-English UI. These need the real export loaded; listed as manual follow-ups, not changed.
