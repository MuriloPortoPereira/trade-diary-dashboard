/*
 * Objetivo:
 *   Validar a renderizacao principal da pagina de Estatisticas (`renderStats`), incluindo
 *   reconstrucao do seletor de contas, comportamento de fixacao (`statsAccountPinned`),
 *   escopo de risco por conta, cards, tabelas, graficos base, histograma e heatmaps de horario/dia.
 *
 * Modulo da aplicacao testado:
 *   - `src/modules/analytics/presentation/analytics-workspace.js` (funcao `renderStats`)
 *   - Remocao da declaracao legada em `app.js` e ordem de declaracao/carregamento em `index.html`
 *
 * Estrategia de isolamento:
 *   - Extrai apenas `renderStats` de `analytics-workspace.js` e a executa em `node:vm`.
 *   - Usa um `Proxy` para criar sob demanda qualquer no DOM consultado via `getElementById`,
 *     junto com stubs para metricas, estrategias, timing, graficos e simulacao.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Quando `statsAccountPinned` e falso, o seletor de contas e reconstruido e volta para `activeAccountId`.
 *   - Quando `'all'` esta fixado, a analise de risco (`renderStopFeeAnalysis`) ainda recebe apenas os trades da conta ativa.
 *   - Estado vazio preserva 8 cards, 16 linhas na tabela de metricas, 4 de sequencias, mensagens vazias e 10 graficos base.
 *   - Estado populado adiciona o histograma (`stHistChart`), tabela de simbolos, heatmap por hora e tabela por dia da semana.
 *   - `renderSimulation` e invocado ao final do ciclo de renderizacao.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Confirma que `renderStats` foi movida de `app.js` para `analytics-workspace.js` e extrai sua declaracao.
const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/analytics/presentation/analytics-workspace.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderStats\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const moduleSource = fs.readFileSync(path.join(root, modulePath), 'utf8');
const source = ['renderStats'].map(name => moduleSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))[0]).join('\n\n');

// Garante carregamento unico e sincrono classico em `index.html` antes de `app.js` e que
// `renderStrategyCompareCards` e declarado antes de `renderStats` dentro do modulo.
test('statistics page loads once as a classic script after strategy comparison and before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src=\"${modulePath}\"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type=\"module\")\b/i);
  assert.ok(moduleSource.indexOf('function renderStrategyCompareCards(') < moduleSource.indexOf('function renderStats('));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src=\"app.js\"'));
});

// Fabrica um elemento DOM minimo com `style`, `innerHTML`, `textContent`, `value` e metodos
// de consulta (`closest`, `querySelectorAll`) para suportar o Proxy de elementos.
function element(extra = {}) {
  return {
    style: {}, innerHTML: '', textContent: '', value: '',
    closest() { return null; },
    querySelectorAll() { return []; },
    ...extra,
  };
}

// Calcula um objeto de metricas deterministico e enxuto a partir da lista de trades fechados
// para alimentar `calcMetrics` no harness sem depender da implementacao completa de `app.js`.
function metrics(closed = []) {
  const wins = closed.filter(row => row.status === 'WIN');
  const losses = closed.filter(row => row.status === 'LOSS');
  const bes = closed.filter(row => row.status === 'BE');
  return {
    totalPnl: closed.reduce((sum, row) => sum + (row.pnl || 0), 0),
    closed, wins, losses, bes,
    wr: closed.length ? wins.length / closed.length : 0,
    exp: 0, pf: 0, maxDD: 0, recovery: 0, sharpe: 0, sortino: 0, calmar: 0,
    startBal: 1000, avgWin: 0, avgLoss: 0, maxWS: 0, maxLS: 0,
  };
}

// Harness principal de `renderStats`: usa um `Proxy` para auto-instaciar elementos DOM consultados,
// injeta stubs de dominio/formatacao/graficos/comparacao/simulacao e registra todas as chamadas em `calls`.
function render({
  rows = [],
  accounts = [{id: 'a1', name: 'Principal'}, {id: 'a2', name: 'Reserva'}],
  activeAccountId = 'a1',
  selectedAccount = 'all',
  pinned = false,
  strategyRows = [],
} = {}) {
  const elements = new Proxy({
    statAccount: element({value: selectedAccount}),
  }, {
    get(target, key) {
      if (!(key in target)) target[key] = element();
      return target[key];
    },
  });
  const calls = [];
  const calculated = metrics(rows.filter(row => row.status !== 'OPEN'));
  const timing = {
    overall: {count: calculated.closed.length, avgPlacedMinutes: null, avgOpenMinutes: null, avgExitMinutes: null, avgDurationMinutes: null},
    wins: {count: calculated.wins.length, avgDurationMinutes: null},
    losses: {count: calculated.losses.length, avgDurationMinutes: null},
    byStrategy: [],
  };
  const context = vm.createContext({
    document: {getElementById: id => elements[id]},
    accounts,
    activeAccountId,
    statsAccountPinned: pinned,
    t: (key, fallback) => fallback ?? key,
    escapeHtml: String,
    getStatsPeriodTrades: () => rows,
    calcMetrics: (input, accountId) => {
      calls.push(['metrics', input, accountId]);
      return calculated;
    },
    mkCard: card => `<card>${card.lbl}:${card.val}</card>`,
    TIPS: new Proxy({}, {get: (_, key) => `tip:${String(key)}`}),
    fR: value => Number(value || 0).toFixed(2),
    mkTip: value => `<tip>${value}</tip>`,
    getActiveAccount: () => accounts.find(account => account.id === activeAccountId),
    renderStopFeeAnalysis: (id, account, trades) => calls.push(['risk', id, account?.id, trades]),
    buildSignedEquityDataset: (data, options = {}) => ({data, ...options}),
    mkChart: (id, config) => calls.push(['chart', id, config]),
    CHART_OPTS: {plugins: {}, scales: {x: {ticks: {}}, y: {ticks: {}}}},
    getStrategySnapshots: (closed, accountId) => {
      calls.push(['strategies', closed, accountId]);
      return strategyRows;
    },
    formatStrategyRatio: value => String(value),
    renderStrategyCompareCards: value => calls.push(['comparison', value]),
    getTradeTimingStats: () => timing,
    formatClockMinutes: value => value == null ? '—' : `${value}m`,
    formatDurationMinutes: value => value == null ? '—' : `${value}min`,
    clockToMinutes: value => value ? Number(value.split(':')[0]) * 60 + Number(value.split(':')[1]) : null,
    renderSimulation: () => calls.push(['simulation']),
  });
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext('renderStats()', context);
  return {elements, calls, calculated};
}

// Quando `statsAccountPinned` e `false`, o dropdown `statAccount` e repovoado com todas as contas
// e redirecionado para `activeAccountId` (`'a1'`), encadeando metricas, analise de risco, comparacao e simulacao.
test('unpinned statistics rebuild accounts and fall back to the active account', () => {
  const {elements, calls} = render();
  assert.match(elements.statAccount.innerHTML, /Principal/);
  assert.match(elements.statAccount.innerHTML, /Reserva/);
  assert.equal(elements.statAccount.value, 'a1');
  assert.deepEqual(calls.find(call => call[0] === 'metrics').slice(1), [[], 'a1']);
  assert.deepEqual(calls.find(call => call[0] === 'risk').slice(1, 3), ['statsRiskLeakageRows', 'a1']);
  assert.deepEqual(calls.find(call => call[0] === 'comparison'), ['comparison', []]);
  assert.deepEqual(calls.at(-1), ['simulation']);
});

// Quando `'all'` esta fixado (`pinned: true`), a selecao global e preservada no controle, mas
// `renderStopFeeAnalysis` filtra os trades para passar apenas os da conta ativa (`a1`), mantendo
// o escopo de risco coerente com os limites da conta.
test('all-accounts selection stays pinned while risk receives only the scoped account trades', () => {
  const rows = [
    {accountId: 'a1', status: 'WIN', pnl: 10, date: '2026-01-01'},
    {accountId: 'a2', status: 'LOSS', pnl: -5, date: '2026-01-02'},
  ];
  const {elements, calls} = render({rows, selectedAccount: 'all', pinned: true});
  assert.equal(elements.statAccount.value, 'all');
  assert.equal(calls.find(call => call[0] === 'metrics')[2], 'a1');
  assert.deepEqual(calls.find(call => call[0] === 'risk')[3], [rows[0]]);
  assert.equal(calls.find(call => call[0] === 'strategies')[2], 'a1');
});

// Valida o estado vazio completo: 8 cards de KPI, 16 linhas na tabela de metricas, 4 linhas de
// sequencias, placeholders de simbolos/horarios sem dados e exatamente os 10 graficos base (sem histograma).
test('empty statistics preserve cards, base charts, tables and empty timing output', () => {
  const {elements, calls} = render();
  assert.equal((elements.statsMetrics.innerHTML.match(/<card>/g) || []).length, 8);
  assert.equal((elements.statsMetTable.innerHTML.match(/border-bottom/g) || []).length, 16);
  assert.equal((elements.statsStreakRows.innerHTML.match(/border-bottom/g) || []).length, 4);
  assert.match(elements.stSymRows.innerHTML, /Sem dados/);
  assert.equal(elements.stTimeBody.innerHTML, '');
  assert.match(elements.stTimeStrategyBody.innerHTML, /Sem horários suficientes/);
  assert.deepEqual(calls.filter(call => call[0] === 'chart').map(call => call[1]), [
    'stEqChart', 'stWLChart', 'stRChart', 'stWdChart', 'stMonthChart', 'stDdChart',
    'stStratPnlChart', 'stStratWRChart', 'stMonthPnlChart', 'stWdWRChart',
  ]);
});

// Valida o estado populado com dois trades fechados em dias e horarios distintos: habilita o
// histograma (`stHistChart`), preenche simbolos, heatmap por hora (`10h`) e tabela por dia (`Seg`, `Ter`).
test('populated statistics add histogram, symbol, weekday and hour detail', () => {
  const rows = [
    {accountId: 'a1', status: 'WIN', pnl: 10, r: 1, date: '2026-01-05', symbol: 'WIN', openTime: '10:15'},
    {accountId: 'a1', status: 'LOSS', pnl: -4, r: -1, date: '2026-01-06', symbol: 'LOSS', openTime: '11:30'},
  ];
  const {elements, calls} = render({rows});
  assert.equal(calls.filter(call => call[0] === 'chart').some(call => call[1] === 'stHistChart'), true);
  assert.match(elements.stSymRows.innerHTML, /WIN/);
  assert.match(elements.stSymRows.innerHTML, /LOSS/);
  assert.match(elements.stHourHeatmap.innerHTML, /10h/);
  assert.match(elements.stTimeBody.innerHTML, /Seg/);
  assert.match(elements.stTimeBody.innerHTML, /Ter/);
});
