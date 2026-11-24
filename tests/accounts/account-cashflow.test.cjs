/*
 * Objetivo: Verificar a logica de leitura, totalizacao de aportes/retiradas e
 * composicao do capital base das contas.
 *
 * Modulo/arquivo testado: `TradeDiaryAccountCashflow` em
 * `src/modules/accounts/domain/account-risk-calculations.js` e funcoes
 * `getAccountCashflows`, `calcAccountCashflow` e `getAccountCapitalBase` em
 * `src/modules/accounts/application/account-risk-workflows.js`.
 *
 * Estrategia de isolamento: executa o modulo de dominio e apenas as tres funcoes
 * extraidas do workflow dentro de `node:vm` limpo, garantindo tambem que nao existem
 * duplicatas em `app.js`; o teste de pureza bloqueia acesso a globais de navegador/IO
 * via getters que lancam erro.
 *
 * Pontos-chave garantidos: preservacao da referencia do array de fluxos, conversao de
 * valores textuais/negativos, erros de tipo e valores `Infinity`/`NaN`, imutabilidade
 * dos registros, semantica legada de adicao no capital base, pureza do dominio e
 * delegacao no workflow.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const modulePath = 'src/modules/accounts/domain/account-risk-calculations.js';
const moduleFile = path.join(root, modulePath);
const workflowPath = 'src/modules/accounts/application/account-risk-workflows.js';
const workflowSource = fs.readFileSync(path.join(root, workflowPath), 'utf8');
const source = ['getAccountCashflows', 'calcAccountCashflow', 'getAccountCapitalBase'].map(name => {
  assert.doesNotMatch(appSource, new RegExp(`^function ${name}\\(`, 'm'));
  const match = workflowSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'));
  assert.ok(match, `${name} must remain available in the account workflow`);
  return match[0];
}).join('\n\n');

/*
 * Helper de inicializacao: cria um contexto `vm` isolado, carrega o arquivo de
 * dominio e as funcoes do workflow de cashflow, devolvendo o proprio contexto como
 * API testavel.
 */
function loadCashflow() {
  const context = vm.createContext({});
  if (fs.existsSync(moduleFile)) {
    vm.runInContext(fs.readFileSync(moduleFile, 'utf8'), context, {filename: modulePath});
  }
  vm.runInContext(source, context, {filename: workflowPath});
  return context;
}

/*
 * Helper de normalizacao: converte objetos criados dentro do realm do `vm` em objetos
 * nativos do processo Node para que `assert.deepEqual` compare prototipos sem falsos
 * negativos.
 */
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

/*
 * Leitura de fluxos: quando `account.cashflows` ja e um array, devolve exatamente a
 * mesma referencia; para conta nula ou campo invalido, retorna um novo array vazio
 * distinto a cada chamada.
 */
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

/*
 * Regras de conversao e totalizacao: aceita strings decimais, usa valor absoluto para
 * retiradas negativas, extrai prefixo numerico (`'12abc'`), ignora vazios/nulos e
 * trata tipos desconhecidos como aporte (`deposits`).
 */
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

/*
 * Casos extremos e excecoes: chamada sem argumentos retorna zeros; item `null` ou
 * valor `Symbol` preservam o lancamento de `TypeError`; aportes e retiradas
 * `Infinity` resultam em `net` igual a `NaN`.
 */
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

/*
 * Imutabilidade: garante que `calcAccountCashflow` nao altera o objeto de conta nem
 * seus registros e retorna uma nova instancia de resumo a cada invocacao.
 */
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

/*
 * Capital base: valida soma com saldo inicial positivo, saldo zero com retirada,
 * preservacao da concatenacao JS quando `balance` e string (`'100' + 25 === '10025'`)
 * e fallback `0` para conta nula.
 */
test('capital base retains balance fallback and JavaScript addition semantics', () => {
  const api = loadCashflow();
  assert.equal(api.getAccountCapitalBase({balance: 100, cashflows: [{type: 'deposit', amount: 25}]}), 125);
  assert.equal(api.getAccountCapitalBase({balance: 0, cashflows: [{type: 'withdrawal', amount: 10}]}), -10);
  assert.equal(api.getAccountCapitalBase({balance: '100', cashflows: [{type: 'deposit', amount: 25}]}), '10025');
  assert.equal(api.getAccountCapitalBase(null), 0);
});

/*
 * Pureza do dominio: executa `account-risk-calculations.js` sob sandbox com globais
 * proibidas armadilhadas, conferindo a lista exata de namespaces globais exportados e
 * a API publica de `TradeDiaryAccountCashflow`.
 */
test('isolated cashflow domain exposes one calculator without account state or IO', () => {
  const forbidden = ['document', 'localStorage', 'fetch', 'accounts', 'save'];
  const sandbox = {};
  for (const name of forbidden) Object.defineProperty(sandbox, name, {get() { throw new Error(`cashflow domain accessed ${name}`); }});
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(moduleFile, 'utf8'), context, {filename: modulePath});
  assert.deepEqual(Object.getOwnPropertyNames(context).filter(name => !forbidden.includes(name)), ['TradeDiaryAccountCashflow', 'TradeDiaryRiskLimits', 'TradeDiaryGoalCycle', 'TradeDiaryBalanceDrawdown', 'TradeDiaryRiskPeriodPnl']);
  assert.deepEqual(Object.keys(context.TradeDiaryAccountCashflow), ['calculateCashflowTotals']);
  assert.deepEqual(plain(context.TradeDiaryAccountCashflow.calculateCashflowTotals([
    {type: 'deposit', amount: 30},
    {type: 'withdrawal', amount: 8},
  ])), {deposits: 30, withdrawals: 8, net: 22});
});

/*
 * Integracao e carregamento: verifica tag `<script>` sincrona unica em `index.html`
 * antes dos consumidores, manutencao das funcoes globais no workflow e delegacao
 * direta para `TradeDiaryAccountCashflow.calculateCashflowTotals`.
 */
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
    'src/modules/accounts/presentation/accounts-workspace.js',
    'src/modules/accounts/presentation/accounts-workspace.js',
    'src/modules/analytics/presentation/analytics-workspace.js',
    'app.js',
  ]) {
    assert.ok(domainIndex < scripts.findIndex(script => script.src === consumer));
  }
  assert.match(workflowSource, /^function getAccountCashflows\(acct\)\{/m);
  assert.match(workflowSource, /^function calcAccountCashflow\(acct\)\{/m);
  assert.match(workflowSource, /^function getAccountCapitalBase\(acct\)\{/m);
  assert.match(workflowSource, /return TradeDiaryAccountCashflow\.calculateCashflowTotals\(getAccountCashflows\(acct\)\);/);
});
