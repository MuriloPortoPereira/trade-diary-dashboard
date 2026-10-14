const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const modulePath = 'src/modules/accounts/domain/calculate-cashflow-totals.js';
const moduleFile = path.join(root, modulePath);
const start = appSource.indexOf('function getAccountCashflows(');
const end = appSource.indexOf('\nfunction getAccountCurrentBalance(', start);
assert.ok(start >= 0 && end > start, 'account cashflow source must remain available');
const source = appSource.slice(start, end);

function loadCashflow() {
  const context = vm.createContext({});
  if (fs.existsSync(moduleFile)) {
    vm.runInContext(fs.readFileSync(moduleFile, 'utf8'), context, {filename: modulePath});
  }
  vm.runInContext(source, context, {filename: 'app.js#account-cashflow'});
  return context;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('cashflow lookup preserves the account array and creates empty fallbacks', () => {
  const api = loadCashflow();
  const flows = [{type: 'deposit', amount: 10}];
  assert.equal(api.getAccountCashflows({cashflows: flows}), flows);
  const first = api.getAccountCashflows(null);
  const second = api.getAccountCashflows({cashflows: 'invalid'});
  assert.deepEqual(plain(first), []);
  assert.deepEqual(plain(second), []);
  assert.notEqual(first, second);
});

test('cashflow totals preserve parsing, absolute amounts and type fallback', () => {
  const api = loadCashflow();
  const account = {cashflows: [
    {type: 'deposit', amount: '100.50'},
    {type: 'withdrawal', amount: '-25.25'},
    {type: 'other', amount: '12abc'},
    {type: 'withdrawal', amount: ''},
    {amount: null},
  ]};
  assert.deepEqual(plain(api.calcAccountCashflow(account)), {
    deposits: 112.5,
    withdrawals: 25.25,
    net: 87.25,
  });
});

test('cashflow totals preserve empty, exceptional and nonfinite behavior', () => {
  const api = loadCashflow();
  assert.deepEqual(plain(api.calcAccountCashflow()), {deposits: 0, withdrawals: 0, net: 0});
  assert.throws(() => api.calcAccountCashflow({cashflows: [null]}), {name: 'TypeError'});
  assert.throws(() => api.calcAccountCashflow({cashflows: [{amount: Symbol('amount')}]}), {name: 'TypeError'});
  const infinite = api.calcAccountCashflow({cashflows: [
    {type: 'withdrawal', amount: Infinity},
    {type: 'deposit', amount: Infinity},
  ]});
  assert.equal(infinite.deposits, Infinity);
  assert.equal(infinite.withdrawals, Infinity);
  assert.equal(Number.isNaN(infinite.net), true);
});

test('cashflow calculation does not mutate records and returns a fresh summary', () => {
  const api = loadCashflow();
  const account = {cashflows: [{id: 'f1', type: 'withdrawal', amount: '-9', note: 'keep'}]};
  const before = JSON.stringify(account);
  const first = api.calcAccountCashflow(account);
  const second = api.calcAccountCashflow(account);
  assert.equal(JSON.stringify(account), before);
  assert.notEqual(first, second);
  assert.deepEqual(plain(first), {deposits: 0, withdrawals: 9, net: -9});
});

test('capital base retains balance fallback and JavaScript addition semantics', () => {
  const api = loadCashflow();
  assert.equal(api.getAccountCapitalBase({balance: 100, cashflows: [{type: 'deposit', amount: 25}]}), 125);
  assert.equal(api.getAccountCapitalBase({balance: 0, cashflows: [{type: 'withdrawal', amount: 10}]}), -10);
  assert.equal(api.getAccountCapitalBase({balance: '100', cashflows: [{type: 'deposit', amount: 25}]}), '10025');
  assert.equal(api.getAccountCapitalBase(null), 0);
});

test('isolated cashflow domain exposes one calculator without account state or IO', () => {
  const forbidden = ['document', 'localStorage', 'fetch', 'accounts', 'save'];
  const sandbox = {};
  for (const name of forbidden) Object.defineProperty(sandbox, name, {get() { throw new Error(`cashflow domain accessed ${name}`); }});
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(moduleFile, 'utf8'), context, {filename: modulePath});
  assert.deepEqual(Object.getOwnPropertyNames(context).filter(name => !forbidden.includes(name)), ['TradeDiaryAccountCashflow']);
  assert.deepEqual(Object.keys(context.TradeDiaryAccountCashflow), ['calculateCashflowTotals']);
  assert.deepEqual(plain(context.TradeDiaryAccountCashflow.calculateCashflowTotals([
    {type: 'deposit', amount: 30},
    {type: 'withdrawal', amount: 8},
  ])), {deposits: 30, withdrawals: 8, net: 22});
});

test('cashflow domain loads once before consumers while legacy helpers remain global', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const domainIndex = scripts.findIndex(script => script.src === modulePath);
  for (const consumer of [
    'src/modules/accounts/presentation/account-cashflow-form.js',
    'src/modules/accounts/presentation/setup-cashflow-list.js',
    'src/modules/analytics/presentation/dashboard-page.js',
    'src/modules/accounts/presentation/account-form.js',
    'app.js',
  ]) {
    assert.ok(domainIndex < scripts.findIndex(script => script.src === consumer));
  }
  assert.match(appSource, /^function getAccountCashflows\(acct\)\{/m);
  assert.match(appSource, /^function calcAccountCashflow\(acct\)\{/m);
  assert.match(appSource, /^function getAccountCapitalBase\(acct\)\{/m);
  assert.match(appSource, /return TradeDiaryAccountCashflow\.calculateCashflowTotals\(getAccountCashflows\(acct\)\);/);
});
