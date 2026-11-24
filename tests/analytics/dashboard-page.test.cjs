/*
 * Objetivo:
 *   Testar a orquestracao completa da pagina principal de Dashboard (`renderDashboard`),
 *   cobrindo cards de metricas, curva de equity em valor e percentual, os sete graficos,
 *   delegacao para subcomponentes, tooltips idempotentes e lista de operacoes recentes.
 *
 * Modulo da aplicacao testado:
 *   - `src/modules/analytics/presentation/analytics-workspace.js` (funcao `renderDashboard`)
 *   - Remocao da declaracao legada em `app.js` e inclusao em `index.html`
 *
 * Estrategia de isolamento:
 *   - Carrega o codigo do modulo em `node:vm` com mocks de DOM e de todas as dependencias
 *     de dominio/UI (`calcMetrics`, `mkChart`, `mkCard`, `renderRiskBoard`, `renderDashboardCalendar`, etc.).
 *   - Como `renderDashStrategyBoard` tambem existe dentro do mesmo arquivo, o harness preserva
 *     o spy original e o reatribui no contexto apos `vm.runInContext` para verificar sua chamada.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Quatro cards principais (P/L, PF infinito como `∞`, WR, Drawdown com recovery `—`), sem mutar os trades.
 *   - Inversao da ordem da curva de equity a partir da capitalizacao base e calculo correto no modo percentual.
 *   - Identidade e dados dos 7 graficos (equity, win/loss, barras de R, dia da semana, evolucao mensal,
 *     estrategias com truncamento de nome longo e emocoes com eixo Y limitado a 100).
 *   - Fallbacks seguros quando periodo ou objeto `risk` estao ausentes, sem disparar fallback para saldo zero.
 *   - Insercao idempotente de tooltips (uma unica vez entre re-renderizacoes) e limite de 20 trades recentes.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
// Confirma que `renderDashboard` foi extraida de `app.js` e carrega o modulo `analytics-workspace.js`.
const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/analytics/presentation/analytics-workspace.js';
const legacy = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/^function renderDashboard\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

// Fixture base propositalmente fora de ordem cronologica, contendo nome longo de estrategia
// (para testar truncamento), operacao `BE` com `r: null` e tres status distintos (`WIN`, `LOSS`, `BE`).
const rows = [
  {id: 'later', date: '2024-02-12', pnl: -10, r: -1, status: 'LOSS', strategy: 'Long strategy name for truncation', emotion: 'Calmo'},
  {id: 'earlier', date: '2024-01-01', pnl: 20, r: 2, status: 'WIN', strategy: 'Setup', emotion: 'Calmo'},
  {id: 'be', date: '2024-02-13', pnl: 0, r: null, status: 'BE'},
];

// Harness completo do dashboard em `node:vm`: simula nos do DOM, captura cards, graficos e
// ordem de invocacao dos subpaineis; usa `Proxy` para `TIPS` e restaura o spy `renderDashStrategyBoard`
// depois de avaliar o modulo para evitar que a declaracao interna sobrescreva o mock de verificacao.
function harness({data = rows, risk = {currentBalance: 1010, capitalBase: 1000}, period = 'month', mode = 'value', tips = false} = {}) {
  const nodes = Object.fromEntries(['dashSub', 'dashMetrics', 'recentTrades'].map(id => [id, {textContent: '', innerHTML: ''}]));
  if (period !== null) nodes.dashPeriod = {value: period};
  if (tips) nodes.equityChartTitle = {textContent: 'Equity', innerHTML: '', querySelector() { return this.innerHTML.includes('<tip>') ? {} : null; }};
  const calls = [], cards = [], charts = new Map();
  const account = {id: 'a'};
  const context = vm.createContext({
    document: {getElementById: id => nodes[id] ?? null},
    getActiveAccount: () => account,
    getAccountTrades(id) { assert.equal(id, 'a'); return data; },
    syncAccountBalanceChrome(acct, trades) { assert.equal(acct, account); assert.equal(trades, data); return risk; },
    filterByPeriod(trades, selected) { assert.equal(trades, data); calls.push(['period', selected]); return data; },
    calcMetrics(trades, id) { assert.equal(trades, data); assert.equal(id, 'a'); return {
      totalPnl: 10, pf: Infinity, exp: 0.33, wr: 0.5, maxDD: 0.01, recovery: Infinity,
      closed: data, wins: data.filter(row => row.status === 'WIN'), losses: data.filter(row => row.status === 'LOSS'), bes: data.filter(row => row.status === 'BE'),
    }; },
    getAccountCurrentBalance() { calls.push('balance-fallback'); return 500; },
    getAccountCapitalBase() { calls.push('capital-fallback'); return 400; },
    t: (key, fallback) => fallback ?? key,
    TIPS: new Proxy({}, {get: (_, key) => key}),
    fR: value => `$${value.toFixed(2)}`,
    mkTip: value => `<tip>${value}</tip>`,
    mkCard(card) { cards.push(card); return `<card>${card.val}</card>`; },
    CHART_OPTS: {plugins: {}, scales: {y: {}}}, eqMode: mode,
    buildSignedEquityDataset: values => ({data: values}),
    mkChart(id, config) { charts.set(id, config); },
    renderRiskBoard(acct, trades) { assert.equal(acct, account); assert.equal(trades, data); calls.push('risk'); },
    renderDashStrategyBoard(trades) { assert.equal(trades, data); calls.push('strategies'); },
    renderDashboardCalendar(trades) { assert.equal(trades, data); calls.push('calendar'); },
    tradeRow(row, flag) { assert.equal(flag, false); return `<tr>${row.id}</tr>`; },
    updateTopbarStats() { calls.push('topbar'); },
  });
  const renderDashStrategyBoard = context.renderDashStrategyBoard;
  vm.runInContext(source, context);
  context.renderDashStrategyBoard = renderDashStrategyBoard;
  assert.equal(vm.runInContext('renderDashboard()', context), undefined);
  return {context, nodes, calls, cards, charts};
}

// Verifica subtitulo do periodo, os 4 KPIs principais, sequencia exata de chamada aos paineis
// auxiliares (`risk`, `strategies`, `calendar`, `topbar`), ordenacao decrescente dos trades recentes
// por data e imutabilidade do array `rows`.
test('dashboard preserves period, four cards, component calls and recent row order', () => {
  const before = JSON.stringify(rows);
  const {nodes, cards, calls} = harness();
  assert.equal(nodes.dashSub.textContent, '3 trades · dash.period.month · 3 fechados');
  assert.deepEqual(cards.map(card => card.val), ['+$10.00', '∞', '50.0%', '1.0%']);
  assert.match(cards[0].sub, /\$1010\.00/);
  assert.match(cards[3].sub, /recovery —/);
  assert.deepEqual(calls, [['period', 'month'], 'risk', 'strategies', 'calendar', 'topbar']);
  assert.equal(nodes.recentTrades.innerHTML, '<tr>be</tr><tr>later</tr><tr>earlier</tr>');
  assert.equal(JSON.stringify(rows), before);
});

// Valida a construcao da serie de equity: reversao da lista de trades fechados a partir do ponto
// `'Início'` com capital base (1000 -> 1000 -> 1020 -> 1010) e sua conversao para retorno percentual (`pct`).
test('dashboard preserves equity reversal and return percentage modes', () => {
  const values = harness().charts.get('equityChart').data;
  assert.deepEqual(Array.from(values.labels), ['Início', '2024-02-13', '2024-01-01', '2024-02-12']);
  assert.deepEqual(Array.from(values.datasets[0].data), [1000, 1000, 1020, 1010]);
  const pct = harness({mode: 'pct'}).charts.get('equityChart').data.datasets[0].data;
  assert.deepEqual(Array.from(pct), [0, 0, 2, 1]);
});

// Inspeciona todos os 7 graficos do dashboard: contagem de WIN/LOSS/BE, exclusao de `r: null` em
// `rBarChart`, agregacao por dia da semana, ordenacao cronologica mensal, truncamento de nome longo
// de estrategia + fallback `'—'`, e win rate por emocao com teto de escala em 100%.
test('seven charts keep trade counts, R filtering, monthly order, labels and emotion treatment', () => {
  const {charts} = harness();
  assert.deepEqual([...charts.keys()], ['equityChart', 'wlChart', 'rBarChart', 'wdayChart', 'monthEvChart', 'stratDashChart', 'emoDashChart']);
  const data = id => charts.get(id).data;
  assert.deepEqual(Array.from(data('wlChart').datasets[0].data), [1, 1, 1]);
  assert.deepEqual(Array.from(data('rBarChart').datasets[0].data), [-1, 2]);
  assert.deepEqual(Array.from(data('wdayChart').datasets[0].data), [0, 10, 0, 0, 0, 0, 0]);
  assert.deepEqual(Array.from(data('monthEvChart').labels), ['2024-01', '2024-02']);
  assert.deepEqual(Array.from(data('monthEvChart').datasets[0].data), [20, -10]);
  assert.deepEqual(Array.from(data('stratDashChart').labels), ['Long strategy name…', 'Setup', '—']);
  assert.deepEqual(Array.from(data('emoDashChart').datasets[0].data), [50, 0]);
  assert.equal(charts.get('emoDashChart').options.scales.y.max, 100);
});

// Testa casos de borda de estado vazio e nulos: seletor de periodo ausente assume `'all'`, `risk: null`
// aciona os fallbacks de saldo/capital base, tabela recente exibe `misc.noTrades`, mas saldo/capital `0`
// sao tratados como valores validos (sem acionar fallback por erro de falsiness).
test('missing period and risk use existing defaults and empty recent-trade message', () => {
  const {nodes, calls, charts} = harness({data: [], period: null, risk: null});
  assert.deepEqual(calls.slice(0, 3), [['period', 'all'], 'balance-fallback', 'capital-fallback']);
  assert.match(nodes.recentTrades.innerHTML, /misc.noTrades/);
  assert.deepEqual(Array.from(charts.get('equityChart').data.datasets[0].data), [400]);
  const zero = harness({risk: {currentBalance: 0, capitalBase: 0}});
  assert.ok(!zero.calls.includes('balance-fallback'));
  assert.equal(zero.charts.get('equityChart').data.datasets[0].data[0], 0);
});

// Confirma que tooltips opcionais nos titulos de grafico sao anexados apenas na primeira passagem
// e nao sao duplicados em chamadas subsequentes de `renderDashboard()`.
test('tooltips remain optional and are inserted only once across refreshes', () => {
  const {context, nodes} = harness({tips: true});
  const title = nodes.equityChartTitle.innerHTML;
  assert.equal(title, 'Equity <tip>equityChart</tip>');
  vm.runInContext('renderDashboard()', context);
  assert.equal(nodes.equityChartTitle.innerHTML, title);
});

// Garante que a tabela de operacoes recentes limita a exibicao aos 20 trades mais recentes
// mesmo quando a conta possui mais registros (25 no cenario), comecando pelo ultimo (`trade24`).
test('recent trade rendering retains its twenty-row cap', () => {
  const data = Array.from({length: 25}, (_, i) => ({id: `trade${i}`, date: `2024-02-${String(i + 1).padStart(2, '0')}`, pnl: 0, status: 'WIN'}));
  const {nodes} = harness({data});
  assert.equal((nodes.recentTrades.innerHTML.match(/<tr>/g) ?? []).length, 20);
  assert.match(nodes.recentTrades.innerHTML, /^<tr>trade24<\/tr>/);
});

// Valida em `index.html` o carregamento sincrono unico do modulo do dashboard antes de `app.js`.
test('dashboard loads once as a synchronous classic script before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)].filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
