export const normalizeAudioText = (text = '') =>
  text.trim().replace(/\s+/g, ' ');

export function parseStudyContent(text = '') {
  if (!/^## /m.test(text)) return [{ heading: '', body: text, kind: 'text' }];
  const sections = [];
  let heading = '';
  let body = [];
  const flush = () => {
    const value = body.join('\n').trim();
    if (heading || value)
      sections.push({
        heading,
        body: value,
        kind:
          heading.toLowerCase() === 'reading'
            ? 'reading'
            : heading.toLowerCase() === 'nguồn tham khảo'
              ? 'sources'
              : 'text',
      });
  };
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('## ')) {
      flush();
      heading = line.slice(3).trim();
      body = [];
    } else body.push(line);
  }
  flush();
  return sections;
}

export function parseSourceLine(line) {
  const parts = line.split(' | ');
  if (parts.length !== 2) return null;
  try {
    const url = new URL(parts[1].trim());
    return url.protocol === 'https:'
      ? { title: parts[0].trim(), url: url.href }
      : null;
  } catch {
    return null;
  }
}
