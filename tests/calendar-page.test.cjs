const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/calendar/presentation/calendar-page.js';
const legacy = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/^function renderCalendar\([^]*?^\}/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function harness(mode = 'month', rows = []) {
  const nodes = Object.fromEntries(['calStats', 'calTitle', 'calGridWrap'].map(id => [id, {innerHTML: '', textContent: ''}]));
  const calls = [], cards = [];
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [2024, 1, 10, 12])); } }
  const context = vm.createContext({
    Date: FixedDate, calYear: 2024, calMonth: 1, calViewMode: mode,
    document: {getElementById: id => nodes[id]},
    syncCalPicker() { calls.push('picker'); },
    t: (key, fallback) => fallback,
    getActiveAccount: () => ({id: 'account-a'}),
    getAccountTrades(id) { calls.push(['account', id]); return rows; },
    calcMetrics(data, id) {
      calls.push(['metrics', data.map(row => row.id), id]);
      return {totalPnl: -5, wr: 0.5, closed: data, pf: Infinity, maxDD: 0.1, exp: -0.25};
    },
    TIPS: {pnl: 'pnl', wr: 'wr', pf: 'pf', dd: 'dd', exp: 'exp'},
    fR: value => `$${value.toFixed(2)}`,
    mkCard(card) { cards.push(card); return `<card>${card.lbl}:${card.val}</card>`; },
  });
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('renderCalendar()', context), true);
  return {nodes, calls, cards, context};
}

const rows = [
  {id: 'gain', date: '2024-02-10', pnl: 10},
  {id: 'loss', date: '2024-02-16', pnl: -20},
  {id: 'last', date: '2024-02-29', pnl: 3},
  {id: 'outside', date: '2024-03-01', pnl: 100},
  {id: 'undated'},
];

test('month view preserves leap days, today, signed totals and day handlers', () => {
  const {nodes, calls, cards} = harness('month', rows);
  assert.equal(nodes.calTitle.textContent, 'Fevereiro 2024');
  const grid = nodes.calGridWrap.innerHTML;
  assert.equal((grid.match(/onclick="showCalDay\(/g) ?? []).length, 29);
  assert.equal((grid.match(/class="cal-day(?: |")/g) ?? []).length, 42);
  assert.match(grid, /class="cal-day today has-trade win" onclick="showCalDay\(10\)"/);
  assert.match(grid, /class="cal-day has-trade loss" onclick="showCalDay\(16\)"/);
  assert.match(grid, /showCalDay\(29\)[^]*\+\$3\.00/);
  assert.deepEqual(calls, ['picker', ['account', 'account-a'], ['metrics', ['gain', 'loss'], 'account-a']]);
  assert.deepEqual(cards.map(card => card.val), ['$-5.00', '50.0%', 2, '—', '10.0%', '-0.25R']);
});

test('week view preserves aligned weeks, empty totals and gain/loss totals', () => {
  const {nodes} = harness('week', rows);
  assert.equal(nodes.calTitle.textContent, 'Mensal — Fevereiro 2024');
  const grid = nodes.calGridWrap.innerHTML;
  assert.equal((grid.match(/class="cal-week-label"/g) ?? []).length, 5);
  assert.equal((grid.match(/class="cal-week-slot"/g) ?? []).length, 35);
  assert.match(grid, /cal-week-total text-green">—/);
  assert.match(grid, /cal-week-total text-green">\+\$10\.00/);
  assert.match(grid, /cal-week-total text-red">\$-20\.00/);
  assert.match(grid, /cal-week-total text-green">\+\$3\.00/);
});

test('biweek view preserves both ranges, trade counts and totals', () => {
  const {nodes} = harness('biweek', rows);
  const grid = nodes.calGridWrap.innerHTML;
  assert.equal(nodes.calTitle.textContent, 'Quinzenal — Fevereiro 2024');
  assert.equal((grid.match(/onclick="showCalDay\(/g) ?? []).length, 29);
  assert.match(grid, /1ª Quinzena \(1–15\)/);
  assert.match(grid, /2ª Quinzena \(16–29\)/);
  assert.match(grid, /1 trades · \+\$10\.00/);
  assert.match(grid, /2 trades · \$-17\.00/);
});

test('empty views keep dates and neutral period markers without mutating rows', () => {
  for (const mode of ['month', 'week', 'biweek']) {
    const {nodes} = harness(mode);
    assert.equal((nodes.calGridWrap.innerHTML.match(/onclick="showCalDay\(/g) ?? []).length, 29);
    assert.doesNotMatch(nodes.calGridWrap.innerHTML, /cal-pnl/);
  }
  const before = JSON.stringify(rows);
  harness('biweek', rows);
  assert.equal(JSON.stringify(rows), before);
});

test('unknown view keeps the legacy fortnight fallback and translations are read per call', () => {
  const {context, nodes} = harness('unknown');
  assert.match(nodes.calGridWrap.innerHTML, /cal-biweek-grid/);
  context.t = (key, fallback) => key === 'month.feb' ? 'February' : fallback;
  vm.runInContext('calViewMode="month"; renderCalendar()', context);
  assert.equal(nodes.calTitle.textContent, 'February 2024');
});
