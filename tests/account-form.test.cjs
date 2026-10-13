const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/accounts/presentation/account-form.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const names = ['newAccount', 'editAccount', 'addAccountCashflowFromForm', 'removeAccountFormCashflow', 'onAcctTypeChange'];
const legacyParts = names.map(name => appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const legacy = legacyParts.every(Boolean) ? legacyParts.join('\n\n') : undefined;
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function element(extra = {}) {
  return {style: {}, value: '', textContent: '', parentElement: {style: {}}, ...extra};
}

function setup({accounts = [], cashflows = [], sanitized = null, type = 'cfd_pct'} = {}) {
  const elements = new Proxy({
    'af-type': element({value: type}),
    'af-risk-unit': element(),
    'af-mult': element(),
    'af-flow-type': element({value: 'deposit'}),
    'af-flow-date': element({value: '2026-01-10'}),
    'af-flow-amount': element({value: '100'}),
    'af-flow-note': element({value: 'Aporte'}),
  }, {
    get(target, key) {
      if (!(key in target)) target[key] = element();
      return target[key];
    },
  });
  const calls = [];
  const context = vm.createContext({
    document: {getElementById: id => elements[id]},
    accounts,
    editingAccountId: 'previous',
    accountFormCashflows: cashflows,
    getAccountCashflows: account => account.cashflows || [],
    renderAccountCashflowList: () => calls.push(['render']),
    sanitizeAccountCashflow: value => { calls.push(['sanitize', value]); return sanitized; },
    showAppNotice: (title, message) => calls.push(['notice', title, message]),
    Date,
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#account-form' : modulePath});
  return {context, elements, calls};
}

test('new account resets state, fields, defaults and renders cashflows', () => {
  const {context, elements, calls} = setup({cashflows: [{id: 'old'}]});
  elements['af-name'].value = 'Anterior';
  vm.runInContext('newAccount()', context);
  assert.equal(context.editingAccountId, null);
  assert.equal(context.accountFormCashflows.length, 0);
  assert.equal(elements.acctFormTitle.textContent, 'Nova Conta');
  assert.equal(elements['af-name'].value, '');
  assert.equal(elements['af-type'].value, 'cfd_pct');
  assert.equal(elements['af-color'].value, '#22d5ed');
  assert.match(elements['af-flow-date'].value, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(elements.accountForm.style.display, 'block');
  assert.deepEqual(calls, [['render']]);
});

test('missing account returns before changing form state', () => {
  const {context, calls} = setup();
  vm.runInContext("editAccount('missing')", context);
  assert.equal(context.editingAccountId, 'previous');
  assert.deepEqual(calls, []);
});

test('account edit clones cashflows, projects values and opens the form', () => {
  const flow = {id: 'f1', amount: 50};
  const account = {id: 'a1', name: 'Principal', type: 'futures_usd', color: '#fff', balance: 2000, risk: 25, mult: 2, ddDaily: 2, ddWeekly: 5, ddMonthly: 8, ddTotal: 10, goalPct: 12, goalWeek: 2, goalMonth: 5, goalTotal: 10, cashflows: [flow]};
  const {context, elements, calls} = setup({accounts: [account]});
  vm.runInContext("editAccount('a1')", context);
  assert.equal(context.editingAccountId, 'a1');
  assert.equal(context.accountFormCashflows.length, 1);
  assert.notEqual(context.accountFormCashflows[0], flow);
  assert.equal(elements.acctFormTitle.textContent, 'Editar Conta');
  assert.equal(elements['af-name'].value, 'Principal');
  assert.equal(elements['af-balance'].value, 2000);
  assert.equal(elements['af-goal-total'].value, 10);
  assert.equal(elements.accountForm.style.display, 'block');
  assert.deepEqual(calls, [['render']]);
});

test('invalid cashflow preserves form and shows the existing notice', () => {
  const {context, elements, calls} = setup({sanitized: null});
  vm.runInContext('addAccountCashflowFromForm()', context);
  assert.equal(context.accountFormCashflows.length, 0);
  assert.equal(elements['af-flow-amount'].value, '100');
  assert.deepEqual(calls.at(-1), ['notice', 'Movimento inválido', 'Informe um valor maior que zero.']);
});

test('valid cashflow is appended, clears transient fields and rerenders', () => {
  const entry = {id: 'f2', type: 'deposit', amount: 100};
  const {context, elements, calls} = setup({sanitized: entry});
  vm.runInContext('addAccountCashflowFromForm()', context);
  assert.equal(context.accountFormCashflows[0], entry);
  assert.equal(elements['af-flow-amount'].value, '');
  assert.equal(elements['af-flow-note'].value, '');
  assert.deepEqual(calls.at(-1), ['render']);
});

test('cashflow removal and account type keep existing presentation behavior', () => {
  const {context, elements, calls} = setup({cashflows: [{id: 1}, {id: 2}], type: 'futures_usd'});
  vm.runInContext('removeAccountFormCashflow(0)', context);
  assert.equal(context.accountFormCashflows.length, 1);
  assert.deepEqual(calls, [['render']]);
  vm.runInContext('onAcctTypeChange()', context);
  assert.equal(elements['af-risk-unit'].textContent, '$');
  assert.equal(elements['af-mult'].parentElement.style.display, 'block');
  elements['af-type'].value = 'cfd_pct';
  vm.runInContext('onAcctTypeChange()', context);
  assert.equal(elements['af-risk-unit'].textContent, '%');
  assert.equal(elements['af-mult'].parentElement.style.display, 'none');
});
