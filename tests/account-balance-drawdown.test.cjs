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

function balance({initial = 1000, trades = [], cashflow = {deposits: 0, withdrawals: 0, net: 0}} = {}) {
  const calls = [];
  const context = vm.createContext({
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : ['2026-10-14T12:00:00Z'])); } },
    getOrderedTrades: rows => { calls.push('ordered'); return rows; },
    getAnchorTradeDate: () => { calls.push('anchor'); return '2026-10-14'; },
    calcAccountCashflow: () => { calls.push('cashflow'); return cashflow; },
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    isFuturesAccount: () => false,
    fR: value => String(value),
    f2: value => String(value),
  });
  for (const name of ['calculate-risk-limits.js', 'calculate-goal-cycle.js', 'calculate-balance-drawdown.js']) {
    const file = path.join(root, 'src/modules/accounts/domain', name);
    if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: name});
  }
  vm.runInContext(appSource.slice(start, end), context, {filename: 'app.js#account-risk'});
  const state = context.calcAccountRiskState({balance: initial, goalPct: 10}, trades, 'all');
  return {values: [state.capitalBase, state.currentBalance, state.peakBalance, state.currentDdPct,
    state.currentDdUsd, state.totalPnl], calls};
}

test('balance and drawdown start at the cashflow-adjusted capital without trades', () => {
  assert.deepEqual(balance().values, [1000, 1000, 1000, 0, 0, 0]);
  assert.deepEqual(balance({initial: 1000, cashflow: {deposits: 200, withdrawals: 50, net: 150}}).values,
    [1150, 1150, 1150, 0, 0, 0]);
  assert.deepEqual(balance().calls, ['ordered', 'anchor', 'cashflow']);
});

test('ordered gains and losses retain the peak and final drawdown', () => {
  const trades = [
    {date: '2026-10-12', pnl: 100},
    {date: '2026-10-13', pnl: -50},
    {date: '2026-10-14', pnl: 25},
  ];
  assert.deepEqual(balance({trades}).values, [1000, 1075, 1100, 25 / 1100, 25, 75]);
  assert.deepEqual(balance({trades: [...trades].reverse()}).values, [1000, 1075, 1075, 0, 0, 75]);
});

test('zero and negative peaks keep percentage at zero while dollar drawdown remains', () => {
  assert.deepEqual(balance({initial: 0, trades: [{pnl: -10}]}).values, [0, -10, 0, 0, 10, -10]);
  assert.deepEqual(balance({initial: -100, trades: [{pnl: -20}]}).values, [-100, -120, -100, 0, 20, -20]);
  assert.deepEqual(balance({trades: [{pnl: null}, {}, {pnl: 0}]}).values, [1000, 1000, 1000, 0, 0, 0]);
});

test('numeric text P/L keeps JavaScript addition and later coercion unchanged', () => {
  assert.deepEqual(balance({trades: [{pnl: '25'}, {pnl: -5}]}).values,
    [1000, '100025-5', '100025-5', 0, NaN, NaN]);
});
