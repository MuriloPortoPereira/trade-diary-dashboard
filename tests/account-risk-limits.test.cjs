const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const modulePath = 'src/modules/accounts/domain/calculate-risk-limits.js';
const start = appSource.indexOf('function calcAccountRiskState(');
const end = appSource.indexOf('\nfunction formatSignedMoney(', start);
assert.ok(start >= 0 && end > start);

function setup({account, trades = [], period, cashflow} = {}) {
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-10-14T12:00:00Z'])); }
  }
  const acct = account ?? {balance: 1000, ddDaily: 2, ddWeekly: 5, ddMonthly: 8, ddTotal: 10, risk: 1, goalPct: 10};
  const calls = [];
  const context = vm.createContext({
    Date: FixedDate,
    getOrderedTrades: rows => { calls.push('ordered'); return [...rows].reverse(); },
    getAnchorTradeDate: rows => { calls.push('anchor'); return rows[0]?.date || '2026-10-14'; },
    calcAccountCashflow: () => { calls.push('cashflow'); return cashflow ?? {deposits: 0, withdrawals: 0, net: 0}; },
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    isFuturesAccount: () => false,
    fR: value => `$${value}`,
    f2: value => String(value),
  });
  const moduleFile = path.join(root, modulePath);
  if (fs.existsSync(moduleFile)) vm.runInContext(fs.readFileSync(moduleFile, 'utf8'), context, {filename: modulePath});
  vm.runInContext(appSource.slice(start, end), context, {filename: 'app.js#account-risk'});
  return {result: context.calcAccountRiskState(acct, trades, period), calls};
}

test('risk limits preserve defaults and empty account calculations', () => {
  const {result, calls} = setup({account: {balance: 1000}});
  assert.deepEqual(calls, ['ordered', 'anchor', 'cashflow']);
  assert.deepEqual([
    result.dayLimit, result.weekLimit, result.monthLimit, result.totalLimit,
    result.riskPerTradeUsd, result.scopeLimit, result.scopeLimitPct,
  ], [20, 50, 100, 100, 0, 100, 10]);
  assert.deepEqual([
    result.dayUsage, result.weekUsage, result.monthUsage, result.totalUsage,
    result.scopeUsage, result.dayExcessUsd, result.totalExcessUsd,
  ], [0, 0, 0, 0, 0, 0, 0]);
});

test('daily limit uses cashflow capital and caps usage while preserving excess', () => {
  const {result} = setup({
    account: {balance: 1000, ddDaily: 2, ddWeekly: 5, ddMonthly: 8, ddTotal: 10, risk: 1, goalPct: 10},
    cashflow: {deposits: 200, withdrawals: 50, net: 150},
    trades: [{status: 'LOSS', date: '2026-10-14', pnl: -40}],
    period: 'today',
  });
  assert.deepEqual([
    result.capitalBase, result.goalBase, result.dayLimit, result.weekLimit,
    result.monthLimit, result.totalLimit, result.riskPerTradeUsd,
  ], [1150, 1200, 23, 57.5, 92, 120, 11.5]);
  assert.deepEqual([
    result.scopeLoss, result.scopeLimit, result.scopeLimitPct, result.scopeUsageRaw,
    result.scopeUsage, result.scopeExcessUsd, result.dayExcessUsd, result.dayExcessPct,
    result.currentDdUsd,
  ], [40, 23, 2, 40 / 23, 1, 17, 17, 1.48, 40]);
});

test('week, month and total scopes preserve selection and cumulative losses', () => {
  const trades = [
    {status: 'LOSS', date: '2026-10-14', pnl: -40},
    {status: 'WIN', date: '2026-10-13', pnl: 10},
    {status: 'LOSS', date: '2026-09-30', pnl: -70},
  ];
  const expected = {
    week: [30, 50, 5, 0.6],
    month: [30, 80, 8, 0.375],
    all: [100, 100, 10, 1],
  };
  for (const [period, values] of Object.entries(expected)) {
    const {result} = setup({account: {balance: 1000, ddMonthly: 8}, trades, period});
    assert.deepEqual([result.scopeLoss, result.scopeLimit, result.scopeLimitPct, result.scopeUsageRaw], values);
  }
});

test('risk limits retain zero capital, fallback percentages and cycle base', () => {
  const {result} = setup({
    account: {balance: 0, ddDaily: 0, ddWeekly: 0, ddTotal: 0, risk: -3, goalPct: 0},
    trades: [{status: 'LOSS', date: '2026-10-14', pnl: -5}],
    period: 'today',
  });
  assert.deepEqual([result.dayLimit, result.weekLimit, result.monthLimit, result.totalLimit], [0, 0, 0, 0]);
  assert.equal(result.riskPerTradeUsd, 0);
  assert.equal(result.scopeUsageRaw, 0);
  assert.equal(result.scopeExcessUsd, 5);
  assert.equal(result.dayExcessPct, 0);
  assert.equal(result.goalProgress, 0);
});

test('isolated risk limits expose only pure calculations', () => {
  const forbidden = ['document', 'localStorage', 'fetch', 'accounts', 'config'];
  const sandbox = {};
  for (const name of forbidden) Object.defineProperty(sandbox, name, {get() { throw new Error(`risk limits accessed ${name}`); }});
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, modulePath), 'utf8'), context, {filename: modulePath});
  assert.deepEqual(Object.getOwnPropertyNames(context).filter(name => !forbidden.includes(name)), ['TradeDiaryRiskLimits']);
  assert.deepEqual(Object.keys(context.TradeDiaryRiskLimits).sort(), ['calculateRiskConsumption', 'calculateRiskThresholds']);
  const thresholds = context.TradeDiaryRiskLimits.calculateRiskThresholds({ddDaily: 2, ddWeekly: 5, ddTotal: 10, risk: 1}, 1000);
  assert.deepEqual(JSON.parse(JSON.stringify(thresholds)), {dayLimit: 20, weekLimit: 50, monthLimit: 100, riskPerTradeUsd: 10});
});

test('risk limits load once before classic consumers and keep global risk API', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const domainIndex = scripts.findIndex(script => script.src === modulePath);
  for (const consumer of [
    'src/modules/accounts/presentation/risk-board.js',
    'src/modules/analytics/presentation/dashboard-page.js',
    'src/modules/accounts/presentation/risk-setup-page.js',
    'app.js',
  ]) assert.ok(domainIndex < scripts.findIndex(script => script.src === consumer));
  assert.match(appSource, /^function calcAccountRiskState\(acct, acctTrades, period\)\{/m);
});
