const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/trades/presentation/trade-log-selection.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function updateBulkBar\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

function createElement(extra = {}) {
  const classes = new Set();
  return {
    textContent: 'before',
    style: {display: 'before'},
    classList: {
      add(value) { classes.add(value); },
      remove(value) { classes.delete(value); },
      contains(value) { return classes.has(value); },
    },
    ...extra,
  };
}

function render({selected = [], incomplete = [], elements = {}, checkboxes = []} = {}) {
  const calls = [];
  const context = vm.createContext({
    selectedTrades: new Set(selected),
    getSelectedIncompleteTrades() { calls.push(['incomplete']); return incomplete; },
    document: {
      getElementById(id) { calls.push(['target', id]); return elements[id] ?? null; },
      querySelectorAll(selector) { calls.push(['query', selector]); return checkboxes; },
    },
  });
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext('updateBulkBar()', context);
  return {calls};
}

test('missing bulk bar returns after resolving optional controls without reading selection details', () => {
  const {calls} = render();
  assert.deepEqual(calls, [
    ['target', 'bulkBar'],
    ['target', 'bulkCount'],
    ['target', 'bulkHint'],
    ['target', 'bulkEditBtn'],
    ['target', 'bulkCompleteBtn'],
  ]);
});

test('trade log selection classic script loads once before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(scripts.filter(src => src === modulePath).length, 1);
  assert.ok(scripts.indexOf(modulePath) < scripts.indexOf('app.js'));
});

test('selected incomplete trades show the bar, counts, actions and checked select-all state', () => {
  const elements = {
    bulkBar: createElement(),
    bulkCount: createElement(),
    bulkHint: createElement(),
    bulkEditBtn: createElement(),
    bulkCompleteBtn: createElement(),
    chkAll: createElement({checked: false}),
  };
  const {calls} = render({
    selected: ['a', 'b'],
    incomplete: [{id: 'b'}],
    elements,
    checkboxes: [{checked: true}, {checked: true}],
  });
  assert.equal(elements.bulkBar.classList.contains('show'), true);
  assert.equal(elements.bulkCount.textContent, '2 selecionado(s) · 1 incompleto(s)');
  assert.equal(elements.bulkHint.style.display, 'none');
  assert.equal(elements.bulkEditBtn.textContent, '✏ Editar seleção');
  assert.equal(elements.bulkCompleteBtn.textContent, '✓ Completar incompletos (1)');
  assert.equal(elements.chkAll.checked, true);
  assert.deepEqual(calls.slice(-3), [
    ['incomplete'],
    ['target', 'chkAll'],
    ['query', '#logTbody input[type=checkbox]'],
  ]);
});

test('single complete selection preserves singular edit text and complete-action fallback', () => {
  const elements = {
    bulkBar: createElement(),
    bulkCount: createElement(),
    bulkHint: createElement(),
    bulkEditBtn: createElement(),
    bulkCompleteBtn: createElement(),
  };
  render({selected: ['a'], elements});
  assert.equal(elements.bulkCount.textContent, '1 selecionado(s)');
  assert.equal(elements.bulkEditBtn.textContent, '✏ Editar');
  assert.equal(elements.bulkCompleteBtn.textContent, '✓ Completar incompletos');
});

test('empty selection hides the bar, restores the hint and clears select-all', () => {
  const bar = createElement();
  bar.classList.add('show');
  const elements = {
    bulkBar: bar,
    bulkCount: createElement(),
    bulkHint: createElement(),
    bulkEditBtn: createElement(),
    bulkCompleteBtn: createElement(),
    chkAll: createElement({checked: true}),
  };
  render({elements, checkboxes: []});
  assert.equal(elements.bulkBar.classList.contains('show'), false);
  assert.equal(elements.bulkCount.textContent, 'before');
  assert.equal(elements.bulkHint.style.display, 'inline-flex');
  assert.equal(elements.bulkEditBtn.textContent, '✏ Editar seleção');
  assert.equal(elements.bulkCompleteBtn.textContent, '✓ Completar incompletos');
  assert.equal(elements.chkAll.checked, false);
});
