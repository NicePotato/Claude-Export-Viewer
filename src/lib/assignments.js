// The export does not say which project a chat belonged to, so the viewer lets the user file
// chats into projects themselves. An assignment map is { [chatUuid]: projectUuid }, kept in this
// browser only. All functions are pure and never mutate their input.

export const NO_PROJECT = 'none';

/** Return a new map with the chat filed under `projectId`, or removed when `projectId` is falsy. */
export function assign(map, chatId, projectId) {
  const next = { ...map };
  if (projectId) next[chatId] = projectId;
  else delete next[chatId];
  return next;
}

/** Drop assignments that point at chats or projects that are not loaded (for example after a re-import). */
export function prune(map, chats, projects) {
  const chatIds = new Set(chats.map((c) => c.uuid));
  const projectIds = new Set(projects.map((p) => p.uuid));
  const next = {};
  for (const [c, p] of Object.entries(map || {})) if (chatIds.has(c) && projectIds.has(p)) next[c] = p;
  return next;
}

/** Chats filed under one project, in the order given. */
export function chatsOfProject(map, chats, projectId) {
  return chats.filter((c) => map[c.uuid] === projectId);
}

/**
 * Group chats by project for the list column. Projects keep the order given, only projects that
 * hold at least one chat appear, and unfiled chats come last under `NO_PROJECT`.
 * @returns {{id: string, label: string, items: object[]}[]}
 */
export function groupByProject(chats, map, projects) {
  const groups = [];
  for (const p of projects) {
    const items = chatsOfProject(map, chats, p.uuid);
    if (items.length) groups.push({ id: p.uuid, label: p.name || 'Untitled project', items });
  }
  const known = new Set(projects.map((p) => p.uuid));
  const loose = chats.filter((c) => !known.has(map[c.uuid]));
  if (loose.length) groups.push({ id: NO_PROJECT, label: 'No project', items: loose });
  return groups;
}
