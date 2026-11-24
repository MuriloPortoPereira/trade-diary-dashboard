/*
 * Objetivo do arquivo:
 *   Validar a renderizacao principal da pagina de calendario (renderCalendar) em
 *   todos os seus modos de exibicao (mensal, semanal, quinzenal e fallback legado),
 *   incluindo ano bissexto (fevereiro/2024 com 29 dias), cartoes de metricas e i18n.
 *
 * Modulo/arquivo testado:
 *   Funcao renderCalendar em src/modules/calendar/presentation/calendar-page.js
 *   (confirmando que a declaracao legada foi removida de app.js).
 *
 * Estrategia de isolamento:
 *   Executa renderCalendar em uma sandbox node:vm com Date fixo em 10/02/2024, nos
 *   DOM simulados (calStats, calTitle, calGridWrap) e stubs espiados para
 *   syncCalPicker, t(), getActiveAccount, getAccountTrades, calcMetrics e mkCard.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Grade mensal de 42 celulas com 29 dias clicaveis em ano bissexto, marcacao de
 *     'today', classes win/loss e filtragem correta de trades fora do mes/sem data.
 *   - Grade semanal alinhada com 5 semanas (35 slots) e totalizadores por semana.
 *   - Grade quinzenal dividida em 1a Quinzena (1-15) e 2a Quinzena (16-29) com
 *     totais.
 *   - Modos vazios preservam todos os dias clicaveis sem badges de P/L e sem mutar
 *     rows.
 *   - Modo desconhecido cai no fallback quinzenal e traducoes t() sao lidas a cada
 *     render.
 *   - Carregamento sincrono unico antes de notifications-page.js no index.html.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/calendar/presentation/calendar-page.js';
const legacy = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/^function renderCalendar\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const moduleSource = fs.readFileSync(path.join(root, modulePath), 'utf8');
const source = ["renderCalendar"].map(name => moduleSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))[0]).join('\n\n');

// Monta a sandbox vm fixando o "hoje" em 10/02/2024 (ano bissexto), executa
// renderCalendar() verificando retorno true e devolve os nos renderizados, chamadas
// registradas e cartoes gerados.
function harness(mode = 'month', rows = []) {
  const nodes = Object.fromEntries(['calStats', 'calTitle', 'calGridWrap'].map(id => [id, {innerHTML: '', textContent: ''}]));
  const calls = [], cards = [];
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [2024, 1, 10, 12])); } }
  const context = vm.createContext({
    Date: FixedDate, calYear: 2024, calMonth: 1, calViewMode: mode,
    document: {getElementById: id => nodes[id]},
    syncCalPicker() { calls.push('picker'); },
    t: (key, fallback) => fallback,
    getActiveAccount: () => ({id: 'account-a'}),
    getAccountTrades(id) { calls.push(['account', id]); return rows; },
    calcMetrics(data, id) {
      calls.push(['metrics', data.map(row => row.id), id]);
      return {totalPnl: -5, wr: 0.5, closed: data, pf: Infinity, maxDD: 0.1, exp: -0.25};
    },
    TIPS: {pnl: 'pnl', wr: 'wr', pf: 'pf', dd: 'dd', exp: 'exp'},
    fR: value => `$${value.toFixed(2)}`,
    mkCard(card) { cards.push(card); return `<card>${card.lbl}:${card.val}</card>`; },
  });
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('renderCalendar()', context), true);
  return {nodes, calls, cards, context};
}

// Conjunto de trades de referencia para fevereiro/2024 cobrindo ganho no dia atual,
// perda na 2a quinzena, dia bissexto (29/02), trade fora do mes (01/03) e trade sem
// data.
const rows = [
  {id: 'gain', date: '2024-02-10', pnl: 10},
  {id: 'loss', date: '2024-02-16', pnl: -20},
  {id: 'last', date: '2024-02-29', pnl: 3},
  {id: 'outside', date: '2024-03-01', pnl: 100},
  {id: 'undated'},
];

// Valida a visao mensal ('month'): titulo em portugues, 29 dias clicaveis em grade de
// 42 celulas, classes today/win/loss, exibicao do dia 29, ordem picker -> account ->
// metrics e formatacao dos 6 cartoes superiores (incluindo pf Infinity -> '—').
test('month view preserves leap days, today, signed totals and day handlers', () => {
  const {nodes, calls, cards} = harness('month', rows);
  assert.equal(nodes.calTitle.textContent, 'Fevereiro 2024');
  const grid = nodes.calGridWrap.innerHTML;
  assert.equal((grid.match(/onclick="showCalDay\(/g) ?? []).length, 29);
  assert.equal((grid.match(/class="cal-day(?: |")/g) ?? []).length, 42);
  assert.match(grid, /class="cal-day today has-trade win" onclick="showCalDay\(10\)"/);
  assert.match(grid, /class="cal-day has-trade loss" onclick="showCalDay\(16\)"/);
  assert.match(grid, /showCalDay\(29\)[^]*\+\$3\.00/);
  assert.deepEqual(calls, ['picker', ['account', 'account-a'], ['metrics', ['gain', 'loss'], 'account-a']]);
  assert.deepEqual(cards.map(card => card.val), ['$-5.00', '50.0%', 2, '—', '10.0%', '-0.25R']);
});

// Valida a visao semanal ('week'): titulo 'Mensal — Fevereiro 2024', 5 linhas
// semanais (35 slots) e totais semanais vazios ('—'), positivos (+$10.00, +$3.00) e
// negativos ($-20.00).
test('week view preserves aligned weeks, empty totals and gain/loss totals', () => {
  const {nodes} = harness('week', rows);
  assert.equal(nodes.calTitle.textContent, 'Mensal — Fevereiro 2024');
  const grid = nodes.calGridWrap.innerHTML;
  assert.equal((grid.match(/class="cal-week-label"/g) ?? []).length, 5);
  assert.equal((grid.match(/class="cal-week-slot"/g) ?? []).length, 35);
  assert.match(grid, /cal-week-total text-green">—/);
  assert.match(grid, /cal-week-total text-green">\+\$10\.00/);
  assert.match(grid, /cal-week-total text-red">\$-20\.00/);
  assert.match(grid, /cal-week-total text-green">\+\$3\.00/);
});

// Valida a visao quinzenal ('biweek'): separa 1a Quinzena (1-15) e 2a Quinzena
// (16-29) com contagem de trades e somatorio de P/L (+$10.00 na 1a e $-17.00 na 2a).
test('biweek view preserves both ranges, trade counts and totals', () => {
  const {nodes} = harness('biweek', rows);
  const grid = nodes.calGridWrap.innerHTML;
  assert.equal(nodes.calTitle.textContent, 'Quinzenal — Fevereiro 2024');
  assert.equal((grid.match(/onclick="showCalDay\(/g) ?? []).length, 29);
  assert.match(grid, /1ª Quinzena \(1–15\)/);
  assert.match(grid, /2ª Quinzena \(16–29\)/);
  assert.match(grid, /1 trades · \+\$10\.00/);
  assert.match(grid, /2 trades · \$-17\.00/);
});

// Garante que os tres modos sem trades renderizam todos os 29 dias sem elementos
// cal-pnl e que a renderizacao com dados nunca muta o array rows recebido.
test('empty views keep dates and neutral period markers without mutating rows', () => {
  for (const mode of ['month', 'week', 'biweek']) {
    const {nodes} = harness(mode);
    assert.equal((nodes.calGridWrap.innerHTML.match(/onclick="showCalDay\(/g) ?? []).length, 29);
    assert.doesNotMatch(nodes.calGridWrap.innerHTML, /cal-pnl/);
  }
  const before = JSON.stringify(rows);
  harness('biweek', rows);
  assert.equal(JSON.stringify(rows), before);
});

// Confirma fallback legado para grade quinzenal quando calViewMode e desconhecido e
// que mudancas dinamicas na funcao de traducao t() refletem imediatamente na proxima
// chamada.
test('unknown view keeps the legacy fortnight fallback and translations are read per call', () => {
  const {context, nodes} = harness('unknown');
  assert.match(nodes.calGridWrap.innerHTML, /cal-biweek-grid/);
  context.t = (key, fallback) => key === 'month.feb' ? 'February' : fallback;
  vm.runInContext('calViewMode="month"; renderCalendar()', context);
  assert.equal(nodes.calTitle.textContent, 'February 2024');
});

// Verifica no index.html que calendar-page.js e carregado uma vez como script
// sincrono antes de notifications-page.js.
test('calendar loads once as a synchronous classic script before notifications', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)].filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src/modules/notifications/presentation/notifications-page.js'));
});
