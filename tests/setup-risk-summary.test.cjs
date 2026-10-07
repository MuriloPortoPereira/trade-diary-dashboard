const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/accounts/presentation/setup-risk-summary.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderSetupRiskSummary\([^]*?^\}/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

const targetIds = [
  'setupInitialBalance', 'setupCashflowNet', 'setupCurrentBalance', 'setupRiskPerTrade',
  'setupDailyDdLimit', 'setupWeeklyDdLimit', 'setupMonthlyDdLimit', 'setupMaxDdLimit',
];

function render({account, trades = [{id: 1}], risk, visible = targetIds} = {}) {
  const nodes = Object.fromEntries(visible.map(id => [id, {textContent: 'before'}]));
  const calls = [];
  const context = vm.createContext({
    document: {getElementById(id) { calls.push(['target', id]); return nodes[id] ?? null; }},
    getActiveAccount() { calls.push(['account']); return account; },
    getAccountTrades(id) { calls.push(['trades', id]); return trades; },
    calcAccountRiskState(value, rows) { calls.push(['calculate', value, rows]); return risk; },
    fR(value) { calls.push(['money', value]); return `R$${value}`; },
    f2(value) { calls.push(['percent', value]); return `P${value}`; },
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderSetupRiskSummary' : modulePath});
  vm.runInContext('renderSetupRiskSummary()', context);
  return {nodes, calls};
}

test('missing active account returns before trades, calculation and DOM access', () => {
  const {calls} = render({account: null});
  assert.deepEqual(calls, [['account']]);
});

test('setup risk summary preserves dependency inputs and all formatted fields', () => {
  const account = {id: 'account-a', risk: 1.5, ddDaily: 2, ddWeekly: 5, ddMonthly: 8, ddTotal: 10};
  const trades = [{id: 1}, {id: 2}];
  const risk = {
    initialBalance: 1000, cashflowNet: 50, currentBalance: 1050, riskPerTradeUsd: 15,
    dayLimit: 20, weekLimit: 50, monthLimit: 80, totalLimit: 100,
  };
  const beforeAccount = JSON.stringify(account);
  const beforeTrades = JSON.stringify(trades);
  const {nodes, calls} = render({account, trades, risk});
  assert.equal(calls.find(call => call[0] === 'trades')[1], 'account-a');
  const calculation = calls.find(call => call[0] === 'calculate');
  assert.equal(calculation[1], account);
  assert.equal(calculation[2], trades);
  assert.deepEqual(Object.fromEntries(targetIds.map(id => [id, nodes[id].textContent])), {
    setupInitialBalance: 'R$1000',
    setupCashflowNet: '+R$50',
    setupCurrentBalance: 'R$1050',
    setupRiskPerTrade: 'P1.5% · R$15',
    setupDailyDdLimit: 'P2% · R$20',
    setupWeeklyDdLimit: 'P5% · R$50',
    setupMonthlyDdLimit: 'P8% · R$80',
    setupMaxDdLimit: 'P10% · R$100',
  });
  assert.equal(JSON.stringify(account), beforeAccount);
  assert.equal(JSON.stringify(trades), beforeTrades);
});

test('negative cashflow omits the plus sign and falsy percentages use zero', () => {
  const account = {id: 'account-a', risk: null, ddDaily: '', ddWeekly: false, ddMonthly: 0, ddTotal: undefined};
  const risk = {
    initialBalance: 1000, cashflowNet: -25, currentBalance: 975, riskPerTradeUsd: 0,
    dayLimit: 0, weekLimit: 0, monthLimit: 0, totalLimit: 0,
  };
  const {nodes} = render({account, risk});
  assert.equal(nodes.setupCashflowNet.textContent, 'R$-25');
  for (const id of ['setupRiskPerTrade', 'setupDailyDdLimit', 'setupWeeklyDdLimit', 'setupMonthlyDdLimit', 'setupMaxDdLimit']) {
    assert.match(nodes[id].textContent, /^P0%/);
  }
});

test('missing summary targets stay optional while formatting still completes', () => {
  const account = {id: 'account-a'};
  const risk = {
    initialBalance: 0, cashflowNet: 0, currentBalance: 0, riskPerTradeUsd: 0,
    dayLimit: 0, weekLimit: 0, monthLimit: 0, totalLimit: 0,
  };
  const {nodes, calls} = render({account, risk, visible: []});
  assert.deepEqual(nodes, {});
  assert.equal(calls.filter(call => call[0] === 'target').length, 8);
  assert.equal(calls.filter(call => call[0] === 'money').length, 8);
  assert.equal(calls.filter(call => call[0] === 'percent').length, 5);
});
