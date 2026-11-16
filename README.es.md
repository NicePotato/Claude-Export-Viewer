# Claude Export Viewer

[English](README.md) · **Español** · [Deutsch](README.de.md) · [Français](README.fr.md) · [Русский](README.ru.md) · [简体中文](README.zh.md)

Un visor local de la exportación de datos que puedes descargar desde Claude.ai. Abre `conversations.json`
o los zips de la exportación y lee tus chats con ramas, búsqueda, adjuntos, proyectos, memoria y artefactos.

No se sube nada: la página incluye una Content-Security-Policy estricta y no puede acceder a la red.
Herramienta no oficial, sin relación con Anthropic.

## Características

- Lee la exportación tal como llega: JSON, zips o una carpeta descomprimida. Los tipos de archivo se
  detectan por el contenido, así que los archivos renombrados también funcionan.
- Markdown con código resaltado, razonamiento y llamadas a herramientas plegados, adjuntos, citas.
- Ramas: un control `< 2 / 3 >` cambia entre las versiones editadas o reintentadas.
- Búsqueda de texto completo con las coincidencias resaltadas en el chat. Pulsa `/` para ir a ella.
- Ordenar por fecha, agrupar por fecha o por proyecto.
- Proyectos con instrucciones, documentos y memoria, además de los chats que archives en ellos.
- Los chats sin nada legible van a *Chats vacíos*, con el motivo leído del archivo.
- Exporta un chat o un proyecto como Markdown, o un proyecto (o todos) como zip.
- Memoria, artefactos y reflexiones en sus propias secciones.
- Disponible en inglés, español, alemán, francés, ruso y chino simplificado. Elige el idioma en la página
  de inicio o con el botón de idioma de la barra lateral. También se aplica al Markdown exportado.

## Inicio rápido

Solo necesita Python 3, sin compilación ni paquetes.

```bash
python serve.py
```

Sirve en `http://127.0.0.1:5173` (solo localhost) y abre el navegador. En Windows puedes ejecutar
`start.bat`. Opciones: `--port 8080`, `--no-open`.

## Cargar una exportación

Suelta archivos o una carpeta en la página, o usa **Elegir archivos** / **Elegir carpeta**. Puedes añadir
archivos en cualquier momento y se combinan con lo que ya está cargado.

| Archivo | Contenido |
| --- | --- |
| `conversations.json` | Todos los chats. Solo con este basta |
| `conversations-XXX.zip` | Lo mismo, comprimido |
| `projects-XXX.zip` | Instrucciones y documentos de los proyectos |
| `memories-XXX.zip` | Memoria global, memoria de proyectos, archivos de memoria |
| `frames-XXX.zip` | Artefactos con una página legible |
| `feedback-XXX.zip` | Reflexiones mensuales |
| `design_chats-XXX.zip` | Se reconoce, pero la exportación no trae mensajes de estos |

`XXX` es el número de parte, por ejemplo `000`.

A veces Claude envía solo una pequeña lista `manifest-....json` con enlaces de descarga. Suéltala y el
visor muestra los enlaces de claude.ai (nunca se abren ni se guardan) para que descargues los zips.
Caducan a las 24 horas.

Los archivos de cuenta como `users.json` y `login_history.json` nunca se cargan.
Marca **Mantener la exportación cargada en este navegador** para guardarla en IndexedDB; el botón de la
papelera o **Borrar** la elimina.

## Notas

- **Proyectos:** la exportación no dice a qué proyecto pertenecía un chat. Usa el menú **Proyecto** de un
  chat, o **Añadir chats** en un proyecto. Las elecciones se guardan solo en este navegador.
- **Chats vacíos:** el visor no puede recuperar el texto que falta en la exportación ni adivina el motivo.
  Los motivos se limitan a lo que muestra el archivo, p. ej. sin mensajes, todos los cuerpos vacíos o solo
  un marcador de posición.
- **Privacidad:** sin analíticas, CDN ni fuentes remotas, y las bibliotecas están incluidas. Las imágenes
  remotas no se descargan (se muestran como enlaces `[imagen: alt]`), el HTML sin procesar en los mensajes
  se escapa y los enlaces se limitan a `http`, `https` y `mailto`. Las preferencias viven en `localStorage`.
- **Navegadores:** Chrome, Edge, Firefox o Safari actuales.
- **Límites:** un `conversations.json` de unos 500 MB o más no se puede procesar en una pestaña. Las
  imágenes y los adjuntos binarios no están en la exportación, solo sus nombres.

## Desarrollo

Módulos ES simples, sin bundler, sin Node.

```
index.html          punto de entrada y CSP
serve.py            servidor estático en 127.0.0.1
src/lib/            importación, árbol de ramas, búsqueda, exportación, i18n (sin DOM)
src/components/     vistas con Preact + htm
src/locales/        traducciones: en (fuente de verdad), es, de, fr, ru, zh
src/styles.css      estilos
fonts/, vendor/     Medeo Mono, bibliotecas incluidas
tests/              suite de pruebas en el navegador
```

Pruebas: ejecuta `python serve.py` y abre `http://127.0.0.1:5173/tests/`. El título de la pestaña muestra
`PASSED n` o `FAILED n`.

Traducciones: los textos están en `src/locales/<código>.js` y se leen con `t()` y `tn()` (plurales) de
`src/lib/i18n.js`. Para añadir un idioma, copia `en.js`, tradúcelo y regístralo en `i18n.js`. Las pruebas
fallan si a un idioma le falta una clave o un marcador, o una forma plural que necesite. El idioma del
navegador decide el valor inicial; la elección se guarda en `localStorage`.

Contribuir: crea una rama desde `main` (`feature/...`, `fix/...`, `docs/...`), usa
[Conventional Commits](https://www.conventionalcommits.org/) y abre un pull request con las pruebas pasando.

## Licencia

[MIT](LICENSE)

## Creado con

[Preact](https://preactjs.com/), [htm](https://github.com/developit/htm), [fflate](https://github.com/101arrowz/fflate),
[marked](https://github.com/markedjs/marked), [highlight.js](https://highlightjs.org/),
[Phosphor Icons](https://phosphoricons.com/) (MIT) y [Medeo Mono](https://github.com/DNFDEVS/medeo-font) (SIL OFL, ver `fonts/OFL.txt`).
