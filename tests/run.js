// Browser-run tests (no Node on this machine). Open /tests/ while `python serve.py` is running.
import { zipSync, strToU8 } from '../vendor/fflate.js';
import {
  classify, ingestText, normalizeMessage, importFiles, emptyData, summarize, hasContent, zipEntryFilter,
} from '../src/lib/importer.js';
import { buildTree, resolvePath, countForks, toViewList, ROOT_UUID } from '../src/lib/tree.js';
import { groupByRecency, chatTitle, clip } from '../src/lib/format.js';
import { searchChats } from '../src/lib/search.js';
import { renderMarkdown } from '../src/lib/markdown.js';
import { toolBrief, groupBlocks, toolLabel } from '../src/components/Message.js';

const results = [];
function test(name, fn) { results.push({ name, fn }); }
function eq(a, b, msg = '') {
  const x = JSON.stringify(a); const y = JSON.stringify(b);
  if (x !== y) throw new Error(`${msg} expected ${y}, got ${x}`);
}
function ok(v, msg = 'expected truthy') { if (!v) throw new Error(msg); }

// ---- fixtures -------------------------------------------------------------
const msg = (uuid, parent, sender, text, extra = {}) => ({
  uuid, parent_message_uuid: parent, sender, text, created_at: '2026-01-01T00:00:00Z',
  content: [{ type: 'text', text, citations: [] }], attachments: [], files: [], ...extra,
});
const rawChat = (uuid, messages, name = 'A chat') => ({
  uuid, name, summary: '', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
  account: { uuid: 'x' }, chat_messages: messages,
});
const n = (m, i) => normalizeMessage(m, i);

// ---- classify -------------------------------------------------------------
test('classify: conversations array', () => eq(classify([rawChat('1', [])], 'conversations.json'), 'conversations'));
test('classify: single conversation object', () => eq(classify(rawChat('1', []), 'x.json'), 'conversations'));
test('classify: empty conversations.json', () => eq(classify([], 'conversations.json'), 'conversations'));
test('classify: project', () => eq(classify({ uuid: 'p', docs: [], prompt_template: '' }, 'p.json'), 'project'));
test('classify: memory', () => eq(classify({ conversations_memory: 'x', project_memories: {} }, 'm.json'), 'memory'));
test('classify: reflections', () => eq(classify({ reflections: [] }, 'r.json'), 'reflections'));
test('classify: design chat', () => eq(classify({ uuid: 'd', messages: [], project: { name: 'n' } }, 'd.json'), 'designChat'));
test('classify: artifact', () => eq(classify({ id: 'a', kind: 'page', versions: [] }, 'artifact.json'), 'artifact'));
test('classify: users file is ignored (private)', () => eq(classify([{ uuid: 'u', email_address: 'a@b.c' }], 'users.json'), 'ignored'));
test('classify: login history is ignored (private)', () => eq(classify({ login_events: [] }, 'login_history.json'), 'ignored'));
test('classify: unknown', () => eq(classify({ hello: 1 }, 'x.json'), 'unknown'));

// ---- message normalization ------------------------------------------------
test('normalize: drops injected prompt blocks', () => {
  const m = n({ ...msg('a', null, 'human', 'hi'), content: [{ type: 'injected_prompt_block', prompt: 'date' }, { type: 'text', text: 'hi' }] }, 0);
  eq(m.blocks.map((b) => b.type), ['text']);
});
test('normalize: drops the unsupported-block placeholder (fenced or bare)', () => {
  const fenced = n({ ...msg('a', null, 'assistant', ''), content: [{ type: 'text', text: '```\nThis block is not supported on your current device yet.\n```' }] }, 0);
  const bare = n({ ...msg('b', null, 'assistant', ''), content: [{ type: 'text', text: 'This block is not supported on your current device yet.' }] }, 0);
  eq(fenced.blocks.length, 0); eq(bare.blocks.length, 0);
});
test('normalize: drops empty text and empty thinking, keeps summarised thinking', () => {
  const m = n({ ...msg('a', null, 'assistant', ''), content: [
    { type: 'text', text: '   ' }, { type: 'thinking', thinking: '' },
    { type: 'thinking', thinking: '', summaries: [{ summary: 'Planned it' }] }, { type: 'text', text: 'real' },
  ] }, 0);
  eq(m.blocks.map((b) => b.type), ['thinking', 'text']);
});
test('normalize: falls back to flat text when there are no content blocks', () => {
  const m = n({ uuid: 'a', parent_message_uuid: null, sender: 'human', text: 'old export', content: [] }, 0);
  eq(m.text, 'old export'); eq(m.blocks.length, 1);
});
test('normalize: unknown sender becomes assistant, text joins text blocks only', () => {
  const m = n({ ...msg('a', null, 'weird', 'x'), content: [{ type: 'text', text: 'a' }, { type: 'tool_use', name: 'T', id: '1', input: {} }, { type: 'text', text: 'b' }] }, 0);
  eq(m.sender, 'assistant'); eq(m.text, 'a\n\nb');
});

