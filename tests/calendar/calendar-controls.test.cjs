/*
 * Objetivo do arquivo:
 *   Testar os controles interativos do modulo de calendario: navegacao mensal com
 *   virada de ano (calNav), selecao direta de mes (calGoToMonth), sincronizacao do
 *   input picker (syncCalPicker), alternancia de visao (setCalView) e detalhamento de
 *   trades de um dia especifico (showCalDay).
 *
 * Modulo/arquivo testado:
 *   Funcoes calNav, calGoToMonth, syncCalPicker, setCalView e showCalDay em
 *   src/modules/calendar/presentation/calendar-page.js (garantindo ausencia em
 *   app.js).
 *
 * Estrategia de isolamento:
 *   Extrai as cinco funcoes de controle e executa-as em uma sandbox node:vm com nos
 *   DOM simulados (permitindo omitir controles opcionais via parametro missing),
 *   rastreamento de chamadas classList.toggle e stubs para renderCalendar,
 *   getAccountTrades, fDate e fR.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Virada de dezembro -> janeiro e janeiro -> dezembro sincronizando o picker
 *     antes de renderizar.
 *   - calGoToMonth ignora entradas vazias/null e preserva a semantica parseInt
 *     (incluindo NaN).
 *   - syncCalPicker e setCalView toleram botoes/picker ausentes no DOM sem lancar
 *     erro.
 *   - showCalDay filtra estritamente por data da conta ativa sem mutar o array de
 *     entrada, mantem ordem original, trata preco 0 como '—', R nao finito e status
 *     OPEN.
 *   - Dia sem trades oculta calDayDetail preservando titulo e tabela anteriores.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/calendar/presentation/calendar-page.js';
const names = ['calNav', 'calGoToMonth', 'syncCalPicker', 'setCalView', 'showCalDay'];
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const declarations = names.map(name => app.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
assert.ok(declarations.every(declaration => declaration === undefined), 'legacy declarations must be moved');
const moduleSource = fs.readFileSync(path.join(root, modulePath), 'utf8');
const source = ["calNav", "calGoToMonth", "syncCalPicker", "setCalView", "showCalDay"].map(name => moduleSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))[0]).join('\n\n');

// Cria o ambiente de teste vm com controles do calendario (com suporte a omitir IDs
// em missing), estado inicial em fevereiro/2024 e rastreamento de toggles e chamadas.
function harness(rows = [], missing = []) {
  const calls = [], toggles = [];
  const ids = ['calMonthPicker', 'calDayDetail', 'calDayTitle', 'calDayTbody', 'calBtnMonth', 'calBtnWeek', 'calBtnBiweek'];
  const nodes = Object.fromEntries(ids.filter(id => !missing.includes(id)).map(id => [id, {value: '', textContent: 'before', innerHTML: 'before', style: {display: 'before'}, classList: {toggle(name, active) { toggles.push([id, name, active]); }}}]));
  const context = vm.createContext({
    calYear: 2024, calMonth: 1, calViewMode: 'week', activeAccountId: 'account-a',
    document: {getElementById: id => nodes[id] ?? null},
    renderCalendar() { calls.push(['render', context.calYear, context.calMonth, context.calViewMode, nodes.calMonthPicker?.value]); },
    getAccountTrades(id) { calls.push(['trades', id]); return rows; },
    fDate: date => date, fR: value => `$${value.toFixed(2)}`,
  });
  vm.runInContext(source, context);
  return {context, nodes, calls, toggles};
}

// Verifica que calNav(+1) em dezembro/2026 avanca para janeiro/2027 (2027-01) e
// calNav(-1) volta para dezembro/2026 (2026-12), atualizando o picker antes de chamar
// renderCalendar.
test('calendar navigation crosses years and synchronizes picker before rendering', () => {
  const {context, nodes, calls} = harness();
  vm.runInContext('calYear=2026; calMonth=11; calNav(1); calNav(-1)', context);
  assert.deepEqual(calls, [['render', 2027, 0, 'week', '2027-01'], ['render', 2026, 11, 'week', '2026-12']]);
  assert.equal(nodes.calMonthPicker.value, '2026-12');
  assert.equal(vm.runInContext('calNav(0)', context), undefined);
});

// Valida calGoToMonth: entradas vazias/null sao ignoradas sem renderizar; strings com
// sufixo ('2025-03extra') seguem parseInt (mes 0-based = 2); entrada invalida produz
// NaN.
test('month selection preserves empty no-op and parseInt behavior before render', () => {
  const {context, calls} = harness();
  vm.runInContext('calGoToMonth(""); calGoToMonth(null)', context);
  assert.deepEqual(calls, []);
  vm.runInContext('calGoToMonth("2025-03extra")', context);
  assert.equal(context.calYear, 2025);
  assert.equal(context.calMonth, 2);
  assert.equal(calls.length, 1);
  vm.runInContext('calGoToMonth("invalid")', context);
  assert.ok(Number.isNaN(context.calYear));
  assert.ok(Number.isNaN(context.calMonth));
});

// Garante tolerancia a elementos opcionais ausentes (calMonthPicker e calBtnMonth) ao
// chamar syncCalPicker e setCalView, inclusive desativando todos os botoes para modo
// desconhecido.
test('picker sync and mode toggles tolerate optional controls without changing API', () => {
  const {context, calls, toggles} = harness([], ['calMonthPicker', 'calBtnMonth']);
  vm.runInContext('syncCalPicker(); setCalView("biweek")', context);
  assert.equal(context.calViewMode, 'biweek');
  assert.deepEqual(toggles, [['calBtnWeek', 'active', false], ['calBtnBiweek', 'active', true]]);
  assert.equal(calls.length, 1);
  vm.runInContext('setCalView("unknown")', context);
  assert.equal(context.calViewMode, 'unknown');
  assert.deepEqual(toggles.slice(-2).map(item => item[2]), [false, false]);
});

// Testa showCalDay(9) em fevereiro/2024: filtra apenas trades de 2024-02-09
// preservando ordem, renderiza titulo com contagem, placeholder '—' para entry=0,
// sinais +/- em R e P/L, sem mutar rows.
test('day detail preserves date/account filter, row order, signs and zero-price placeholders', () => {
  const rows = [
    {date: '2024-02-09', symbol: 'FIRST', direction: 'BUY', entry: 0, exit: 2, r: 1.5, pnl: 12, emotion: 'Calmo', status: 'WIN'},
    {date: '2024-02-10', symbol: 'OTHER'},
    {date: '2024-02-09', symbol: 'SECOND', direction: 'SELL', r: -1, pnl: -5, status: 'LOSS'},
  ];
  const before = JSON.stringify(rows);
  const {context, nodes, calls} = harness(rows);
  assert.equal(vm.runInContext('showCalDay(9)', context), undefined);
  assert.deepEqual(calls, [['trades', 'account-a']]);
  assert.equal(nodes.calDayTitle.textContent, 'Trades de 2024-02-09 (2)');
  assert.equal(nodes.calDayDetail.style.display, 'block');
  const html = nodes.calDayTbody.innerHTML;
  assert.equal((html.match(/<tr>/g) ?? []).length, 2);
  assert.ok(html.indexOf('FIRST') < html.indexOf('SECOND'));
  assert.doesNotMatch(html, /OTHER/);
  assert.match(html, /badge buy/);
  assert.match(html, /class="mono">—<\/td><td class="mono">2/);
  assert.match(html, /\+1\.50R/);
  assert.match(html, /-1\.00R/);
  assert.match(html, /\+\$12\.00/);
  assert.match(html, /\$-5\.00/);
  assert.equal(JSON.stringify(rows), before);
});

// Verifica os fallbacks para campos ausentes ou nao finitos no detalhe diario: status
// padrao OPEN, R=Infinity renderizado como '—' e P/L zero exibido como '+$0.00'.
test('day detail keeps OPEN and missing/nonfinite value fallbacks', () => {
  const {context, nodes} = harness([{date: '2024-02-09', symbol: 'MISSING', r: Infinity, pnl: 0}]);
  vm.runInContext('showCalDay(9)', context);
  assert.match(nodes.calDayTbody.innerHTML, /badge open">OPEN/);
  assert.match(nodes.calDayTbody.innerHTML, /text-green">—/);
  assert.match(nodes.calDayTbody.innerHTML, /\+\$0\.00/);
});

// Quando nao ha trades no dia selecionado, oculta o painel (display='none') sem
// sobrescrever o titulo nem o HTML previo do corpo da tabela.
test('empty day hides detail while preserving prior title and table', () => {
  const {context, nodes} = harness();
  vm.runInContext('showCalDay(9)', context);
  assert.equal(nodes.calDayDetail.style.display, 'none');
  assert.equal(nodes.calDayTitle.textContent, 'before');
  assert.equal(nodes.calDayTbody.innerHTML, 'before');
});

// Confirma no index.html que calendar-page.js aparece uma unica vez como script
// sincrono antes de app.js.
test('calendar controls loads once as a synchronous classic script before calendar renderer', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)].filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
