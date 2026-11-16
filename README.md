# Claude Export Viewer

A local-only viewer for the data export you can download from Claude.ai. Open `conversations.json`
or the export zips and read your chats with branches, search, attachments, projects, memory and artifacts.

Nothing is uploaded: the page ships a strict Content-Security-Policy and cannot reach the network.
Unofficial tool, not affiliated with Anthropic.

## Features

- Reads the export as it comes: JSON, zips or an unzipped folder. File types are detected from
  content, so renamed files still work.
- Markdown with highlighted code, collapsed thinking and tool calls, attachments, citations.
- Branches: a `< 2 / 3 >` control switches between edited or retried versions.
- Full-text search with highlighted matches in the chat. Press `/` to focus it.
- Sort by date, group by date or project.
- Projects with instructions, documents and memory, plus the chats you file under them.
- Chats with nothing readable go under *Empty chats*, with the reason read from the file.
- Export a chat or project as Markdown, or a project (or all of them) as a zip.
- Memory, artifacts and reflections in their own sections.

## Quick start

Needs only Python 3, no build step or packages.

```bash
python serve.py
```

Serves on `http://127.0.0.1:5173` (localhost only) and opens the browser. On Windows you can run
`start.bat`. Options: `--port 8080`, `--no-open`.

## Loading an export

Drop files or a folder on the page, or use **Choose files** / **Choose folder**. You can add files at
any time and they are merged into what is already loaded.

| File | Contents |
| --- | --- |
| `conversations.json` | All chats. This alone is enough |
| `conversations-XXX.zip` | The same, zipped |
| `projects-XXX.zip` | Project instructions and documents |
| `memories-XXX.zip` | Global memory, project memory, memory files |
| `frames-XXX.zip` | Artifacts with a readable page |
| `feedback-XXX.zip` | Monthly reflections |
| `design_chats-XXX.zip` | Recognised, but the export has no messages for these |

`XXX` is the part number, for example `000`.

Sometimes Claude sends only a small `manifest-....json` list of download links. Drop it and the
viewer lists the claude.ai links (never opened or stored) so you can download the zips. They expire after 24 hours.

Account files such as `users.json` and `login_history.json` are never loaded.
Tick **Keep the loaded export in this browser** to store it in IndexedDB; the trash button or **Clear** removes it.

## Notes

- **Projects:** the export does not say which project a chat belonged to. Use the **Project** menu in a
  chat, or **Add chats** in a project. Choices are saved in this browser only.
- **Empty chats:** the viewer cannot recover text missing from the export and does not guess why.
  Reasons are limited to what the file shows, e.g. no messages, all bodies empty, or only a placeholder.
- **Privacy:** no analytics, CDN or remote fonts, and libraries are vendored. Remote images are not
  fetched (shown as `[image: alt]` links), raw HTML in messages is escaped, and links are limited to
  `http`, `https` and `mailto`. Preferences live in `localStorage`.
- **Browsers:** current Chrome, Edge, Firefox or Safari.
- **Limits:** a `conversations.json` of roughly 500 MB or more cannot be parsed in a tab. Images and
  binary attachments are not in the export, only their names.

## Development

Plain ES modules, no bundler, no Node.

```
index.html          entry point and CSP
serve.py            127.0.0.1 static server
src/lib/            import, branch tree, search, export (no DOM)
src/components/     Preact + htm views
src/styles.css      styling
fonts/, vendor/     Medeo Mono, vendored libraries
tests/              browser test suite
```

Tests: run `python serve.py`, open `http://127.0.0.1:5173/tests/`. The tab title shows `PASSED n` or `FAILED n`.

Contributing: branch from `main` (`feature/...`, `fix/...`, `docs/...`), use
[Conventional Commits](https://www.conventionalcommits.org/), and open a pull request with the tests passing.

## License

[MIT](LICENSE)

## Built with

[Preact](https://preactjs.com/), [htm](https://github.com/developit/htm), [fflate](https://github.com/101arrowz/fflate),
[marked](https://github.com/markedjs/marked), [highlight.js](https://highlightjs.org/),
[Phosphor Icons](https://phosphoricons.com/) (MIT) and [Medeo Mono](https://github.com/DNFDEVS/medeo-font) (SIL OFL, see `fonts/OFL.txt`).
