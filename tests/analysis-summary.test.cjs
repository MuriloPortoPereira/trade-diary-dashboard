const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/shared/presentation/analysis-summary.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderAnalysisSummary\([^]*?^\}/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function render(items, visible = true) {
  const node = {innerHTML: 'before'};
  const context = vm.createContext({
    document: {getElementById(id) { assert.equal(id, 'target'); return visible ? node : null; }},
    escapeHtml(value) {
      return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    },
    items,
  });
  vm.runInContext(source, context, {filename: modulePath});
  assert.equal(vm.runInContext('renderAnalysisSummary("target", items)', context), undefined);
  return node.innerHTML;
}

test('analysis summary preserves order, tones, values and escaping', () => {
  const items = [
    {tone: 'safe', label: '<Forte>', value: '10 & 2', sub: 'primeiro'},
    {tone: 'danger', label: 'Fraco', value: '0', sub: '<risco>'},
  ];
  const before = JSON.stringify(items);
  const html = render(items);
  assert.equal((html.match(/class="analysis-summary-chip /g) ?? []).length, 2);
  assert.ok(html.indexOf('&lt;Forte&gt;') < html.indexOf('Fraco'));
  assert.match(html, /analysis-summary-chip safe/);
  assert.match(html, /analysis-summary-chip danger/);
  assert.match(html, /10 &amp; 2/);
  assert.match(html, /&lt;risco&gt;/);
  assert.equal(JSON.stringify(items), before);
});

test('falsy items are filtered while missing fields keep legacy defaults', () => {
  const html = render([null, false, undefined, {}, {value: 0, tone: 0, label: 0, sub: 0}]);
  assert.equal((html.match(/class="analysis-summary-chip /g) ?? []).length, 2);
  assert.equal((html.match(/analysis-summary-value">—/g) ?? []).length, 2);
  assert.equal((html.match(/analysis-summary-chip "/g) ?? []).length, 2);
});

test('empty, non-array and default items clear existing content', () => {
  assert.equal(render([]), '');
  assert.equal(render(null), '');
  assert.equal(render('invalid'), '');
  const context = vm.createContext({
    document: {getElementById() { return {innerHTML: 'before'}; }},
    escapeHtml: String,
  });
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('renderAnalysisSummary("target")', context), undefined);
});

test('missing target returns before reading or normalizing items', () => {
  const throwing = new Proxy([], {get() { throw new Error('items accessed'); }});
  assert.equal(render(throwing, false), 'before');
});
