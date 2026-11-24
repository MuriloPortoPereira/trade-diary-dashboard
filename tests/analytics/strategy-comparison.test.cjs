/*
 * Objetivo:
 *   Validar o comparador lado a lado de estrategias (`renderStrategyCompareCards`),
 *   cobrindo guard clause do wrapper ausente, estado vazio de selecao, validacao contra
 *   comparacao da mesma estrategia consigo mesma e comparacao completa com 4 graficos e 3 resumos.
 *
 * Modulo da aplicacao testado:
 *   - `src/modules/analytics/presentation/analytics-workspace.js` (funcao `renderStrategyCompareCards`)
 *   - Remocao da declaracao legada em `app.js` e ordem de declaracao/carregamento em `index.html`
 *
 * Estrategia de isolamento:
 *   - Carrega `analytics-workspace.js` em `node:vm` com mocks de todos os 13 elementos do comparador
 *     e stubs deterministicos para metricas, timing, resultados, vencedores, curvas de equity,
 *     graficos (`mkChart`) e chips de resumo (`renderAnalysisSummary`).
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Ausencia do container raiz `stStratCompare` aborta imediatamente antes de ler selecoes ou metricas.
 *   - Com lista vazia ou selecao incompleta, oculta `stCmpFull`, exibe `stCmpEmpty` com orientacao,
 *     limpa os 3 resumos e nao cria graficos.
 *   - Selecionar a mesma estrategia em A e B mantem estado vazio orientativo mas ainda preenche os
 *     cards individuais `stCmpA` e `stCmpB` sem renderizar graficos comparativos.
 *   - Comparacao valida entre A e B exibe `stCmpFull`, marca o vencedor, gera insights, 4 graficos e 3 resumos.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Verifica que `renderStrategyCompareCards` foi removida de `app.js` e carrega `analytics-workspace.js`.
const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/analytics/presentation/analytics-workspace.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderStrategyCompareCards\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

// Confirma carregamento unico e sincrono classico antes de `app.js` em `index.html`, bem como
// a declaracao de `renderStrategyRows` antes de `renderStrategyCompareCards` no modulo.
test('strategy comparison loads once as a classic script after rows and before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src=\"${modulePath}\"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type=\"module\")\b/i);
  assert.ok(source.indexOf('function renderStrategyRows(') < source.indexOf('function renderStrategyCompareCards('));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src=\"app.js\"'));
});

// Fabrica um no DOM minimo com propriedades mutaveis para os containers do comparador.
function element(extra = {}) {
  return {style: {}, innerHTML: '', textContent: '', value: '', ...extra};
}

// Auxiliar de renderizacao do comparador: monta os elementos da UI (com `includeWrap` para testar
// o wrapper ausente), define 4 metricas comparativas (`pnl`, `exp`, `pf`, `maxDD`) e executa
// `renderStrategyCompareCards(rows)` registrando consultas ao DOM, resumos e graficos em `calls`.
function render({rows = [], selectedA = '', selectedB = '', includeWrap = true} = {}) {
  const elements = {
    stStratA: element({value: selectedA}),
    stStratB: element({value: selectedB}),
    stCmpCards: element(),
    stCmpInsights: element(),
    stCmpSummaryBody: element(),
    stCmpMetricExplain: element(),
    stCmpOutcomeExplain: element(),
    stCmpTimingExplain: element(),
    stCmpEmpty: element(),
    stCmpFull: element(),
    stCmpA: element(),
    stCmpB: element(),
  };
  if (includeWrap) elements.stStratCompare = element();
  const calls = [];
  const defs = [
    {key: 'pnl', label: 'P/L', better: 'higher', get: row => row.pnl, format: value => `${value}R`},
    {key: 'exp', label: 'Expectância', better: 'higher', get: row => row.exp, format: value => `${value}R`},
    {key: 'pf', label: 'Profit Factor', better: 'higher', get: row => row.pf, format: String},
    {key: 'maxDD', label: 'Drawdown', better: 'lower', get: row => row.maxDD, format: String},
  ];
  const context = vm.createContext({
    document: {
      getElementById(id) {
        calls.push(['get', id]);
        return elements[id] ?? null;
      },
    },
    escapeHtml: value => String(value),
    getStrategyCompareMetricDefs: () => defs,
    renderAnalysisSummary: (id, items) => calls.push(['summary', id, items]),
    getTradeTimingStats: () => ({overall: {avgOpenMinutes: 600, avgExitMinutes: 660, avgDurationMinutes: 60}}),
    formatClockMinutes: value => `${value}m`,
    formatDurationMinutes: value => `${value}min`,
    fR: value => Number(value).toFixed(2),
    fDate: value => `date:${value}`,
    getStrategyOutcomeStats: row => ({
      wins: row.wins, losses: row.n - row.wins, bes: 0,
      medianPnl: row.pnl, bestPnl: row.best, worstPnl: -1,
      winRatePct: 50, lossRatePct: 50, beRatePct: 0, avgWinPnl: 1,
    }),
    getDominantTimingWindow: () => ({label: '10:00', count: 2}),
    getStrategyMetricWinner: (def, a, b) => {
      const av = def.get(a);
      const bv = def.get(b);
      if (av === bv) return 'Empate';
      return def.better === 'lower' ? (av < bv ? a.name : b.name) : (av > bv ? a.name : b.name);
    },
    formatStrategyRatio: String,
    buildStrategyEquitySeries: row => ({points: [0, row.pnl]}),
    buildSignedEquityDataset: (data, options) => ({data, ...options}),
    mkChart: (id, config) => calls.push(['chart', id, config]),
    getStrategyCompareScores: () => [100, 50],
    CHART_OPTS: {plugins: {}, scales: {x: {ticks: {}}, y: {ticks: {}}}},
  });
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext('renderStrategyCompareCards(__rows)', vm.createContext({...context, __rows: rows}));
  return {elements, calls};
}

// Garante retorno imediato quando `stStratCompare` nao existe no DOM, sem consultar nenhum outro
// elemento nem disparar metricas ou graficos.
test('missing comparison wrapper returns before reading selections or metrics', () => {
  const {calls} = render({includeWrap: false});
  assert.deepEqual(calls, [['get', 'stStratCompare']]);
});

// Verifica o estado vazio (apenas A selecionada, sem linhas): mostra `stCmpEmpty` com a estrategia
// escolhida e "Aguardando seleção", oculta `stCmpFull`, limpa os 3 blocos de resumo e nao gera graficos.
test('empty rows preserve guidance, selected labels and cleared summaries', () => {
  const {elements, calls} = render({selectedA: 'Breakout'});
  assert.equal(elements.stStratCompare.style.display, 'block');
  assert.equal(elements.stCmpFull.style.display, 'none');
  assert.equal(elements.stCmpEmpty.style.display, 'grid');
  assert.match(elements.stCmpEmpty.innerHTML, /Breakout/);
  assert.match(elements.stCmpEmpty.innerHTML, /Aguardando seleção/);
  assert.match(elements.stCmpSummaryBody.innerHTML, /Selecione Estratégia A e Estratégia B/);
  assert.deepEqual(calls.filter(call => call[0] === 'summary').map(call => [call[1], call[2].length]), [
    ['stCmpMetricSummary', 0],
    ['stCmpOutcomeSummary', 0],
    ['stCmpTimingSummary', 0],
  ]);
  assert.equal(calls.some(call => call[0] === 'chart'), false);
});

// Testa o caso de borda de comparar a mesma estrategia em A e B: orienta o usuario a escolher
// "duas estratégias diferentes", preenche ambos os cards detalhados (`stCmpA` e `stCmpB`) e pula graficos.
test('same strategy keeps the empty state and renders both detail cards', () => {
  const row = {name: 'Breakout', n: 4, wins: 2, pnl: 1, best: 2, lastDate: '2026-01-01', trades: []};
  const {elements, calls} = render({rows: [row], selectedA: row.name, selectedB: row.name});
  assert.match(elements.stCmpEmpty.innerHTML, /duas estratégias diferentes/);
  assert.match(elements.stCmpA.innerHTML, /Estratégia A: Breakout/);
  assert.match(elements.stCmpB.innerHTML, /Estratégia B: Breakout/);
  assert.equal(calls.some(call => call[0] === 'chart'), false);
});

// Exercita a comparacao completa entre `'Breakout'` e `'Pullback'`: exibe o grid completo,
// preenche os cards, destaca `'Breakout'` como vencedor nos insights e tabela, e instancia os
// 4 graficos (`Equity`, `MetricBars`, `Outcome`, `Timing`) e os 3 resumos de analise.
test('complete comparison preserves cards, winners, summaries and four charts', () => {
  const rows = [
    {name: 'Breakout', n: 12, wins: 7, pnl: 5, exp: 0.4, pf: 2, maxDD: 0.1, best: 2, lastDate: '2026-01-02', trades: []},
    {name: 'Pullback', n: 10, wins: 5, pnl: 2, exp: 0.2, pf: 1.5, maxDD: 0.2, best: 1.5, lastDate: '2026-01-01', trades: []},
  ];
  const {elements, calls} = render({rows, selectedA: 'Breakout', selectedB: 'Pullback'});
  assert.equal(elements.stCmpEmpty.style.display, 'none');
  assert.equal(elements.stCmpFull.style.display, 'grid');
  assert.match(elements.stCmpCards.innerHTML, /Breakout/);
  assert.match(elements.stCmpCards.innerHTML, /Pullback/);
  assert.match(elements.stCmpSummaryBody.innerHTML, /strategy-compare-winner">Breakout/);
  assert.match(elements.stCmpInsights.textContent, /Breakout lidera/);
  assert.deepEqual(calls.filter(call => call[0] === 'chart').map(call => call[1]), [
    'stCmpEquityChart',
    'stCmpMetricBarsChart',
    'stCmpOutcomeChart',
    'stCmpTimingChart',
  ]);
  assert.deepEqual(calls.filter(call => call[0] === 'summary').map(call => call[1]), [
    'stCmpMetricSummary',
    'stCmpOutcomeSummary',
    'stCmpTimingSummary',
  ]);
});
