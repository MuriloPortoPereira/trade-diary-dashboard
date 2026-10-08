const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/accounts/presentation/account-balance-chrome.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function syncAccountBalanceChrome\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

function render({account = {id: 'acct-1'}, trades = [{id: 'trade-1'}], risk, elements = {}, useDefaults = false} = {}) {
  const calls = [];
  const context = vm.createContext({
    account,
    trades,
    getActiveAccount() { calls.push(['active']); return account; },
    getAccountTrades(id) { calls.push(['trades', id]); return trades; },
    calcAccountRiskState(acct, rows) { calls.push(['risk', acct, rows]); return risk; },
    fR(value) { calls.push(['money', value]); return `F:${value}`; },
    formatAccountBalanceChange(value) { calls.push(['change', value]); return 'formatted change'; },
    document: {getElementById(id) { calls.push(['target', id]); return elements[id] ?? null; }},
  });
  vm.runInContext(source, context, {filename: modulePath});
  const result = vm.runInContext(useDefaults
    ? 'syncAccountBalanceChrome()'
    : 'syncAccountBalanceChrome(account,trades)', context);
  return {calls, result};
}

test('missing default account still resolves its trades and returns before risk or DOM work', () => {
  const {calls, result} = render({account: null, useDefaults: true});
  assert.equal(result, null);
  assert.deepEqual(calls, [['active'], ['trades', undefined]]);
});

test('account balance chrome classic script loads once before dashboard and app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(scripts.filter(src => src === modulePath).length, 1);
  assert.ok(scripts.indexOf(modulePath) < scripts.indexOf('src/modules/analytics/presentation/dashboard-page.js'));
  assert.ok(scripts.indexOf(modulePath) < scripts.indexOf('app.js'));
});

test('default account updates balance, positive change and trade count and returns risk', () => {
  const account = {id: 'acct-1'};
  const trades = [{id: 'trade-1'}];
  const elements = {
    sideBalance: {textContent: 'before'},
    sideBalanceChange: {textContent: 'before', style: {color: 'before'}},
    sideTradeCount: {textContent: 'before'},
  };
  const risk = {currentBalance: 1234.5, totalPnl: 20, cashflowNet: -50};
  const {calls, result} = render({account, trades, risk, elements, useDefaults: true});
  assert.equal(result, risk);
  assert.equal(elements.sideBalance.textContent, 'F:1234.5');
  assert.equal(elements.sideBalanceChange.textContent, 'formatted change');
  assert.equal(elements.sideBalanceChange.style.color, 'var(--green)');
  assert.equal(elements.sideTradeCount.textContent, 1);
  assert.deepEqual(calls, [
    ['active'],
    ['trades', 'acct-1'],
    ['risk', account, trades],
    ['target', 'sideBalance'],
    ['money', 1234.5],
    ['target', 'sideBalanceChange'],
    ['change', risk],
    ['target', 'sideTradeCount'],
  ]);
});

test('negative result or zero result with negative cashflow keeps the negative change color', () => {
  const pnlChange = {textContent: '', style: {color: ''}};
  render({
    risk: {currentBalance: 100, totalPnl: -1, cashflowNet: 10},
    elements: {sideBalanceChange: pnlChange},
  });
  assert.equal(pnlChange.style.color, 'var(--red)');

  const cashflowChange = {textContent: '', style: {color: ''}};
  render({
    risk: {currentBalance: 100, totalPnl: 0, cashflowNet: -1},
    elements: {sideBalanceChange: cashflowChange},
  });
  assert.equal(cashflowChange.style.color, 'var(--red)');
});

test('optional targets skip their formatters without changing the calculated return', () => {
  const risk = {currentBalance: 100, totalPnl: -1, cashflowNet: 0};
  const {calls, result} = render({risk});
  assert.equal(result, risk);
  assert.equal(calls.some(call => call[0] === 'money'), false);
  assert.equal(calls.some(call => call[0] === 'change'), false);
  assert.deepEqual(calls.filter(call => call[0] === 'target'), [
    ['target', 'sideBalance'],
    ['target', 'sideBalanceChange'],
    ['target', 'sideTradeCount'],
  ]);
});
