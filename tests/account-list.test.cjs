const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/accounts/presentation/account-list.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderAccountList\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

function render(accounts, visible = true) {
  const node = {innerHTML: 'before'};
  const calls = [];
  const context = vm.createContext({
    document: {getElementById(id) { calls.push(['target', id]); return visible ? node : null; }},
    getAccountTrades(id) {
      calls.push(['trades', id]);
      return id === 'a' ? [{id: 1}, {id: 2}] : [{id: 3}];
    },
    calcAccountRiskState(account, trades) {
      calls.push(['risk', account, trades]);
      return account.id === 'a'
        ? {currentBalance: 1100, initialBalance: 1000, cashflowNet: 25}
        : {currentBalance: 1900, initialBalance: 2000, cashflowNet: -50};
    },
    acctTypeLabel(value) { calls.push(['type', value]); return `TYPE:${value}`; },
    fR(value) { calls.push(['money', value]); return `R$${value}`; },
  });
  vm.runInContext(`let accounts=${JSON.stringify(accounts)};`, context);
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderAccountList' : modulePath});
  vm.runInContext('renderAccountList()', context);
  return {
    html: node.innerHTML,
    calls,
    accounts: JSON.parse(vm.runInContext('JSON.stringify(accounts)', context)),
  };
}

test('missing target returns before reading the account collection', () => {
  const context = vm.createContext({document: {getElementById() { return null; }}});
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('renderAccountList()', context), undefined);
});

test('empty account list keeps the legacy message without risk work', () => {
  const {html, calls} = render([]);
  assert.equal(html, '<p style="color:var(--muted);font-size:12px">Nenhuma conta cadastrada.</p>');
  assert.equal(calls.some(call => call[0] === 'trades' || call[0] === 'risk'), false);
});

test('single account preserves fields, calculations and hides deletion', () => {
  const accounts = [{id: 'a', name: 'Conta <A>', type: 'cfd_pct', color: '#123456', goalPct: 12}];
  const {html, calls, accounts: after} = render(accounts);
  assert.match(html, /border-left:3px solid #123456/);
  assert.match(html, /Conta <A>/);
  assert.match(html, /TYPE:cfd_pct · 2 trades · Saldo: R\$1100/);
  assert.match(html, /Inicial: R\$1000 · Aportes líquidos: R\$25 · Meta: 12%/);
  assert.match(html, /selectAccount\('a'\)/);
  assert.match(html, /editAccount\('a'\)/);
  assert.doesNotMatch(html, /deleteAccount/);
  const riskCall = calls.find(call => call[0] === 'risk');
  assert.equal(riskCall[1].id, 'a');
  assert.equal(riskCall[2].length, 2);
  assert.deepEqual(after, accounts);
});

test('multiple accounts preserve order and add one delete action per row', () => {
  const accounts = [
    {id: 'a', name: 'Primeira', type: 'cfd_pct', color: 'red', goalPct: 10},
    {id: 'b', name: 'Segunda', type: 'prop_pct', color: 'blue', goalPct: 20},
  ];
  const {html, calls} = render(accounts);
  assert.ok(html.indexOf('Primeira') < html.indexOf('Segunda'));
  assert.equal((html.match(/deleteAccount\('/g) ?? []).length, 2);
  assert.match(html, /TYPE:prop_pct · 1 trades · Saldo: R\$1900/);
  assert.match(html, /Aportes líquidos: R\$-50 · Meta: 20%/);
  assert.deepEqual(calls.filter(call => call[0] === 'trades').map(call => call[1]), ['a', 'b']);
  assert.equal(calls.filter(call => call[0] === 'risk').length, 2);
});

test('account list loads once as a synchronous classic script before accounts page', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src/modules/accounts/presentation/accounts-page.js'));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
