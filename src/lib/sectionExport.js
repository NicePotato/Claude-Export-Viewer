// Turn memory, artifacts and reflections into Markdown files, one by one or as a zip.
// Pure functions, no DOM.
import { strToU8, zipSync } from '../../vendor/fflate.js';
import { safeName, uniqueName } from './export.js';
import { fmtDate, humanize } from './format.js';
import { t, tn } from './i18n.js';

const tidy = (lines) => lines.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';

/** Zip `[{path, text}]`. Paths are made unique, so two items with the same name never overwrite each other. */
function zipFiles(files) {
  const used = new Set();
  const tree = {};
  for (const f of files) tree[uniqueName(f.path, used)] = strToU8(f.text);
  return zipSync(tree, { level: 6 });
}

// ---- memory ---------------------------------------------------------------

/**
 * Every memory text as one flat list, used by the list column, the detail pane and the export.
 * @param memory       data.memory: { global, perProject: {uuid: text}, files: [{path, content}] }
 * @param projectName  Map of project uuid -> name
 * @returns {{id: string, kind: 'global'|'project'|'file', title: string, meta: string, text: string, path: string}[]}
 *          `path` is where the text goes inside a zip.
 */
export function memoryDocs(memory, projectName = new Map()) {
  const docs = [];
  if (memory.global) {
    const title = t('mem.about');
    docs.push({ id: 'global', kind: 'global', title, meta: t('mem.across'), text: memory.global, path: `${safeName(title, 'memory')}.md` });
  }
  for (const [uuid, text] of Object.entries(memory.perProject)) {
    const title = projectName.get(uuid) || t('mem.projectMemory');
    docs.push({
      id: `project:${uuid}`, kind: 'project', title, meta: t('mem.projectMemory'), text: typeof text === 'string' ? text : '',
      path: `${safeName(t('mem.projects'), 'projects')}/${safeName(title, 'memory')}.md`,
    });
  }
  for (const f of memory.files) {
    const inside = String(f.path).split(/[\\/]/).filter(Boolean).map((part) => safeName(part, 'file')).join('/') || 'memory.md';
    docs.push({
      id: `file:${f.path}`, kind: 'file', title: f.path, meta: t('mem.file'), text: typeof f.content === 'string' ? f.content : '',
      path: `${safeName(t('mem.files'), 'files')}/${inside}`,
    });
  }
  return docs;
}

/** The memory text exactly as stored. Memory files start with a frontmatter block that must stay first. */
export const memoryToMarkdown = (doc) => (doc.text.trim() ? `${doc.text.replace(/\s+$/, '')}\n` : '');

export function memoryFileName(doc) {
  if (doc.kind === 'project') return `${safeName(doc.title, 'memory')} (${t('mem.projectMemory')}).md`;
  return doc.path.split('/').pop();
}

export const memoryToZip = (docs) => zipFiles(docs.filter((d) => d.text.trim()).map((d) => ({ path: d.path, text: memoryToMarkdown(d) })));

// ---- artifacts ------------------------------------------------------------

export function artifactToMarkdown(a) {
  const out = [`# ${a.title}`, ''];
  const meta = [a.kind, tn('version', a.versions), fmtDate(a.updated_at)].filter(Boolean);
  out.push(meta.join(' · '));
  if (a.description) out.push('', a.description.trim());
  out.push('', a.page ? a.page.trim() : `_${t('view.artNoPage')}_`);
  return tidy(out);
}

export const artifactFileName = (a) => `${safeName(a.title, 'artifact')}.md`;

export const artifactsToZip = (artifacts) => zipFiles(artifacts.map((a) => ({ path: artifactFileName(a), text: artifactToMarkdown(a) })));

// ---- reflections ----------------------------------------------------------

/** Mirrors the reflection pane: every string or list in the reflection becomes a section. */
export function reflectionToMarkdown(r) {
  const out = [`# ${r.period}`];
  for (const [name, value] of Object.entries(r.content || {})) {
    if (Array.isArray(value)) {
      out.push('', `## ${humanize(name)}`);
      for (const v of value) {
        if (typeof v === 'string') out.push('', v);
        else if (v && typeof v === 'object') {
          if (v.title) out.push('', `### ${v.title}`);
          if (v.body) out.push('', v.body);
        }
      }
    } else if (typeof value === 'string') {
      out.push('', `## ${humanize(name)}`, '', value);
    }
  }
  return tidy(out);
}

export const reflectionFileName = (r) => `${safeName(r.period, 'reflection')}.md`;

export const reflectionsToZip = (reflections) => zipFiles(reflections.map((r) => ({ path: reflectionFileName(r), text: reflectionToMarkdown(r) })));
