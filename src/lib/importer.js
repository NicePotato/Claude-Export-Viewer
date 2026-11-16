// Turns whatever the user drops (conversations.json, any of the export zips, a folder)
// into one normalized ExportData object. Nothing here touches the network.
import { unzipSync, strFromU8 } from '../../vendor/fflate.js';

export function emptyData() {
  return {
    chats: [],
    projects: [],
    memory: { global: '', perProject: {}, files: [] },
    artifacts: [],
    reflections: [],
    designChats: [],
    manifest: null, // a download list the user dropped instead of the export (never persisted)
    log: [], // [{path, kind, count, note}]
  };
}

const norm = (p) => String(p).replace(/\\/g, '/');
const base = (p) => norm(p).split('/').pop().toLowerCase();
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Identify what a parsed JSON document is, by shape first and file name second.
 * Returns 'conversations' | 'project' | 'projects' | 'memory' | 'reflections' |
 *         'designChat' | 'artifact' | 'manifest' | 'ignored' | 'unknown'.
 * 'manifest' is the small download list Claude sometimes sends first: links to the real zips, no data.
 * 'ignored' covers account files (users, login history) that hold personal data
 * the viewer has no reason to load.
 */
export function classify(json, path = '') {
  const name = base(path);
  if (Array.isArray(json)) {
    if (json.length && isObj(json[0])) {
      if (Array.isArray(json[0].chat_messages)) return 'conversations';
      if (Array.isArray(json[0].docs)) return 'projects';
      if ('email_address' in json[0] || 'verified_phone_number' in json[0]) return 'ignored';
    }
    if (!json.length && name.startsWith('conversations')) return 'conversations';
    return 'unknown';
  }
  if (!isObj(json)) return 'unknown';
  if (Array.isArray(json.data_files) && json.data_files.some((f) => isObj(f) && 'export_url' in f)) return 'manifest';
  if (Array.isArray(json.chat_messages)) return 'conversations'; // a single chat
  if (Array.isArray(json.docs) && ('prompt_template' in json || 'is_starter_project' in json)) return 'project';
  if ('conversations_memory' in json || 'project_memories' in json) return 'memory';
  if (Array.isArray(json.reflections)) return 'reflections';
  if (Array.isArray(json.messages) && isObj(json.project) && json.uuid) return 'designChat';
  if (Array.isArray(json.versions) && 'kind' in json) return 'artifact';
  if ('login_events' in json) return 'ignored';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

// Claude exports a stand-in for content the export cannot represent (widgets, some artifacts).
const UNSUPPORTED = /^\s*(?:```\s*)?this block is not supported on your current device yet\.?\s*(?:```)?\s*$/i;

/** Blocks that carry nothing to show: system scaffolding, placeholders, empty text/thinking. */
function isNoise(b) {
  if (!b) return true;
  if (b.type === 'injected_prompt_block') return true; // date notes etc., never shown in the Claude UI
  if (b.type === 'text') return !(b.text || '').trim() || UNSUPPORTED.test(b.text);
  if (b.type === 'thinking') {
    return !(b.thinking || '').trim() && !(Array.isArray(b.summaries) && b.summaries.some((s) => s && s.summary));
  }
  return false;
}

export function normalizeMessage(m, idx) {
  const content = Array.isArray(m.content) ? m.content : [];
  const blocks = content.filter((b) => !isNoise(b));
  const textBlocks = blocks.filter((b) => b.type === 'text');
  if (!textBlocks.length && m.text && m.text.trim() && !UNSUPPORTED.test(m.text)) {
    // Older exports only carry the flat `text` field.
    blocks.unshift({ type: 'text', text: m.text, citations: [] });
  }
  const text = blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.text || '')
    .join('\n\n');
  // What the export file itself held, before noise was dropped. Used to explain empty chats.
  const raw = {
    blocks: content.length,
    flatText: Boolean(m.text && m.text.trim()),
    unsupported: content.filter((b) => b && b.type === 'text' && UNSUPPORTED.test(b.text || '')).length
      + (UNSUPPORTED.test(m.text || '') ? 1 : 0),
  };
  return {
    uuid: m.uuid,
    parent: m.parent_message_uuid || null,
    sender: m.sender === 'human' ? 'human' : 'assistant',
    created_at: m.created_at || '',
    blocks,
    attachments: Array.isArray(m.attachments) ? m.attachments : [],
    files: Array.isArray(m.files) ? m.files : [],
    text,
    raw,
    idx,
  };
}

