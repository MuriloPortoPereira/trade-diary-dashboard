const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/analytics/presentation/strategy-rows.js';
const legacy = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/^function renderStrategyRows\([^]*?^\}/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function render(rows, limit, visible = true) {
  const node = {innerHTML: 'before'}, calls = [];
  const context = vm.createContext({
    document: {getElementById(id) { assert.equal(id, 'target'); return visible ? node : null; }},
    escapeHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
    fR(value) { calls.push(['money', value]); return `$${value.toFixed(2)}`; },
    formatStrategyRatio(value) { calls.push(['ratio', value]); return value === Infinity ? '∞' : value.toFixed(2); },
    rows, limit,
  });
  vm.runInContext(source, context);
  assert.equal(vm.runInContext(limit === undefined ? 'renderStrategyRows("target", rows)' : 'renderStrategyRows("target", rows, limit)', context), undefined);
  return {html: node.innerHTML, calls};
}

const row = (name, pnl) => ({name, pnl, n: 3, wr: 66.6, recovery: 1.25});

test('strategy rows preserve order, escaping, signs, metrics and relative progress', () => {
  const rows = [row('<gain&>', 100), {...row('loss', -50), recovery: Infinity}, row('zero', 0)];
  const before = JSON.stringify(rows);
  const {html, calls} = render(rows);
  const blocks = html.split('<div class="strategy-row">').slice(1);
  assert.equal(blocks.length, 3);
  assert.match(blocks[0], /&lt;gain&amp;&gt;/);
  assert.match(blocks[0], /text-green">\+\$100\.00/);
  assert.match(blocks[0], /width:100%/);
  assert.match(blocks[1], /text-red">\$-50\.00/);
  assert.match(blocks[1], /width:50%;background:linear-gradient\(90deg, var\(--red\)/);
  assert.match(blocks[1], /FR ∞/);
  assert.match(blocks[2], /text-green">\+\$0\.00/);
  assert.match(blocks[2], /width:8%/);
  assert.match(blocks[0], /3 trades[^]*67% WR[^]*FR 1\.25/);
  assert.deepEqual(calls.filter(call => call[0] === 'money').map(call => call[1]), [100, -50, 0]);
  assert.equal(JSON.stringify(rows), before);
});

test('default limit is five and explicit limits retain slice behavior and sliced normalization', () => {
  const rows = [row('first', 10), row('second', 5), ...Array.from({length: 4}, (_, i) => row(`other${i}`, 100))];
  assert.equal((render(rows).html.match(/class="strategy-row"/g) ?? []).length, 5);
  const limited = render(rows, 2).html;
  assert.equal((limited.match(/class="strategy-row"/g) ?? []).length, 2);
  assert.match(limited, /width:100%/);
  assert.match(limited, /width:50%/);
  assert.equal(render(rows, 0).html, '');
  assert.equal((render(rows, -1).html.match(/class="strategy-row"/g) ?? []).length, 5);
  assert.match(render([row('small', 0.1)]).html, /width:10%/);
});

test('empty rows preserve existing guidance and skip formatting', () => {
  const {html, calls} = render([]);
  assert.match(html, /Sem trades suficientes/);
  assert.match(html, /Registre operações fechadas para ranquear setups\./);
  assert.deepEqual(calls, []);
});

test('missing target returns without reading rows or formatting', () => {
  const {html, calls} = render(null, undefined, false);
  assert.equal(html, 'before');
  assert.deepEqual(calls, []);
});
