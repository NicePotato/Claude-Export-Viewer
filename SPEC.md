# Spec: Claude Export Viewer — V2

Status: approved baseline, updated after reviewing PRs #1-#14.
V1 was PRs #1-#11. PRs #12-#14 (compact README and MIT license, six-language UI, export of every section and
artifacts in projects) shipped after the first draft of this spec and are folded in here, which is why the
version is V2. Follow-up changes get a delta spec next to this file, named `SPEC-<change>.md`.

## Objective
Let one person open their Claude.ai data export and read it comfortably offline: browse chats, projects,
memory, artifacts and reflections, search chats, and re-export pieces as Markdown or zip.

User: the repository owner, who wants a faster, nicer reader than raw JSON. Local-only, dark mode, UI in
English, Spanish, German, French, Russian or Simplified Chinese.

Success: drop the export files, see every chat that has readable content, find one in seconds, export it,
and never lose data or send anything off the machine.

Acceptance criteria are listed under Success Criteria.

## Tech Stack
- Preact + htm as ES modules, no bundler, no build step
- marked (Markdown), highlight.js (code), fflate (zip), Phosphor icons generated into `src/lib/icons.js`, Medeo Mono font
- Python 3 `serve.py`, static server on `127.0.0.1:5173`, strict CSP
- i18n: `src/lib/i18n.js` with `t()` and `tn()` (plurals), strings in `src/locales/<code>.js`, English is the source of truth
- Browser storage: IndexedDB for imported data (opt-in), `localStorage` for preferences (`cev:` prefix: `rail`, `order`, `group`, `filed`, `filedArtifacts`, `lang`)
- Targets current Chrome, Edge, Firefox and Safari (as stated in the README)
- License: MIT. Repository is private.

## Commands
```
Dev:   python serve.py                 # http://127.0.0.1:5173 (--port 8080, --no-open); Windows: start.bat
Test:  open http://127.0.0.1:5173/tests/   # page title reads "PASSED n" when all pass (92 now)
Build: none
Lint:  none
```

## Project Structure
```
index.html           → entry point and CSP
serve.py             → 127.0.0.1 static server
src/App.js           → state, routing (#/home, chat, project, section views), derived lists
src/components/      → Sidebar, Landing, ChatView, Views, Modal, ManifestHelp, ProjectLinks, ProjectExport, LanguageMenu, TextExport
src/lib/             → importer, tree, search, format, empties, assignments, export, projectExport, sectionExport, persist, prefs, hooks, i18n
src/locales/         → en (source), es, de, fr, ru, zh
src/styles.css       → all styling and dark theme tokens
tests/run.js         → browser-run test suite
tests/local/         → real data for manual checks (gitignored, never committed)
README.md + README.<lang>.md → documentation in six languages
```

## Code Style
Small pure functions in `src/lib/`, a comment that says why, native platform features before custom widgets.

```js
/** Milliseconds since the epoch for an ISO string; unparseable dates sort as oldest. */
const stamp = (iso) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? -Infinity : t;
};

export function newestFirst(a, b) {
  const x = stamp(a.updated_at);
  const y = stamp(b.updated_at);
  return x === y ? 0 : x < y ? 1 : -1;
}
```

Conventions:
- Sort by parsed instant, never by comparing date strings. Use `toSorted` / `toReversed`, never sort state in place.
- User-facing text goes through `t()` / `tn()`; no hard-coded strings in components.
- Templates use `html` from `src/lib/ui.js`; shared behaviour goes in hooks (`useDismissDetails`) or components (`Modal`, `ItemPicker`).
- Conventional Commits, small commits, branches named `feature/`, `fix/`, `docs/`, `refactor/`, PRs merged with merge commits.

## Testing Strategy
- Framework: the in-repo browser test page (`tests/run.js`), no external runner.
- Every pure function in `src/lib/` gets tests: ordering, empties, assignments, export (chat, project, sections), manifest, i18n.
- Locale parity test: every locale has the same keys and placeholders and the plural forms its language needs.
- UI behaviour is checked by hand with real mouse and keyboard input against data in `tests/local/`; file downloads and non-English UI are not covered by the automated tests and are checked by hand.
- A bug fix starts with a failing test when the logic is testable.
- Gate before merge: test page shows `PASSED n` with no failures.

## Boundaries
- Always: run the test page before committing; add every new string to all six locales; treat export contents as untrusted (escape, sanitise, filter links, keep zip paths inside their folder); keep real export data out of git; make small commits and reference the spec section in the PR.
- Ask first: adding a dependency or vendored library; any network access or CSP loosening; changing the stored data format or `localStorage` keys; adding a build step or a new language; making the repository public.
- Never: send export data off the machine; open or fetch URLs found inside an export; commit `tests/local/` or personal data; remove or weaken a failing test without approval.

## Success Criteria
1. Dropping `conversations*.zip` (or a folder of export files) loads all chats; counts match the file (reference export: 144 chats, 76 readable, 68 empty).
2. Newest and oldest sort correctly across years, times and mixed date formats; unparseable dates sort as oldest.
3. Chats with no renderable messages appear only under "Empty chats", with a reason taken from facts in the file and no guessed causes.
4. A chat or an artifact can be filed into a project from its own page or the project's picker; filing survives reload; grouping by project works; stale choices are pruned.
5. A project exports as a zip (with an `artifacts/` folder when artifacts are attached), one Markdown file, or clipboard text; fenced code in content never breaks the fence.
6. Memory, artifacts and reflections each export as Markdown (download or copy) and as a zip of all items; a memory file path can never escape its folder in the zip.
7. Dropping the download-list file shows the how-to-export help, offers only https `claude.ai` links, shows expiry, and persists nothing.
8. Dialogs trap focus and close on Escape and backdrop click; menus close on outside click and Escape and return focus.
9. Data persists across reload only when "Keep the loaded export in this browser" is ticked; "Clear" removes it.
10. Switching language changes the UI, dates, plurals, import log and exported Markdown; first visit follows the browser language; the choice is saved.
11. Chat search matches titles and message text, case-insensitively, with highlighted snippets.
12. No outbound network requests while using the app (verified in the browser network panel).
13. Test page reports `PASSED` with at least 92 tests.

## Out of Scope (Deferred)
- Automatic chat-to-project linking: the export has no such link.
- Backup and restore of manual filing (`filed`, `filedArtifacts`): they live only in `localStorage`, so clearing site data loses them. Revisit if that bites.
- Search over projects, memory and artifacts: search covers chats only.
- Light theme and a mobile layout: not needed for a single desktop user.
- Menus on the Popover API with anchor positioning: Firefox lacks anchor positioning, and polyfills would need vendoring under the CSP.
- Editing or annotating exported content: the viewer is read-only by design.
- Files over roughly 500 MB: a `conversations.json` that large cannot be parsed in a tab (documented limit).

## Open Questions
None blocking. Resolved by the repository itself: browser support (README states current Chrome, Edge, Firefox, Safari), size limit (about 500 MB, documented), sharing (MIT license added, repository still private, making it public stays "ask first"). Search scope and filing backup were decided as deferred above; say so if you want either promoted.
