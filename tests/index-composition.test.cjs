const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {fragmentFiles, renderIndex, exportSite} = require('../scripts/build-index.cjs');
const {tmpdir} = require('node:os');
const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'));

test('published shell preserves every byte and its existing mixed line endings', () => {
  // Workspace consolidation changes script and stylesheet registrations only.
  assert.equal(index.length, 102012);
  assert.equal(createHash('sha256').update(index).digest('hex'),
    '119ee43ec824066d4fa3e7f4c0e922353de0e582e9cef2962a27f7efee949aaf');
  assert.equal((index.toString().match(/\r\n/g) || []).length, 1417);
  assert.equal((index.toString().match(/\n/g) || []).length, 1503);
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

test('delivery contains only the unchanged runtime assets, license and user instructions', t => {
  const temporary = fs.mkdtempSync(path.join(tmpdir(), 'trade-delivery-'));
  t.after(() => fs.rmSync(temporary, {recursive: true, force: true}));
  const target = path.join(temporary, 'site');
  const files = exportSite(target);
  assert.equal(files.length, 73);
  assert.equal(files.filter(file => file.endsWith('.js')).length, 48);
  assert.equal(files.filter(file => file.endsWith('.css')).length, 22);
  for (const file of files.filter(file => file !== 'README.md')) {
    assert.ok(fs.readFileSync(path.join(target, file)).equals(fs.readFileSync(path.join(root, file))), file);
  }
  for (const excluded of ['tests', 'scripts', 'docs', '.agents', '.codex', '.git', 'AGENTS.md', 'src/app/presentation/shell']) {
    assert.equal(fs.existsSync(path.join(target, excluded)), false, excluded);
  }
  assert.deepEqual(exportSite(target), files, 'identical delivery can be verified without overwriting');
});

test('export refuses to overwrite an existing delivery or unrelated directory', t => {
  const temporary = fs.mkdtempSync(path.join(tmpdir(), 'trade-delivery-preserve-'));
  t.after(() => fs.rmSync(temporary, {recursive: true, force: true}));
  const target = path.join(temporary, 'site');
  exportSite(target);
  const filename = path.join(target, 'app.js');
  fs.writeFileSync(filename, '// user edit');
  assert.throws(() => exportSite(target), /already exists with different files/);
  assert.equal(fs.readFileSync(filename, 'utf8'), '// user edit');
  const unrelated = path.join(temporary, 'unrelated');
  fs.mkdirSync(unrelated);
  fs.writeFileSync(path.join(unrelated, 'notes.txt'), 'preserve');
  assert.throws(() => exportSite(unrelated), /already exists with different files/);
  assert.equal(fs.readFileSync(path.join(unrelated, 'notes.txt'), 'utf8'), 'preserve');
});
