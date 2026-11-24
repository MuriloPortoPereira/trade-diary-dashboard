/*
 * Objetivo:
 *   Validar os controles interativos da tabela do historico de trades: ordenacao de
 *   colunas (sortLog), limpeza do intervalo de datas (clearLogDateRange) e
 *   gerenciamento de selecao de linhas (toggleSelectAll, toggleRowSelect e
 *   clearSelection).
 *
 * Modulo testado:
 *   src/modules/trades/presentation/trade-log.js (funcoes sortLog, clearLogDateRange,
 *   toggleSelectAll, toggleRowSelect e clearSelection, alem da garantia de migracao
 *   do legado em app.js e carregamento sincrono no index.html).
 *
 * Estrategia de isolamento:
 *   Executa o modulo em contexto node:vm com mocks leves de linhas (`tr` com
 *   classList), checkboxes com `closest('tr')`, indicadores de ordenacao `.sort-ind`
 *   e inputs de filtro. Sobrescreve renderLog e updateBulkBar apos carregar o script
 *   para registrar chamadas sem disparar renderizacoes completas.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - sortLog alterna direcao na mesma coluna, usa 'desc' como padrao para 'date' e
 *     'asc' para demais colunas, limpa indicadores antigos, aplica seta no indicador
 *     atual e chama renderLog.
 *   - clearLogDateRange limpa os inputs opcionais de data e sempre re-renderiza o
 *     log.
 *   - toggleSelectAll sincroniza checkboxes visiveis, classe 'selected' nas linhas, o
 *     Set selectedTrades (preservando IDs de outras paginas/filtros ao
 *     marcar/desmarcar) e atualiza a barra em lote.
 *   - toggleRowSelect adiciona/remove um unico ID e tolera ausencia de linha
 *     ancestral (`closest` null).
 *   - clearSelection esvazia o Set, desmarca checkboxes/linhas e chkAll opcional, e
 *     atualiza a barra em lote.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/trades/presentation/trade-log.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const names = ['sortLog', 'clearLogDateRange', 'toggleSelectAll', 'toggleRowSelect', 'clearSelection'];
const legacyParts = names.map(name => appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const legacy = legacyParts.every(Boolean) ? legacyParts.join('\n\n') : undefined;
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

// Fabrica de linha de tabela simulada (`tr`) com implementacao minima de classList
// suportando toggle, remove e contains para inspecionar a classe 'selected'.
function row() {
  const classes = new Set();
  return {classList: {
    toggle(name, force) { if (force) classes.add(name); else classes.delete(name); },
    remove: name => classes.delete(name),
    contains: name => classes.has(name),
  }};
}

// Fabrica de checkbox de linha simulado com dataset.id e metodo closest('tr')
// apontando para a linha pai.
function checkbox(id, checked = false, parent = row()) {
  return {checked, dataset: {id}, closest: selector => selector === 'tr' ? parent : null, parent};
}

// Helper de ambiente em VM: prepara sortState, selectedTrades, indicadores de
// ordenacao, filtros de data, chkAll e logTbody. Reatribui renderLog e updateBulkBar
// apos runInContext para espionar as chamadas de sincronizacao da pagina.
function setup({sortState = {col: 'date', dir: 'desc'}, selected = [], checkboxes = []} = {}) {
  const indicators = [{textContent: 'old'}, {textContent: 'old'}];
  const elements = {
    'si-date': {textContent: '↓'},
    'si-symbol': {textContent: ''},
    filterDateStart: {value: '2026-01-01'},
    filterDateEnd: {value: '2026-01-31'},
    chkAll: {checked: true},
    logTbody: {querySelectorAll: selector => selector === 'input[type=checkbox]' ? checkboxes : []},
  };
  const calls = [];
  const context = vm.createContext({
    sortState,
    selectedTrades: new Set(selected),
    document: {
      getElementById: id => elements[id] ?? null,
      querySelectorAll: selector => selector === '.sort-ind' ? indicators : checkboxes,
    },
    renderLog: () => calls.push('renderLog'),
    updateBulkBar: () => calls.push('updateBulkBar'),
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#trade-log-controls' : modulePath});
  context.renderLog = () => calls.push('renderLog');
  context.updateBulkBar = () => calls.push('updateBulkBar');
  return {context, elements, indicators, calls};
}

// Valida troca para nova coluna em sortLog: colunas comuns comecam em 'asc' ('↑'),
// 'date' comeca em 'desc' ('↓'), todos os indicadores .sort-ind anteriores sao limpos
// e renderLog e chamado.
test('sorting a new column preserves defaults, indicators and render order', () => {
  const {context, elements, indicators, calls} = setup();
  context.sortLog('symbol');
  assert.equal(context.sortState.col, 'symbol');
  assert.equal(context.sortState.dir, 'asc');
  assert.deepEqual(indicators.map(item => item.textContent), ['', '']);
  assert.equal(elements['si-symbol'].textContent, '↑');
  assert.deepEqual(calls, ['renderLog']);
  context.sortLog('date');
  assert.equal(context.sortState.dir, 'desc');
  assert.equal(elements['si-date'].textContent, '↓');
});

// Testa alternancia de direcao na mesma coluna ('asc' -> 'desc') e caso de borda com
// coluna sem elemento indicador correspondente no DOM ('unknown'), garantindo que
// renderLog ainda rode.
test('sorting the same column toggles direction and tolerates a missing indicator', () => {
  const {context, elements, calls} = setup({sortState: {col: 'symbol', dir: 'asc'}});
  context.sortLog('symbol');
  assert.equal(context.sortState.dir, 'desc');
  assert.equal(elements['si-symbol'].textContent, '↓');
  context.sortLog('unknown');
  assert.equal(context.sortState.col, 'unknown');
  assert.equal(context.sortState.dir, 'asc');
  assert.deepEqual(calls, ['renderLog', 'renderLog']);
});

// Valida clearLogDateRange com inputs presentes (zera inicio e fim) e ausentes (nao
// falha), garantindo disparo de renderLog em ambos os casos.
test('clearing the date range keeps optional controls and always rerenders', () => {
  const present = setup();
  present.context.clearLogDateRange();
  assert.equal(present.elements.filterDateStart.value, '');
  assert.equal(present.elements.filterDateEnd.value, '');
  assert.deepEqual(present.calls, ['renderLog']);
  delete present.elements.filterDateStart;
  delete present.elements.filterDateEnd;
  present.context.clearLogDateRange();
  assert.deepEqual(present.calls, ['renderLog', 'renderLog']);
});

// Verifica toggleSelectAll ao marcar e desmarcar todos os checkboxes visiveis:
// aplica/remove classe 'selected' nas linhas, preserva IDs preexistentes fora da
// tabela ('old') no Set selectedTrades e chama updateBulkBar a cada alternancia.
test('select all synchronizes checkboxes, rows, ids and the bulk bar', () => {
  const first = checkbox('a');
  const second = checkbox('b');
  const {context, calls} = setup({selected: ['old'], checkboxes: [first, second]});
  context.toggleSelectAll({checked: true});
  assert.equal(first.checked, true);
  assert.equal(second.checked, true);
  assert.equal(first.parent.classList.contains('selected'), true);
  assert.deepEqual([...context.selectedTrades], ['old', 'a', 'b']);
  context.toggleSelectAll({checked: false});
  assert.equal(first.parent.classList.contains('selected'), false);
  assert.deepEqual([...context.selectedTrades], ['old']);
  assert.deepEqual(calls, ['updateBulkBar', 'updateBulkBar']);
});

// Testa selecao individual via toggleRowSelect: adiciona o ID informado e marca a
// linha pai; ao desmarcar sem linha pai (`closest` retornando null), remove o ID sem
// falhar e atualiza a barra.
test('row selection adds or removes one id and updates its optional row', () => {
  const selectedRow = row();
  const cb = checkbox('ignored', true, selectedRow);
  const {context, calls} = setup();
  context.toggleRowSelect(cb, 'trade-1');
  assert.equal(context.selectedTrades.has('trade-1'), true);
  assert.equal(selectedRow.classList.contains('selected'), true);
  cb.checked = false;
  cb.closest = () => null;
  context.toggleRowSelect(cb, 'trade-1');
  assert.equal(context.selectedTrades.has('trade-1'), false);
  assert.deepEqual(calls, ['updateBulkBar', 'updateBulkBar']);
});

// Verifica clearSelection: limpa o Set, desmarca checkboxes e classes 'selected' das
// linhas visiveis, desmarca chkAll (tolerando sua ausencia) e invoca updateBulkBar.
test('clear selection resets state, visible rows, select-all and bulk bar', () => {
  const first = checkbox('a', true);
  const second = checkbox('b', true);
  first.parent.classList.toggle('selected', true);
  second.parent.classList.toggle('selected', true);
  const {context, elements, calls} = setup({selected: ['a', 'b'], checkboxes: [first, second]});
  context.clearSelection();
  assert.equal(context.selectedTrades.size, 0);
  assert.equal(first.checked, false);
  assert.equal(second.checked, false);
  assert.equal(first.parent.classList.contains('selected'), false);
  assert.equal(elements.chkAll.checked, false);
  assert.deepEqual(calls, ['updateBulkBar']);
  delete elements.chkAll;
  context.clearSelection();
  assert.deepEqual(calls, ['updateBulkBar', 'updateBulkBar']);
});

// Confirma que as funcoes legadas sairam de app.js e que trade-log.js carrega uma
// unica vez, como script classico sincrono, antes de app.js no index.html.
test('trade log controls load once after their renderers and before app.js', () => {
  for (const part of legacyParts) assert.equal(part, undefined);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const selectionIndex = scripts.findIndex(script => script.src === 'src/modules/trades/presentation/trade-log.js');
  const logIndex = scripts.findIndex(script => script.src === 'src/modules/trades/presentation/trade-log.js');
  const controlsIndex = scripts.findIndex(script => script.src === modulePath);
  const appIndex = scripts.findIndex(script => script.src === 'app.js');
  assert.ok(selectionIndex === logIndex && logIndex === controlsIndex && controlsIndex < appIndex);
});
