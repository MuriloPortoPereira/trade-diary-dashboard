const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/calendar/presentation/dashboard-calendar.js';
const legacy = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/^function renderDashboardCalendar\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

function render(rows = [], {visible = ['dashCalendarMonth', 'dashCalendarMini', 'dashWeekBreakdown'], anchor = '2024-02-10'} = {}) {
  const nodes = Object.fromEntries(visible.map(id => [id, {innerHTML: 'before', textContent: 'before'}]));
  const calls = [];
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [2024, 1, 10, 12])); } }
  const context = vm.createContext({
    Date: FixedDate,
    document: {getElementById: id => nodes[id] ?? null},
    getAnchorTradeDate(data) { calls.push(data); return anchor; },
    t: (key, fallback) => fallback,
    fR: value => `$${value.toFixed(2)}`,
    rows,
  });
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('renderDashboardCalendar(rows)', context), undefined);
  return {nodes, calls, context};
}

const rows = [
  {date: '2024-02-10', pnl: 10}, {date: '2024-02-10', pnl: -2},
  {date: '2024-02-16', pnl: -20}, {date: '2024-02-29', pnl: 0},
  {date: '2024-03-01', pnl: 100}, {pnl: 5},
];

test('dashboard calendar anchors the month and renders leap days with signed daily results', () => {
  const {nodes, calls} = render(rows);
  assert.equal(calls[0], rows);
  assert.equal(nodes.dashCalendarMonth.textContent, 'Fevereiro de 2024');
  const grid = nodes.dashCalendarMini.innerHTML;
  assert.equal((grid.match(/class="mini-cal-head"/g) ?? []).length, 7);
  assert.equal((grid.match(/class="dash-cal-cell /g) ?? []).length, 42);
  assert.equal((grid.match(/onclick="showPage\('calendar'\)"/g) ?? []).length, 29);
  assert.match(grid, /is-gain today[^]*?<strong>10<\/strong><span class="dash-cal-value">\+\$8\.00/);
  assert.match(grid, /is-loss[^]*?<strong>16<\/strong><span class="dash-cal-value">\$-20\.00/);
  assert.match(grid, /is-gain[^]*?<strong>29<\/strong><span class="dash-cal-value">\+\$0\.00/);
  assert.doesNotMatch(grid, /\$100\.00/);
});

test('weekly breakdown keeps empty markers and aggregated gain/loss totals', () => {
  const {nodes} = render(rows);
  const html = nodes.dashWeekBreakdown.innerHTML;
  assert.equal((html.match(/class="week-row"/g) ?? []).length, 5);
  assert.match(html, /Semana 1[^]*?text-green">—/);
  assert.match(html, /Semana 2[^]*?text-green">\+\$8\.00/);
  assert.match(html, /Semana 3[^]*?text-red">\$-20\.00/);
  assert.match(html, /Semana 5[^]*?text-green">\+\$0\.00/);
  assert.equal(JSON.stringify(rows), JSON.stringify([
    {date: '2024-02-10', pnl: 10}, {date: '2024-02-10', pnl: -2},
    {date: '2024-02-16', pnl: -20}, {date: '2024-02-29', pnl: 0},
    {date: '2024-03-01', pnl: 100}, {pnl: 5},
  ]));
});

test('non-array input becomes empty data while translated headings stay independent of month locale', () => {
  const {nodes, calls, context} = render(null);
  assert.equal(calls[0].length, 0);
  assert.doesNotMatch(nodes.dashCalendarMini.innerHTML, /is-gain|is-loss/);
  context.t = (key, fallback) => key === 'day.sun' ? 'Sun' : fallback;
  vm.runInContext('renderDashboardCalendar([])', context);
  assert.match(nodes.dashCalendarMini.innerHTML, /mini-cal-head">Sun/);
  assert.equal(nodes.dashCalendarMonth.textContent, 'Fevereiro de 2024');
});

test('every required target is guarded before reading anchor or changing other targets', () => {
  const ids = ['dashCalendarMonth', 'dashCalendarMini', 'dashWeekBreakdown'];
  for (const missing of ids) {
    const {nodes, calls} = render(rows, {visible: ids.filter(id => id !== missing)});
    assert.deepEqual(calls, []);
    for (const node of Object.values(nodes)) assert.deepEqual(node, {innerHTML: 'before', textContent: 'before'});
  }
});

test('dashboard calendar loads once as a synchronous classic script before stop fee presentation', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)].filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src/modules/analytics/presentation/stop-fee-analysis.js'));
});