// ---- tree / branches ------------------------------------------------------
const lin = () => [
  n(msg('1', ROOT_UUID, 'human', 'q1'), 0), n(msg('2', '1', 'assistant', 'a1'), 1),
  n(msg('3', '2', 'human', 'q2'), 2), n(msg('4', '3', 'assistant', 'a2'), 3),
];
test('tree: linear chat resolves in order', () => eq(resolvePath(buildTree(lin())).map((e) => e.msg.uuid), ['1', '2', '3', '4']));
test('tree: edited message creates a fork, newest branch wins by default', () => {
  const ms = [...lin(), n(msg('5', '2', 'human', 'q2 edited'), 4), n(msg('6', '5', 'assistant', 'a2b'), 5)];
  const tree = buildTree(ms);
  eq(resolvePath(tree).map((e) => e.msg.uuid), ['1', '2', '5', '6']);
  eq(countForks(tree), 1);
});
test('tree: choice overrides default and downstream follows that branch', () => {
  const ms = [...lin(), n(msg('5', '2', 'human', 'edited'), 4), n(msg('6', '5', 'assistant', 'b'), 5)];
  const p = resolvePath(buildTree(ms), { 2: '3' });
  eq(p.map((e) => e.msg.uuid), ['1', '2', '3', '4']);
  eq([p[2].index, p[2].siblings.length], [0, 2]);
});
test('tree: missing parent is treated as a root, nothing is lost', () => {
  const ms = [n(msg('1', 'ghost', 'human', 'orphan'), 0), n(msg('2', '1', 'assistant', 'r'), 1)];
  eq(resolvePath(buildTree(ms)).map((e) => e.msg.uuid), ['1', '2']);
});
test('tree: a cycle cannot hang the resolver', () => {
  const ms = [n(msg('1', '2', 'human', 'a'), 0), n(msg('2', '1', 'assistant', 'b'), 1)];
  ok(resolvePath(buildTree(ms)).length <= 2);
});
test('tree: 20000-message chain does not overflow the stack', () => {
  const ms = [];
  for (let i = 0; i < 20000; i++) ms.push(n(msg(`m${i}`, i ? `m${i - 1}` : ROOT_UUID, i % 2 ? 'assistant' : 'human', 'x'), i));
  eq(resolvePath(buildTree(ms)).length, 20000);
});
test('tree: empty chat', () => eq(resolvePath(buildTree([])).length, 0));

// ---- view list ------------------------------------------------------------
test('viewlist: tool results in a textless human message fold into the assistant message', () => {
  const a = n({ ...msg('a', ROOT_UUID, 'assistant', ''), content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: {} }] }, 0);
  const h = n({ ...msg('h', 'a', 'human', ''), content: [{ type: 'tool_result', tool_use_id: 't1', content: [{ type: 'text', text: 'out' }] }] }, 1);
  const b = n(msg('b', 'h', 'assistant', 'done'), 2);
  const list = toViewList(resolvePath(buildTree([a, h, b])));
  eq(list.map((x) => x.entry.msg.uuid), ['a', 'b']);
  eq([...list[0].extra.keys()], ['t1']);
});
test('viewlist: fully empty messages are dropped', () => {
  const e = n({ ...msg('e', ROOT_UUID, 'assistant', ''), content: [] }, 0);
  eq(toViewList(resolvePath(buildTree([e]))).length, 0);
});
test('viewlist: a human message with only an image is kept', () => {
  const h = n({ ...msg('h', ROOT_UUID, 'human', ''), content: [{ type: 'image', file_uuid: 'f' }], files: [{ file_uuid: 'f', file_name: null }] }, 0);
  eq(toViewList(resolvePath(buildTree([h]))).length, 1);
});

