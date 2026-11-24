/*
 * Objetivo: Testar a composicao de alto nivel dos workflows de risco da conta,
 * integrando cashflow, limites, drawdown, metas, P/L por periodo e analise de
 * violacao de stops e taxas.
 *
 * Modulo/arquivo testado: funcoes `calcAccountRiskState`, `getTradeWeekKey` e
 * `buildStopFeeAnalysis` em
 * `src/modules/accounts/application/account-risk-workflows.js` (combinadas com
 * `src/modules/accounts/domain/account-risk-calculations.js`).
 *
 * Estrategia de isolamento: carrega o dominio e apenas as tres funcoes do workflow em
 * `node:vm` com `FixedDate` em 2026-10-14 e mocks minimos para cashflow, ordenacao e
 * formatadores.
 *
 * Pontos-chave garantidos: integracao completa do estado de risco da conta,
 * agrupamento diario/ semanal/mensal na analise de stops e impacto das taxas
 * (`feeDragPct`, `feesInR`, arredondamentos), ausencia de duplicatas em `app.js` e
 * ordem correta de scripts classicos em `index.html`.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const modulePath = 'src/modules/accounts/application/account-risk-workflows.js';
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

/*
 * Helper de sandbox: configura `Date` deterministico, injeta cashflow liquido de +150
 * (200 depositos, 50 retiradas), carrega o modulo de dominio de calculos de risco e
 * extrai as tres funcoes de workflow para execucao isolada.
 */
function setup() {
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-10-14T12:00:00Z'])); }
  }
  const context = vm.createContext({
    Date: FixedDate,
    getOrderedTrades: rows => [...rows],
    getAnchorTradeDate: rows => rows.at(-1)?.date || '2026-10-14',
    calcAccountCashflow: () => ({deposits: 200, withdrawals: 50, net: 150}),
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    isFuturesAccount: () => false,
    fR: value => `$${Number(value).toFixed(2)}`,
    f2: value => Number(value).toFixed(2),
  });
  for (const name of [
    'account-risk-calculations.js',
  ]) {
    const filename = path.join(root, 'src/modules/accounts/domain', name);
    vm.runInContext(fs.readFileSync(filename, 'utf8'), context, {filename: name});
  }
  const workflowSource = ['calcAccountRiskState', 'getTradeWeekKey', 'buildStopFeeAnalysis'].map(name => source.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))[0]).join('\n\n');
  vm.runInContext(workflowSource, context, {filename: modulePath});
  return context;
}

/*
 * Fixtures compartilhadas: conta com saldo inicial 1000 e limites percentuais
 * 2/5/8/10, alem de tres operacoes fechadas distribuidas em dois meses e duas semanas
 * com taxas explicitas.
 */
const account = {
  balance: 1000,
  goalPct: 10,
  ddDaily: 2,
  ddWeekly: 5,
  ddMonthly: 8,
  ddTotal: 10,
  risk: 1,
};
const trades = [
  {status: 'LOSS', date: '2026-10-14', pnl: -40, fees: 5},
  {status: 'WIN', date: '2026-10-13', pnl: 10, fees: 2},
  {status: 'LOSS', date: '2026-09-30', pnl: -70, fees: 3},
];

/*
 * Composicao de estado de risco: verifica que `calcAccountRiskState` combina
 * corretamente `capitalBase` (1150), `goalBase` (1200), saldo atual (1050), P/L
 * diario/semanal/mensal/total, limites calculados, drawdown atual, uso limitado no
 * escopo (`scopeUsage: 1`) e `riskLabel`.
 */
test('account risk workflow composes cashflow, limits, drawdown, goals and period state', () => {
  const state = setup().calcAccountRiskState(account, trades, 'today');
  assert.deepEqual(JSON.parse(JSON.stringify({
    activePeriod: state.activePeriod,
    capitalBase: state.capitalBase,
    goalBase: state.goalBase,
    currentBalance: state.currentBalance,
    totalPnl: state.totalPnl,
    dayPnl: state.dayPnl,
    weekPnl: state.weekPnl,
    monthPnl: state.monthPnl,
    dayLimit: state.dayLimit,
    weekLimit: state.weekLimit,
    monthLimit: state.monthLimit,
    totalLimit: state.totalLimit,
    currentDdUsd: state.currentDdUsd,
    scopeUsage: state.scopeUsage,
    riskLabel: state.riskLabel,
  })), {
    activePeriod: 'today',
    capitalBase: 1150,
    goalBase: 1200,
    currentBalance: 1050,
    totalPnl: -100,
    dayPnl: -40,
    weekPnl: -30,
    monthPnl: -30,
    dayLimit: 23,
    weekLimit: 57.5,
    monthLimit: 92,
    totalLimit: 120,
    currentDdUsd: 100,
    scopeUsage: 1,
    riskLabel: '1.00%',
  });
});

/*
 * Analise de stops e taxas: garante a contagem de dias/semanas/meses operados,
 * violacoes de stop diario (2/3 = 66.7%) e semanal (1/2 = 50%), metricas de taxas
 * (`totalFees`, `feePerTrade`), expectativas antes/depois das taxas, `feeDragPct`
 * (11.1%) e custo das taxas em unidades de risco (`feesInR: 0.87`).
 */
test('stop and fee workflow preserves grouping, breach thresholds and rounding', () => {
  const result = setup().buildStopFeeAnalysis(account, trades);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    closedTrades: 3,
    dayLimit: 23,
    weekLimit: 57.5,
    monthLimit: 92,
    days: 3,
    weeks: 2,
    months: 2,
    daysOverDailyStop: 2,
    weeksOverWeeklyStop: 1,
    monthsOverMonthlyStop: 0,
    daysOverDailyStopPct: 66.7,
    weeksOverWeeklyStopPct: 50,
    monthsOverMonthlyStopPct: 0,
    totalFees: 10,
    netPnl: -100,
    pnlBeforeFees: -90,
    feePerTrade: 3.33,
    expectancyBeforeFees: -30,
    expectancyAfterFees: -33.33,
    edgeRemovedPct: 0,
    feeDragPct: 11.1,
    feesInR: 0.87,
  });
});

/*
 * Contrato de arquitetura e carregamento: garante que as tres funcoes foram removidas
 * de `app.js`, permanecem declaradas no arquivo de workflow e carregam uma unica vez
 * como script classico sincrono depois do dominio e antes dos consumidores em
 * `index.html`.
 */
test('risk workflows load once as classic globals after domains and before consumers', () => {
  assert.doesNotMatch(appSource, /^function (?:calcAccountRiskState|getTradeWeekKey|buildStopFeeAnalysis)\(/m);
  assert.match(source, /^function calcAccountRiskState\(acct, acctTrades, period\)\{/m);
  assert.match(source, /^function getTradeWeekKey\(dateStr\)\{/m);
  assert.match(source, /^function buildStopFeeAnalysis\(acct, acctTrades=\[\]\)\{/m);

  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const workflowIndex = scripts.findIndex(script => script.src === modulePath);
  assert.ok(scripts.findIndex(script => script.src === 'src/modules/accounts/domain/account-risk-calculations.js') < workflowIndex);
  for (const consumer of [
    'src/modules/accounts/presentation/accounts-workspace.js',
    'src/modules/analytics/presentation/analytics-workspace.js',
    'app.js',
  ]) assert.ok(workflowIndex < scripts.findIndex(script => script.src === consumer));
});
