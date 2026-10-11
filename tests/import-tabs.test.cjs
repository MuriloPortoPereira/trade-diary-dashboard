const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/data-transfer/presentation/import-tabs.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function switchImportTab\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

test('import tabs load once as a classic script after dependencies and before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf('src/modules/data-transfer/presentation/backup-summary.js') < html.indexOf(modulePath));
  assert.ok(html.indexOf('src/modules/data-transfer/presentation/export-account-filter.js') < html.indexOf(modulePath));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});

function createButton(onclick) {
  return {
    active: null,
    getAttribute(name) { return name === 'onclick' ? onclick : null; },
    classList: {toggle(name, active) { assert.equal(name, 'active'); this.owner.active = active; }},
  };
}

function render(id, {csv = {style: {display: 'before'}}, exportPanel = {style: {display: 'before'}}} = {}) {
  const calls = [];
  const payload = {kind: 'current'};
  const csvButton = createButton("switchImportTab('csv')");
  const exportButton = createButton("switchImportTab('export')");
  csvButton.classList.owner = csvButton;
  exportButton.classList.owner = exportButton;
  const buttons = [csvButton, exportButton];
  const context = vm.createContext({
    selectedTab: id,
    document: {
      getElementById(targetId) {
        calls.push(['target', targetId]);
        return targetId === 'importTab-csv' ? csv : targetId === 'importTab-export' ? exportPanel : null;
      },
      querySelectorAll(selector) {
        calls.push(['buttons', selector]);
        return buttons;
      },
    },
    createBackupPayload() { calls.push(['payload']); return payload; },
    renderBackupSummary(value) { calls.push(['summary', value]); },
    renderExportAccountFilter() { calls.push(['filter']); },
  });
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext('switchImportTab(selectedTab)', context);
  return {csv, exportPanel, csvButton, exportButton, calls, payload};
}

test('csv tab shows import, hides export and updates active buttons without export work', () => {
  const result = render('csv');
  assert.equal(result.csv.style.display, '');
  assert.equal(result.exportPanel.style.display, 'none');
  assert.equal(result.csvButton.active, true);
  assert.equal(result.exportButton.active, false);
  assert.deepEqual(result.calls, [
    ['target', 'importTab-csv'],
    ['target', 'importTab-export'],
    ['buttons', '#page-import .tab-btn'],
  ]);
});

test('export tab renders current backup summary then account filter', () => {
  const result = render('export');
  assert.equal(result.csv.style.display, 'none');
  assert.equal(result.exportPanel.style.display, '');
  assert.equal(result.csvButton.active, false);
  assert.equal(result.exportButton.active, true);
  assert.deepEqual(result.calls, [
    ['target', 'importTab-csv'],
    ['target', 'importTab-export'],
    ['buttons', '#page-import .tab-btn'],
    ['payload'],
    ['summary', result.payload],
    ['filter'],
  ]);
});

test('unknown tab hides both panels, deactivates buttons and skips export work', () => {
  const result = render('other');
  assert.equal(result.csv.style.display, 'none');
  assert.equal(result.exportPanel.style.display, 'none');
  assert.equal(result.csvButton.active, false);
  assert.equal(result.exportButton.active, false);
  assert.equal(result.calls.length, 3);
});

test('missing panels remain optional while buttons and export effects still update', () => {
  const result = render('export', {csv: null, exportPanel: null});
  assert.equal(result.csvButton.active, false);
  assert.equal(result.exportButton.active, true);
  assert.deepEqual(result.calls.slice(-3), [
    ['payload'],
    ['summary', result.payload],
    ['filter'],
  ]);
});
