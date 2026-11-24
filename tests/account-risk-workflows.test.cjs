const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const modulePath = 'src/modules/accounts/application/account-risk-workflows.js';
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

function setup() {
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-10-14T12:00:00Z'])); }
  }
  const context = vm.createContext({
    Date: FixedDate,
    getOrderedTrades: rows => [...rows],
    getAnchorTradeDate: rows => rows.at(-1)?.date || '2026-10-14',
    calcAccountCashflow: () => ({deposits: 200, withdrawals: 50, net: 150}),
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    isFuturesAccount: () => false,
    fR: value => `$${Number(value).toFixed(2)}`,
    f2: value => Number(value).toFixed(2),
  });
  for (const name of [
    'account-risk-calculations.js',
  ]) {
    const filename = path.join(root, 'src/modules/accounts/domain', name);
    vm.runInContext(fs.readFileSync(filename, 'utf8'), context, {filename: name});
  }
  const workflowSource = ['calcAccountRiskState', 'getTradeWeekKey', 'buildStopFeeAnalysis'].map(name => source.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))[0]).join('\n\n');
  vm.runInContext(workflowSource, context, {filename: modulePath});
  return context;
}

const account = {
  balance: 1000,
  goalPct: 10,
  ddDaily: 2,
  ddWeekly: 5,
  ddMonthly: 8,
  ddTotal: 10,
  risk: 1,
};
const trades = [
  {status: 'LOSS', date: '2026-10-14', pnl: -40, fees: 5},
  {status: 'WIN', date: '2026-10-13', pnl: 10, fees: 2},
  {status: 'LOSS', date: '2026-09-30', pnl: -70, fees: 3},
];

test('account risk workflow composes cashflow, limits, drawdown, goals and period state', () => {
  const state = setup().calcAccountRiskState(account, trades, 'today');
  assert.deepEqual(JSON.parse(JSON.stringify({
    activePeriod: state.activePeriod,
    capitalBase: state.capitalBase,
    goalBase: state.goalBase,
    currentBalance: state.currentBalance,
    totalPnl: state.totalPnl,
    dayPnl: state.dayPnl,
    weekPnl: state.weekPnl,
    monthPnl: state.monthPnl,
    dayLimit: state.dayLimit,
    weekLimit: state.weekLimit,
    monthLimit: state.monthLimit,
    totalLimit: state.totalLimit,
    currentDdUsd: state.currentDdUsd,
    scopeUsage: state.scopeUsage,
    riskLabel: state.riskLabel,
  })), {
    activePeriod: 'today',
    capitalBase: 1150,
    goalBase: 1200,
    currentBalance: 1050,
    totalPnl: -100,
    dayPnl: -40,
    weekPnl: -30,
    monthPnl: -30,
    dayLimit: 23,
    weekLimit: 57.5,
    monthLimit: 92,
    totalLimit: 120,
    currentDdUsd: 100,
    scopeUsage: 1,
    riskLabel: '1.00%',
  });
});

test('stop and fee workflow preserves grouping, breach thresholds and rounding', () => {
  const result = setup().buildStopFeeAnalysis(account, trades);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    closedTrades: 3,
    dayLimit: 23,
    weekLimit: 57.5,
    monthLimit: 92,
    days: 3,
    weeks: 2,
    months: 2,
    daysOverDailyStop: 2,
    weeksOverWeeklyStop: 1,
    monthsOverMonthlyStop: 0,
    daysOverDailyStopPct: 66.7,
    weeksOverWeeklyStopPct: 50,
    monthsOverMonthlyStopPct: 0,
    totalFees: 10,
    netPnl: -100,
    pnlBeforeFees: -90,
    feePerTrade: 3.33,
    expectancyBeforeFees: -30,
    expectancyAfterFees: -33.33,
    edgeRemovedPct: 0,
    feeDragPct: 11.1,
    feesInR: 0.87,
  });
});

test('risk workflows load once as classic globals after domains and before consumers', () => {
  assert.doesNotMatch(appSource, /^function (?:calcAccountRiskState|getTradeWeekKey|buildStopFeeAnalysis)\(/m);
  assert.match(source, /^function calcAccountRiskState\(acct, acctTrades, period\)\{/m);
  assert.match(source, /^function getTradeWeekKey\(dateStr\)\{/m);
  assert.match(source, /^function buildStopFeeAnalysis\(acct, acctTrades=\[\]\)\{/m);

  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const workflowIndex = scripts.findIndex(script => script.src === modulePath);
  assert.ok(scripts.findIndex(script => script.src === 'src/modules/accounts/domain/account-risk-calculations.js') < workflowIndex);
  for (const consumer of [
    'src/modules/accounts/presentation/accounts-workspace.js',
    'src/modules/analytics/presentation/analytics-workspace.js',
    'app.js',
  ]) assert.ok(workflowIndex < scripts.findIndex(script => script.src === consumer));
});
