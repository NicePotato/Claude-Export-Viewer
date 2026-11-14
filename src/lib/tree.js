// Claude conversations are trees: editing a message or retrying a reply creates a branch.
// chat_messages is a flat list where each message points to its parent.
// The viewer shows ONE path through the tree and lets the user switch at branch points.

export const ROOT_UUID = '00000000-0000-4000-8000-000000000000';
const ROOT = ROOT_UUID;

/** @returns {{byId: Map, children: Map<string, object[]>, maxIdx: Map<string, number>}} */
export function buildTree(messages) {
  const byId = new Map();
  for (const m of messages) byId.set(m.uuid, m);

  const children = new Map();
  for (const m of messages) {
    // Missing or unknown parents are treated as roots so no message is ever lost.
    const key = m.parent && byId.has(m.parent) && m.parent !== m.uuid ? m.parent : ROOT;
    if (!children.has(key)) children.set(key, []);
    children.get(key).push(m);
  }
  for (const list of children.values()) list.sort((a, b) => a.idx - b.idx);

  // maxIdx[node] = highest array index in the node's subtree. "Latest branch" = largest maxIdx.
  // Iterative post-order so very long chats cannot overflow the call stack.
  const maxIdx = new Map();
  const visited = new Set();
  const stack = [{ key: ROOT, expanded: false }];
  while (stack.length) {
    const top = stack[stack.length - 1];
    const kids = children.get(top.key) || [];
    if (!top.expanded) {
      top.expanded = true;
      if (visited.has(top.key)) { stack.pop(); continue; } // cycle guard
      visited.add(top.key);
      for (const k of kids) stack.push({ key: k.uuid, expanded: false });
    } else {
      stack.pop();
      const own = byId.get(top.key)?.idx ?? -1;
      let best = own;
      for (const k of kids) best = Math.max(best, maxIdx.get(k.uuid) ?? -1);
      maxIdx.set(top.key, best);
    }
  }
  return { byId, children, maxIdx };
}

/**
 * Walk from the root choosing a child at every fork.
 * `choice` maps parentKey -> chosen child uuid; otherwise the most recent branch wins.
 * @returns {{msg: object, parentKey: string, siblings: object[], index: number}[]}
 */
export function resolvePath(tree, choice = {}) {
  const path = [];
  const seen = new Set();
  let key = ROOT;
  for (;;) {
    const kids = tree.children.get(key);
    if (!kids || !kids.length || seen.has(key)) break;
    seen.add(key);
    let pick = kids.find((k) => k.uuid === choice[key]);
    if (!pick) {
      pick = kids.reduce((best, k) =>
        (tree.maxIdx.get(k.uuid) ?? -1) > (tree.maxIdx.get(best.uuid) ?? -1) ? k : best, kids[0]);
    }
    path.push({ msg: pick, parentKey: key, siblings: kids, index: kids.indexOf(pick) });
    key = pick.uuid;
  }
  return path;
}

export function countForks(tree) {
  let n = 0;
  for (const kids of tree.children.values()) if (kids.length > 1) n += 1;
  return n;
}

/**
 * Turn a resolved path into what the UI actually shows.
 * - Messages with nothing to display are dropped.
 * - Tool results often arrive in a separate, textless "human" message. Those are folded into
 *   the assistant message that made the call, as Claude's own UI does.
 * @returns {{entry: object, extra: Map<string, object>|null}[]}
 */
export function toViewList(path) {
  const out = [];
  for (const entry of path) {
    const m = entry.msg;
    const hasPlain = Boolean(m.text.trim()) || m.attachments.length > 0 || m.files.length > 0;
    const onlyResults = m.blocks.length > 0 && m.blocks.every((b) => b.type === 'tool_result') && !hasPlain;
    if (onlyResults) {
      const prev = out[out.length - 1];
      if (prev && prev.entry.msg.sender === 'assistant') {
        prev.extra = prev.extra || new Map();
        for (const b of m.blocks) prev.extra.set(b.tool_use_id, b);
      }
      continue;
    }
    if (!m.blocks.length && !hasPlain) continue;
    out.push({ entry, extra: null });
  }
  return out;
}