// ---- ingest ---------------------------------------------------------------
test('ingest: conversations upsert by uuid (re-import does not duplicate)', () => {
  const d = emptyData();
  const text = JSON.stringify([rawChat('c1', [msg('1', ROOT_UUID, 'human', 'x')])]);
  ingestText('conversations.json', text, d); ingestText('conversations.json', text, d);
  eq(d.chats.length, 1);
});
test('ingest: invalid JSON is reported, not thrown', () => eq(ingestText('x.json', '{nope', emptyData()).kind, 'error'));
test('ingest: memory splits global, per-project and files', () => {
  const d = emptyData();
  ingestText('memories/x.json', JSON.stringify({ conversations_memory: 'G', project_memories: { p1: 'P' }, memory_files: [{ path: '/a.md', content: 'A' }] }), d);
  eq([d.memory.global, d.memory.perProject.p1, d.memory.files[0].path], ['G', 'P', '/a.md']);
});
test('ingest: project docs are normalized', () => {
  const d = emptyData();
  ingestText('projects/p.json', JSON.stringify({ uuid: 'p', name: 'Alpha', docs: [{ uuid: 'd', filename: 'n.md', content: 'hi' }], prompt_template: 'be nice' }), d);
  eq([d.projects[0].name, d.projects[0].docs[0].filename, d.projects[0].prompt], ['Alpha', 'n.md', 'be nice']);
});
test('ingest: artifact json + page.md merge into one artifact in either order', () => {
  const d = emptyData();
  ingestText('artifacts/abc/page.md', '# Hello', d);
  ingestText('artifacts/abc/artifact.json', JSON.stringify({ id: 'abc', kind: 'page', versions: [{ id: 'v2', title: 'T', created_at: '2026-02-01' }, { id: 'v1', title: 'T0', created_at: '2026-01-01' }] }), d);
  eq(d.artifacts.length, 1);
  eq([d.artifacts[0].title, d.artifacts[0].page, d.artifacts[0].versions], ['T', '# Hello', 2]);
});
test('ingest: account files are not loaded', () => {
  const d = emptyData();
  const r = ingestText('users.json', JSON.stringify([{ uuid: 'u', full_name: 'N', email_address: 'e@x.y', verified_phone_number: '+1' }]), d);
  eq(r.kind, 'ignored'); ok(!hasContent(d));
  ok(!JSON.stringify(d).includes('e@x.y'), 'email leaked into data');
});

// ---- zip / files ----------------------------------------------------------
const asFile = (name, bytes) => new File([bytes], name);
test('importFiles: a bare conversations.json file', async () => {
  const f = asFile('conversations.json', JSON.stringify([rawChat('c1', [msg('1', ROOT_UUID, 'human', 'x')])]));
  const d = await importFiles([{ path: 'conversations.json', file: f }]);
  eq(d.chats.length, 1); ok(hasContent(d));
});
test('importFiles: zip with json and artifacts, skips thumbnails and big junk', async () => {
  const zip = zipSync({
    'projects/p.json': strToU8(JSON.stringify({ uuid: 'p', name: 'Zed', docs: [], prompt_template: 'x' })),
    'artifacts/a1/artifact.json': strToU8(JSON.stringify({ id: 'a1', kind: 'page', versions: [{ title: 'Doc', created_at: '2026-01-01' }] })),
    'artifacts/a1/page.md': strToU8('# page'),
    'artifacts/a1/app.js': strToU8('console.log(1)'),
    'artifacts/a1/thumbnail.json': strToU8('{}'),
  });
  const d = await importFiles([{ path: 'bundle.zip', file: asFile('bundle.zip', zip) }]);
  eq([d.projects.length, d.artifacts.length, d.artifacts[0].page], [1, 1, '# page']);
  ok(!d.log.some((l) => l.path.endsWith('app.js')), 'app.js should not be inflated');
});
test('importFiles: later files override earlier (merge), several files combine', async () => {
  const a = asFile('a.json', JSON.stringify([rawChat('c1', [msg('1', ROOT_UUID, 'human', 'old')], 'Old')]));
  const b = asFile('b.json', JSON.stringify([rawChat('c1', [msg('1', ROOT_UUID, 'human', 'new')], 'New'), rawChat('c2', [])]));
  const d = await importFiles([{ path: 'a.json', file: a }, { path: 'b.json', file: b }]);
  eq([d.chats.length, d.chats.find((c) => c.uuid === 'c1').name], [2, 'New']);
});
test('importFiles: unreadable and unknown files are logged and do not abort the rest', async () => {
  const good = asFile('conversations.json', JSON.stringify([rawChat('c1', [])]));
  const d = await importFiles([
    { path: 'junk.txt', file: asFile('junk.txt', 'x') },
    { path: 'broken.zip', file: asFile('broken.zip', 'not a zip') },
    { path: 'conversations.json', file: good },
  ]);
  eq(d.chats.length, 1);
  ok(d.log.some((l) => l.kind === 'skipped') && d.log.some((l) => l.kind === 'error'));
});
test('zipEntryFilter keeps json and artifact pages only', () => {
  ok(zipEntryFilter({ name: 'projects/x.json' }));
  ok(!zipEntryFilter({ name: 'artifacts/a/app.js' }));
  ok(zipEntryFilter({ name: 'artifacts/a/page.md' }));
  ok(!zipEntryFilter({ name: 'artifacts/a/thumbnail.json' }));
  ok(!zipEntryFilter({ name: 'folder/' }));
});
test('summarize', () => {
  const d = emptyData();
  eq(summarize(d), 'nothing recognizable');
  d.chats.push({}); d.projects.push({}, {});
  eq(summarize(d), '1 chat, 2 projects');
});

