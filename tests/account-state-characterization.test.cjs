const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const applicationPath = 'src/modules/accounts/application/account-risk-workflows.js';
const presentationPath = 'src/modules/accounts/presentation/accounts-workspace.js';
const names = ['getActiveAccount', 'getAccountTrades', 'getAccountWorkingBalance', 'isFuturesAccount', 'normalizeAccountType', 'normalizeAccount', 'normalizeCashflowType', 'sanitizeAccountCashflow', 'getAccountCashflows', 'calcAccountCashflow', 'getAccountCapitalBase', 'getAccountCurrentBalance', 'addAccountCashflow', 'deleteAccountCashflow', 'getTradeFormAccount', 'formatSignedMoney', 'formatAccountBalanceChange', 'setMode', 'acctTypeLabel'];
const candidates = ['app.js', applicationPath, presentationPath].map(file => fs.readFileSync(path.join(root, file), 'utf8'));
const source = names.map(name => {
  const definitions = candidates.map(text => text.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))).filter(Boolean);
  assert.equal(definitions.length, 1, `${name} remains available exactly once`);
  return definitions[0][0];
}).join('\n');
const plain = value => JSON.parse(JSON.stringify(value));
function setup() {
  const calls = [], nodes = {};
  let nextId = 0;
  const c = vm.createContext({accounts: [], trades: [], activeAccountId: 'a', config: {},
    Date: class extends Date {constructor(...args) {super(...(args.length ? args : ['2026-11-06T12:00:00Z']));}},
    document: {getElementById: id => nodes[id] || null},
    uid: () => {calls.push('uid'); return `flow-${++nextId}`;},
    cleanMTCell: value => {calls.push(['clean', value]); return String(value).trim();},
    save: () => calls.push('save'),
    calcAccountRiskState: (account, trades) => {calls.push(['risk', account, trades]); return {currentBalance: c.riskBalance};},
    calcMetrics: (trades, id) => {calls.push(['metrics', trades, id]); return {totalPnl: trades.reduce((sum, trade) => sum + trade.pnl, 0)};},
    fR: value => `money:${value}`,
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'src/modules/accounts/domain/account-risk-calculations.js'), 'utf8'), c);
  vm.runInContext(source, c);
  return {c, calls, nodes};
}

test('normalization preserves nullish defaults, unknown fields and legacy account types', () => {
  const {c} = setup();
  assert.deepEqual(plain(c.normalizeAccount()), {type: 'cfd_pct', ddDaily: 2, ddWeekly: 5, ddMonthly: 8, ddTotal: 10, risk: 1, goalPct: 10, cashflows: []});
  const account = {id: 'a', type: 'futures_usd', ddDaily: 0, ddWeekly: '', ddMonthly: null, ddTotal: 7, risk: false, goalPct: 0, custom: 'keep'};
  const normalized = c.normalizeAccount(account);
  assert.notEqual(normalized, account); assert.equal(account.type, 'futures_usd');
  assert.deepEqual(plain(normalized), {...account, type: 'cfd_pct', ddMonthly: 7, cashflows: []});
  assert.equal(c.normalizeAccountType('other'), 'other'); assert.equal(c.normalizeAccountType(0), 'cfd_pct');
  assert.equal(c.isFuturesAccount({type: 'futures_usd'}), false); assert.equal(c.isFuturesAccount(), false);
  assert.throws(() => c.normalizeAccount(null), {name: 'TypeError'});
});

test('cashflow sanitization preserves parsing, generated defaults, cleaning and errors', () => {
  const {c, calls} = setup();
  assert.equal(c.sanitizeAccountCashflow(), null); assert.equal(c.sanitizeAccountCashflow({amount: 'invalid'}), null); assert.deepEqual(calls, []);
  assert.deepEqual(plain(c.sanitizeAccountCashflow({amount: '-12.5tail', note: ' note ', type: 'other'})), {id: 'flow-1', type: 'deposit', date: '2026-11-06', amount: 12.5, note: 'note'});
  assert.deepEqual(calls, ['uid', ['clean', ' note ']]);
  const flow = {id: 'keep', type: 'withdrawal', date: 'raw-date', amount: Infinity, note: 0};
  const normalized = c.sanitizeAccountCashflow(flow); assert.equal(normalized.amount, Infinity); assert.equal(normalized.date, 'raw-date'); assert.equal(normalized.id, 'keep'); assert.equal(normalized.note, '');
  assert.throws(() => c.sanitizeAccountCashflow(null), {name: 'TypeError'});
  assert.throws(() => c.sanitizeAccountCashflow({amount: Symbol()}), {name: 'TypeError'});
  assert.equal(c.normalizeCashflowType('Withdrawal'), 'deposit');
});