export function normalizeChat(raw) {
  const messages = (raw.chat_messages || []).map((m, i) => normalizeMessage(m, i));
  return {
    uuid: raw.uuid,
    name: raw.name || '',
    summary: raw.summary || '',
    created_at: raw.created_at || '',
    updated_at: raw.updated_at || raw.created_at || '',
    messages,
  };
}

export function normalizeProject(raw) {
  return {
    uuid: raw.uuid,
    name: (raw.name || '').trim(),
    description: raw.description || '',
    prompt: raw.prompt_template || '',
    created_at: raw.created_at || '',
    updated_at: raw.updated_at || raw.created_at || '',
    docs: (raw.docs || []).map((d) => ({
      uuid: d.uuid,
      filename: d.filename || 'Untitled',
      content: d.content || '',
      created_at: d.created_at || '',
    })),
  };
}

const EXPORT_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** Only https links on claude.ai are kept, so a crafted file can never put another address on the page. */
export function safeExportUrl(value) {
  try {
    const u = new URL(String(value));
    const host = u.hostname.toLowerCase();
    return u.protocol === 'https:' && (host === 'claude.ai' || host.endsWith('.claude.ai')) ? u.href : '';
  } catch {
    return '';
  }
}

/** The download list as the UI needs it. The links expire 24 hours after `created_at`. */
export function normalizeManifest(raw) {
  const created = Date.parse(raw.created_at);
  return {
    created_at: raw.created_at || '',
    expires_at: Number.isNaN(created) ? null : created + EXPORT_LIFETIME_MS,
    files: raw.data_files.filter(isObj).map((f) => ({
      filename: String(f.filename || 'unnamed.zip'),
      category: String(f.category || ''),
      url: safeExportUrl(f.export_url),
    })),
  };
}

export function normalizeArtifact(meta, id) {
  const versions = Array.isArray(meta.versions) ? meta.versions : [];
  const latest = versions[0] || {};
  const oldest = versions[versions.length - 1] || latest;
  return {
    id: meta.id || id,
    kind: meta.kind || 'artifact',
    title: latest.title || 'Untitled artifact',
    description: latest.description || '',
    created_at: oldest.created_at || '',
    updated_at: latest.created_at || '',
    versions: versions.length,
    page: '',
  };
}

// ---------------------------------------------------------------------------
// Ingest
// ---------------------------------------------------------------------------

function upsert(list, item, key) {
  const i = list.findIndex((x) => x[key] === item[key]);
  if (i === -1) list.push(item);
  else list[i] = item;
}

function upsertArtifactPiece(data, id, apply) {
  let art = data.artifacts.find((a) => a.id === id);
  if (!art) {
    art = { id, kind: 'page', title: 'Untitled artifact', description: '', created_at: '', updated_at: '', versions: 0, page: '' };
    data.artifacts.push(art);
  }
  apply(art);
}

const ARTIFACT_PATH = /(?:^|\/)artifacts\/([^/]+)\/(artifact\.json|page\.md)$/i;

