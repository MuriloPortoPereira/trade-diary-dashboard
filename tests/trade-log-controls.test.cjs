const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/trades/presentation/trade-log-controls.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const names = ['sortLog', 'clearLogDateRange', 'toggleSelectAll', 'toggleRowSelect', 'clearSelection'];
const legacyParts = names.map(name => appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const legacy = legacyParts.every(Boolean) ? legacyParts.join('\n\n') : undefined;
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function row() {
  const classes = new Set();
  return {classList: {
    toggle(name, force) { if (force) classes.add(name); else classes.delete(name); },
    remove: name => classes.delete(name),
    contains: name => classes.has(name),
  }};
}

function checkbox(id, checked = false, parent = row()) {
  return {checked, dataset: {id}, closest: selector => selector === 'tr' ? parent : null, parent};
}

function setup({sortState = {col: 'date', dir: 'desc'}, selected = [], checkboxes = []} = {}) {
  const indicators = [{textContent: 'old'}, {textContent: 'old'}];
  const elements = {
    'si-date': {textContent: '↓'},
    'si-symbol': {textContent: ''},
    filterDateStart: {value: '2026-01-01'},
    filterDateEnd: {value: '2026-01-31'},
    chkAll: {checked: true},
    logTbody: {querySelectorAll: selector => selector === 'input[type=checkbox]' ? checkboxes : []},
  };
  const calls = [];
  const context = vm.createContext({
    sortState,
    selectedTrades: new Set(selected),
    document: {
      getElementById: id => elements[id] ?? null,
      querySelectorAll: selector => selector === '.sort-ind' ? indicators : checkboxes,
    },
    renderLog: () => calls.push('renderLog'),
    updateBulkBar: () => calls.push('updateBulkBar'),
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#trade-log-controls' : modulePath});
  return {context, elements, indicators, calls};
}

test('sorting a new column preserves defaults, indicators and render order', () => {
  const {context, elements, indicators, calls} = setup();
  context.sortLog('symbol');
  assert.equal(context.sortState.col, 'symbol');
  assert.equal(context.sortState.dir, 'asc');
  assert.deepEqual(indicators.map(item => item.textContent), ['', '']);
  assert.equal(elements['si-symbol'].textContent, '↑');
  assert.deepEqual(calls, ['renderLog']);
  context.sortLog('date');
  assert.equal(context.sortState.dir, 'desc');
  assert.equal(elements['si-date'].textContent, '↓');
});

test('sorting the same column toggles direction and tolerates a missing indicator', () => {
  const {context, elements, calls} = setup({sortState: {col: 'symbol', dir: 'asc'}});
  context.sortLog('symbol');
  assert.equal(context.sortState.dir, 'desc');
  assert.equal(elements['si-symbol'].textContent, '↓');
  context.sortLog('unknown');
  assert.equal(context.sortState.col, 'unknown');
  assert.equal(context.sortState.dir, 'asc');
  assert.deepEqual(calls, ['renderLog', 'renderLog']);
});

test('clearing the date range keeps optional controls and always rerenders', () => {
  const present = setup();
  present.context.clearLogDateRange();
  assert.equal(present.elements.filterDateStart.value, '');
  assert.equal(present.elements.filterDateEnd.value, '');
  assert.deepEqual(present.calls, ['renderLog']);
  delete present.elements.filterDateStart;
  delete present.elements.filterDateEnd;
  present.context.clearLogDateRange();
  assert.deepEqual(present.calls, ['renderLog', 'renderLog']);
});

test('select all synchronizes checkboxes, rows, ids and the bulk bar', () => {
  const first = checkbox('a');
  const second = checkbox('b');
  const {context, calls} = setup({selected: ['old'], checkboxes: [first, second]});
  context.toggleSelectAll({checked: true});
  assert.equal(first.checked, true);
  assert.equal(second.checked, true);
  assert.equal(first.parent.classList.contains('selected'), true);
  assert.deepEqual([...context.selectedTrades], ['old', 'a', 'b']);
  context.toggleSelectAll({checked: false});
  assert.equal(first.parent.classList.contains('selected'), false);
  assert.deepEqual([...context.selectedTrades], ['old']);
  assert.deepEqual(calls, ['updateBulkBar', 'updateBulkBar']);
});

test('row selection adds or removes one id and updates its optional row', () => {
  const selectedRow = row();
  const cb = checkbox('ignored', true, selectedRow);
  const {context, calls} = setup();
  context.toggleRowSelect(cb, 'trade-1');
  assert.equal(context.selectedTrades.has('trade-1'), true);
  assert.equal(selectedRow.classList.contains('selected'), true);
  cb.checked = false;
  cb.closest = () => null;
  context.toggleRowSelect(cb, 'trade-1');
  assert.equal(context.selectedTrades.has('trade-1'), false);
  assert.deepEqual(calls, ['updateBulkBar', 'updateBulkBar']);
});

test('clear selection resets state, visible rows, select-all and bulk bar', () => {
  const first = checkbox('a', true);
  const second = checkbox('b', true);
  first.parent.classList.toggle('selected', true);
  second.parent.classList.toggle('selected', true);
  const {context, elements, calls} = setup({selected: ['a', 'b'], checkboxes: [first, second]});
  context.clearSelection();
  assert.equal(context.selectedTrades.size, 0);
  assert.equal(first.checked, false);
  assert.equal(second.checked, false);
  assert.equal(first.parent.classList.contains('selected'), false);
  assert.equal(elements.chkAll.checked, false);
  assert.deepEqual(calls, ['updateBulkBar']);
  delete elements.chkAll;
  context.clearSelection();
  assert.deepEqual(calls, ['updateBulkBar', 'updateBulkBar']);
});
