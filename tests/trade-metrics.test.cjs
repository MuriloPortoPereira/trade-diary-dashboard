const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const modulePath = 'src/modules/analytics/domain/calculate-trade-metrics.js';
const moduleFile = path.join(root, modulePath);
const start = appSource.indexOf('function calcMetrics(');
const end = appSource.indexOf('\nfunction filterByPeriod(', start);
assert.ok(start >= 0 && end > start, 'calcMetrics source must remain available');
const source = appSource.slice(start, end);

function loadMetrics({accounts, activeAccountId = 'a1', activeAccount, configBalance = 3000, capitalBase} = {}) {
  const accountRows = accounts ?? [{id: 'a1', balance: 2000}];
  const selected = activeAccount ?? accountRows.find(account => account.id === activeAccountId) ?? null;
  const calls = [];
  const context = vm.createContext({
    accounts: accountRows,
    activeAccountId,
    config: {balance: configBalance},
    getActiveAccount() { calls.push(['active']); return selected; },
    getAccountCapitalBase(account) {
      calls.push(['capital', account?.id]);
      return typeof capitalBase === 'function' ? capitalBase(account) : capitalBase;
    },
  });
  if (fs.existsSync(moduleFile)) {
    vm.runInContext(fs.readFileSync(moduleFile, 'utf8'), context, {filename: modulePath});
  }
  vm.runInContext(source, context, {filename: 'app.js#trade-metrics'});
  return {context, calls};
}

test('metrics preserve account resolution and starting-balance fallback order', () => {
  const direct = loadMetrics({capitalBase: 1500});
  assert.equal(direct.context.calcMetrics([], 'a1').startBal, 1500);
  assert.deepEqual(direct.calls, [['capital', 'a1']]);

  const fallback = loadMetrics({activeAccount: {id: 'fallback', balance: 2400}, capitalBase: 0});
  assert.equal(fallback.context.calcMetrics([], 'missing').startBal, 2400);
  assert.deepEqual(fallback.calls, [['active'], ['capital', 'fallback']]);

  const configured = loadMetrics({accounts: [], activeAccount: null, configBalance: 3200, capitalBase: NaN});
  assert.equal(configured.context.calcMetrics([], 'missing').startBal, 3200);
  const finalDefault = loadMetrics({accounts: [], activeAccount: null, configBalance: 0, capitalBase: NaN});
  assert.equal(finalDefault.context.calcMetrics([], 'missing').startBal, 1000);
});

test('metrics preserve closed groups, expectancy, profit factor and source references', () => {
  const {context} = loadMetrics({capitalBase: 1000});
  const rows = [
    {status: 'LOSS', pnl: -40, r: -1, date: '2026-01-02'},
    {status: 'BE', pnl: 0, r: 0, date: '2026-01-01'},
    {status: 'WIN', pnl: 100, r: 2, date: '2026-01-01'},
    {status: 'OPEN', pnl: 500, r: 5, date: '2026-01-03'},
  ];
  const before = JSON.stringify(rows);
  const result = context.calcMetrics(rows);
  assert.equal(result.closed.length, 3);
  assert.equal(result.wins[0], rows[2]);
  assert.equal(result.losses[0], rows[0]);
  assert.equal(result.bes[0], rows[1]);
  assert.equal(result.totalPnl, 60);
  assert.equal(result.wr, 1 / 3);
  assert.equal(result.avgWin, 2);
  assert.equal(result.avgLoss, 1);
  assert.equal(result.exp, -1.1102230246251565e-16);
  assert.equal(result.grossW, 100);
  assert.equal(result.grossL, 40);
  assert.equal(result.pf, 2.5);
  assert.equal(JSON.stringify(rows), before);
});

test('empty, breakeven and winning-only inputs retain zero and Infinity behavior', () => {
  const {context} = loadMetrics({capitalBase: 1000});
  const empty = context.calcMetrics();
  for (const key of ['totalPnl', 'wr', 'avgWin', 'avgLoss', 'exp', 'pf', 'maxDD', 'maxDDusd', 'sharpe', 'sortino', 'calmar', 'recovery', 'maxWS', 'maxLS', 'maxLoseStreakPnl', 'grossW', 'grossL']) {
    assert.equal(empty[key], 0, key);
  }
  const breakeven = context.calcMetrics([{status: 'BE', pnl: 0, r: 0, date: '2026-01-01'}]);
  assert.equal(breakeven.closed.length, 1);
  assert.equal(breakeven.pf, 0);
  assert.equal(breakeven.maxLS, 1);
  const winning = context.calcMetrics([{status: 'WIN', pnl: 10, r: 1, date: '2026-01-01'}]);
  assert.equal(winning.pf, Infinity);
  assert.equal(winning.recovery, Infinity);
  assert.throws(() => context.calcMetrics(null), {name: 'TypeError'});
});

