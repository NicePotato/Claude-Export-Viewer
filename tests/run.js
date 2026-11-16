// Browser-run tests (no Node on this machine). Open /tests/ while `python serve.py` is running.
import { zipSync, strToU8, unzipSync, strFromU8 } from '../vendor/fflate.js';
import {
  classify, ingestText, safeExportUrl, normalizeMessage, normalizeChat, importFiles, emptyData, summarize, hasContent, zipEntryFilter,
} from '../src/lib/importer.js';
import { buildTree, resolvePath, countForks, toViewList, ROOT_UUID } from '../src/lib/tree.js';
import { groupByRecency, chatTitle, clip, newestFirst, orderGroups } from '../src/lib/format.js';
import { searchChats } from '../src/lib/search.js';
import { renderMarkdown } from '../src/lib/markdown.js';
import { toolBrief, groupBlocks, toolLabel } from '../src/components/Message.js';
import { chatToMarkdown, exportFileName } from '../src/lib/export.js';
import { showsNothing, diagnoseEmpty } from '../src/lib/empties.js';
import { projectToMarkdown, projectFiles, projectsToZip, uniqueName } from '../src/lib/projectExport.js';
import { assign, prune, chatsOfProject, groupByProject, NO_PROJECT } from '../src/lib/assignments.js';

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

// ---- export ---------------------------------------------------------------
const exportFixture = () => {
  const human = n({ ...msg('h', ROOT_UUID, 'human', 'Why is my loop slow?'), attachments: [{ file_name: 'main.go', extracted_content: 'x' }] }, 0);
  const asst = n({ ...msg('a', 'h', 'assistant', ''), content: [
    { type: 'thinking', thinking: 'Likely allocations.' },
    { type: 'tool_use', id: 't', name: 'mcp__srv__search', input: { query: 'go slice append' } },
    { type: 'text', text: ['Preallocate the slice.', '', '```go', 's := make([]int, 0, n)', '```'].join('\n'), citations: [{ details: { url: 'https://go.dev/doc' } }] },
  ] }, 1);
  const chat = { uuid: 'c', name: 'Slow loop', created_at: '2026-03-05T10:00:00Z', messages: [human, asst] };
  return { chat, items: toViewList(resolvePath(buildTree(chat.messages))) };
};
test('export: markdown has title, speakers, attachment, code and sources', () => {
  const { chat, items } = exportFixture();
  const md = chatToMarkdown(chat, items);
  ok(md.startsWith('# Slow loop' + String.fromCharCode(10)), md);
  ok(md.includes('## You') && md.includes('Attached: main.go') && md.includes('Why is my loop slow?'));
  ok(md.includes('## Claude') && md.includes('```go') && md.includes('Sources: https://go.dev/doc'));
  ok(!md.includes('Thinking:') && !md.includes('Tool:'), 'steps should be off by default');
  ok(md.split(String.fromCharCode(10) + String.fromCharCode(10) + String.fromCharCode(10)).length === 1, 'no triple blank lines');
});
test('export: steps option adds quoted thinking and tool lines', () => {
  const { chat, items } = exportFixture();
  const md = chatToMarkdown(chat, items, { steps: true });
  ok(md.includes('> Thinking: Likely allocations.') && md.includes('> Tool: search (go slice append)'));
});
test('export: file name is dated and safe on Windows', () => {
  eq(exportFileName({ name: 'a/b: c?*"<>|', created_at: '2026-03-05T10:00:00Z', messages: [] }), '2026-03-05 a-b- c------.md');
  eq(exportFileName({ name: '...', created_at: '', messages: [] }), 'chat.md');
});

// ---- ordering -------------------------------------------------------------
test('newestFirst sorts by updated_at descending', () => {
  const list = [{ updated_at: '2026-01-01' }, { updated_at: '2026-03-01' }, { updated_at: '2026-02-01' }];
  eq(list.sort(newestFirst).map((x) => x.updated_at), ['2026-03-01', '2026-02-01', '2026-01-01']);
});
test('newestFirst compares year and time of day, whatever the timestamp format', () => {
  const list = [
    { id: 'old-year', updated_at: '2025-12-31T23:59:59Z' },
    { id: 'plain', updated_at: '2026-10-05T10:54:59Z' },
    { id: 'fraction', updated_at: '2026-10-05T10:54:59.5Z' },
    { id: 'offset', updated_at: '2026-10-05T12:00:00+02:00' },
    { id: 'bad', updated_at: 'junk' },
  ];
  eq(list.toSorted(newestFirst).map((x) => x.id), ['fraction', 'plain', 'offset', 'old-year', 'bad']);
});
test('orderGroups: oldest first reverses groups and items, newest first is untouched', () => {
  const g = [{ label: 'New', items: [3, 2] }, { label: 'Old', items: [1, 0] }];
  eq(orderGroups(g, 'new'), g);
  eq(orderGroups(g, 'old'), [{ label: 'Old', items: [0, 1] }, { label: 'New', items: [2, 3] }]);
  eq(g[0].items, [3, 2], 'input must not be mutated');
});

