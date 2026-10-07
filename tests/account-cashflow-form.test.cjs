const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/accounts/presentation/account-cashflow-form.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderAccountCashflowList\([^]*?^\}/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function render(flows, summary = {deposits: 0, withdrawals: 0, net: 0}, visible = true) {
  const node = {innerHTML: 'before'};
  const calls = [];
  const context = vm.createContext({
    document: {getElementById(id) { calls.push(['target', id]); return visible ? node : null; }},
    calcAccountCashflow(account) { calls.push(['calculate', account]); return summary; },
    fR(value) { calls.push(['money', value]); return `R$${value}`; },
    fDate(value) { calls.push(['date', value]); return `D:${value}`; },
    escapeHtml(value) {
      calls.push(['escape', value]);
      return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    },
  });
  vm.runInContext(`let accountFormCashflows=${JSON.stringify(flows)};`, context);
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderAccountCashflowList' : modulePath});
  vm.runInContext('renderAccountCashflowList()', context);
  return {
    html: node.innerHTML,
    calls,
    flows: JSON.parse(vm.runInContext('JSON.stringify(accountFormCashflows)', context)),
  };
}

test('missing target returns before calculating or reading cashflows', () => {
  const node = {innerHTML: 'before'};
  const context = vm.createContext({
    document: {getElementById() { return null; }},
    calcAccountCashflow() { throw new Error('calculation reached'); },
    node,
  });
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('renderAccountCashflowList()', context), undefined);
  assert.equal(node.innerHTML, 'before');
});

test('empty cashflows keep the legacy message after calculating the summary', () => {
  const {html, calls} = render([]);
  assert.equal(html, '<div class="account-cashflow-empty">Nenhum aporte ou retirada registrada. Saldo atual usa só saldo inicial + P/L.</div>');
  assert.deepEqual(calls.slice(0, 2).map(call => call[0]), ['target', 'calculate']);
  assert.equal(calls.some(call => call[0] === 'money'), false);
});

test('cashflow rows preserve summary, order, types, formatting, escaping and actions', () => {
  const flows = [
    {type: 'deposit', date: '2026-10-01', amount: 125, note: 'Aporte <principal>'},
    {type: 'withdrawal', date: '2026-10-02', amount: 25, note: ''},
  ];
  const {html, flows: after} = render(flows, {deposits: 125, withdrawals: 25, net: 100});
  assert.match(html, /Aportes: <b>R\$125<\/b>/);
  assert.match(html, /Retiradas: <b>R\$25<\/b>/);
  assert.match(html, /class="text-green">\+R\$100<\/b>/);
  assert.ok(html.indexOf('Aporte') < html.indexOf('Retirada'));
  assert.match(html, /class="text-green">Aporte<\/span>/);
  assert.match(html, /class="text-red">Retirada<\/span>/);
  assert.match(html, /D:2026-10-01/);
  assert.match(html, /Aporte &lt;principal&gt;/);
  assert.match(html, />—<\/span>/);
  assert.match(html, /removeAccountFormCashflow\(0\)/);
  assert.match(html, /removeAccountFormCashflow\(1\)/);
  assert.deepEqual(after, flows);
});

test('negative net retains the red tone without a positive sign', () => {
  const {html} = render(
    [{type: 'other', date: '', amount: 10, note: null}],
    {deposits: 0, withdrawals: 10, net: -10},
  );
  assert.match(html, /class="text-red">R\$-10<\/b>/);
  assert.match(html, /class="text-green">Aporte<\/span>/);
});
