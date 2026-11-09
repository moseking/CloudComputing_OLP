import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAudioText,
  parseSourceLine,
  parseStudyContent,
} from './studyContent.js';

test('existing plain lesson text stays intact', () => {
  assert.deepEqual(parseStudyContent('Hello!\nAn existing lesson.'), [
    { heading: '', body: 'Hello!\nAn existing lesson.', kind: 'text' },
  ]);
});
test('reading is separated from bilingual notes and reference URLs', () => {
  const result = parseStudyContent(
    'Introduction\n\n## Reading\nAn original text.\n\n## Nguồn tham khảo\nSource | https://example.org/path',
  );
  assert.equal(result[0].body, 'Introduction');
  assert.equal(result[1].kind, 'reading');
  assert.equal(result[1].body, 'An original text.');
  assert.equal(result[2].kind, 'sources');
});
test('audio matching ignores whitespace while preserving spoken wording', () => {
  assert.equal(
    normalizeAudioText(' Hello!\n My name is Mai.  '),
    'Hello! My name is Mai.',
  );
  assert.notEqual(
    normalizeAudioText('a changed passage'),
    normalizeAudioText('the original passage'),
  );
});
test('source renderer accepts HTTPS links and rejects unsafe schemes', () => {
  assert.deepEqual(parseSourceLine('Source | https://example.org/page'), {
    title: 'Source',
    url: 'https://example.org/page',
  });
  for (const line of [
    'Text only',
    'Click | javascript:alert(1)',
    'File | file:///private.txt',
    'Site | http://example.org',
  ])
    assert.equal(parseSourceLine(line), null);
});
