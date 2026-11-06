const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {fragmentFiles, renderIndex} = require('../scripts/build-index.cjs');
const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'));

test('published shell preserves every byte and its existing mixed line endings', () => {
  // G7f: register strategy queries before the presentation consumers.
  assert.equal(index.length, 107273);
  assert.equal(createHash('sha256').update(index).digest('hex'),
    'f22c8d670938008407c3c708fb66e3c7654773593677d25e702a573e49003a32');
  assert.equal((index.toString().match(/\r\n/g) || []).length, 1420);
  assert.equal((index.toString().match(/\n/g) || []).length, 1569);
});

test('shell keeps all fifteen pages in order including psychology outside the sidebar', () => {
  const pages = [...index.toString().matchAll(/id="(page-[^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(pages, ['page-dashboard','page-log','page-calendar','page-stats','page-premarket',
    'page-psych','page-strategyHub','page-studyHub','page-import','page-documents','page-setup',
    'page-notifications','page-accounts','page-partners','page-profile']);
});

test('authored fragments compose exactly the committed static entry point', () => {
  const result = renderIndex();
  assert.ok(Buffer.isBuffer(result));
  assert.ok(result.equals(index));
  assert.equal(fragmentFiles[0], 'src/app/presentation/shell/open.html');
  assert.equal(fragmentFiles.at(-1), 'src/app/presentation/shell/close.html');
  for (const file of fragmentFiles.slice(1, -1)) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.equal([...source.matchAll(/id="page-[^"]+"/g)].length, 1, `${file} owns one page view`);
  }
});
