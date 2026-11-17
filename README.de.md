# Claude Export Viewer

[English](README.md) · [Español](README.es.md) · **Deutsch** · [Français](README.fr.md) · [Русский](README.ru.md) · [简体中文](README.zh.md)

Ein rein lokaler Viewer für den Datenexport, den du bei Claude.ai herunterladen kannst. Öffne `conversations.json`
oder die Export-Zips und lies deine Chats mit Verzweigungen, Suche, Anhängen, Projekten, Gedächtnis und Artefakten.

Es wird nichts hochgeladen: Die Seite liefert eine strikte Content-Security-Policy mit und kann das Netzwerk nicht erreichen.
Inoffizielles Tool, nicht mit Anthropic verbunden.

## Funktionen

- Liest den Export so, wie er kommt: JSON, Zips oder ein entpackter Ordner. Dateitypen werden am Inhalt
  erkannt, daher funktionieren auch umbenannte Dateien.
- Markdown mit hervorgehobenem Code, eingeklappten Denkschritten und Tool-Aufrufen, Anhängen, Quellenangaben.
- Verzweigungen: Mit `< 2 / 3 >` wechselst du zwischen bearbeiteten oder erneut versuchten Versionen.
- Volltextsuche mit hervorgehobenen Treffern im Chat. Mit `/` springst du ins Suchfeld.
- Sortieren nach Datum, gruppieren nach Datum oder Projekt.
- Projekte mit Anweisungen, Dokumenten und Gedächtnis sowie den Chats und Artefakten, die du darin ablegst.
- Chats ohne lesbaren Inhalt landen unter *Leere Chats*, mit dem aus der Datei gelesenen Grund.
- Einen Chat, ein Projekt, Gedächtnis, ein Artefakt oder einen Rückblick als Markdown exportieren, oder ein Projekt, das gesamte Gedächtnis, alle Artefakte oder alle Rückblicke als Zip.
- Gedächtnis, Artefakte und Rückblicke in eigenen Bereichen.
- Verfügbar auf Englisch, Spanisch, Deutsch, Französisch, Russisch und in vereinfachtem Chinesisch. Die Sprache
  wählst du auf der Startseite oder mit der Sprachtaste in der Seitenleiste. Sie gilt auch für exportiertes Markdown.

## Schnellstart

Benötigt nur Python 3, keinen Build-Schritt und keine Pakete.

```bash
python serve.py
```

Läuft auf `http://127.0.0.1:5173` (nur localhost) und öffnet den Browser. Unter Windows kannst du
`start.bat` ausführen. Optionen: `--port 8080`, `--no-open`.

## Einen Export laden

Lege Dateien oder einen Ordner auf der Seite ab oder nutze **Dateien auswählen** / **Ordner auswählen**. Du kannst
jederzeit Dateien hinzufügen, sie werden mit dem bereits Geladenen zusammengeführt.

| Datei | Inhalt |
| --- | --- |
| `conversations.json` | Alle Chats. Diese Datei allein genügt |
| `conversations-XXX.zip` | Dasselbe, gezippt |
| `projects-XXX.zip` | Projektanweisungen und Dokumente |
| `memories-XXX.zip` | Globales Gedächtnis, Projektgedächtnis, Gedächtnisdateien |
| `frames-XXX.zip` | Artefakte mit lesbarer Seite |
| `feedback-XXX.zip` | Monatliche Rückblicke |
| `design_chats-XXX.zip` | Wird erkannt, aber der Export enthält dafür keine Nachrichten |

`XXX` ist die Teilnummer, zum Beispiel `000`.

Manchmal schickt Claude nur eine kleine Liste `manifest-....json` mit Download-Links. Lege sie ab, und der
Viewer zeigt die claude.ai-Links an (sie werden nie geöffnet oder gespeichert), damit du die Zips herunterladen kannst.
Sie laufen nach 24 Stunden ab.

Kontodateien wie `users.json` und `login_history.json` werden nie geladen.
Setze den Haken bei **Den geladenen Export in diesem Browser behalten**, um ihn in IndexedDB zu speichern; die
Papierkorb-Taste oder **Leeren** entfernt ihn.

## Hinweise

- **Projekte:** Der Export sagt nicht, zu welchem Projekt ein Chat oder Artefakt gehörte. Nutze das Menü **Projekt** in einem
  Chat oder Artefakt oder **Chats hinzufügen** / **Artefakte hinzufügen** in einem Projekt. Die Auswahl wird nur in diesem Browser gespeichert.
- **Leere Chats:** Der Viewer kann Text, der im Export fehlt, nicht wiederherstellen und rät auch nicht, warum.
  Die Gründe beschränken sich auf das, was die Datei zeigt, z. B. keine Nachrichten, alle Texte leer oder nur
  ein Platzhalter.
- **Datenschutz:** Keine Analyse, kein CDN, keine entfernten Schriften, und die Bibliotheken sind mitgeliefert.
  Entfernte Bilder werden nicht geladen (sie erscheinen als `[Bild: alt]`-Links), rohes HTML in Nachrichten
  wird maskiert, und Links sind auf `http`, `https` und `mailto` beschränkt. Einstellungen liegen in `localStorage`.
- **Browser:** aktuelles Chrome, Edge, Firefox oder Safari.
- **Grenzen:** Eine `conversations.json` von etwa 500 MB oder mehr lässt sich in einem Tab nicht verarbeiten.
  Bilder und binäre Anhänge sind nicht im Export enthalten, nur ihre Namen.

## Entwicklung

Einfache ES-Module, kein Bundler, kein Node.

```
index.html          Einstiegspunkt und CSP
serve.py            statischer Server auf 127.0.0.1
src/lib/            Import, Verzweigungsbaum, Suche, Export, i18n (kein DOM)
src/components/     Ansichten mit Preact + htm
src/locales/        Übersetzungen: en (maßgeblich), es, de, fr, ru, zh
src/styles.css      Gestaltung
fonts/, vendor/     Medeo Mono, mitgelieferte Bibliotheken
tests/              Test-Suite im Browser
```

Tests: Starte `python serve.py` und öffne `http://127.0.0.1:5173/tests/`. Der Tab-Titel zeigt `PASSED n` oder `FAILED n`.

Übersetzungen: Die Texte stehen in `src/locales/<code>.js` und werden mit `t()` und `tn()` (Plural) aus
`src/lib/i18n.js` gelesen. Für eine neue Sprache kopierst du `en.js`, übersetzt die Datei und trägst sie in
`i18n.js` ein. Die Tests schlagen fehl, wenn einer Sprache ein Schlüssel oder Platzhalter fehlt oder eine
Pluralform, die ihre Sprache braucht. Die Browsersprache bestimmt die erste Vorgabe; die Wahl wird in
`localStorage` gespeichert.

Mitwirken: Zweige von `main` ab (`feature/...`, `fix/...`, `docs/...`), nutze
[Conventional Commits](https://www.conventionalcommits.org/) und öffne einen Pull Request mit bestandenen Tests.

## Lizenz

[MIT](LICENSE)

## Gebaut mit

[Preact](https://preactjs.com/), [htm](https://github.com/developit/htm), [fflate](https://github.com/101arrowz/fflate),
[marked](https://github.com/markedjs/marked), [highlight.js](https://highlightjs.org/),
[Phosphor Icons](https://phosphoricons.com/) (MIT) und [Medeo Mono](https://github.com/DNFDEVS/medeo-font) (SIL OFL, siehe `fonts/OFL.txt`).
