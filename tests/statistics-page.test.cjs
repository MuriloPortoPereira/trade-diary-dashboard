const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/analytics/presentation/statistics-page.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderStats\([^]*?^\}/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function element(extra = {}) {
  return {
    style: {}, innerHTML: '', textContent: '', value: '',
    closest() { return null; },
    querySelectorAll() { return []; },
    ...extra,
  };
}

function metrics(closed = []) {
  const wins = closed.filter(row => row.status === 'WIN');
  const losses = closed.filter(row => row.status === 'LOSS');
  const bes = closed.filter(row => row.status === 'BE');
  return {
    totalPnl: closed.reduce((sum, row) => sum + (row.pnl || 0), 0),
    closed, wins, losses, bes,
    wr: closed.length ? wins.length / closed.length : 0,
    exp: 0, pf: 0, maxDD: 0, recovery: 0, sharpe: 0, sortino: 0, calmar: 0,
    startBal: 1000, avgWin: 0, avgLoss: 0, maxWS: 0, maxLS: 0,
  };
}

function render({
  rows = [],
  accounts = [{id: 'a1', name: 'Principal'}, {id: 'a2', name: 'Reserva'}],
  activeAccountId = 'a1',
  selectedAccount = 'all',
  pinned = false,
  strategyRows = [],
} = {}) {
  const elements = new Proxy({
    statAccount: element({value: selectedAccount}),
  }, {
    get(target, key) {
      if (!(key in target)) target[key] = element();
      return target[key];
    },
  });
  const calls = [];
  const calculated = metrics(rows.filter(row => row.status !== 'OPEN'));
  const timing = {
    overall: {count: calculated.closed.length, avgPlacedMinutes: null, avgOpenMinutes: null, avgExitMinutes: null, avgDurationMinutes: null},
    wins: {count: calculated.wins.length, avgDurationMinutes: null},
    losses: {count: calculated.losses.length, avgDurationMinutes: null},
    byStrategy: [],
  };
  const context = vm.createContext({
    document: {getElementById: id => elements[id]},
    accounts,
    activeAccountId,
    statsAccountPinned: pinned,
    t: (key, fallback) => fallback ?? key,
    escapeHtml: String,
    getStatsPeriodTrades: () => rows,
    calcMetrics: (input, accountId) => {
      calls.push(['metrics', input, accountId]);
      return calculated;
    },
    mkCard: card => `<card>${card.lbl}:${card.val}</card>`,
    TIPS: new Proxy({}, {get: (_, key) => `tip:${String(key)}`}),
    fR: value => Number(value || 0).toFixed(2),
    mkTip: value => `<tip>${value}</tip>`,
    getActiveAccount: () => accounts.find(account => account.id === activeAccountId),
    renderStopFeeAnalysis: (id, account, trades) => calls.push(['risk', id, account?.id, trades]),
    buildSignedEquityDataset: (data, options = {}) => ({data, ...options}),
    mkChart: (id, config) => calls.push(['chart', id, config]),
    CHART_OPTS: {plugins: {}, scales: {x: {ticks: {}}, y: {ticks: {}}}},
    getStrategySnapshots: (closed, accountId) => {
      calls.push(['strategies', closed, accountId]);
      return strategyRows;
    },
    formatStrategyRatio: value => String(value),
    renderStrategyCompareCards: value => calls.push(['comparison', value]),
    getTradeTimingStats: () => timing,
    formatClockMinutes: value => value == null ? '—' : `${value}m`,
    formatDurationMinutes: value => value == null ? '—' : `${value}min`,
    clockToMinutes: value => value ? Number(value.split(':')[0]) * 60 + Number(value.split(':')[1]) : null,
    renderSimulation: () => calls.push(['simulation']),
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderStats' : modulePath});
  vm.runInContext('renderStats()', context);
  return {elements, calls, calculated};
}

test('unpinned statistics rebuild accounts and fall back to the active account', () => {
  const {elements, calls} = render();
  assert.match(elements.statAccount.innerHTML, /Principal/);
  assert.match(elements.statAccount.innerHTML, /Reserva/);
  assert.equal(elements.statAccount.value, 'a1');
  assert.deepEqual(calls.find(call => call[0] === 'metrics').slice(1), [[], 'a1']);
  assert.deepEqual(calls.find(call => call[0] === 'risk').slice(1, 3), ['statsRiskLeakageRows', 'a1']);
  assert.deepEqual(calls.find(call => call[0] === 'comparison'), ['comparison', []]);
  assert.deepEqual(calls.at(-1), ['simulation']);
});

test('all-accounts selection stays pinned while risk receives only the scoped account trades', () => {
  const rows = [
    {accountId: 'a1', status: 'WIN', pnl: 10, date: '2026-01-01'},
    {accountId: 'a2', status: 'LOSS', pnl: -5, date: '2026-01-02'},
  ];
  const {elements, calls} = render({rows, selectedAccount: 'all', pinned: true});
  assert.equal(elements.statAccount.value, 'all');
  assert.equal(calls.find(call => call[0] === 'metrics')[2], 'a1');
  assert.deepEqual(calls.find(call => call[0] === 'risk')[3], [rows[0]]);
  assert.equal(calls.find(call => call[0] === 'strategies')[2], 'a1');
});

test('empty statistics preserve cards, base charts, tables and empty timing output', () => {
  const {elements, calls} = render();
  assert.equal((elements.statsMetrics.innerHTML.match(/<card>/g) || []).length, 8);
  assert.equal((elements.statsMetTable.innerHTML.match(/border-bottom/g) || []).length, 16);
  assert.equal((elements.statsStreakRows.innerHTML.match(/border-bottom/g) || []).length, 4);
  assert.match(elements.stSymRows.innerHTML, /Sem dados/);
  assert.equal(elements.stTimeBody.innerHTML, '');
  assert.match(elements.stTimeStrategyBody.innerHTML, /Sem horários suficientes/);
  assert.deepEqual(calls.filter(call => call[0] === 'chart').map(call => call[1]), [
    'stEqChart', 'stWLChart', 'stRChart', 'stWdChart', 'stMonthChart', 'stDdChart',
    'stStratPnlChart', 'stStratWRChart', 'stMonthPnlChart', 'stWdWRChart',
  ]);
});

test('populated statistics add histogram, symbol, weekday and hour detail', () => {
  const rows = [
    {accountId: 'a1', status: 'WIN', pnl: 10, r: 1, date: '2026-01-05', symbol: 'WIN', openTime: '10:15'},
    {accountId: 'a1', status: 'LOSS', pnl: -4, r: -1, date: '2026-01-06', symbol: 'LOSS', openTime: '11:30'},
  ];
  const {elements, calls} = render({rows});
  assert.equal(calls.filter(call => call[0] === 'chart').some(call => call[1] === 'stHistChart'), true);
  assert.match(elements.stSymRows.innerHTML, /WIN/);
  assert.match(elements.stSymRows.innerHTML, /LOSS/);
  assert.match(elements.stHourHeatmap.innerHTML, /10h/);
  assert.match(elements.stTimeBody.innerHTML, /Seg/);
  assert.match(elements.stTimeBody.innerHTML, /Ter/);
});
