const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const accountsPath = 'src/modules/accounts/presentation/accounts-page.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacyDeclaration = appSource.match(/^function renderAccountsPage\([^]*?^\}/m)?.[0];
const extracted = fs.existsSync(path.join(root, accountsPath));
const source = extracted ? fs.readFileSync(path.join(root, accountsPath), 'utf8') : legacyDeclaration;
assert.ok(source, 'renderAccountsPage must remain available');

function createHarness({accounts, visible = ['accountsMetrics', 'accountsOverview']} = {}) {
  const rows = accounts ?? [
    {id: 'a', name: 'Conta <A', type: 'futures_usd', color: '#12ab34'},
    {id: 'b', name: 'Conta B', type: 'cfd_pct', color: '#abcdef'},
  ];
  const trades = {a: [{id: 1}, {id: 2}], b: [{id: 3}]};
  const risk = {
    a: {currentBalance: 1000, cashflowNet: 50, currentDdPct: 0.042, dayUsage: 0.7, weekUsage: 0.2, goalProgress: 0.3},
    b: {currentBalance: 2000, cashflowNet: -25, currentDdPct: 0.1, dayUsage: 0.05, weekUsage: 0.9, goalProgress: 0.8},
  };
  const metrics = {a: {totalPnl: 75}, b: {totalPnl: -5}};
  const calls = [];
  const nodes = Object.fromEntries(visible.map(id => [id, {innerHTML: 'before'}]));
  const context = vm.createContext({
    document: {getElementById(id) { calls.push(['getElementById', id]); return nodes[id] ?? null; }},
    accounts: rows, activeAccountId: 'a',
    getAccountTrades(id) { calls.push(['getAccountTrades', id]); return trades[id] ?? []; },
    calcAccountRiskState(account, accountTrades) { calls.push(['calcAccountRiskState', account.id, accountTrades.length]);
      return risk[account.id]; },
    calcMetrics(accountTrades, id) { calls.push(['calcMetrics', id, accountTrades.length]); return metrics[id]; },
    getActiveAccount() { calls.push(['getActiveAccount']); return rows.find(account => account.id === 'a') ?? null; },
    acctTypeLabel(type) { calls.push(['acctTypeLabel', type]); return `Tipo ${type}`; },
    fR(value) { calls.push(['fR', value]); return `R:${value}`; },
    mkTip(value) { calls.push(['mkTip', value]); return '<span class="tip">?</span>'; },
    escapeHtml(value) { calls.push(['escapeHtml', value]); return String(value)
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;'); },
  });
  vm.runInContext(source, context, {filename: extracted ? accountsPath : 'app.js (accounts declaration)'});
  return {calls, nodes, context};
}

test('multiple accounts render capital, action buttons, signed results and risk bars', () => {
  const {calls, nodes, context} = createHarness();
  assert.equal(vm.runInContext('renderAccountsPage()', context), undefined);
  assert.equal((nodes.accountsMetrics.innerHTML.match(/class="metric-card /g) ?? []).length, 4);
  assert.match(nodes.accountsMetrics.innerHTML, /R:3000/);
  assert.match(nodes.accountsMetrics.innerHTML, /R:3000[\s\S]*Conta &lt;A/);
  assert.match(nodes.accountsMetrics.innerHTML, /Trades totais[\s\S]*<div class="m-value">3<\/div>/);
  assert.equal((nodes.accountsOverview.innerHTML.match(/class="account-overview-card"/g) ?? []).length, 2);
  assert.match(nodes.accountsOverview.innerHTML, /Conta &lt;A/);
  assert.match(nodes.accountsOverview.innerHTML, /style="background:#12ab34"/);
  assert.match(nodes.accountsOverview.innerHTML, /class="badge long">Ativa/);
  assert.match(nodes.accountsOverview.innerHTML, /onclick="selectAccount\('b'\)"/);
  assert.match(nodes.accountsOverview.innerHTML, /onclick="editAccount\('a'\)"/);
  assert.match(nodes.accountsOverview.innerHTML, /\+R:50/);
  assert.match(nodes.accountsOverview.innerHTML, /text-red">R:-25/);
  assert.match(nodes.accountsOverview.innerHTML, /4\.20%/);
  assert.match(nodes.accountsOverview.innerHTML, /width:90%/);
  assert.equal(calls.filter(call => call[0] === 'getAccountTrades').length, 6);
  assert.equal(calls.filter(call => call[0] === 'calcAccountRiskState').length, 4);
  assert.equal(calls.filter(call => call[0] === 'calcMetrics').length, 2);
  assert.equal(calls.filter(call => call[0] === 'getActiveAccount').length, 2);
});

test('empty account list keeps four summary cards and an empty overview', () => {
  const {calls, nodes, context} = createHarness({accounts: []});
  vm.runInContext('renderAccountsPage()', context);
  assert.equal((nodes.accountsMetrics.innerHTML.match(/class="metric-card /g) ?? []).length, 4);
  assert.match(nodes.accountsMetrics.innerHTML, /Conta em foco[\s\S]*<div class="m-value">—<\/div>/);
  assert.match(nodes.accountsMetrics.innerHTML, /<div class="m-value">0<\/div>/);
  assert.equal(nodes.accountsOverview.innerHTML, '');
  assert.equal(calls.some(call => call[0] === 'calcAccountRiskState'), false);
  assert.equal(calls.some(call => call[0] === 'calcMetrics'), false);
});

test('optional containers control independent summary and overview work', () => {
  const summaryOnly = createHarness({visible: ['accountsMetrics']});
  vm.runInContext('renderAccountsPage()', summaryOnly.context);
  assert.equal(summaryOnly.calls.some(call => call[0] === 'calcMetrics'), false);
  assert.equal(summaryOnly.calls.filter(call => call[0] === 'getActiveAccount').length, 2);
  const overviewOnly = createHarness({visible: ['accountsOverview']});
  vm.runInContext('renderAccountsPage()', overviewOnly.context);
  assert.equal(overviewOnly.calls.filter(call => call[0] === 'getActiveAccount').length, 0);
  assert.equal(overviewOnly.calls.filter(call => call[0] === 'calcMetrics').length, 2);
  assert.equal((overviewOnly.nodes.accountsOverview.innerHTML.match(/class="account-overview-card"/g) ?? []).length, 2);
});

test('extracted accounts renderer stays a synchronous classic script before app.js', () => {
  if (!extracted) return;
  assert.ok(!legacyDeclaration, 'legacy declaration must be moved');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .map(match => ({attributes: match[1], src: match[1].match(/\bsrc="([^"]+)"/)?.[1]}))
    .filter(script => script.src && !script.src.startsWith('https://'));
  assert.equal(scripts.filter(script => script.src === accountsPath).length, 1);
  const accountIndex = scripts.findIndex(script => script.src === accountsPath);
  assert.equal(scripts[accountIndex + 1].src, 'src/modules/partners/presentation/partners-page.js');
  assert.doesNotMatch(scripts[accountIndex].attributes, /\b(?:async|defer|type="module")\b/i);
});
