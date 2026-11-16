// Turn projects into files: one Markdown document, or a folder (zip) with the instructions,
// memory, documents and every chat filed under the project. Pure functions, no DOM.
import { strToU8, zipSync } from '../../vendor/fflate.js';
import { buildTree, resolvePath, toViewList } from './tree.js';
import { chatToMarkdown, exportFileName, safeName } from './export.js';
import { chatTitle, fmtDate } from './format.js';

import { t } from './i18n.js';

const projectTitle = (p) => p.name || t('untitledProject');

/** A code fence longer than any backtick run inside the text, so the content can never close it early. */
function fenced(text, lang = '') {
  const longest = (String(text).match(/`+/g) || []).reduce((n, run) => Math.max(n, run.length), 2);
  const bar = '`'.repeat(longest + 1);
  return `${bar}${lang}\n${String(text).replace(/\n+$/, '')}\n${bar}`;
}

/** Make `name` unique among `used` (case-insensitive), keeping the extension: "a.md" -> "a (2).md". */
export function uniqueName(name, used) {
  const dot = name.lastIndexOf('.');
  const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
  let candidate = name;
  for (let i = 2; used.has(candidate.toLowerCase()); i += 1) candidate = `${stem} (${i})${ext}`;
  used.add(candidate.toLowerCase());
  return candidate;
}

const chatLine = (c) => `- ${fmtDate(c.created_at) || t('undated')}  ${chatTitle(c)}`;

function header(project) {
  const out = [`# ${projectTitle(project)}`, ''];
  const when = fmtDate(project.created_at);
  out.push(when ? t('exp.created', { date: when }) : t('exp.plain'));
  if (project.description) out.push('', project.description.trim());
  return out;
}

/**
 * Everything about a project in one Markdown document.
 * @param project  normalized project
 * @param extras   { memory: string, chats: normalized chats filed under the project }
 */
export function projectToMarkdown(project, { memory = '', chats = [] } = {}) {
  const out = header(project);
  if (project.prompt) out.push('', `## ${t('exp.instructions')}`, '', project.prompt.trim());
  if (memory) out.push('', `## ${t('exp.memory')}`, '', memory.trim());
  if (project.docs.length) {
    out.push('', `## ${t('exp.documents')}`);
    for (const d of project.docs) out.push('', `### ${d.filename}`, '', d.content ? fenced(d.content) : t('exp.emptyDoc'));
  }
  if (chats.length) out.push('', `## ${t('exp.chats')}`, '', ...chats.map(chatLine));
  return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

/**
 * The project as a set of files, relative to its folder.
 * @returns {{path: string, text: string}[]}
 */
export function projectFiles(project, { memory = '', chats = [], steps = false } = {}) {
  const files = [];

  const readme = header(project);
  if (project.docs.length) readme.push('', `## ${t('exp.documents')}`, '', ...project.docs.map((d) => `- ${d.filename}`));
  if (chats.length) readme.push('', `## ${t('exp.chats')}`, '', ...chats.map(chatLine));
  files.push({ path: 'README.md', text: readme.join('\n') + '\n' });

  if (project.prompt) files.push({ path: 'instructions.md', text: `${project.prompt.trim()}\n` });
  if (memory) files.push({ path: 'memory.md', text: `${memory.trim()}\n` });

  const docNames = new Set();
  for (const d of project.docs) {
    files.push({ path: `documents/${uniqueName(safeName(d.filename, 'document'), docNames)}`, text: d.content || '' });
  }

  const chatNames = new Set();
  for (const chat of chats) {
    const items = toViewList(resolvePath(buildTree(chat.messages)));
    // Empty chats have nothing to write, so they are left out of the folder.
    if (!items.length) continue;
    files.push({ path: `chats/${uniqueName(exportFileName(chat), chatNames)}`, text: chatToMarkdown(chat, items, { steps }) });
  }
  return files;
}

/**
 * Zip one or more projects, one folder each.
 * @param entries [{project, memory, chats}]
 */
export function projectsToZip(entries, { steps = false } = {}) {
  const tree = {};
  const folders = new Set();
  for (const { project, memory, chats } of entries) {
    const folder = uniqueName(safeName(projectTitle(project), 'Project'), folders);
    for (const f of projectFiles(project, { memory, chats, steps })) tree[`${folder}/${f.path}`] = strToU8(f.text);
  }
  return zipSync(tree, { level: 6 });
}

export const projectFileName = (project) => `${safeName(projectTitle(project), 'Project')}.md`;
export const projectZipName = (project) => `${safeName(projectTitle(project), 'Project')}.zip`;
