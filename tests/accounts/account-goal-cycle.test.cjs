/*
 * Objetivo: Validar a progressao de ciclos compostos de meta (`goalCycle`), base de
 * meta, alvo por ciclo, progresso limitado em [0, 1] e base de drawdown (`ddBase`).
 *
 * Modulo/arquivo testado: dominio `TradeDiaryGoalCycle` em
 * `src/modules/accounts/domain/account-risk-calculations.js` e sua integracao com
 * `calcAccountRiskState` em
 * `src/modules/accounts/application/account-risk-workflows.js`.
 *
 * Estrategia de isolamento: executa o modulo de dominio e `calcAccountRiskState` em
 * `node:vm` com `Date` congelado e stubs leves; o teste final verifica pureza
 * bloqueando globais proibidas.
 *
 * Pontos-chave garantidos: avanco de ciclo ao atingir o alvo, preservacao das
 * fronteiras de ponto flutuante e teto de progresso, inclusao de aportes (e exclusao
 * de retiradas) na `goalBase`, fallback de 10% quando `goalPct` e zero, e
 * carregamento sincrono antes dos consumidores.
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
 * Helper de calculo de ciclo: cria contexto `vm` deterministico, carrega o dominio e
 * `calcAccountRiskState`, simula um unico trade sintetico quando `pnl` e diferente de
 * zero e retorna a tupla com os 9 campos ligados a meta, ciclo atual e base de
 * drawdown.
 */
function cycle({balance = 1000, goalPct = 10, pnl = 0, cashflow = {deposits: 0, withdrawals: 0, net: 0}} = {}) {
  const context = vm.createContext({
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : ['2026-10-14T12:00:00Z'])); } },
    getOrderedTrades: rows => rows,
    getAnchorTradeDate: () => '2026-10-14',
    calcAccountCashflow: () => cashflow,
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
  const trades = pnl ? [{status: pnl > 0 ? 'WIN' : 'LOSS', date: '2026-10-14', pnl}] : [];
  const state = context.calcAccountRiskState({balance, goalPct}, trades, 'all');
  return [state.goalBase, state.currentBalance, state.cicloAtual, state.cicloBase,
    state.cicloAlvo, state.goalTarget, state.pnlNoCiclo, state.goalProgress, state.ddBase];
}

/*
 * Progressao inicial de ciclo: sem P/L inicia no ciclo 0 (base 1000, alvo 1100); ao
 * ganhar 100 avanca para o ciclo 1 (base 1100, alvo 1210, progresso 0); com +200
 * registra progresso parcial de 100/110 dentro do ciclo 1.
 */
test('goal cycle starts at the cash balance and advances when the first target is met', () => {
  assert.deepEqual(cycle(), [1000, 1000, 0, 1000, 1100, 100, 0, 0, 1000]);
  assert.deepEqual(cycle({pnl: 100}), [1000, 1100, 1, 1100, 1210, 110, 0, 0, 1100]);
  assert.deepEqual(cycle({pnl: 200}), [1000, 1200, 1, 1100, 1210, 110, 100, 100 / 110, 1100]);
});

/*
 * Fronteiras de ponto flutuante e clamp: garante que os limites compostos exatos
 * (+210 e +331) preservam o arredondamento/ciclo legado com progresso travado em 1, e
 * que P/L negativo mantem ciclo 0 com progresso limitado a 0.
 */
test('goal cycle retains floating-point boundary, rounding and capped progress', () => {
  assert.deepEqual(cycle({pnl: 210}), [1000, 1210, 1, 1100, 1210, 110, 110, 1, 1100]);
  assert.deepEqual(cycle({pnl: 331}), [1000, 1331, 2, 1210, 1331, 121, 121, 1, 1210]);
  assert.deepEqual(cycle({pnl: -100}), [1000, 900, 0, 1000, 1100, 100, -100, 0, 1000]);
});

/*
 * Base de meta e fallbacks: `goalBase` soma depositos mas ignora retiradas (`1000 +
 * 200 = 1200`), `goalPct` zerado assume 10% por padrao, e saldo inicial zero mantem
 * todos os indicadores em zero.
 */
test('goal base includes deposits but not withdrawals, and zero goal percent uses ten', () => {
  assert.deepEqual(cycle({goalPct: 0, pnl: 150, cashflow: {deposits: 200, withdrawals: 50, net: 150}}),
    [1200, 1300, 0, 1200, 1320, 120, 100, 100 / 120, 1200]);
  assert.deepEqual(cycle({balance: 0, goalPct: 0}), [0, 0, 0, 0, 0, 0, 0, 0, 0]);
});

/*
 * Pureza e contrato de script: valida que `TradeDiaryGoalCycle` nao toca em globais
 * proibidas, expoe apenas `calculateGoalCycle`, carrega uma vez de forma sincrona em
 * `index.html` antes dos consumidores e que `calcAccountRiskState` permanece somente
 * no arquivo de workflow.
 */
test('goal cycle domain stays pure and loads once before classic consumers', () => {
  const modulePath = 'src/modules/accounts/domain/account-risk-calculations.js';
  const sandbox = {};
  for (const name of ['document', 'localStorage', 'fetch', 'accounts', 'trades']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`goal cycle accessed ${name}`); }});
  }
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, modulePath), 'utf8'), context, {filename: modulePath});
  assert.deepEqual(Object.keys(context.TradeDiaryGoalCycle), ['calculateGoalCycle']);
  assert.deepEqual(JSON.parse(JSON.stringify(context.TradeDiaryGoalCycle.calculateGoalCycle({
    configuredGoalPct: 10, goalBase: 1000, current: 1200,
  }))), {cicloAtual: 1, cicloBase: 1100, cicloAlvo: 1210, goalTarget: 110, pnlNoCiclo: 100, goalProgress: 100 / 110});

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