test('drawdown and streaks preserve reverse input order and trailing-loss behavior', () => {
  const {context} = loadMetrics({capitalBase: 1000});
  const newestFirst = [
    {status: 'LOSS', pnl: -50, date: '2026-01-03'},
    {status: 'WIN', pnl: 100, date: '2026-01-02'},
    {status: 'LOSS', pnl: -20, date: '2026-01-01'},
  ];
  const result = context.calcMetrics(newestFirst);
  assert.equal(result.maxDDusd, 50);
  assert.equal(result.maxDD, 50 / 1080);
  assert.equal(result.maxWS, 1);
  assert.equal(result.maxLS, 1);
  assert.equal(result.maxLoseStreakPnl, -20);

  const unflushed = context.calcMetrics([
    {status: 'LOSS', pnl: -10, date: '2026-01-03'},
    {status: 'LOSS', pnl: -5, date: '2026-01-02'},
    {status: 'WIN', pnl: 20, date: '2026-01-01'},
  ]);
  assert.equal(unflushed.maxLS, 2);
  assert.equal(unflushed.maxLoseStreakPnl, 0);
});

test('daily ratios retain sample deviation, downside denominator and annualization', () => {
  const {context} = loadMetrics({capitalBase: 1000});
  const result = context.calcMetrics([
    {status: 'LOSS', pnl: -10, r: -1, date: '2026-01-03'},
    {status: 'LOSS', pnl: -5, r: -0.5, date: '2026-01-02'},
    {status: 'WIN', pnl: 20, r: 2, date: '2026-01-01'},
  ]);
  assert.ok(Math.abs(result.sharpe - 1.646109783506203) < 1e-12);
  assert.ok(Math.abs(result.sortino - 3.3466401061363027) < 1e-12);
  assert.equal(result.calmar, 28.56);
  assert.equal(result.recovery, 1 / 3);
});

test('isolated metrics domain exposes one calculator without UI, storage or account state', () => {
  const forbidden = ['document', 'localStorage', 'fetch', 'Chart', 'accounts', 'activeAccountId', 'config'];
  const sandbox = {};
  for (const name of forbidden) Object.defineProperty(sandbox, name, {get() { throw new Error(`metrics domain accessed ${name}`); }});
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(moduleFile, 'utf8'), context, {filename: modulePath});
  assert.deepEqual(Object.getOwnPropertyNames(context).filter(name => !forbidden.includes(name)), ['TradeDiaryTradeMetrics']);
  assert.deepEqual(Object.keys(context.TradeDiaryTradeMetrics), ['calculateTradeMetrics']);
  const result = context.TradeDiaryTradeMetrics.calculateTradeMetrics([
    {status: 'WIN', pnl: 25, r: 1, date: '2026-01-01'},
  ], 500);
  assert.equal(result.totalPnl, 25);
  assert.equal(result.startBal, 500);
});

test('metrics domain loads once before consumers while calcMetrics remains global', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const domainIndex = scripts.findIndex(script => script.src === modulePath);
  for (const consumer of [
    'src/modules/trades/presentation/trade-log-metrics.js',
    'src/modules/analytics/presentation/dashboard-page.js',
    'src/modules/analytics/presentation/statistics-page.js',
    'src/modules/calendar/presentation/calendar-page.js',
    'src/modules/accounts/presentation/accounts-page.js',
    'src/modules/profile/presentation/profile-page.js',
    'app.js',
  ]) {
    assert.ok(domainIndex < scripts.findIndex(script => script.src === consumer));
  }
  assert.match(appSource, /^function calcMetrics\(data=\[\], acctId=activeAccountId\)\{/m);
  assert.match(appSource, /return TradeDiaryTradeMetrics\.calculateTradeMetrics\(data,startBal\);/);
});