test('account normalization sanitizes cashflows without mutating input and active lookup replaces state', () => {
  const {c} = setup();
  const original = [{id: 'a', cashflows: [{id: 'x', amount: 0}, {id: 'y', amount: '-2'}]}, {id: 'b'}];
  c.accounts = original; c.activeAccountId = 'b';
  const active = c.getActiveAccount(); assert.equal(active.id, 'b'); assert.notEqual(c.accounts, original); assert.notEqual(active, original[1]);
  assert.equal(original[0].cashflows.length, 2); assert.equal(c.accounts[0].cashflows.length, 1); assert.equal(c.accounts[0].cashflows[0].amount, 2);
  c.activeAccountId = 'missing'; assert.equal(c.getActiveAccount().id, 'a'); c.accounts = []; assert.equal(c.getActiveAccount(), undefined);
});

test('trade queries preserve all-array identity, strict ids and default legacy membership', () => {
  const {c} = setup(); c.trades = [{id: 'a', accountId: 'a'}, {id: 'b'}, {id: 'c', accountId: ''}, {id: 'd', accountId: 'default'}, {id: 'e', accountId: 1}];
  assert.equal(c.getAccountTrades(), c.trades); assert.equal(c.getAccountTrades('all'), c.trades); assert.equal(c.getAccountTrades(0), c.trades);
  assert.deepEqual(c.getAccountTrades('default').map(t => t.id), ['b', 'c', 'd']);
  assert.deepEqual(c.getAccountTrades('1'), []); assert.deepEqual(c.getAccountTrades(1).map(t => t.id), ['e']);
});

test('working balance uses only positive finite risk values and preserves fallback coercion', () => {
  const {c, calls} = setup(); const account = {id: 'a', balance: 200}; c.trades = [{accountId: 'a'}];
  c.riskBalance = 220; assert.equal(c.getAccountWorkingBalance(account), 220); assert.equal(calls.at(-1)[2][0], c.trades[0]);
  for (const value of [0, -10, Infinity, NaN, '250', undefined]) {c.riskBalance = value; assert.equal(c.getAccountWorkingBalance(account), 200);}
  c.config.balance = '300'; assert.equal(c.getAccountWorkingBalance({id: 'a', balance: 0}), '300');
  assert.equal(c.getAccountWorkingBalance(), '300'); c.config.balance = 0; assert.equal(c.getAccountWorkingBalance(), 1000);
});

test('capital and current balances preserve cashflow references, defaults and addition semantics', () => {
  const {c, calls} = setup(); const flows = [{type: 'deposit', amount: 20}, {type: 'withdrawal', amount: 5}];
  const account = {id: 'a', balance: 100, cashflows: flows}; c.trades = [{accountId: 'a', pnl: 7}, {accountId: 'b', pnl: 99}];
  assert.equal(c.getAccountCashflows(account), flows); assert.notEqual(c.getAccountCashflows(), c.getAccountCashflows());
  assert.deepEqual(plain(c.calcAccountCashflow(account)), {deposits: 20, withdrawals: 5, net: 15});
  assert.equal(c.getAccountCurrentBalance(account), 122); assert.equal(calls.at(-1)[2], 'a');
  assert.equal(c.getAccountCurrentBalance(account, null), 115); assert.deepEqual(plain(calls.at(-1)[1]), []);
  assert.equal(c.getAccountCapitalBase({balance: '100', cashflows: flows}), '10015');
  assert.equal(c.getAccountCurrentBalance({balance: '100', cashflows: flows}, [{pnl: 7}]), '100157');
  assert.equal(c.getAccountCapitalBase(null), 0);
});

