/*
 * Objetivo: Garantir o calculo correto dos limites de drawdown (diario, semanal, mensal e total),
 * risco por trade, consumo/excesso no escopo selecionado e pureza da camada de dominio.
 * Modulo/arquivo testado: `TradeDiaryRiskLimits` em
 * `src/modules/accounts/domain/account-risk-calculations.js` e sua integracao em
 * `calcAccountRiskState` em `src/modules/accounts/application/account-risk-workflows.js`.
 * Estrategia de isolamento: executa o modulo de dominio e o workflow em `node:vm` com `Date`
 * fixo (`FixedDate`) e mocks para ordenacao, data ancora, fluxo de caixa e formatadores; valida
 * pureza do dominio em sandbox separado com globais proibidas bloqueadas.
 * Pontos-chave garantidos: percentuais padrao de limite, diferenca entre `capitalBase` e
 * `goalBase`, teto de `scopeUsage` em 1 preservando `scopeUsageRaw` e excesso em USD/%,
 * selecao de escopos `today`/`week`/`month`/`all`, protecao contra capital zerado e carregamento
 * sincrono antes dos consumidores em `index.html`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const modulePath = 'src/modules/accounts/domain/account-risk-calculations.js';
const workflowPath = 'src/modules/accounts/application/account-risk-workflows.js';
const workflowSource = fs.readFileSync(path.join(root, workflowPath), 'utf8');

/*
 * Helper de execucao em sandbox: fixa a data do sistema em 2026-10-14T12:00:00Z, injeta stubs
 * (notando que `getOrderedTrades` inverte a lista simulando reordenacao cronologica) e invoca
 * `calcAccountRiskState` retornando o estado calculado e o rastro de chamadas.
 */
function setup({account, trades = [], period, cashflow} = {}) {
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-10-14T12:00:00Z'])); }
  }
  const acct = account ?? {balance: 1000, ddDaily: 2, ddWeekly: 5, ddMonthly: 8, ddTotal: 10, risk: 1, goalPct: 10};
  const calls = [];
  const context = vm.createContext({
    Date: FixedDate,
    getOrderedTrades: rows => { calls.push('ordered'); return [...rows].reverse(); },
    getAnchorTradeDate: rows => { calls.push('anchor'); return rows[0]?.date || '2026-10-14'; },
    calcAccountCashflow: () => { calls.push('cashflow'); return cashflow ?? {deposits: 0, withdrawals: 0, net: 0}; },
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    isFuturesAccount: () => false,
    fR: value => `$${value}`,
    f2: value => String(value),
  });
  const moduleFile = path.join(root, modulePath);
  if (fs.existsSync(moduleFile)) vm.runInContext(fs.readFileSync(moduleFile, 'utf8'), context, {filename: modulePath});
  vm.runInContext(workflowSource.match(/^function calcAccountRiskState\([^]*?^\}/m)[0], context, {filename: workflowPath});
  return {result: context.calcAccountRiskState(acct, trades, period), calls};
}

/*
 * Valores padrao sem trades: conta apenas com `balance: 1000` assume limites default (2%, 5%,
 * 10%, 10%), risco por trade 0, escopo padrao total (100 / 10%) e todos os consumos/excessos em 0.
 */
test('risk limits preserve defaults and empty account calculations', () => {
  const {result, calls} = setup({account: {balance: 1000}});
  assert.deepEqual(calls, ['ordered', 'anchor', 'cashflow']);
  assert.deepEqual([
    result.dayLimit, result.weekLimit, result.monthLimit, result.totalLimit,
    result.riskPerTradeUsd, result.scopeLimit, result.scopeLimitPct,
  ], [20, 50, 100, 100, 0, 100, 10]);
  assert.deepEqual([
    result.dayUsage, result.weekUsage, result.monthUsage, result.totalUsage,
    result.scopeUsage, result.dayExcessUsd, result.totalExcessUsd,
  ], [0, 0, 0, 0, 0, 0, 0]);
});

/*
 * Escopo diario com estouro de limite: usa `capitalBase` (1150) para limites diario/semanal/mensal
 * e risco por trade, usa `goalBase` (1200) para `totalLimit`, limita `scopeUsage` a 1 mas preserva
 * `scopeUsageRaw` (40/23), excesso em dolares (17) e excesso percentual arredondado (1.48).
 */
