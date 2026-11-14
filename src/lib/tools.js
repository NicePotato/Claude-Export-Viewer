// Helpers for describing tool calls. No DOM.

/** One short line describing what a tool call did. */
export function toolBrief(block) {
  const input = block.input && typeof block.input === 'object' ? block.input : {};
  for (const k of ['query', 'command', 'file_path', 'path', 'url', 'pattern', 'description', 'title', 'prompt']) {
    if (typeof input[k] === 'string' && input[k]) return input[k].replace(/\s+/g, ' ').slice(0, 90);
  }
  const first = Object.values(input).find((v) => typeof v === 'string' && v);
  return first ? first.replace(/\s+/g, ' ').slice(0, 90) : '';
}

/** mcp__server__tool -> "tool" with the server as context; plain names pass through. */
export function toolLabel(name) {
  const m = /^mcp__(.+?)__(.+)$/.exec(name || '');
  return m ? { short: m[2], full: name } : { short: name || 'tool', full: name || 'tool' };
}

