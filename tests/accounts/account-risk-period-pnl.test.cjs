/*
 * Objetivo: Validar o agrupamento e a soma de P/L por janela temporal (dia, semana domingo-sabado,
 * mes calendario, ano e historico total) e o calculo da perda no escopo ativo (`scopeLoss`).
 * Modulo/arquivo testado: `TradeDiaryRiskPeriodPnl` em
 * `src/modules/accounts/domain/account-risk-calculations.js` e sua integracao em
 * `calcAccountRiskState` em `src/modules/accounts/application/account-risk-workflows.js`.
 * Estrategia de isolamento: executa o modulo de dominio e o workflow em `node:vm` com relogio
 * fixo em quarta-feira 2026-10-14 e stubs para ordenacao, data ancora e fluxo de caixa; inclui
 * validacao de pureza do dominio com globais proibidas bloqueadas.
 * Pontos-chave garantidos: fronteiras exatas de semana (domingo a sabado) e mes, inclusao de
 * trades sem data em `year`/`all`/omisso, comparacao estrita de data ISO curta, preservacao da
 * concatenacao JS legada para P/L textual e ordem sincrona de scripts em `index.html`.
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
 * Helper de execucao em sandbox: fixa a data ancora em 2026-10-14, carrega o dominio e
 * `calcAccountRiskState`, executa o calculo para o `period` informado e retorna os 6 campos de
 * P/L por periodo junto com a ordem das chamadas auxiliares.
 */
function periodState(trades, period) {
  const calls = [];
  const context = vm.createContext({
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : ['2026-10-14T12:00:00Z'])); } },
    getOrderedTrades: rows => { calls.push('ordered'); return rows; },
    getAnchorTradeDate: () => { calls.push('anchor'); return '2026-10-14'; },
    calcAccountCashflow: () => { calls.push('cashflow'); return {deposits: 0, withdrawals: 0, net: 0}; },
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
  const state = context.calcAccountRiskState({balance: 1000, goalPct: 10}, trades, period);
  return {values: [state.dayPnl, state.weekPnl, state.monthPnl, state.scopePnl, state.scopeLoss, state.activePeriod], calls};
}

/*
 * Fixture de trades multi-data cobrindo limites criticos ao redor de 2026-10-14 (quarta-feira):
 * sabado anterior (10/10), domingo inicio da semana (10/11), dia ancora (10/14), sabado fim da
 * semana (10/17), domingo seguinte (10/18), bordas de mes (09/30, 10/01, 10/31, 11/01) e trade sem data.
 */
const trades = [
  {date: '2026-10-10', pnl: -10},
  {date: '2026-10-11', pnl: 20},
  {date: '2026-10-14', pnl: -5},
  {date: '2026-10-17', pnl: -7},
  {date: '2026-10-18', pnl: 4},
  {date: '2026-09-30', pnl: -3},
  {date: '2026-10-01', pnl: 6},
  {date: '2026-10-31', pnl: 8},
  {date: '2026-11-01', pnl: 9},
  {date: null, pnl: 2},
];

/*
 * Fronteiras de calendario: confirma `dayPnl` (-5), `weekPnl` domingo a sabado (20 - 5 - 7 = 8)
 * e `monthPnl` de outubro (16), alem de selecionar `scopePnl` e `scopeLoss` conforme o periodo.
 */
test('risk P/L keeps Sunday-Saturday and calendar-month boundaries', () => {
  assert.deepEqual(periodState(trades, 'today').values, [-5, 8, 16, -5, 5, 'today']);
  assert.deepEqual(periodState(trades, 'week').values, [-5, 8, 16, 8, 0, 'week']);
  assert.deepEqual(periodState(trades, 'month').values, [-5, 8, 16, 16, 0, 'month']);
});

/*
 * Escopos amplos e fallback: `year`, `all` e periodo omitido (que assume `'all'`) somam todos
 * os trades incluindo o registro sem data (`total = 24`), preservando a ordem das chamadas.
 */
test('year, all and absent periods include every trade, including undated trades', () => {
  assert.deepEqual(periodState(trades, 'year').values, [-5, 8, 16, 24, 0, 'year']);
  assert.deepEqual(periodState(trades, 'all').values, [-5, 8, 16, 24, 0, 'all']);
  assert.deepEqual(periodState(trades).values, [-5, 8, 16, 24, 0, 'all']);
  assert.deepEqual(periodState(trades, 'today').calls, ['ordered', 'anchor', 'cashflow']);
});

/*
 * Correspondencia de data e P/L vazio: timestamp completo (`2026-10-14T00:00:00`) nao casa com
 * a comparacao exata de dia, valores `null`/ausentes somam 0 e lista vazia mantem tudo zerado.
 */
test('date matching and empty P/L retain exact fallback behavior', () => {
  const rows = [{date: '2026-10-14T00:00:00', pnl: 99}, {date: '2026-10-14', pnl: null}, {date: '2026-10-14'}];
  assert.deepEqual(periodState(rows, 'today').values, [0, 0, 0, 0, 0, 'today']);
  assert.deepEqual(periodState([], 'month').values, [0, 0, 0, 0, 0, 'month']);
});

/*
 * Caracterizacao de P/L textual: mantem a ordem de reducao com concatenacao JS (`'05-2'`) e a
 * coercao resultante `NaN` para `scopeLoss`.
 */
test('text P/L keeps reduction order and scope loss coercion', () => {
  const rows = [{date: '2026-10-14', pnl: '5'}, {date: '2026-10-14', pnl: -2}];
  assert.deepEqual(periodState(rows, 'today').values, ['05-2', '05-2', '05-2', '05-2', NaN, 'today']);
});

/*
 * Pureza e contrato de carregamento: valida que `TradeDiaryRiskPeriodPnl` nao acessa globais
 * proibidas, aceita entradas congeladas, e carregado uma vez sincronamente antes dos consumidores
 * em `index.html` e que `calcAccountRiskState` foi movida de `app.js` para o workflow.
 */
test('risk period domain is isolated and loads once before classic consumers', () => {
  const modulePath = 'src/modules/accounts/domain/account-risk-calculations.js';
  const sandbox = {};
  for (const name of ['document', 'localStorage', 'fetch', 'accounts', 'trades']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`risk period accessed ${name}`); }});
  }
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, modulePath), 'utf8'), context, {filename: modulePath});
  assert.deepEqual(Object.keys(context.TradeDiaryRiskPeriodPnl), ['calculateRiskPeriodPnl']);
  const rows = Object.freeze([Object.freeze({date: '2026-10-14', pnl: -5})]);
  const result = context.TradeDiaryRiskPeriodPnl.calculateRiskPeriodPnl({
    acctTrades: rows, period: 'today', todayStr: '2026-10-14', todayDate: new Date('2026-10-14T12:00:00'),
    weekStart: new Date('2026-10-11T00:00:00'), weekEnd: new Date('2026-10-17T23:59:59'),
  });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {dayPnl: -5, weekPnl: -5, monthPnl: -5, scopePnl: -5, scopeLoss: 5});

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