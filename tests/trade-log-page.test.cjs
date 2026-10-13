const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/trades/presentation/trade-log.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const start = appSource.indexOf('function renderLog(){');
const end = appSource.indexOf('\nfunction deleteTrade(', start);
const legacy = start >= 0 && end > start ? appSource.slice(start, end).trimEnd() : undefined;
assert.equal(legacy, undefined, 'legacy declarations must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

test('trade log loads once as a classic script after its components and before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src=\"${modulePath}\"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type=\"module\")\b/i);
  assert.ok(html.indexOf('src/modules/trades/presentation/trade-log-selection.js') < html.indexOf(modulePath));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src=\"app.js\"'));
});

function element(extra = {}) {
  return {style: {}, innerHTML: '', textContent: '', value: '', ...extra};
}

function setup({
  accountValue = 'active',
  strategyValue = '',
  filtered = [],
  accountTrades = [],
  accounts = [{id: 'a1', name: 'Principal'}, {id: 'a2', name: 'Reserva'}],
} = {}) {
  const elements = {
    filterAccount: element({value: accountValue}),
    filterStrategy: element({value: strategyValue}),
    incompleteAlert: element(),
    incompleteCount: element(),
    logCount: element(),
    logTbody: element(),
  };
  const calls = [];
  const selectedTrades = new Set(['selected']);
  const context = vm.createContext({
    document: {getElementById: id => elements[id] ?? null},
    accounts,
    config: {strategies: ['Breakout', 'Pullback']},
    activeAccountId: 'a1',
    selectedTrades,
    escapeHtml: String,
    renderLogReadOnlyNotice: account => calls.push(['notice', account]),
    getLogDateRangeFromControls: () => ({startDate: '2026-01-01', endDate: '2026-01-31'}),
    getLogFilteredTrades: options => { calls.push(['filter', options]); return filtered; },
    getAccountTrades: id => { calls.push(['accountTrades', id]); return accountTrades.filter(row => row.accountId === id); },
    renderLogMetrics: (rows, incomplete) => calls.push(['metrics', rows, incomplete]),
    updateBulkBar: () => calls.push(['bulk']),
    t: key => `translated:${key}`,
    fDate: value => `date:${value}`,
    fR: value => Number(value).toFixed(2),
    getMarket: symbol => `market:${symbol}`,
  });
  vm.runInContext(source, context, {filename: modulePath});
  return {context, elements, calls, selectedTrades};
}

test('log renderer rebuilds filters and preserves orchestration order', () => {
  const row = {id: 'one', accountId: 'a1', date: '2026-01-02', symbol: 'WIN', status: 'WIN', pnl: 5};
  const {context, elements, calls} = setup({filtered: [row], accountTrades: [row], strategyValue: 'Breakout'});
  vm.runInContext('renderLog()', context);
  assert.match(elements.filterAccount.innerHTML, /Conta atual/);
  assert.match(elements.filterAccount.innerHTML, /Principal/);
  assert.equal(elements.filterAccount.value, 'active');
  assert.match(elements.filterStrategy.innerHTML, /Breakout/);
  assert.equal(elements.filterStrategy.value, 'Breakout');
  assert.deepEqual(calls[0], ['notice', 'active']);
  assert.equal(calls[1][0], 'filter');
  assert.equal(JSON.stringify(calls[1][1]), JSON.stringify({accountId: 'active', strategy: 'Breakout', startDate: '2026-01-01', endDate: '2026-01-31'}));
  assert.deepEqual(calls.at(-1), ['bulk']);
  assert.equal(elements.logCount.textContent, '1 registros');
  assert.match(elements.logTbody.innerHTML, /WIN/);
});

test('all-account log aggregates incomplete trades and shows the alert', () => {
  const incomplete = {id: 'i1', accountId: 'a2', incomplete: true};
  const {context, elements, calls} = setup({accountValue: 'all', accountTrades: [incomplete]});
  vm.runInContext('renderLog()', context);
  assert.equal(elements.incompleteAlert.style.display, 'block');
  assert.equal(elements.incompleteCount.textContent, 1);
  assert.deepEqual(calls.find(call => call[0] === 'metrics'), ['metrics', [], 1]);
  assert.deepEqual(calls.filter(call => call[0] === 'accountTrades').map(call => call[1]), ['a1', 'a2']);
});

test('empty log hides incomplete alert and preserves translated empty row', () => {
  const {context, elements, calls} = setup();
  vm.runInContext('renderLog()', context);
  assert.equal(elements.incompleteAlert.style.display, 'none');
  assert.equal(elements.logCount.textContent, '0 registros');
  assert.match(elements.logTbody.innerHTML, /translated:misc\.noTrades/);
  assert.deepEqual(calls.find(call => call[0] === 'metrics'), ['metrics', [], 0]);
});

test('missing-field labels preserve known translations and unknown fallback', () => {
  const {context} = setup();
  assert.equal(vm.runInContext("fmtMissingField('entry')", context), 'entrada');
  assert.equal(vm.runInContext("fmtMissingField('followedPlan')", context), 'plano');
  assert.equal(vm.runInContext("fmtMissingField('custom')", context), 'custom');
});

test('compact trade row preserves defaults, badges and result formatting', () => {
  const {context} = setup();
  context.__trade = {date: '2026-01-02', symbol: 'WIN', direction: 'LONG', mode: 'absolute', entry: 10, exit: 12, r: 1.25, pnl: 5, emotion: 'Calmo', status: 'WIN'};
  const html = vm.runInContext('tradeRow(__trade,false)', context);
  assert.match(html, /date:2026-01-02/);
  assert.match(html, /badge long/);
  assert.match(html, /\+1\.25R/);
  assert.match(html, /\+5\.00/);
  assert.doesNotMatch(html, /type="checkbox"/);
});

test('full trade row preserves selection, incomplete fields, fallbacks and actions', () => {
  const {context} = setup();
  context.__trade = {
    id: 'selected', date: '2026-01-03', symbol: 'BTC', direction: 'SHORT',
    incomplete: true, missing_fields: ['stop', 'custom'], riskPct: 1.5,
    pnl: -2, pnlPct: -0.02, status: 'LOSS', discipline: 80,
  };
  const html = vm.runInContext('tradeRow(__trade,true,7)', context);
  assert.match(html, /class="selected trade-row-incomplete"/);
  assert.match(html, /checked/);
  assert.match(html, /Faltando: stop, custom/);
  assert.match(html, /market:BTC/);
  assert.match(html, /1\.50%/);
  assert.match(html, /-2\.00%/);
  assert.match(html, /openModal\('tradeModal','selected'\)/);
  assert.match(html, /duplicateTrade\('selected'\)/);
  assert.match(html, /deleteTrade\('selected'\)/);
});
