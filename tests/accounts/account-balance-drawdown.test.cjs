/*
 * Objetivo: Garantir a precisao e a preservacao de comportamento no calculo de saldo
 * corrente, pico de patrimonio (`peakBalance`) e drawdown em percentual e dolares
 * (`currentDdPct`, `currentDdUsd`).
 *
 * Modulo/arquivo testado: dominio `TradeDiaryBalanceDrawdown` em
 * `src/modules/accounts/domain/account-risk-calculations.js` e sua integracao com
 * `calcAccountRiskState` em
 * `src/modules/accounts/application/account-risk-workflows.js`.
 *
 * Estrategia de isolamento: executa o modulo de dominio e o workflow em `node:vm` com
 * `Date` deterministico e stubs para ordenacao, data ancora e fluxo de caixa; inclui
 * teste de pureza com getters bloqueados para globais proibidas (`document`,
 * `localStorage`, `fetch`, etc.).
 *
 * Pontos-chave garantidos: capital base ajustado por fluxo de caixa, sensibilidade a
 * ordem dos trades, tratamento de picos zerados ou negativos, preservacao da coercao
 * JS legada para P/L textual, pureza do dominio e ordem sincrona de scripts em
 * `index.html`.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const workflowPath = 'src/modules/accounts/application/account-risk-workflows.js';
const workflowSource = fs.readFileSync(path.join(root, workflowPath), 'utf8');

/*
 * Helper de execucao em sandbox: monta um contexto `vm` com relogio congelado em
 * 2026-10-14, carrega `account-risk-calculations.js` e a funcao
 * `calcAccountRiskState`, executa o calculo para o periodo `'all'` e retorna a tupla
 * com os seis indicadores de saldo/drawdown e o log de chamadas auxiliares.
 */
function balance({initial = 1000, trades = [], cashflow = {deposits: 0, withdrawals: 0, net: 0}} = {}) {
  const calls = [];
  const context = vm.createContext({
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : ['2026-10-14T12:00:00Z'])); } },
    getOrderedTrades: rows => { calls.push('ordered'); return rows; },
    getAnchorTradeDate: () => { calls.push('anchor'); return '2026-10-14'; },
    calcAccountCashflow: () => { calls.push('cashflow'); return cashflow; },
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    isFuturesAccount: () => false,
    fR: value => String(value),
    f2: value => String(value),
  });
  for (const name of ['account-risk-calculations.js']) {
    const file = path.join(root, 'src/modules/accounts/domain', name);
    if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: name});
  }
  vm.runInContext(workflowSource.match(/^function calcAccountRiskState\([^]*?^\}/m)[0], context, {filename: workflowPath});
  const state = context.calcAccountRiskState({balance: initial, goalPct: 10}, trades, 'all');
  return {values: [state.capitalBase, state.currentBalance, state.peakBalance, state.currentDdPct,
    state.currentDdUsd, state.totalPnl], calls};
}

/*
 * Cenario base sem operacoes: saldo atual e pico devem iniciar no capital ajustado
 * pelo fluxo de caixa liquido, com drawdown e P/L zerados, executando na ordem
 * `ordered`, `anchor`, `cashflow`.
 */
test('balance and drawdown start at the cashflow-adjusted capital without trades', () => {
  assert.deepEqual(balance().values, [1000, 1000, 1000, 0, 0, 0]);
  assert.deepEqual(balance({initial: 1000, cashflow: {deposits: 200, withdrawals: 50, net: 150}}).values,
    [1150, 1150, 1150, 0, 0, 0]);
  assert.deepEqual(balance().calls, ['ordered', 'anchor', 'cashflow']);
});

/*
 * Sensibilidade a sequencia: uma alta seguida de perda e recuperacao parcial mantem o
 * pico em 1100 e drawdown de 25 USD (25/1100); invertendo a ordem, o saldo final e
 * P/L permanecem iguais, mas o pico passa a ser o proprio saldo final (1075), zerando
 * o drawdown.
 */
test('ordered gains and losses retain the peak and final drawdown', () => {
  const trades = [
    {date: '2026-10-12', pnl: 100},
    {date: '2026-10-13', pnl: -50},
    {date: '2026-10-14', pnl: 25},
  ];
  assert.deepEqual(balance({trades}).values, [1000, 1075, 1100, 25 / 1100, 25, 75]);
  assert.deepEqual(balance({trades: [...trades].reverse()}).values, [1000, 1075, 1075, 0, 0, 75]);
});

/*
 * Casos de borda numericos: quando o pico e zero ou negativo, o drawdown percentual
 * permanece em 0 (evitando divisao invalida ou sinal invertido) enquanto o drawdown
 * em dolares continua sendo calculado; entradas com `pnl` nulo, ausente ou zero nao
 * alteram o capital.
 */
test('zero and negative peaks keep percentage at zero while dollar drawdown remains', () => {
  assert.deepEqual(balance({initial: 0, trades: [{pnl: -10}]}).values, [0, -10, 0, 0, 10, -10]);
  assert.deepEqual(balance({initial: -100, trades: [{pnl: -20}]}).values, [-100, -120, -100, 0, 20, -20]);
  assert.deepEqual(balance({trades: [{pnl: null}, {}, {pnl: 0}]}).values, [1000, 1000, 1000, 0, 0, 0]);
});

/*
 * Caracterizacao de comportamento legado: P/L fornecido como string preserva a
 * concatenacao do operador `+` em JavaScript e a posterior coercao para `NaN` nas
 * subtracoes de drawdown e P/L.
 */
test('numeric text P/L keeps JavaScript addition and later coercion unchanged', () => {
  assert.deepEqual(balance({trades: [{pnl: '25'}, {pnl: -5}]}).values,
    [1000, '100025-5', '100025-5', 0, NaN, NaN]);
});

/*
 * Pureza arquitetural e carregamento: assegura que `TradeDiaryBalanceDrawdown` nao
 * acessa DOM, storage, rede ou estado global, aceita objetos congelados sem mutacao,
 * e carregado uma unica vez como script sincrono antes dos consumidores em
 * `index.html`, e que `calcAccountRiskState` vive apenas no arquivo de workflow (nao
 * em `app.js`).
 */
test('balance drawdown domain is pure and loads once before classic consumers', () => {
  const modulePath = 'src/modules/accounts/domain/account-risk-calculations.js';
  const sandbox = {};
  for (const name of ['document', 'localStorage', 'fetch', 'accounts', 'trades']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`balance drawdown accessed ${name}`); }});
  }
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, modulePath), 'utf8'), context, {filename: modulePath});
  assert.deepEqual(Object.keys(context.TradeDiaryBalanceDrawdown), ['calculateBalanceDrawdown']);
  const rows = Object.freeze([Object.freeze({pnl: 100}), Object.freeze({pnl: -25})]);
  assert.deepEqual(JSON.parse(JSON.stringify(context.TradeDiaryBalanceDrawdown.calculateBalanceDrawdown(1000, rows))),
    {current: 1075, peak: 1100, currentDdPct: 25 / 1100, currentDdUsd: 25});

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
    'src/modules/analytics/presentation/analytics-workspace.js',
    'app.js',
  ]) assert.ok(domainIndex < scripts.findIndex(script => script.src === consumer));
  assert.doesNotMatch(appSource, /^function calcAccountRiskState\(acct, acctTrades, period\)\{/m);
  assert.match(workflowSource, /^function calcAccountRiskState\(acct, acctTrades, period\)\{/m);
});