/** Ingest one text file. `path` is only used for detection and for the import log. */
export function ingestText(path, text, data) {
  const p = norm(path);

  const art = ARTIFACT_PATH.exec(p);
  if (art) {
    const [, id, file] = art;
    if (file.toLowerCase() === 'page.md') {
      upsertArtifactPiece(data, id, (a) => { a.page = text; });
      return { kind: 'artifactPage', count: 1 };
    }
    try {
      const meta = JSON.parse(text);
      upsertArtifactPiece(data, id, (a) => Object.assign(a, normalizeArtifact(meta, id), { page: a.page }));
      return { kind: 'artifact', count: 1 };
    } catch {
      return { kind: 'error', count: 0, note: 'artifact.json is not valid JSON' };
    }
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { kind: 'error', count: 0, note: 'Not valid JSON' };
  }

  const kind = classify(json, p);
  switch (kind) {
    case 'conversations': {
      const list = Array.isArray(json) ? json : [json];
      for (const raw of list) upsert(data.chats, normalizeChat(raw), 'uuid');
      return { kind, count: list.length };
    }
    case 'projects':
    case 'project': {
      const list = Array.isArray(json) ? json : [json];
      for (const raw of list) upsert(data.projects, normalizeProject(raw), 'uuid');
      return { kind: 'project', count: list.length };
    }
    case 'memory': {
      const mem = data.memory;
      if (typeof json.conversations_memory === 'string') mem.global = json.conversations_memory;
      if (isObj(json.project_memories)) Object.assign(mem.perProject, json.project_memories);
      if (Array.isArray(json.memory_files)) {
        for (const f of json.memory_files) {
          if (f && typeof f.path === 'string') upsert(mem.files, { path: f.path, content: f.content || '' }, 'path');
        }
      }
      return { kind, count: 1 + Object.keys(json.project_memories || {}).length };
    }
    case 'reflections': {
      for (const r of json.reflections) upsert(data.reflections, r, 'period');
      return { kind, count: json.reflections.length };
    }
    case 'designChat': {
      upsert(data.designChats, {
        uuid: json.uuid,
        title: json.title || 'Chat',
        project: json.project?.name || '',
        created_at: json.created_at || '',
        messageCount: json.messages.length,
      }, 'uuid');
      return { kind, count: 1 };
    }
    case 'artifact': {
      const id = json.id || p;
      upsertArtifactPiece(data, id, (a) => Object.assign(a, normalizeArtifact(json, id), { page: a.page }));
      return { kind, count: 1 };
    }
    case 'manifest': {
      data.manifest = normalizeManifest(json);
      return { kind, count: data.manifest.files.length, note: 'A download list, not the export itself' };
    }
    case 'ignored':
      return { kind, count: 0, note: 'Account details are not loaded' };
    default:
      return { kind: 'unknown', count: 0, note: 'Unrecognized file' };
  }
}

/** Which zip entries are worth inflating. Keeps the 50 MB frames zip from being fully unpacked. */
export function zipEntryFilter(f) {
  const n = norm(f.name);
  const b = base(n);
  if (n.endsWith('/')) return false;
  if (/(^|\/)artifacts\//i.test(n)) return b === 'artifact.json' || b === 'page.md';
  return b.endsWith('.json') && !b.includes('thumbnail');
}

const tick = () => new Promise((r) => setTimeout(r, 0));

/**
 * Import a list of {path, file}. Accepts .json and .zip. Returns the same `data` object.
 * `onProgress(message)` is called as work advances so the UI can show it.
 */
export async function importFiles(entries, data = emptyData(), onProgress = () => {}) {
  for (const { path, file } of entries) {
    const lower = path.toLowerCase();
    const label = norm(path);
    try {
      if (lower.endsWith('.zip')) {
        onProgress(`Unpacking ${label}`);
        await tick();
        const buf = new Uint8Array(await file.arrayBuffer());
        const files = unzipSync(buf, { filter: zipEntryFilter });
        const names = Object.keys(files);
        if (!names.length) data.log.push({ path: label, kind: 'empty', count: 0, note: 'Nothing readable inside' });
        for (const name of names) {
          onProgress(`Reading ${label} / ${name}`);
          await tick();
          const res = ingestText(name, strFromU8(files[name]), data);
          data.log.push({ path: `${label} / ${name}`, ...res });
        }
      } else if (lower.endsWith('.json')) {
        onProgress(`Reading ${label}`);
        await tick();
        const res = ingestText(path, await file.text(), data);
        data.log.push({ path: label, ...res });
      } else if (lower.endsWith('.md') && ARTIFACT_PATH.test(norm(path))) {
        const res = ingestText(path, await file.text(), data);
        data.log.push({ path: label, ...res });
      } else {
        data.log.push({ path: label, kind: 'skipped', count: 0, note: 'Only .json and .zip are read' });
      }
    } catch (err) {
      data.log.push({ path: label, kind: 'error', count: 0, note: String(err?.message || err) });
    }
  }
  return data;
}

/** One-line description of what an import found. */
export function summarize(data) {
  const bits = [];
  const add = (n, one, many) => { if (n) bits.push(`${n} ${n === 1 ? one : many}`); };
  add(data.chats.length, 'chat', 'chats');
  add(data.projects.length, 'project', 'projects');
  add(data.artifacts.length, 'artifact', 'artifacts');
  add(data.reflections.length, 'reflection', 'reflections');
  if (data.memory.global || Object.keys(data.memory.perProject).length || data.memory.files.length) bits.push('memory');
  return bits.join(', ') || 'nothing recognizable';
}

export function hasContent(data) {
  return Boolean(
    data.chats.length || data.projects.length || data.artifacts.length ||
    data.reflections.length || data.memory.global || data.memory.files.length ||
    Object.keys(data.memory.perProject).length,
  );
}
