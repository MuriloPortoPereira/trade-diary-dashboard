/*
 * Objetivo:
 *   Suite de caracterizacao dos insights comportamentais e alertas operacionais
 *   (`buildHesitationStats`, `buildDisciplineBuckets`,
 *   `getClosedTradesWithSubjectiveEmotion`, `getClosedTradesWithPlanTag` e
 *   `buildOperationalAlerts`), documentando e congelando regras de negocio sutis
 *   durante a migracao do codigo legado para o dominio de analytics.
 *
 * Modulo da aplicacao testado:
 *   - `src/modules/analytics/domain/calculate-trade-metrics.js` (metricas
 *     comportamentais puras)
 *   - Declaracoes de ponte/apresentacao em `app.js`,
 *     `src/modules/psychology/presentation/psychology-page.js` e
 *     `src/modules/notifications/presentation/notifications-page.js`
 *
 * Estrategia de isolamento:
 *   - Localiza cada funcao entre os arquivos de apresentacao/legado priorizando a
 *     versao mais recente (camada de apresentacao) e executa junto com
 *     `calculate-trade-metrics.js` em contexto `node:vm`.
 *   - No ultimo teste, cria uma sandbox com getters explosivos para `document`,
 *     `localStorage`, `fetch`, `Chart`, `trades`, `config` e `clamp` para provar
 *     pureza absoluta do modulo de dominio.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Calculo de hesitacao com coercao numerica de P/L e taxas inteiras baseadas
 *     apenas em trades decididos (WIN/LOSS).
 *   - Faixas de disciplina (0-20% ate 81-100%), clamping de extremos e preservacao de
 *     peculiaridades legadas de soma.
 *   - Filtros subjetivos (emocao e plano seguido) sensiveis a status fechado em caixa
 *     alta e espacos em branco.
 *   - Limiares de severidade dos alertas operacionais (0.55 warn, 0.80 danger),
 *     ordenacao estavel e deduplicacao de datas.
 *   - Independencia total do namespace `TradeDiaryTradeMetrics` em relacao a DOM,
 *     storage ou estado da aplicacao.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');

// Auxiliar conciso para ler arquivos relativos a raiz do repositorio em UTF-8.
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const metricsFile = 'src/modules/analytics/domain/calculate-trade-metrics.js';
const files = ['app.js', 'src/modules/psychology/presentation/psychology-page.js', 'src/modules/notifications/presentation/notifications-page.js'];
const names = ['buildHesitationStats', 'buildDisciplineBuckets', 'getClosedTradesWithSubjectiveEmotion', 'getClosedTradesWithPlanTag', 'buildOperationalAlerts'];

// Extrai cada declaracao de funcao procurada nos arquivos candidatos, priorizando a
// ultima ocorrencia encontrada para acompanhar a transicao segura de `app.js` para
// modulos dedicados.
const declarations = names.map(name => {
  const matches = files.map(read).map(source => source.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))).filter(Boolean);
  assert.ok(matches.length, `Missing ${name}`);

  // A camada de apresentacao prevalece enquanto a declaracao de origem esta sendo
  // removida de app.js.
  return matches.at(-1)[0];
}).join('\n');

// Normaliza objetos criados dentro da VM para objetos planos do realm do Node,
// evitando falhas de comparacao estrita (`assert.deepEqual`) causadas por prototipos
// de realms distintos.
const plain = value => JSON.parse(JSON.stringify(value));

// Monta um contexto `vm` limpo com `clamp`, carrega o modulo de metricas de dominio e
// as funcoes extraidas, permitindo injetar overrides especificos por teste.
function setup(overrides = {}) {
  const c = vm.createContext({clamp: (value, min, max) => Math.min(max, Math.max(min, value)), ...overrides});
  vm.runInContext(read(metricsFile), c);
  vm.runInContext(declarations, c);
  return c;
}

// Verifica `buildHesitationStats`: retorno zerado sem argumento, filtragem por
// truthiness de `hesitation` (aceitando `'yes'`, `true`, `1`), coercao de `pnl`
// (descartando invalidos/null), contagem de `BE` e `other` (status `OPEN` ou caixa
// baixa), taxas arredondadas sobre decididos e erro para `null`.
test('hesitation statistics preserve truthiness, numeric P/L coercion and decided-only integer rates', () => {
  const c = setup();
  assert.deepEqual(plain(c.buildHesitationStats()), {total: 0, wins: 0, losses: 0, breakeven: 0, other: 0, potentialPnl: 0, winRatePct: 0, lossRatePct: 0});
  const rows = [null, {hesitation: false, status: 'WIN', pnl: 900},
    {hesitation: 'yes', status: 'WIN', pnl: '2.5'}, {hesitation: true, status: 'LOSS', pnl: -1},
    {hesitation: 1, status: 'LOSS', pnl: 'invalid'}, {hesitation: true, status: 'BE'},
    {hesitation: true, status: 'OPEN', pnl: 3}, {hesitation: true, status: 'win', pnl: null}];
  assert.deepEqual(plain(c.buildHesitationStats(rows)), {total: 6, wins: 1, losses: 2, breakeven: 1, other: 2, potentialPnl: 4.5, winRatePct: 33, lossRatePct: 67});
  assert.throws(() => c.buildHesitationStats(null), /filter/);
});

// Caracteriza `buildDisciplineBuckets`: cinco faixas fixas de 20%, clamping de
// valores abaixo de 0 e acima de 100, fronteiras exatas (20 vs 20.1, etc.),
// arredondamento de media e preservacao proposital do comportamento legado de
// concatenacao quando `pnl` chega como string.
test('discipline buckets preserve boundaries, clamping, invalid inputs and raw P/L accumulation', () => {
  const c = setup();
  const empty = plain(c.buildDisciplineBuckets(null));
  assert.deepEqual(empty.map(b => [b.label, b.count, b.winRatePct, b.avgPnl]), ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'].map(label => [label, 0, null, null]));
  const rows = [null, {}, {discipline: null}, ...[-1, 20, 20.1, 40, 40.1, 60, 60.1, 80, 80.1, 120].map(discipline => ({discipline, status: 'WIN', pnl: 0.125}))];
  const result = plain(c.buildDisciplineBuckets(rows));
  assert.deepEqual(result.map(b => [b.count, b.wins, b.pnl, b.winRatePct, b.avgPnl]), Array(5).fill([2, 2, 0.25, 100, 0.13]));
  const odd = c.buildDisciplineBuckets([{discipline: 'invalid', status: 'BE', pnl: '2'}, {discipline: '', status: 'WIN', pnl: 3}, {discipline: false, status: 'LOSS'}])[0];
  assert.equal(odd.pnl, '0230');
  assert.equal(odd.avgPnl, 76.67);
  assert.equal(odd.winRatePct, 33.3);
});

// Valida os filtros de trades fechados com emocao subjetiva e tag de plano: somente
// status fechados em maiusculas (`WIN`, `LOSS`, `BE`), trim de espacos, exclusao de
// valores vazios/numericos invalidos (0), preservacao das referencias originais e
// retorno vazio para entradas ausentes ou invalidas.
test('subjective selections retain closed-status matching, trimming rules and row references', () => {
  const c = setup();
  const rows = [null, {status: 'WIN', emotion: ' calm ', followedPlan: ' sim '}, {status: 'LOSS', emotion: 2, followedPlan: 'nao'},
    {status: 'BE', emotion: ' ', followedPlan: 'parcial'}, {status: 'OPEN', emotion: 'calm', followedPlan: 'sim'},
    {status: 'win', emotion: 'calm', followedPlan: 'sim'}, {status: 'WIN', emotion: 0, followedPlan: 'Sim'}];
  assert.deepEqual(Array.from(c.getClosedTradesWithSubjectiveEmotion(rows)), [rows[1], rows[2]]);
  assert.deepEqual(Array.from(c.getClosedTradesWithPlanTag(rows)), [rows[1], rows[2], rows[3]]);
  for (const name of ['getClosedTradesWithSubjectiveEmotion', 'getClosedTradesWithPlanTag']) {
    assert.deepEqual(plain(c[name]()), []);
    assert.deepEqual(plain(c[name]({})), []);
  }
});

// Auxiliar especializado para `buildOperationalAlerts`: injeta mocks deterministicos
// de formatacao (`fR`, `fDate`), estado de risco diario/semanal
// (`calcAccountRiskState`), `preMarketData` e snapshots de estrategias
// (`getStrategySnapshots`).
function alertsSetup(dayUsage = 0.8, weekPnl = -12, strategies = []) {
  const c = setup({preMarketData: {}, fR: value => `money:${value}`, fDate: value => `date:${value}`,
    calcAccountRiskState: () => ({dayUsage, weekPnl, anchorLabel: 'hoje', dayLimit: 100, dayPnl: -20, currentDdPct: 0.12345}),
    getStrategySnapshots: () => strategies});
  return c;
}

// Testa os limiares exatos de severidade do alerta de risco diario (0.549 -> safe,
// 0.55/0.799 -> warn, 0.80 -> danger), a troca de mensagem a partir de 80% e os
// alertas obrigatorios de semana/drawdown.
test('operational alerts preserve severity thresholds, mandatory messages and stable sorting', () => {
  for (const [usage, tone] of [[0.549, 'safe'], [0.55, 'warn'], [0.799, 'warn'], [0.8, 'danger']]) {
    const c = alertsSetup(usage, 0);
    const alerts = c.buildOperationalAlerts({}, []);
    const risk = alerts.find(row => row.title === 'Risco diário');
    assert.equal(risk.tone, tone);
    assert.equal(risk.value, 'money:80');
    assert.equal(risk.summary, usage >= 0.8 ? `A sessão de hoje consumiu ${Math.round(usage * 100)}% do limite diário.` : `Uso atual do stop da sessão em ${Math.round(usage * 100)}% do permitido.`);
    const week = alerts.find(row => row.title === 'Semana operacional');
    assert.equal(week.summary, 'Semana positiva em +money:0.');
    assert.equal(week.value, 'DD 12.35%');
  }
});

// Exercita todos os alertas condicionais simultaneamente (estrategia pressionada,
// trades incompletos, hesitacao, losses sem documentacao, rotina nao registrada e
// melhor tracao), verificando a ordem por prioridade/tom, deduplicacao de datas com
// checklist, resumo de "+1 mais" e acao apontando para o mes mais antigo.
test('operational alerts retain optional conditions, date deduplication and oldest month action', () => {
  const c = alertsSetup(0.8, -12, [{name: 'A', n: 2, pnl: 10, wr: 50}, {name: 'B', n: 3, pnl: -4, wr: 33.3}]);
  const rows = ['2026-10-01', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'].map(date => ({date, status: 'LOSS', remarks: 'review'}));
  rows.push({date: '2026-11-05', status: 'LOSS', remarks: ' ', incomplete: true, hesitation: true});
  c.preMarketData['2026-11-05'] = {habits: []};
  const alerts = plain(c.buildOperationalAlerts({}, rows));
  assert.deepEqual(alerts.map(row => [row.tone, row.title]), [['danger', 'Risco diário'], ['warn', 'Semana operacional'], ['warn', 'Estratégia pressionada'], ['warn', 'Trades incompletos'], ['warn', 'Hesitação operacional'], ['info', 'Losses sem documentação'], ['info', 'Rotina não registrada'], ['safe', 'Melhor tração atual']]);
  assert.equal(alerts[2].summary, 'B está com 3 trades e resultado de money:-4.');
  assert.equal(alerts[2].value, 'WR 33%');
  assert.deepEqual(alerts[6], {tone: 'info', title: 'Rotina não registrada', summary: '5 dia(s) sem checklist: date:2026-11-04, date:2026-11-03, date:2026-11-02, date:2026-11-01 +1 mais.', value: 'Ir ao mês', actionFn: "openPMMonth('2026-10')", actionLabel: 'Abrir rotina'});
  assert.equal(alerts[7].value, '+money:10');
});

// Garante fronteira arquitetural limpa do modulo de dominio
// `calculate-trade-metrics.js`: ele deve carregar e executar todas as metricas
// comportamentais sem tocar em DOM, storage, rede, graficos, globais da aplicacao ou
// `clamp` externo, expondo apenas `TradeDiaryTradeMetrics`.
test('behavioral metrics load and execute without presentation, storage or application state', () => {
  const sandbox = {};
  for (const name of ['document', 'localStorage', 'fetch', 'Chart', 'trades', 'config', 'clamp']) {
    Object.defineProperty(sandbox, name, {get() {throw new Error(`domain accessed ${name}`);}});
  }
  const c = vm.createContext(sandbox);
  vm.runInContext(read(metricsFile), c);
  const metrics = c.TradeDiaryTradeMetrics;
  assert.equal(metrics.buildHesitationStats([{hesitation: true, status: 'WIN'}]).winRatePct, 100);
  assert.equal(metrics.buildDisciplineBuckets([{discipline: 101}])[4].count, 1);
  assert.equal(metrics.getClosedTradesWithSubjectiveEmotion([{status: 'BE', emotion: 'x'}]).length, 1);
  assert.equal(metrics.getClosedTradesWithPlanTag([{status: 'WIN', followedPlan: 'sim'}]).length, 1);
  assert.deepEqual(Object.keys(c), ['TradeDiaryTradeMetrics']);
});
