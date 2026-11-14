# Claude Export Viewer

A local-only, dark-mode viewer for a Claude.ai data export. Chats open in a Claude-style
reading view. Nothing is uploaded and the page cannot reach the network.

## Run

Needs Python 3 only (no Node, no build step).

```bash
python serve.py
```

or double-click `start.bat`. It serves on `http://127.0.0.1:5173` and opens the browser.
Use `--port 8080` to change the port and `--no-open` to skip opening the browser.

## Load your export

Drop any of these on the page, or use **Choose files** / **Choose folder**:

| File | What it gives you |
| --- | --- |
| `conversations.json` | All chats (this alone is enough) |
| `conversations-000.zip` | Same, zipped |
| `projects-000.zip` | Projects: instructions and documents |
| `memories-000.zip` | Global memory, project memory, memory files |
| `frames-000.zip` | Artifacts that have a readable page |
| `feedback-000.zip` | Monthly reflections |
| `design_chats-000.zip` | Recognised, but the export holds no messages for these |

Files can be dropped together, one at a time, or later via the **+** button. Account files
(`users.json`, `login_history.json`) are detected and deliberately not loaded.

The file type is detected from the content, not the name, so renamed files still work.

## What it shows

- Chats grouped by recency, full-text search over titles and messages, with highlighted snippets.
- Opening a chat from a search highlights every match in it, with previous and next controls.
  Press `/` anywhere to jump to the search box.
- **Export** on each chat downloads or copies it as Markdown (optionally with thinking and tool
  calls as quoted lines). Files are named `YYYY-MM-DD Title.md`.
- Branches: when you edited a message or retried a reply, a `< 2 / 3 >` control switches versions.
  The newest branch is shown by default.
- Thinking and tool calls collapsed under each reply, with results paired to their calls.
- Attachments with their extracted text, citations as source chips, markdown with
  highlighted code and copy buttons.
- Projects, memory, artifacts and reflections in their own sections.

## Privacy

- `index.html` ships a Content-Security-Policy that only allows the page's own files.
  There are no analytics, no CDN and no remote fonts. Libraries are vendored in `vendor/`.
- Remote images inside chats are never fetched. They show as `[image: alt]` links.
- Raw HTML inside messages is escaped, and links are limited to http, https and mailto.
- Loaded data lives in memory. The checkbox **Keep the loaded export in this browser** stores
  it in IndexedDB so you can skip re-importing. The trash button in the left rail removes it.

## Known limits

- A very large `conversations.json` (roughly 500 MB or more) cannot be parsed in a browser
  tab. Chat export sizes seen so far are far below that. A streaming parser would lift it.
- The export does not say which project a chat belongs to, so chats are not grouped by project.
- Images and binary attachments are not part of the export, only their names.

## Tests

The suite runs in the browser, since there is no Node on this machine:

1. `python serve.py`
2. Open `http://127.0.0.1:5173/tests/`. The tab title reads `PASSED n` or `FAILED n`.

## Layout

```
index.html          entry, CSP
serve.py            127.0.0.1 static server
src/lib/            importer, branch tree, search, markdown, formatting (no DOM)
src/components/     Preact + htm views
src/styles.css      all styling
fonts/              Medeo Mono (OFL), see fonts/OFL.txt
vendor/             preact+htm, fflate, marked, highlight.js, Phosphor licence
tests/              browser test suite
```

Stack: Preact + htm (ES modules, no build), fflate for zips, marked for markdown,
highlight.js for code, Phosphor icons, Medeo Mono for type.
