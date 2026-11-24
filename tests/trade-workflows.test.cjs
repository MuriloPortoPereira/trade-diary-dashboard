const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/trades/application/trade-workflows.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const names = [
  'saveTrade', 'getSelectedTradeList', 'getSelectedIncompleteTrades',
  'showTradeDeleteDoubleConfirm', 'bulkDelete', 'editSelectedTrades',
  'completeSelectedIncompleteTrades', 'completeAllIncompleteTrades',
  'cloneTradeForDuplicate', 'finishTradeMutation', 'duplicateTrade',
  'duplicateSelectedTrades', 'getLogFilteredTrades', 'getLogAccountTrades', 'deleteTrade',
];
const legacySources = names.map(name => appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const source = legacySources.every(Boolean)
  ? legacySources.join('\n\n')
  : fs.readFileSync(path.join(root, modulePath), 'utf8');

class FixedDate extends Date {
  constructor(value) { super(value === undefined ? '2026-11-04T15:30:00.000Z' : value); }
}

function setup(overrides = {}) {
  const calls = [];
  const values = {
    't-symbol': 'USTEC', 't-date': '2026-11-04', 't-entry': '100', 't-stop': '90',
    't-tp': '130', 't-exit': '120', 't-direction': 'Long', 't-fees': '1.5',
    't-placedtime': '09:25', 't-opentime': '09:30', 't-exittime': '09:45',
    't-account': 'account-a', 't-pnl': '', 't-r': '', 't-riskpct': '1', 't-riskusd': '',
    't-pnl-abs': '', 't-r-abs': '', 't-riskabs': '', 't-qty': '', 't-mult': '',
    't-strategy': 'Al Brooks', 't-market': '', 't-emotion': 'Calma', 't-followedplan': 'sim',
    't-result-type': '', 't-exitdate': '2026-11-04', 't-emo-before': 'Neutro',
    't-emo-after': 'Alívio', 't-plan-deviation': '', 't-mistake': '', 't-remarks': 'ok',
    't-confidence': '80', 't-discipline': '90',
  };
  const elements = new Map(Object.entries(values).map(([id, value]) => [id, {value}]));
  elements.set('t-hesitation', {checked: true});
  const sandbox = {
    Date: FixedDate,
    document: {
      getElementById: id => elements.get(id) ?? null,
      querySelector: selector => selector === '.page.active' ? {} : null,
    },
    activeAccountId: 'account-a',
    accounts: [{id: 'account-a', balance: 1000, mult: 0.2}],
    trades: [],
    editingId: null,
    selectedErrors: ['FOMO'],
    tradeImages: [{name: 'chart', dataUrl: 'data:image/png;base64,x'}],
    selectedTrades: new Set(),
    config: {beBreakeven: 10},
    uid: () => 'trade-new',
    normalizeClockTime: value => String(value ?? '').trim(),
    getActiveAccount: () => sandbox.accounts[0],
    getAccountWorkingBalance: account => account.balance,
    isFuturesAccount: () => false,
    getMarket: () => 'EUA',
    normalizeDocImages: images => (images ?? []).map(image => ({...image})),
    isBulkIncompleteFlowTrade: () => false,
    getNextBulkIncompleteTradeAfterSave: () => null,
    save: () => calls.push(['save']),
    refreshAll: () => calls.push(['refresh']),
    openModal: (...args) => calls.push(['open', ...args]),
    closeModal: id => calls.push(['close', id]),
    showAppNotice: (...args) => calls.push(['notice', ...args]),
    showAppConfirm: (...args) => calls.push(['confirm', ...args]),
    showLogAccountEditLockNotice: action => { calls.push(['lock', action]); return false; },
    clearBulkIncompleteFlow: () => calls.push(['clearBulk']),
    startBulkIncompleteFlow: ids => calls.push(['startBulk', [...ids]]),
    getAccountTrades: id => sandbox.trades.filter(trade => trade.accountId === id),
    isTradeInLogDateRange: (trade, start, end) => (!start || trade.date >= start) && (!end || trade.date <= end),
    getSortedTrades: list => [...list].sort((a, b) => String(a.id).localeCompare(String(b.id))),
    t: key => `t:${key}`,
    ...overrides,
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(source, context, {filename: legacySources.every(Boolean) ? 'app.js#trade-workflows' : modulePath});
  return {context, sandbox, calls, elements};
}

test('saveTrade preserves validation, derived values, payload and persistence order', () => {
  const required = setup();
  required.elements.get('t-symbol').value = '';
  required.context.saveTrade();
  assert.deepEqual(required.calls, [['notice', 'Campo obrigatório', 'Símbolo e data são obrigatórios.']]);
  assert.equal(required.sandbox.trades.length, 0);

  const current = setup();
  current.context.saveTrade();
  assert.equal(current.sandbox.trades.length, 1);
  const trade = current.sandbox.trades[0];
  assert.equal(trade.id, 'trade-new');
  assert.equal(trade.accountId, 'account-a');
  assert.equal(trade.market, 'EUA');
  assert.equal(trade.riskUsd, 10);
  assert.equal(trade.r, 2);
  assert.equal(trade.pnl, 20);
  assert.equal(trade.pnlPct, 0.02);
  assert.equal(trade.status, 'WIN');
  assert.equal(trade.incomplete, false);
  assert.deepEqual([...trade.errors], ['FOMO']);
  assert.deepEqual(trade.images, [{name: 'chart', dataUrl: 'data:image/png;base64,x'}]);
  assert.equal(trade.createdAt, '2026-11-04T15:30:00.000Z');
  assert.deepEqual(current.calls, [['save'], ['refresh'], ['close', 'tradeModal']]);
});

test('saveTrade preserves edit identity and advances an incomplete bulk flow', () => {
  const original = {id: 'edit-1', accountId: 'account-a', createdAt: '2026-01-01T00:00:00.000Z'};
  const current = setup({
    trades: [original],
    editingId: 'edit-1',
    isBulkIncompleteFlowTrade: () => true,
    getNextBulkIncompleteTradeAfterSave: () => 'edit-2',
  });
  current.context.saveTrade();
  assert.equal(current.sandbox.trades.length, 1);
  assert.equal(current.sandbox.trades[0].id, 'edit-1');
  assert.equal(current.sandbox.trades[0].createdAt, original.createdAt);
  assert.deepEqual(current.calls.slice(-3), [['save'], ['refresh'], ['open', 'tradeModal', 'edit-2']]);
});

test('saveTrade preserves the absolute futures branch and final price-derived result', () => {
  const current = setup({isFuturesAccount: () => true});
  current.elements.get('t-riskabs').value = '50';
  current.elements.get('t-qty').value = '2';
  current.elements.get('t-mult').value = '5';
  current.elements.get('t-pnl-abs').value = '-25';
  current.elements.get('t-r-abs').value = '-0.5';
  current.elements.get('t-exit').value = '95';
  current.context.saveTrade();
  const trade = current.sandbox.trades[0];
  assert.equal(trade.mode, 'absolute');
  assert.equal(trade.qty, 2);
  assert.equal(trade.mult, 5);
  assert.equal(trade.riskUsd, 50);
  assert.equal(trade.pnl, -25);
  assert.equal(trade.r, -0.5);
  assert.equal(trade.status, 'LOSS');
});

test('duplicate workflows preserve deep copies, order, locks and selection cleanup', () => {
  let uid = 0;
  const sourceTrade = {id: 'one', accountId: 'account-a', positionId: 'p1', errors: ['FOMO'], images: [{name: 'x'}]};
  const current = setup({trades: [sourceTrade, {id: 'two', accountId: 'account-a'}], uid: () => `copy-${++uid}`});
  const clone = current.context.cloneTradeForDuplicate(sourceTrade, '2026-01-02T00:00:00.000Z');
  assert.equal(clone.id, 'copy-1');
  assert.equal('positionId' in clone, false);
  assert.equal(clone.createdAt, '2026-01-02T00:00:00.000Z');
  assert.notStrictEqual(clone.errors, sourceTrade.errors);
  assert.notStrictEqual(clone.images, sourceTrade.images);

  current.context.duplicateTrade('one');
  assert.equal(current.sandbox.trades[0].id, 'copy-2');
  assert.deepEqual(current.calls.slice(-3), [['lock', 'duplicar'], ['save'], ['refresh']]);

  current.sandbox.selectedTrades = new Set(['one', 'two']);
  current.context.duplicateSelectedTrades();
  assert.deepEqual([...current.sandbox.trades.slice(0, 2).map(trade => trade.id)], ['copy-3', 'copy-4']);
  assert.equal(current.sandbox.selectedTrades.size, 0);
});

test('delete workflows preserve two confirmations and mutate only after the final callback', () => {
  const current = setup({trades: [{id: 'one'}, {id: 'two'}], selectedTrades: new Set(['one'])});
  current.context.bulkDelete();
  assert.equal(current.sandbox.trades.length, 2);
  const first = current.calls.find(call => call[0] === 'confirm');
  first[3]();
  const second = current.calls.filter(call => call[0] === 'confirm')[1];
  second[3]();
  assert.deepEqual(current.sandbox.trades.map(trade => trade.id), ['two']);
  assert.equal(current.sandbox.selectedTrades.size, 0);
  assert.deepEqual(current.calls.slice(-2), [['save'], ['refresh']]);

  const single = setup({trades: [{id: 'one'}, {id: 'two'}], selectedTrades: new Set(['two'])});
  single.context.deleteTrade('two');
  single.calls.find(call => call[0] === 'confirm')[3]();
  single.calls.filter(call => call[0] === 'confirm')[1][3]();
  assert.deepEqual(single.sandbox.trades.map(trade => trade.id), ['one']);
  assert.equal(single.sandbox.selectedTrades.has('two'), false);
});

test('completion and query workflows preserve sorting, account scope and strategy filters', () => {
  const trades = [
    {id: 'b', accountId: 'account-a', date: '2026-02-02', createdAt: '2', incomplete: true, strategy: 'S2'},
    {id: 'a', accountId: 'account-a', date: '2026-02-01', createdAt: '1', incomplete: true, strategy: 'S1'},
    {id: 'c', accountId: 'account-a', date: '2026-02-03', incomplete: false, strategy: 'S1'},
  ];
  const current = setup({trades, selectedTrades: new Set(['b', 'a'])});
  current.context.completeSelectedIncompleteTrades();
  assert.deepEqual(current.calls.at(-1), ['startBulk', ['a', 'b']]);
  const filtered = current.context.getLogFilteredTrades({strategy: 'S1', startDate: '2026-02-01', endDate: '2026-02-03'});
  assert.deepEqual([...filtered.map(trade => trade.id)], ['a', 'c']);
  const accountTrades = current.context.getLogAccountTrades('active', {startDate: '2026-02-02', endDate: ''});
  assert.deepEqual([...accountTrades.map(trade => trade.id)], ['b', 'c']);
});

test('edit, complete-all and lock guards preserve their public action behavior', () => {
  const trades = [
    {id: 'b', accountId: 'account-a', date: '2026-02-02', createdAt: '2', incomplete: true},
    {id: 'a', accountId: 'account-a', date: '2026-02-01', createdAt: '1', incomplete: true},
  ];
  const edit = setup({trades, selectedTrades: new Set(['a'])});
  edit.context.editSelectedTrades();
  assert.deepEqual(edit.calls.slice(-3), [['lock', 'editar'], ['clearBulk'], ['open', 'tradeModal', 'a']]);

  const complete = setup({trades});
  complete.context.completeAllIncompleteTrades();
  assert.deepEqual(complete.calls.at(-1), ['startBulk', ['a', 'b']]);

  const blockedCalls = [];
  const blocked = setup({
    trades,
    selectedTrades: new Set(['a']),
    showLogAccountEditLockNotice: action => { blockedCalls.push(action); return true; },
  });
  blocked.context.duplicateSelectedTrades();
  assert.deepEqual(blockedCalls, ['duplicar']);
  assert.deepEqual(blocked.sandbox.trades, trades);
});

test('trade workflows remain one synchronous classic script before app.js consumers', () => {
  if (legacySources.every(Boolean)) return;
  assert.equal(legacySources.filter(Boolean).length, 0);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src/modules/trades/presentation/trade-log.js'));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