test('cashflow add and delete preserve guards, stored references and persistence counts', () => {
  const {c, calls} = setup(); c.accounts = [{id: 'a', cashflows: 'invalid'}];
  assert.equal(c.addAccountCashflow('missing', {amount: 1}), null); assert.deepEqual(calls, []);
  assert.equal(c.addAccountCashflow('a', {amount: 0}), null); assert.equal(c.accounts[0].cashflows, 'invalid');
  assert.equal(c.deleteAccountCashflow('missing', 'x'), false); assert.equal(c.deleteAccountCashflow('a', 'x'), false);
  const added = c.addAccountCashflow('a', {id: 'x', amount: 2}); assert.equal(c.accounts[0].cashflows[0], added); assert.equal(calls.at(-1), 'save');
  const original = c.accounts[0].cashflows; assert.equal(c.deleteAccountCashflow('a', 'missing'), false); assert.notEqual(c.accounts[0].cashflows, original);
  c.accounts[0].cashflows.push({...added}); assert.equal(c.deleteAccountCashflow('a', 'x'), true); assert.equal(c.accounts[0].cashflows.length, 0);
  assert.equal(calls.filter(call => call === 'save').length, 2);
});

test('trade form account uses direct selection before active account normalization', () => {
  const {c, nodes} = setup(); const original = [{id: 'a'}, {id: 'b'}]; c.accounts = original; nodes['t-account'] = {value: 'b'};
  assert.equal(c.getTradeFormAccount(), original[1]); assert.equal(c.accounts, original);
  nodes['t-account'].value = ''; assert.equal(c.getTradeFormAccount(), original[0]);
  nodes['t-account'].value = 'missing'; assert.equal(c.getTradeFormAccount().id, 'a'); assert.notEqual(c.accounts, original);
  c.accounts = []; delete nodes['t-account']; assert.equal(c.getTradeFormAccount(), undefined);
});

test('money labels retain signs, coercion and the cashflow visibility threshold', () => {
  const {c} = setup();
  for (const value of [0, -0, NaN, undefined, 'invalid']) assert.equal(c.formatSignedMoney(value), '+money:0');
  assert.equal(c.formatSignedMoney('-12.5'), '-money:12.5'); assert.equal(c.formatSignedMoney(Infinity), '+money:Infinity');
  assert.equal(c.formatAccountBalanceChange(), '—');
  assert.equal(c.formatAccountBalanceChange({totalPnl: -5, cashflowNet: 0.0001}), 'P/L -money:5');
  assert.equal(c.formatAccountBalanceChange({totalPnl: 5, cashflowNet: -0.00011}), 'P/L +money:5 · Mov. -money:0.00011');
});


test('mode changes persist before updating optional fields and refresh the current page only', () => {
  const {c, calls, nodes} = setup();
  let page = 'page-log';
  c.document.querySelector = selector => {assert.equal(selector, '.page.active'); return {id: page};};
  c.renderLog = () => calls.push('log'); c.renderDashboard = () => calls.push('dashboard');
  for (const id of ['modePercent', 'modeAbsolute']) nodes[id] = {classList: {toggle: (...args) => calls.push([id, ...args])}};
  nodes.modePercentFields = {style: {}}; nodes.modeAbsFields = {style: {}};
  assert.equal(c.setMode('percent'), undefined); assert.equal(c.config.mode, 'percent');
  assert.deepEqual(calls, ['save', ['modePercent', 'active', true], ['modeAbsolute', 'active', false], 'log']);
  assert.equal(nodes.modePercentFields.style.display, ''); assert.equal(nodes.modeAbsFields.style.display, 'none');
  calls.length = 0; page = 'page-dashboard'; c.setMode('absolute'); assert.equal(calls.at(-1), 'dashboard');
  assert.equal(nodes.modePercentFields.style.display, 'none'); assert.equal(nodes.modeAbsFields.style.display, '');
  calls.length = 0; for (const id of Object.keys(nodes)) delete nodes[id]; c.document.querySelector = () => null;
  c.setMode('unknown'); assert.equal(c.config.mode, 'unknown'); assert.deepEqual(calls, ['save']);
});

test('account type labels preserve legacy aliases and unknown values', () => {
  const {c} = setup();
  for (const type of ['cfd_pct', 'futures_usd']) assert.equal(c.acctTypeLabel(type), 'CFD %');
  assert.equal(c.acctTypeLabel('prop_pct'), 'Prop Firm %'); assert.equal(c.acctTypeLabel('crypto'), 'Crypto');
  assert.equal(c.acctTypeLabel('unknown'), 'unknown'); assert.equal(c.acctTypeLabel(), undefined); assert.equal(c.acctTypeLabel(null), null);
});