// ---- empty chats ----------------------------------------------------------
const blankMsg = (uuid, parent, sender, extra = {}) => ({
  uuid, parent_message_uuid: parent, sender, text: '', content: [], attachments: [], files: [],
  created_at: '2026-10-05T10:54:59Z', ...extra,
});
const chatOf = (messages) => normalizeChat(rawChat('c', messages, ''));

test('empties: a chat with text is not empty', () => {
  const c = chatOf([msg('a', ROOT_UUID, 'human', 'hi')]);
  eq(showsNothing(c), false);
  eq(diagnoseEmpty(c), null);
});
test('empties: blank bodies are explained from the file contents', () => {
  const c = chatOf([blankMsg('a', ROOT_UUID, 'human'), blankMsg('b', 'a', 'assistant'), blankMsg('c', 'b', 'human')]);
  const d = diagnoseEmpty(c);
  eq(d.code, 'blank-bodies');
  eq([d.facts.total, d.facts.human, d.facts.assistant], [3, 2, 1]);
  ok(d.detail.includes('3 messages') && d.detail.includes('2 from you'), d.detail);
});
test('empties: unsupported-block placeholder only', () => {
  const ph = 'This block is not supported on your current device yet.';
  eq(diagnoseEmpty(chatOf([msg('a', ROOT_UUID, 'human', ph)])).code, 'unsupported-only');
});
test('empties: no messages at all', () => eq(diagnoseEmpty(chatOf([])).code, 'no-messages'));
test('empties: only system notes falls back to no-content', () => {
  const note = blankMsg('a', ROOT_UUID, 'human', { content: [{ type: 'injected_prompt_block', text: 'date' }] });
  eq(diagnoseEmpty(chatOf([note])).code, 'no-content');
});
test('empties: data without raw info is still classified', () => {
  const c = chatOf([blankMsg('a', ROOT_UUID, 'human')]);
  for (const m of c.messages) delete m.raw;
  eq(diagnoseEmpty(c).code, 'no-content');
});

// ---- chats in projects ----------------------------------------------------
const chatsAB = [{ uuid: 'c1' }, { uuid: 'c2' }, { uuid: 'c3' }];
const projAB = [{ uuid: 'p1', name: 'Alpha' }, { uuid: 'p2', name: '' }, { uuid: 'p3', name: 'Empty one' }];
test('assignments: assign, move and unassign without mutating', () => {
  const a = {};
  const b = assign(a, 'c1', 'p1');
  const c = assign(b, 'c1', 'p2');
  const d = assign(c, 'c1', null);
  eq([a, b, c, d], [{}, { c1: 'p1' }, { c1: 'p2' }, {}]);
});
test('assignments: prune drops unknown chats and projects', () => {
  eq(prune({ c1: 'p1', zz: 'p1', c2: 'gone' }, chatsAB, projAB), { c1: 'p1' });
  eq(prune(null, chatsAB, projAB), {});
});
test('assignments: chatsOfProject keeps order', () => {
  eq(chatsOfProject({ c1: 'p1', c3: 'p1', c2: 'p2' }, chatsAB, 'p1').map((c) => c.uuid), ['c1', 'c3']);
});
test('assignments: groupByProject skips empty projects and ends with unfiled chats', () => {
  const g = groupByProject(chatsAB, { c1: 'p1', c2: 'p2' }, projAB);
  eq(g.map((x) => [x.id, x.label, x.items.map((c) => c.uuid)]), [
    ['p1', 'Alpha', ['c1']], ['p2', 'Untitled project', ['c2']], [NO_PROJECT, 'No project', ['c3']],
  ]);
  eq(groupByProject(chatsAB, { c1: 'p1', c2: 'p1', c3: 'p1' }, projAB).map((x) => x.id), ['p1']);
});

