/*
 * Objetivo: Validar o ciclo de vida e as interacoes do formulario de contas (criacao, edicao,
 * adicao/remocao de movimentacoes financeiras e alternancia de tipo de conta).
 * Modulo/arquivo testado: funcoes `newAccount`, `editAccount`, `addAccountCashflowFromForm`,
 * `removeAccountFormCashflow` e `onAcctTypeChange` em
 * `src/modules/accounts/presentation/accounts-workspace.js`.
 * Estrategia de isolamento: extrai as cinco funcoes e executa em `node:vm` com um registro de
 * elementos DOM simulado via `Proxy` (que cria nos sob demanda) e stubs para sanitizacao,
 * notificacao e re-renderizacao da lista de cashflows.
 * Pontos-chave garantidos: reset completo em nova conta, clonagem de cashflows na edicao para
 * evitar mutacao prematura, validacao de movimento com aviso ao usuario, limpeza de campos
 * transitorios apos inclusao, exibicao condicional de multiplicador/unidade por tipo de conta
 * e limpeza do legado em `app.js`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/accounts/presentation/accounts-workspace.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const names = ['newAccount', 'editAccount', 'addAccountCashflowFromForm', 'removeAccountFormCashflow', 'onAcctTypeChange'];
const legacyParts = names.map(name => appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const legacy = legacyParts.every(Boolean) ? legacyParts.join('\n\n') : undefined;
const moduleSource = fs.readFileSync(path.join(root, modulePath), 'utf8');
const source = legacy ?? names.map(name => moduleSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))[0]).join('\n\n');

/*
 * Fabrica de elemento DOM minimo: cria um objeto com `style`, `value`, `textContent` e
 * `parentElement.style`, mesclando propriedades iniciais opcionais.
 */
function element(extra = {}) {
  return {style: {}, value: '', textContent: '', parentElement: {style: {}}, ...extra};
}

/*
 * Helper de ambiente em sandbox: prepara um `Proxy` de elementos DOM (garantindo que qualquer
 * ID consultado pelo formulario retorne um no valido), injeta estado global e stubs gravadores
 * de chamadas, e carrega as funcoes do formulario no contexto `vm`.
 */
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

/*
 * Criacao de nova conta: limpa `editingAccountId` e rascunho de cashflows, preenche valores
 * padrao (`cfd_pct`, cor `#22d5ed`, data ISO atual), exibe o formulario e renderiza a lista.
 */
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

/*
 * Guarda de edicao: tentar editar um ID inexistente nao altera `editingAccountId` nem dispara
 * renderizacoes ou avisos.
 */
test('missing account returns before changing form state', () => {
  const {context, calls} = setup();
  vm.runInContext("editAccount('missing')", context);
  assert.equal(context.editingAccountId, 'previous');
  assert.deepEqual(calls, []);
});

/*
 * Edicao de conta existente: clona os objetos de cashflow para isolar edicoes nao salvas,
 * projeta os atributos nos campos do formulario, ajusta o titulo para "Editar Conta", abre o
 * painel e re-renderiza a lista de movimentacoes.
 */
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

/*
 * Validacao negativa de cashflow: quando `sanitizeAccountCashflow` devolve `null`, nenhum item
 * e adicionado, o valor digitado e preservado no campo e `showAppNotice` exibe a mensagem esperada.
 */
test('invalid cashflow preserves form and shows the existing notice', () => {
  const {context, elements, calls} = setup({sanitized: null});
  vm.runInContext('addAccountCashflowFromForm()', context);
  assert.equal(context.accountFormCashflows.length, 0);
  assert.equal(elements['af-flow-amount'].value, '100');
  assert.deepEqual(calls.at(-1), ['notice', 'Movimento inválido', 'Informe um valor maior que zero.']);
});

/*
 * Inclusao valida de cashflow: adiciona o item sanitizado ao rascunho, limpa os campos de valor
 * e nota para a proxima entrada e solicita re-renderizacao da lista.
 */
test('valid cashflow is appended, clears transient fields and rerenders', () => {
  const entry = {id: 'f2', type: 'deposit', amount: 100};
  const {context, elements, calls} = setup({sanitized: entry});
  vm.runInContext('addAccountCashflowFromForm()', context);
  assert.equal(context.accountFormCashflows[0], entry);
  assert.equal(elements['af-flow-amount'].value, '');
  assert.equal(elements['af-flow-note'].value, '');
  assert.deepEqual(calls.at(-1), ['render']);
});

/*
 * Remocao de cashflow e troca de tipo de conta: confirma remocao por indice com re-renderizacao
 * e alternancia da unidade de risco (`$` vs `%`) e visibilidade do multiplicador entre contas
 * `futures_usd` e `cfd_pct`.
 */
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

/*
 * Integridade estrutural: garante remocao de todas as cinco declaracoes legadas de `app.js`,
 * presenca do script classico em `index.html` antes de `app.js` e ordenacao correta das funcoes.
 */
test('account form loads as a classic script before its consumers and leaves app.js clean', () => {
  for (const name of names) {
    assert.equal(legacyParts[names.indexOf(name)], undefined);
  }
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const formIndex = html.indexOf(`<script src="${modulePath}"></script>`);
  const setupIndex = html.indexOf('<script src="src/modules/accounts/presentation/accounts-workspace.js"></script>');
  const appIndex = html.indexOf('<script src="app.js"></script>');
  assert.ok(formIndex >= 0);
  assert.ok(moduleSource.indexOf('function renderAccountCashflowList(') < moduleSource.indexOf('function newAccount('));
  assert.ok(formIndex === setupIndex && setupIndex < appIndex);
});