// ---- format / search ------------------------------------------------------
test('chatTitle: name, then first human message, then fallback', () => {
  const base = { messages: [{ sender: 'human', text: 'hello   there' }] };
  eq(chatTitle({ name: ' Named ', ...base }), 'Named');
  eq(chatTitle({ name: '', ...base }), 'hello there');
  eq(chatTitle({ name: '', messages: [] }), 'Untitled chat');
});
test('clip', () => eq(clip('a'.repeat(100), 10).length, 10));
test('groupByRecency buckets', () => {
  const now = new Date(2026, 10, 14, 12);
  const d = (days) => new Date(now.getTime() - days * 86400000).toISOString();
  const groups = groupByRecency([{ t: d(0) }, { t: d(1) }, { t: d(3) }, { t: d(20) }, { t: d(100) }, { t: 'junk' }], (x) => x.t, now);
  eq(groups.map((g) => g.label).slice(0, 4), ['Today', 'Yesterday', 'Previous 7 days', 'Previous 30 days']);
  eq(groups[groups.length - 1].label, 'Undated');
});
test('search: case-insensitive, searches titles and attachments, snippet keeps original case', () => {
  const chats = [
    { name: 'Kafka notes', messages: [{ text: 'Consumer Groups rebalance', attachments: [{ file_name: 'plan.pdf' }] }] },
    { name: 'Other', messages: [{ text: 'nothing', attachments: [] }] },
  ];
  eq(searchChats(chats, 'consumer groups').length, 1);
  eq(searchChats(chats, 'consumer groups')[0].snippet.match, 'Consumer Groups');
  eq(searchChats(chats, 'PLAN.PDF').length, 1);
  eq(searchChats(chats, 'kafka').length, 1);
  eq(searchChats(chats, '  ').length, 0);
});

// ---- markdown safety ------------------------------------------------------
test('markdown: raw HTML is escaped', () => {
  const h = renderMarkdown('<script>alert(1)</script> <img src=x onerror=alert(1)>');
  ok(!/<script/i.test(h) && !/<img/i.test(h), h);
});
test('markdown: javascript: links are neutralized, https links get rel+target', () => {
  ok(!/href="javascript:/i.test(renderMarkdown('[x](javascript:alert(1))')));
  const h = renderMarkdown('[ok](https://example.com)');
  ok(h.includes('rel="noopener noreferrer nofollow"') && h.includes('target="_blank"'));
});
test('markdown: remote images are never emitted as <img> (local-only guarantee)', () => {
  const h = renderMarkdown('![pic](https://tracker.example/p.png)');
  ok(!/<img/i.test(h) && h.includes('[image: pic]'), h);
});
test('markdown: labelled code is highlighted, copy button present, code is escaped', () => {
  const h = renderMarkdown('```go\nfunc main() { x := "<b>" }\n```');
  ok(h.includes('hljs-keyword'), 'no highlighting');
  ok(h.includes('data-copy'));
  ok(!h.includes('<b>'), 'code not escaped');
});
test('markdown: unlabelled code stays plain and labelled "text"', () => {
  const h = renderMarkdown('```\nplain\n```');
  ok(h.includes('>text<') && !h.includes('hljs-'));
});
test('markdown: tables and lists render', () => {
  const h = renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |\n\n- x\n- y');
  ok(h.includes('<table') && h.includes('<li>'));
});

// ---- message helpers ------------------------------------------------------
test('toolBrief prefers query/command/path', () => {
  eq(toolBrief({ input: { query: 'kafka', foo: 'bar' } }), 'kafka');
  eq(toolBrief({ input: { file_path: '/a/b' } }), '/a/b');
  eq(toolBrief({ input: {} }), '');
});
test('toolLabel strips mcp prefix', () => {
  eq(toolLabel('mcp__remote-devices__device_bash').short, 'device_bash');
  eq(toolLabel('Bash').short, 'Bash');
});
test('groupBlocks groups consecutive thinking/tool blocks', () => {
  const g = groupBlocks([{ type: 'thinking' }, { type: 'tool_use' }, { type: 'text' }, { type: 'tool_use' }]);
  eq(g.map((x) => x.kind), ['steps', 'block', 'steps']);
  eq(g[0].items.length, 2);
});

// ---- run ------------------------------------------------------------------
const out = document.getElementById('out');
let pass = 0; const fails = [];
for (const t of results) {
  try { await t.fn(); pass += 1; } catch (e) { fails.push(`FAIL ${t.name}\n     ${e.message}`); }
}
out.textContent = `${pass}/${results.length} passed\n${fails.join('\n')}`;
document.title = fails.length ? `FAILED ${fails.length}` : `PASSED ${pass}`;
