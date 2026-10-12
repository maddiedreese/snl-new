/** Shared by live preview and export. Uses actual glyph ink bounds, not length. */
export const FONT_STACK = '"Studio Marker", "Arial Narrow", Arial, sans-serif';

export function normalizeText(value) {
  return String(value).normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().toLocaleUpperCase('en-US');
}

export function measureInk(ctx, text) {
  const m = ctx.measureText(text);
  const left = Number.isFinite(m.actualBoundingBoxLeft) ? m.actualBoundingBoxLeft : 0;
  const right = Number.isFinite(m.actualBoundingBoxRight) ? m.actualBoundingBoxRight : m.width;
  return { width: Math.max(m.width, left + right), left, right,
    ascent: m.actualBoundingBoxAscent || 0, descent: m.actualBoundingBoxDescent || 0 };
}

function wrap(ctx, text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (measureInk(ctx, candidate).width <= width) { line = candidate; continue; }
    if (line) lines.push(line);
    line = '';
    if (measureInk(ctx, word).width <= width) { line = word; continue; }
    // Preserve a name's spelling and silhouette. A long word is fitted by
    // reducing type size, never by stranding its last letter on another line.
    line = word;
  }
  if (line) lines.push(line);
  return lines;
}

export function fitText(ctx, rawText, { width, height, maxSize = 162, maxLines = 3, date = false }) {
  const text = normalizeText(rawText);
  if (!text) return { fontSize: maxSize, lines: [], lineHeight: 0, height: 0, metrics: [] };
  let best;
  // All whitespace boundaries are tried for two lines, avoiding an orphan surname.
  const words = text.split(' ');
  const partitions = [[text]];
  for (let i = 1; i < words.length; i++) partitions.push([words.slice(0, i).join(' '), words.slice(i).join(' ')]);
  for (let size = maxSize; size >= 1; size--) {
    ctx.font = `${size}px ${FONT_STACK}`;
    const options = [...partitions, wrap(ctx, text, width)];
    for (const lines of options) {
      if (lines.length > maxLines) continue;
      if (date && words.length === 2 && /^[A-Z]+$/.test(words[0]) && /^\d{1,2}$/.test(words[1]) && lines.length !== 2) continue;
      const metrics = lines.map(line => measureInk(ctx, line));
      const lineHeight = Math.max(size * .83, ...metrics.map(m => m.ascent + m.descent + size * .09));
      const blockHeight = metrics[0].ascent + metrics.at(-1).descent + (lines.length - 1) * lineHeight;
      if (blockHeight > height || metrics.some(m => m.width > width)) continue;
      const widths = metrics.map(m => m.width);
      const balance = Math.min(...widths) / Math.max(...widths, 1);
      // A modest size gain shouldn't force three lines or a badly lopsided pair.
      const score = size * (lines.length > 2 ? .76 : 1) + balance * 5;
      if (!best || score > best.score) best = { fontSize: size, lines, lineHeight, height: blockHeight, metrics, score };
    }
    if (best && size < best.fontSize * .75) break;
  }
  return best || { fontSize: 1, lines: [], lineHeight: 0, height: 0, metrics: [] };
}

export function nextSaturday(now = new Date()) {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  day.setDate(day.getDate() + ((6 - day.getDay() + 7) % 7));
  return day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

export function randomChoice(names, previous, random = Math.random) {
  if (!names.length) return '';
  const candidates = names.filter(name => normalizeText(name) !== normalizeText(previous));
  const pool = candidates.length ? candidates : names;
  return pool[Math.floor(random() * pool.length)];
}
