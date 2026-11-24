/*
 * Objetivo:
 *   Validar toda a logica de horarios, duracoes e estatisticas temporais de trades
 *   (normalizacao de relogio, conversao para minutos, formatacao, calculo de duracao com
 *   virada de meia-noite/multiplos dias, estatisticas agregadas por status e estrategia,
 *   e isolamento da fabrica pura TradeDiaryTradeTiming).
 *
 * Modulos testados:
 *   - src/modules/trades/domain/trade-rules.js (fabrica TradeDiaryTradeTiming.createTradeTiming)
 *   - src/modules/data-transfer/infrastructure/trade-file-formats.js (normalizador de data usado na inicializacao)
 *   - app.js (inicializador tradeTimingDomain e wrappers globais legados)
 *
 * Estrategia de isolamento:
 *   Carrega trade-rules.js, o normalizador de datas e os wrappers extraidos de app.js dentro de
 *   um contexto node:vm limpo para testar a integracao via API global. Tambem carrega trade-rules.js
 *   isoladamente com getters armadilha em globals proibidos (document, localStorage, fetch, Chart)
 *   para comprovar pureza do dominio.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - normalizeClockTime aceita Date, 'H:MM:SS', 'H.MM.SS', 'HMM', preserva faixas frouxas legadas ('25:61')
 *     e rejeita texto invalido retornando ''.
 *   - formatClockMinutes faz wrap modular em 1440 minutos e arredondamento; formatDurationMinutes trata
 *     arredondamento para hora cheia e rejeita negativos/nao-finitos com '—'.
 *   - getTradeDurationMinutes lida com mesmo dia, virada de meia-noite, datas explicitas distintas,
 *     intervalos invalidos/invertidos (null), duracao zero e TypeError em null.
 *   - getTradeTimingStats considera apenas fechados, calcula medias por grupo/estrategia, usa
 *     'Sem estratégia' como fallback e preserva a imutabilidade dos dados de entrada.
 *   - O modulo de dominio carrega uma unica vez antes dos consumidores e mantem os 9 wrappers globais em app.js.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const modulePath = 'src/modules/trades/domain/trade-rules.js';
const moduleFile = path.join(root, modulePath);
const normalizerFile = path.join(root, 'src/modules/data-transfer/infrastructure/trade-file-formats.js');

// Utilitario para extrair uma fatia de codigo-fonte entre dois marcadores, falhando caso o trecho suma.
function between(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `missing source range: ${start}`);
  return source.slice(from, to);
}

// Helper de carregamento em VM: carrega trade-rules.js, o arquivo de formatos de data/hora,
// a linha `const tradeTimingDomain=...` e os 9 wrappers globais de app.js no mesmo contexto isolado.
function loadTiming() {
  const context = vm.createContext({});
  if (fs.existsSync(moduleFile)) {
    vm.runInContext(fs.readFileSync(moduleFile, 'utf8'), context, {filename: modulePath});
  }
  const names = ['normalizeClockTime', 'clockToMinutes', 'formatClockMinutes', 'formatDurationMinutes',
    'buildTradeDateTime', 'getTradeDurationMinutes', 'averageMinutes', 'summarizeTradeTimingGroup', 'getTradeTimingStats'];
  const initializer = appSource.match(/^const tradeTimingDomain=.*;$/m)?.[0];
  assert.ok(initializer, 'timing domain initializer must remain available');
  const wrappers = names.map(name => {
    const match = appSource.match(new RegExp(`^function ${name}\\([^\\n]*\\}[^\\S\\n]*$`, 'm'));
    assert.ok(match, `missing timing wrapper ${name}`);
    return match[0];
  });
  vm.runInContext([fs.readFileSync(normalizerFile, 'utf8'), initializer, ...wrappers].join('\n'), context, {filename: 'app.js#trade-timing'});
  return context;
}

// Converte valores produzidos dentro da VM em objetos planos do realm local para assert.deepEqual.
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

// Valida normalizeClockTime e clockToMinutes: null, formatos com ':', '.', sem separador ('930'),
// objetos Date criados no realm da VM, strings invalidas e preservacao de horarios legados fora de 24h ('25:61' -> 1561 min).
test('clock normalization preserves dates, supported text shapes and legacy loose ranges', () => {
  const api = loadTiming();
  assert.equal(api.normalizeClockTime(null), '');
  assert.equal(api.normalizeClockTime(' 9:05:44 '), '09:05');
  assert.equal(api.normalizeClockTime('9.07.30'), '09:07');
  assert.equal(api.normalizeClockTime('930'), '09:30');
  assert.equal(api.normalizeClockTime('25:61'), '25:61');
  assert.equal(api.normalizeClockTime('not a clock'), '');
  assert.equal(vm.runInContext('normalizeClockTime(new Date(2026, 0, 2, 9, 5))', api), '09:05');
  assert.equal(api.clockToMinutes('7:30'), 450);
  assert.equal(api.clockToMinutes('invalid'), null);
  assert.equal(api.clockToMinutes('25:61'), 1561);
});

// Valida formatClockMinutes e formatDurationMinutes: wrap negativo (-1 -> '23:59') e em 1440 ('00:00'),
// arredondamento (90.6 -> '01:31', 59.6 -> '1h'), horas exatas sem '0min' e fallback '—' para valores invalidos.
test('clock and duration formatting preserve rounding, wrapping and invalid fallbacks', () => {
  const api = loadTiming();
  assert.equal(api.formatClockMinutes(-1), '23:59');
  assert.equal(api.formatClockMinutes(1440), '00:00');
  assert.equal(api.formatClockMinutes(90.6), '01:31');
  assert.equal(api.formatClockMinutes(Infinity), '—');
  assert.equal(api.formatDurationMinutes(-1), '—');
  assert.equal(api.formatDurationMinutes(59.6), '1h');
  assert.equal(api.formatDurationMinutes(61), '1h 1min');
  assert.equal(api.formatDurationMinutes(120), '2h');
});

// Testa getTradeDurationMinutes em todos os cenarios: intraday, virada de meia-noite (23:30 -> 00:30 = 60 min),
// varios dias via exitDate explicita (1590 min), exitDate anterior a entrada (null), duracao 0, horario vazio (null)
// e erro TypeError ao receber null.
test('trade duration preserves same-day, midnight rollover, explicit dates and invalid ranges', () => {
  const api = loadTiming();
  assert.equal(api.getTradeDurationMinutes({date: '2026-01-02', openTime: '09:15', exitTime: '11:45'}), 150);
  assert.equal(api.getTradeDurationMinutes({date: '2026-01-02', openTime: '23:30', exitTime: '00:30'}), 60);
  assert.equal(api.getTradeDurationMinutes({date: '2026-01-02', exitDate: '2026-01-03', openTime: '09:15', exitTime: '11:45'}), 1590);
  assert.equal(api.getTradeDurationMinutes({date: '2026-01-03', exitDate: '2026-01-01', openTime: '09:15', exitTime: '08:45'}), null);
  assert.equal(api.getTradeDurationMinutes({date: '2026-01-02', openTime: '09:15', exitTime: '09:15'}), 0);
  assert.equal(api.getTradeDurationMinutes({date: '2026-01-02', openTime: '', exitTime: '09:15'}), null);
  assert.throws(() => api.getTradeDurationMinutes(null), {name: 'TypeError'});
});

// Valida getTradeTimingStats: exclui trades OPEN, calcula contagens e medias para overall, wins e losses
// (incluindo trades BE sem horarios que influenciam o denominador conforme regra atual), ordena estrategias
// por contagem decrescente e preserva a imutabilidade do array original.
test('timing statistics retain closed-status groups, averages and strategy ordering', () => {
  const api = loadTiming();
  const source = [
    {status: 'WIN', strategy: 'Alpha', date: '2026-01-02', placedTime: '09:00', openTime: '10:00', exitTime: '11:00'},
    {status: 'LOSS', strategy: 'Beta', date: '2026-01-02', placedTime: '08:00', openTime: '23:30', exitTime: '00:30'},
    {status: 'BE', strategy: 'Alpha', date: '2026-01-02', placedTime: '', openTime: '', exitTime: ''},
    {status: 'OPEN', strategy: 'Ignored', date: '2026-01-02', placedTime: '12:00', openTime: '12:00', exitTime: '13:00'},
  ];
  const before = JSON.stringify(source);
  const result = plain(api.getTradeTimingStats(source));
  assert.deepEqual(result.overall, {count: 3, avgPlacedMinutes: 340, avgOpenMinutes: 670, avgExitMinutes: 230, avgDurationMinutes: 40});
  assert.deepEqual(result.wins, {count: 1, avgPlacedMinutes: 540, avgOpenMinutes: 600, avgExitMinutes: 660, avgDurationMinutes: 60});
  assert.deepEqual(result.losses, {count: 1, avgPlacedMinutes: 480, avgOpenMinutes: 1410, avgExitMinutes: 30, avgDurationMinutes: 60});
  assert.deepEqual(result.byStrategy.map(row => [row.name, row.count]), [['Alpha', 2], ['Beta', 1]]);
  assert.equal(JSON.stringify(source), before);
});

// Casos de borda de getTradeTimingStats: entrada null retorna grupos zerados com medias null e byStrategy vazio;
// trade sem estrategia preenchida e agrupado sob o rotulo 'Sem estratégia'.
test('timing statistics preserve empty inputs and the missing-strategy label', () => {
  const api = loadTiming();
  assert.deepEqual(plain(api.getTradeTimingStats(null)), {
    overall: {count: 0, avgPlacedMinutes: null, avgOpenMinutes: null, avgExitMinutes: null, avgDurationMinutes: null},
    wins: {count: 0, avgPlacedMinutes: null, avgOpenMinutes: null, avgExitMinutes: null, avgDurationMinutes: null},
    losses: {count: 0, avgPlacedMinutes: null, avgOpenMinutes: null, avgExitMinutes: null, avgDurationMinutes: null},
    byStrategy: [],
  });
  const result = plain(api.getTradeTimingStats([{status: 'BE', strategy: '', date: '2026-01-02'}]));
  assert.deepEqual(result.byStrategy.map(row => [row.name, row.count]), [['Sem estratégia', 1]]);
});

// Prova pureza e encapsulamento de trade-rules.js: bloqueia acesso a DOM/storage/rede/Chart via getters,
// confirma os simbolos exatos expostos no escopo global e valida a fabrica createTradeTiming com normalizeDate injetado.
test('isolated timing domain exposes one factory without UI, storage or IO access', () => {
  const forbidden = ['document', 'localStorage', 'fetch', 'Chart'];
  const sandbox = {};
  for (const name of forbidden) Object.defineProperty(sandbox, name, {get() { throw new Error(`timing domain accessed ${name}`); }});
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(moduleFile, 'utf8'), context, {filename: modulePath});
  assert.deepEqual(Object.getOwnPropertyNames(context).filter(name => !forbidden.includes(name)), ['getMarket', 'normalizeDocImages', 'TradeDiaryTradeTiming']);
  assert.deepEqual(Object.keys(context.TradeDiaryTradeTiming), ['createTradeTiming']);
  const api = context.TradeDiaryTradeTiming.createTradeTiming({normalizeDate: value => String(value || '').slice(0, 10)});
  assert.deepEqual(Object.keys(api).sort(), [
    'averageMinutes', 'buildTradeDateTime', 'clockToMinutes', 'formatClockMinutes',
    'formatDurationMinutes', 'getTradeDurationMinutes', 'getTradeTimingStats',
    'normalizeClockTime', 'summarizeTradeTimingGroup',
  ]);
  assert.equal(api.getTradeDurationMinutes({date: '2026-01-02', openTime: '23:30', exitTime: '00:30'}), 60);
});

// Verifica no index.html que trade-rules.js carrega uma unica vez de forma sincrona antes dos consumidores
// de apresentacao (trade-form.js, analytics-workspace.js e app.js) e que todos os 9 wrappers globais seguem em app.js.
test('timing domain loads once before presentation consumers and legacy wrappers remain global', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const domainIndex = scripts.findIndex(script => script.src === modulePath);
  for (const consumer of [
    'src/modules/trades/presentation/trade-form.js',
    'src/modules/analytics/presentation/analytics-workspace.js',
    'src/modules/analytics/presentation/analytics-workspace.js',
    'app.js',
  ]) {
    assert.ok(domainIndex < scripts.findIndex(script => script.src === consumer));
  }
  for (const name of [
    'normalizeClockTime', 'clockToMinutes', 'formatClockMinutes', 'formatDurationMinutes',
    'buildTradeDateTime', 'getTradeDurationMinutes', 'averageMinutes',
    'summarizeTradeTimingGroup', 'getTradeTimingStats',
  ]) {
    assert.match(appSource, new RegExp(`^function ${name}\\(`, 'm'));
  }
});