test('daily limit uses cashflow capital and caps usage while preserving excess', () => {
  const {result} = setup({
    account: {balance: 1000, ddDaily: 2, ddWeekly: 5, ddMonthly: 8, ddTotal: 10, risk: 1, goalPct: 10},
    cashflow: {deposits: 200, withdrawals: 50, net: 150},
    trades: [{status: 'LOSS', date: '2026-10-14', pnl: -40}],
    period: 'today',
  });
  assert.deepEqual([
    result.capitalBase, result.goalBase, result.dayLimit, result.weekLimit,
    result.monthLimit, result.totalLimit, result.riskPerTradeUsd,
  ], [1150, 1200, 23, 57.5, 92, 120, 11.5]);
  assert.deepEqual([
    result.scopeLoss, result.scopeLimit, result.scopeLimitPct, result.scopeUsageRaw,
    result.scopeUsage, result.scopeExcessUsd, result.dayExcessUsd, result.dayExcessPct,
    result.currentDdUsd,
  ], [40, 23, 2, 40 / 23, 1, 17, 17, 1.48, 40]);
});

/*
 * Selecao por periodo (`week`, `month`, `all`): valida que o mesmo historico multi-data produz
 * perdas acumuladas, limites e taxas de uso coerentes para cada janela temporal.
 */
test('week, month and total scopes preserve selection and cumulative losses', () => {
  const trades = [
    {status: 'LOSS', date: '2026-10-14', pnl: -40},
    {status: 'WIN', date: '2026-10-13', pnl: 10},
    {status: 'LOSS', date: '2026-09-30', pnl: -70},
  ];
  const expected = {
    week: [30, 50, 5, 0.6],
    month: [30, 80, 8, 0.375],
    all: [100, 100, 10, 1],
  };
  for (const [period, values] of Object.entries(expected)) {
    const {result} = setup({account: {balance: 1000, ddMonthly: 8}, trades, period});
    assert.deepEqual([result.scopeLoss, result.scopeLimit, result.scopeLimitPct, result.scopeUsageRaw], values);
  }
});

/*
 * Casos de borda extremos: capital zerado, percentuais de DD zerados e risco negativo resultam
 * em limites e ratios zerados (sem `NaN`/`Infinity`), mantendo ainda o registro do excesso em USD.
 */
test('risk limits retain zero capital, fallback percentages and cycle base', () => {
  const {result} = setup({
    account: {balance: 0, ddDaily: 0, ddWeekly: 0, ddTotal: 0, risk: -3, goalPct: 0},
    trades: [{status: 'LOSS', date: '2026-10-14', pnl: -5}],
    period: 'today',
  });
  assert.deepEqual([result.dayLimit, result.weekLimit, result.monthLimit, result.totalLimit], [0, 0, 0, 0]);
  assert.equal(result.riskPerTradeUsd, 0);
  assert.equal(result.scopeUsageRaw, 0);
  assert.equal(result.scopeExcessUsd, 5);
  assert.equal(result.dayExcessPct, 0);
  assert.equal(result.goalProgress, 0);
});

/*
 * Pureza do modulo de dominio: garante ausencia de acesso a DOM, storage, rede ou estado global,
 * verifica exatamente os metodos expostos por `TradeDiaryRiskLimits` e testa `calculateRiskThresholds`.
 */
test('isolated risk limits expose only pure calculations', () => {
  const forbidden = ['document', 'localStorage', 'fetch', 'accounts', 'config'];
  const sandbox = {};
  for (const name of forbidden) Object.defineProperty(sandbox, name, {get() { throw new Error(`risk limits accessed ${name}`); }});
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, modulePath), 'utf8'), context, {filename: modulePath});
  assert.deepEqual(Object.getOwnPropertyNames(context).filter(name => !forbidden.includes(name)), ['TradeDiaryAccountCashflow', 'TradeDiaryRiskLimits', 'TradeDiaryGoalCycle', 'TradeDiaryBalanceDrawdown', 'TradeDiaryRiskPeriodPnl']);
  assert.deepEqual(Object.keys(context.TradeDiaryRiskLimits).sort(), ['calculateRiskConsumption', 'calculateRiskThresholds']);
  const thresholds = context.TradeDiaryRiskLimits.calculateRiskThresholds({ddDaily: 2, ddWeekly: 5, ddTotal: 10, risk: 1}, 1000);
  assert.deepEqual(JSON.parse(JSON.stringify(thresholds)), {dayLimit: 20, weekLimit: 50, monthLimit: 100, riskPerTradeUsd: 10});
});

/*
 * Ordem de carregamento e migracao: confirma script classico sincrono unico em `index.html`
 * antes dos consumidores e que `calcAccountRiskState` existe no workflow e nao em `app.js`.
 */
test('risk limits load once before classic consumers and keep global risk API', () => {
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
    'src/modules/accounts/presentation/accounts-workspace.js',
    'app.js',
  ]) assert.ok(domainIndex < scripts.findIndex(script => script.src === consumer));
  assert.doesNotMatch(appSource, /^function calcAccountRiskState\(acct, acctTrades, period\)\{/m);
  assert.match(workflowSource, /^function calcAccountRiskState\(acct, acctTrades, period\)\{/m);
});