// ---- project export -------------------------------------------------------
const proj = {
  uuid: 'p1', name: 'Go: study', description: 'Learning Go.', prompt: 'Be brief.', created_at: '2026-03-01T00:00:00Z',
  docs: [{ filename: 'notes.md', content: 'a ```fence``` inside' }, { filename: 'notes.md', content: '' }, { filename: 'a/b.txt', content: 'x' }],
};
const projChats = [
  normalizeChat(rawChat('c1', [msg('m1', ROOT_UUID, 'human', 'hello'), msg('m2', 'm1', 'assistant', 'hi')], 'Slices')),
  normalizeChat(rawChat('c2', [], '')),
];
test('projectExport: uniqueName keeps the extension and ignores case', () => {
  const used = new Set();
  eq([uniqueName('A.md', used), uniqueName('a.MD', used), uniqueName('a.md', used)], ['A.md', 'a (2).MD', 'a (3).md']);
});
test('projectExport: markdown holds instructions, memory, fenced documents and the chat index', () => {
  const md = projectToMarkdown(proj, { memory: 'Likes Go.', chats: projChats });
  const NL = String.fromCharCode(10);
  ok(md.startsWith('# Go: study'), md);
  ok(md.includes('## Instructions') && md.includes('Be brief.') && md.includes('## Memory') && md.includes('Likes Go.'));
  ok(md.includes('### notes.md') && md.includes('````' + NL + 'a ```fence``` inside' + NL + '````'), 'fence must outgrow inner backticks');
  ok(md.includes('_Empty document._') && md.includes('## Chats') && md.includes('Slices'));
});
test('projectExport: folder layout, safe unique names, empty chats skipped', () => {
  const paths = projectFiles(proj, { memory: 'm', chats: projChats }).map((f) => f.path);
  eq(paths, ['README.md', 'instructions.md', 'memory.md', 'documents/notes.md', 'documents/notes (2).md', 'documents/a-b.txt', 'chats/2026-01-01 Slices.md']);
});
test('projectExport: zip round-trips with one folder per project', () => {
  const zip = projectsToZip([{ project: proj, memory: '', chats: projChats }, { project: { ...proj, uuid: 'p2' }, memory: '', chats: [] }]);
  const files = unzipSync(zip);
  const names = Object.keys(files).sort();
  ok(names.includes('Go- study/README.md') && names.includes('Go- study (2)/README.md'), names.join(','));
  ok(strFromU8(files['Go- study/chats/2026-01-01 Slices.md']).includes('hello'));
});

// ---- download list (manifest) --------------------------------------------
const manifestJson = {
  created_at: '2026-11-14T09:11:59.546493+00:00', version: '1.0', total_files: 3,
  data_files: [
    { batch_index: 0, export_url: 'https://claude.ai/export/abc/download/1', category: 'conversations', part: 0, filename: 'conversations-000.zip' },
    { batch_index: 1, export_url: 'javascript:alert(1)', category: 'projects', part: 0, filename: 'projects-000.zip' },
    { batch_index: 2, export_url: 'https://evil.example/claude.ai', category: 'frames', part: 0, filename: 'frames-000.zip' },
  ],
};
test('manifest: classified, and a normal export is not mistaken for one', () => {
  eq(classify(manifestJson, 'manifest-x.json'), 'manifest');
  eq(classify(rawChat('1', []), 'conversations.json'), 'conversations');
});
test('manifest: stored, never counted as content, links limited to claude.ai over https', () => {
  const data = emptyData();
  const res = ingestText('manifest-x.json', JSON.stringify(manifestJson), data);
  eq([res.kind, res.count, hasContent(data)], ['manifest', 3, false]);
  eq(data.manifest.files.map((f) => f.url !== ''), [true, false, false]);
  eq(data.manifest.expires_at - Date.parse(manifestJson.created_at), 24 * 60 * 60 * 1000);
});
test('manifest: safeExportUrl rejects other schemes, hosts and junk', () => {
  eq(safeExportUrl('http://claude.ai/x'), '');
  eq(safeExportUrl('not a url'), '');
  eq(safeExportUrl('https://sub.claude.ai/x') !== '', true);
  eq(safeExportUrl('https://claude.ai.evil.com/x'), '');
});

// ---- run ------------------------------------------------------------------
const out = document.getElementById('out');
let pass = 0; const fails = [];
for (const t of results) {
  try { await t.fn(); pass += 1; } catch (e) { fails.push(`FAIL ${t.name}\n     ${e.message}`); }
}
out.textContent = `${pass}/${results.length} passed\n${fails.join('\n')}`;
document.title = fails.length ? `FAILED ${fails.length}` : `PASSED ${pass}`;
