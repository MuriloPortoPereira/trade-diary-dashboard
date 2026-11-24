/*
 * Objetivo:
 *   Validar o mini-calendario mensal e o detalhamento semanal do dashboard
 *   (`renderDashboardCalendar`), assegurando corretude de calendario (incluindo anos
 *   bissextos), agregacao diaria/semanal de P/L, traducoes e protecoes contra alvos
 *   DOM ausentes.
 *
 * Modulo da aplicacao testado:
 *   - `src/modules/calendar/presentation/dashboard-calendar.js` (funcao
 *     `renderDashboardCalendar`)
 *   - Remocao da declaracao legada em `app.js` e ordem de carga em `index.html`
 *
 * Estrategia de isolamento:
 *   - Executa o arquivo inteiro do modulo dentro de `node:vm` com `Date` congelado em
 *     10/02/2024 (`FixedDate`) para tornar o destaque de "hoje" e o ano bissexto 100%
 *     deterministicos.
 *   - Injeta nos DOM simulados (`dashCalendarMonth`, `dashCalendarMini`,
 *     `dashWeekBreakdown`) e stubs de `getAnchorTradeDate`, `t` e `fR`.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Grade completa de 7 cabecalhos e 42 celulas, respeitando 29 dias em fevereiro
 *     de ano bissexto.
 *   - Soma de multiplos trades no mesmo dia, sinalizacao de ganho/perda (inclusive 0
 *     como ganho) e exclusao de outros meses.
 *   - Quebra em 5 semanas mantendo marcador vazio ("—") e imutabilidade dos dados de
 *     entrada.
 *   - Fallback seguro para entradas nao-array e independencia entre traducao dos dias
 *     e rotulo do mes.
 *   - Guard clause atomica: se qualquer um dos 3 elementos obrigatorios faltar, nada
 *     e lido ou alterado.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Confirma que `renderDashboardCalendar` foi removida de `app.js` e carrega o fonte
// do modulo extraido.
const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/calendar/presentation/dashboard-calendar.js';
const legacy = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/^function renderDashboardCalendar\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

// Auxiliar de renderizacao em sandbox: fixa a data corrente em 2024-02-10 12:00 (mes
// bissexto) atraves da subclasse `FixedDate`, prepara apenas os nos especificados em
// `visible` com estado sentinela `'before'` e registra as chamadas a
// `getAnchorTradeDate`.
function render(rows = [], {visible = ['dashCalendarMonth', 'dashCalendarMini', 'dashWeekBreakdown'], anchor = '2024-02-10'} = {}) {
  const nodes = Object.fromEntries(visible.map(id => [id, {innerHTML: 'before', textContent: 'before'}]));
  const calls = [];
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [2024, 1, 10, 12])); } }
  const context = vm.createContext({
    Date: FixedDate,
    document: {getElementById: id => nodes[id] ?? null},
    getAnchorTradeDate(data) { calls.push(data); return anchor; },
    t: (key, fallback) => fallback,
    fR: value => `$${value.toFixed(2)}`,
    rows,
  });
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('renderDashboardCalendar(rows)', context), undefined);
  return {nodes, calls, context};
}

// Fixture compartilhada: dois trades no dia ancora (10/02, liquido +8), perda no dia
// 16 (-20), zero no dia bissexto 29/02, trade de outro mes (01/03) que deve ser
// ignorado e registro sem data.
const rows = [
  {date: '2024-02-10', pnl: 10}, {date: '2024-02-10', pnl: -2},
  {date: '2024-02-16', pnl: -20}, {date: '2024-02-29', pnl: 0},
  {date: '2024-03-01', pnl: 100}, {pnl: 5},
];

// Verifica a ancora mensal em fevereiro de 2024 (bissexto): 7 cabecalhos, 42 celulas
// no grid, 29 dias clicaveis para abrir a pagina de calendario, destaque `today` no
// dia 10 com P/L somado (+$8.00), perda no dia 16, zero como `is-gain` no dia 29 e
// exclusao do trade de marco ($100.00).
test('dashboard calendar anchors the month and renders leap days with signed daily results', () => {
  const {nodes, calls} = render(rows);
  assert.equal(calls[0], rows);
  assert.equal(nodes.dashCalendarMonth.textContent, 'Fevereiro de 2024');
  const grid = nodes.dashCalendarMini.innerHTML;
  assert.equal((grid.match(/class="mini-cal-head"/g) ?? []).length, 7);
  assert.equal((grid.match(/class="dash-cal-cell /g) ?? []).length, 42);
  assert.equal((grid.match(/onclick="showPage\('calendar'\)"/g) ?? []).length, 29);
  assert.match(grid, /is-gain today[^]*?<strong>10<\/strong><span class="dash-cal-value">\+\$8\.00/);
  assert.match(grid, /is-loss[^]*?<strong>16<\/strong><span class="dash-cal-value">\$-20\.00/);
  assert.match(grid, /is-gain[^]*?<strong>29<\/strong><span class="dash-cal-value">\+\$0\.00/);
  assert.doesNotMatch(grid, /\$100\.00/);
});

// Valida o resumo semanal (5 linhas de semana): semana sem operacoes exibe travessao
// "—", semanas com lucro/perda/zero recebem classes e sinais corretos, e o array
// `rows` nao sofre mutacao.
test('weekly breakdown keeps empty markers and aggregated gain/loss totals', () => {
  const {nodes} = render(rows);
  const html = nodes.dashWeekBreakdown.innerHTML;
  assert.equal((html.match(/class="week-row"/g) ?? []).length, 5);
  assert.match(html, /Semana 1[^]*?text-green">—/);
  assert.match(html, /Semana 2[^]*?text-green">\+\$8\.00/);
  assert.match(html, /Semana 3[^]*?text-red">\$-20\.00/);
  assert.match(html, /Semana 5[^]*?text-green">\+\$0\.00/);
  assert.equal(JSON.stringify(rows), JSON.stringify([
    {date: '2024-02-10', pnl: 10}, {date: '2024-02-10', pnl: -2},
    {date: '2024-02-16', pnl: -20}, {date: '2024-02-29', pnl: 0},
    {date: '2024-03-01', pnl: 100}, {pnl: 5},
  ]));
});

// Confirma que entrada `null` e normalizada para lista vazia sem celulas de
// ganho/perda, e que a traducao dos cabecalhos de dia da semana via `t('day.sun')`
// funciona sem alterar o rotulo do mes.
test('non-array input becomes empty data while translated headings stay independent of month locale', () => {
  const {nodes, calls, context} = render(null);
  assert.equal(calls[0].length, 0);
  assert.doesNotMatch(nodes.dashCalendarMini.innerHTML, /is-gain|is-loss/);
  context.t = (key, fallback) => key === 'day.sun' ? 'Sun' : fallback;
  vm.runInContext('renderDashboardCalendar([])', context);
  assert.match(nodes.dashCalendarMini.innerHTML, /mini-cal-head">Sun/);
  assert.equal(nodes.dashCalendarMonth.textContent, 'Fevereiro de 2024');
});

// Testa a protecao atomica de elementos obrigatorios: removendo cada um dos 3 IDs por
// vez, `getAnchorTradeDate` nao deve ser chamada e os demais nos devem permanecer
// intactos (`'before'`).
test('every required target is guarded before reading anchor or changing other targets', () => {
  const ids = ['dashCalendarMonth', 'dashCalendarMini', 'dashWeekBreakdown'];
  for (const missing of ids) {
    const {nodes, calls} = render(rows, {visible: ids.filter(id => id !== missing)});
    assert.deepEqual(calls, []);
    for (const node of Object.values(nodes)) assert.deepEqual(node, {innerHTML: 'before', textContent: 'before'});
  }
});

// Verifica em `index.html` o carregamento sincrono unico do calendario do dashboard
// apos `analytics-workspace.js` e a disponibilidade de `calendar-page.js` antes de
// `app.js`.
test('dashboard calendar loads once after analytics and calendar is available before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)].filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf('src/modules/analytics/presentation/analytics-workspace.js') < html.indexOf(modulePath));
  assert.ok(html.indexOf('src/modules/calendar/presentation/calendar-page.js') < html.indexOf('src="app.js"'));
});
