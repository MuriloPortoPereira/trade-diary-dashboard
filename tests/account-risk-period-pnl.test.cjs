const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const start = appSource.indexOf('function calcAccountRiskState(');
const end = appSource.indexOf('\nfunction formatSignedMoney(', start);
assert.ok(start >= 0 && end > start);

function periodState(trades, period) {
  const calls = [];
  const context = vm.createContext({
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : ['2026-10-14T12:00:00Z'])); } },
    getOrderedTrades: rows => { calls.push('ordered'); return rows; },
    getAnchorTradeDate: () => { calls.push('anchor'); return '2026-10-14'; },
    calcAccountCashflow: () => { calls.push('cashflow'); return {deposits: 0, withdrawals: 0, net: 0}; },
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    isFuturesAccount: () => false,
    fR: value => String(value),
    f2: value => String(value),
  });
  for (const name of ['calculate-risk-limits.js', 'calculate-goal-cycle.js', 'calculate-balance-drawdown.js', 'calculate-risk-period-pnl.js']) {
    const file = path.join(root, 'src/modules/accounts/domain', name);
    if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: name});
  }
  vm.runInContext(appSource.slice(start, end), context, {filename: 'app.js#account-risk'});
  const state = context.calcAccountRiskState({balance: 1000, goalPct: 10}, trades, period);
  return {values: [state.dayPnl, state.weekPnl, state.monthPnl, state.scopePnl, state.scopeLoss, state.activePeriod], calls};
}

const trades = [
  {date: '2026-10-10', pnl: -10},
  {date: '2026-10-11', pnl: 20},
  {date: '2026-10-14', pnl: -5},
  {date: '2026-10-17', pnl: -7},
  {date: '2026-10-18', pnl: 4},
  {date: '2026-09-30', pnl: -3},
  {date: '2026-10-01', pnl: 6},
  {date: '2026-10-31', pnl: 8},
  {date: '2026-11-01', pnl: 9},
  {date: null, pnl: 2},
];

test('risk P/L keeps Sunday-Saturday and calendar-month boundaries', () => {
  assert.deepEqual(periodState(trades, 'today').values, [-5, 8, 16, -5, 5, 'today']);
  assert.deepEqual(periodState(trades, 'week').values, [-5, 8, 16, 8, 0, 'week']);
  assert.deepEqual(periodState(trades, 'month').values, [-5, 8, 16, 16, 0, 'month']);
});

test('year, all and absent periods include every trade, including undated trades', () => {
  assert.deepEqual(periodState(trades, 'year').values, [-5, 8, 16, 24, 0, 'year']);
  assert.deepEqual(periodState(trades, 'all').values, [-5, 8, 16, 24, 0, 'all']);
  assert.deepEqual(periodState(trades).values, [-5, 8, 16, 24, 0, 'all']);
  assert.deepEqual(periodState(trades, 'today').calls, ['ordered', 'anchor', 'cashflow']);
});

test('date matching and empty P/L retain exact fallback behavior', () => {
  const rows = [{date: '2026-10-14T00:00:00', pnl: 99}, {date: '2026-10-14', pnl: null}, {date: '2026-10-14'}];
  assert.deepEqual(periodState(rows, 'today').values, [0, 0, 0, 0, 0, 'today']);
  assert.deepEqual(periodState([], 'month').values, [0, 0, 0, 0, 0, 'month']);
});

test('text P/L keeps reduction order and scope loss coercion', () => {
  const rows = [{date: '2026-10-14', pnl: '5'}, {date: '2026-10-14', pnl: -2}];
  assert.deepEqual(periodState(rows, 'today').values, ['05-2', '05-2', '05-2', '05-2', NaN, 'today']);
});
