const BULLET = /^(\s*)([-*•])\s+/;

export function toggleNoteBullets(text, start, end = start) {
  const from = start === 0 ? 0 : text.lastIndexOf("\n", start - 1) + 1;
  const last = end > start && text[end - 1] === "\n" ? end - 1 : end;
  const newline = text.indexOf("\n", last);
  const to = newline < 0 ? text.length : newline;
  const lines = text.slice(from, to).split("\n");
  const remove = lines.every((line) => BULLET.test(line));
  const replacement = lines
    .map((line) =>
      remove
        ? line.replace(BULLET, "$1")
        : BULLET.test(line)
          ? line
          : `- ${line}`,
    )
    .join("\n");
  return {
    text: text.slice(0, from) + replacement + text.slice(to),
    start: from,
    end: from + replacement.length,
  };
}

export function continueNoteBullet(text, start, end = start) {
  if (start !== end) return null;
  const from = start === 0 ? 0 : text.lastIndexOf("\n", start - 1) + 1;
  const line = text.slice(from, start);
  const match = line.match(BULLET);
  if (!match) return null;
  const nextLine = text.indexOf("\n", start);
  const wholeLine = text.slice(from, nextLine < 0 ? text.length : nextLine);
  if (!wholeLine.slice(match[0].length).trim()) {
    return {
      text: text.slice(0, from) + text.slice(start),
      start: from,
      end: from,
    };
  }
  const prefix = `\n${match[1]}- `;
  return {
    text: text.slice(0, start) + prefix + text.slice(start),
    start: start + prefix.length,
    end: start + prefix.length,
  };
}

export function noteBlocks(text) {
  const blocks = [];
  for (const line of text.split("\n")) {
    const match = line.match(BULLET);
    const type = match ? "list" : "paragraph";
    const value = match ? line.slice(match[0].length) : line;
    const last = blocks.at(-1);
    if (last?.type === type) last.lines.push(value);
    else blocks.push({ type, lines: [value] });
  }
  return blocks;
}

export function notePreview(text) {
  return text
    .split("\n")
    .map((line) => line.replace(BULLET, "$1• "))
    .join("\n");
}
