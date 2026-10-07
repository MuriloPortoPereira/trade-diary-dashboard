const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/documents/presentation/document-folder-icon.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderDocFolderIcon\([^]*?^\}/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function icon(type, useArgument = true) {
  const context = vm.createContext({type});
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderDocFolderIcon' : modulePath});
  return vm.runInContext(useArgument ? 'renderDocFolderIcon(type)' : 'renderDocFolderIcon()', context);
}

test('folder icons keep the shared wrapper and accessible SVG contract', () => {
  for (const type of ['plus', 'calendar', 'file', 'folder']) {
    const html = icon(type);
    assert.match(html, /^<span class="doc-folder-icon"><svg viewBox="0 0 24 24" aria-hidden="true">/);
    assert.match(html, /<\/svg><\/span>$/);
  }
});

test('each supported folder type preserves its distinct path data', () => {
  assert.match(icon('plus'), /M12 5v14M5 12h14/);
  assert.match(icon('calendar'), /M7 3v4M17 3v4M4 9h16/);
  assert.match(icon('file'), /M14 3v5h5M9 13h6M9 17h4/);
  assert.match(icon('folder'), /M3 7h7l2 2h9v10/);
});

test('unknown, empty, null and omitted types retain the file fallback', () => {
  const file = icon('file');
  assert.equal(icon('missing'), file);
  assert.equal(icon(''), file);
  assert.equal(icon(null), file);
  assert.equal(icon(undefined, false), file);
});
