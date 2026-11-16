# Claude Export Viewer

A local-only viewer for the data export you can download from Claude.ai. Open `conversations.json`
or any of the export zips and read your chats in a dark, Claude-style interface, with branches,
search, attachments, projects, memory and artifacts.

Nothing is uploaded. The page ships a strict Content-Security-Policy and cannot reach the network.

This is an independent, unofficial tool. It is not affiliated with or endorsed by Anthropic.

## Features

- **Reads the export as it comes.** Drop `conversations.json`, the export zips or the unzipped
  folder. The file type is detected from the content, so renamed files still work.
- **Chats like the original.** Markdown with highlighted code and copy buttons, thinking and tool
  calls collapsed under each reply, attachments with their extracted text, citations as source chips.
- **Branches.** When a message was edited or a reply retried, a `< 2 / 3 >` control switches
  between versions. The newest branch is shown first.
- **Search.** Full-text search across titles and messages, with highlighted snippets. Opening a
  result highlights every match in the chat, with previous and next controls. Press `/` to focus the search box.
- **Sort and group.** Order lists newest or oldest first. Group chats by date or by project.
- **Projects.** Instructions, documents and memory, plus the chats you file under each project.
- **Empty chats.** Chats that have nothing readable are kept out of the main list, grouped under
  *Empty chats*, with the reason read from the file (see below).
- **Export.** Save any chat as Markdown. Save a project, or all projects, as Markdown or a zipped
  folder that contains its documents and filed chats.
- **Memory, artifacts and reflections** in their own sections.
- **Comfortable layout.** Collapsible sidebar with labels, a start page you can return to, and a
  single-pane layout on small screens.

## Quick start

Python 3 is the only requirement. There is no build step and no package to install.

```bash
python serve.py
```

This serves the app on `http://127.0.0.1:5173` and opens your browser. On Windows you can
double-click `start.bat` instead.

| Option | Effect |
| --- | --- |
| `--port 8080` | Use a different port |
| `--no-open` | Do not open the browser |

The server only listens on `127.0.0.1`.

## Loading an export

Drop files on the page, or use **Choose files** or **Choose folder**. Files can be dropped together,
one at a time, or added later from the sidebar or the start page. New files are merged into what is
already loaded.

| File | What it gives you |
| --- | --- |
| `conversations.json` | All chats. This alone is enough |
| `conversations-000.zip` | The same, zipped |
| `projects-000.zip` | Projects: instructions and documents |
| `memories-000.zip` | Global memory, project memory, memory files |
| `frames-000.zip` | Artifacts that have a readable page |
| `feedback-000.zip` | Monthly reflections |
| `design_chats-000.zip` | Recognised, but the export holds no messages for these |

Account files such as `users.json` and `login_history.json` are detected and deliberately never loaded.

Tick **Keep the loaded export in this browser** to store it in IndexedDB so you can skip importing
next time. The trash button in the sidebar, or **Clear** on the start page, removes it.

## Using it

### Projects and chats

The export does not record which project a chat belonged to, so chats cannot be filed automatically.
You can do it yourself:

- Open a chat and use the **Project** menu in its header, or
- Open a project and choose **Add chats** to tick several at once.

Switch the chat list to **By project** to see them grouped. These choices are saved in this browser only
and never change your export files.

### Empty chats

Some chats are listed in the export but show nothing when opened. The viewer moves them under
**Empty chats** and explains what the file contains for each one. The reasons are limited to what
can be read from the file, for example:

- the chat has no messages in the export,
- the messages are present with senders and times, but every message body is empty,
- the only text is Claude's stand-in for content it cannot export.

The viewer cannot recover text that is not in the export, and it does not guess why it is missing.

### Exporting

- **Chat:** *Export* in the chat header downloads or copies Markdown. You can include thinking and
  tool calls as quoted lines. Files are named `YYYY-MM-DD Title.md`.
- **Project:** *Export* in the project header gives a folder (zip) with `README.md`,
  `instructions.md`, `memory.md`, `documents/` and `chats/`, or a single Markdown file.
- **All projects:** *Export all projects* at the bottom of the project list gives one zip with a folder per project.

### Keyboard

| Key | Action |
| --- | --- |
| `/` | Focus the chat search box |
| `Esc` | Close the open dialog or menu |

## Privacy and security

- `index.html` sets a Content-Security-Policy that allows only the page's own files. There are no
  analytics, no CDN and no remote fonts. All libraries are vendored in `vendor/`.
- Remote images inside chats are never fetched. They appear as `[image: alt]` links.
- Raw HTML inside messages is escaped, and links are limited to `http`, `https` and `mailto`.
- Loaded data lives in memory. It is written to IndexedDB only if you tick the keep option.
- Preferences (sidebar width, sort order, grouping, project filing) are stored in `localStorage`.

## Browser support

A current Chrome, Edge, Firefox or Safari. The app uses native `<dialog>`, `toSorted()` / `toReversed()` and the
CSS Custom Highlight API. Where a browser lacks `<dialog closedby>`, clicking the backdrop is handled by a small fallback.

## Limitations

- A very large `conversations.json` (roughly 500 MB or more) cannot be parsed in a browser tab.
  A streaming parser would lift this.
- Images and binary attachments are not part of the export, only their names.
- Chats are not linked to projects in the export (see above).

## Development

The code is plain ES modules served as they are. There is no bundler and no Node requirement.

```
index.html          entry point and CSP
serve.py            127.0.0.1 static server
src/lib/            import, branch tree, search, ordering, export, assignments (no DOM)
src/components/     Preact + htm views
src/styles.css      all styling
fonts/              Medeo Mono
vendor/             vendored libraries
tests/              browser test suite
```

### Tests

The suite runs in the browser:

1. `python serve.py`
2. Open `http://127.0.0.1:5173/tests/`. The tab title reads `PASSED n` or `FAILED n`, and the page lists failures.

### Contributing

Branch from `main` using `feature/...`, `fix/...` or `docs/...`, keep commits small, and use
[Conventional Commits](https://www.conventionalcommits.org/) (`feat(chat): ...`, `fix(import): ...`).
Open a pull request against `main` and make sure the test page shows `PASSED`.

## Built with

[Preact](https://preactjs.com/) and [htm](https://github.com/developit/htm), [fflate](https://github.com/101arrowz/fflate)
for zips, [marked](https://github.com/markedjs/marked) for Markdown, [highlight.js](https://highlightjs.org/) for code,
[Phosphor Icons](https://phosphoricons.com/) (MIT) and the [Medeo Mono](https://github.com/DNFDEVS/medeo-font)
typeface (SIL OFL, see `fonts/OFL.txt`).
