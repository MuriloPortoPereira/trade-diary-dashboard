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

function cycle({balance = 1000, goalPct = 10, pnl = 0, cashflow = {deposits: 0, withdrawals: 0, net: 0}} = {}) {
  const context = vm.createContext({
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : ['2026-10-14T12:00:00Z'])); } },
    getOrderedTrades: rows => rows,
    getAnchorTradeDate: () => '2026-10-14',
    calcAccountCashflow: () => cashflow,
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    isFuturesAccount: () => false,
    fR: value => String(value),
    f2: value => String(value),
  });
  for (const name of ['calculate-risk-limits.js', 'calculate-goal-cycle.js']) {
    const file = path.join(root, 'src/modules/accounts/domain', name);
    if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: name});
  }
  vm.runInContext(appSource.slice(start, end), context, {filename: 'app.js#account-risk'});
  const trades = pnl ? [{status: pnl > 0 ? 'WIN' : 'LOSS', date: '2026-10-14', pnl}] : [];
  const state = context.calcAccountRiskState({balance, goalPct}, trades, 'all');
  return [state.goalBase, state.currentBalance, state.cicloAtual, state.cicloBase,
    state.cicloAlvo, state.goalTarget, state.pnlNoCiclo, state.goalProgress, state.ddBase];
}

test('goal cycle starts at the cash balance and advances when the first target is met', () => {
  assert.deepEqual(cycle(), [1000, 1000, 0, 1000, 1100, 100, 0, 0, 1000]);
  assert.deepEqual(cycle({pnl: 100}), [1000, 1100, 1, 1100, 1210, 110, 0, 0, 1100]);
  assert.deepEqual(cycle({pnl: 200}), [1000, 1200, 1, 1100, 1210, 110, 100, 100 / 110, 1100]);
});

test('goal cycle retains floating-point boundary, rounding and capped progress', () => {
  assert.deepEqual(cycle({pnl: 210}), [1000, 1210, 1, 1100, 1210, 110, 110, 1, 1100]);
  assert.deepEqual(cycle({pnl: 331}), [1000, 1331, 2, 1210, 1331, 121, 121, 1, 1210]);
  assert.deepEqual(cycle({pnl: -100}), [1000, 900, 0, 1000, 1100, 100, -100, 0, 1000]);
});

test('goal base includes deposits but not withdrawals, and zero goal percent uses ten', () => {
  assert.deepEqual(cycle({goalPct: 0, pnl: 150, cashflow: {deposits: 200, withdrawals: 50, net: 150}}),
    [1200, 1300, 0, 1200, 1320, 120, 100, 100 / 120, 1200]);
  assert.deepEqual(cycle({balance: 0, goalPct: 0}), [0, 0, 0, 0, 0, 0, 0, 0, 0]);
});
