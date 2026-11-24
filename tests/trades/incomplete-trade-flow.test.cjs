/*
 * Objetivo:
 *   Validar a atualizacao da interface do modal de trade durante o fluxo em lote
 *   de conclusao de trades incompletos (titulos, rotulos de progresso, navegacao e botao de salvar).
 *
 * Modulo testado:
 *   src/modules/trades/presentation/trade-form.js
 *   (funcao updateTradeModalFlowUI, alem de confirmar a remocao do legado em app.js
 *   e o carregamento correto no index.html).
 *
 * Estrategia de isolamento:
 *   Executa o script de apresentacao dentro de um contexto node:vm com mocks de estado global
 *   (bulkIncompleteEditIds, bulkIncompleteEditIndex, editingId, trades), espiao para
 *   isBulkIncompleteFlowTrade e stubs de elementos DOM com registro de chamadas.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Ausencia de controles no DOM nao gera erro e evita consultas desnecessarias ao fluxo vazio.
 *   - O modulo deve ser carregado uma unica vez antes de app.js no index.html.
 *   - Controles parciais preservam o titulo e texto de salvamento de edicao normal.
 *   - No modo de registro comum (fluxo inativo), os controles de navegacao em lote ficam ocultos e desabilitados.
 *   - No fluxo ativo, exibe progresso ("X de Y"), sufixo opcional de simbolo, texto contextual no botao salvar
 *     e habilitacao coerente dos botoes anterior/proximo nos limites da lista.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/trades/presentation/trade-form.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function updateTradeModalFlowUI\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

// Fabrica de elemento DOM simulado com valores sentinela ('before') para detectar
// claramente quais propriedades foram atualizadas ou preservadas pela funcao.
function element(extra = {}) {
  return {textContent: 'before', style: {display: 'before'}, disabled: false, ...extra};
}

// Helper de renderizacao em VM: configura estado do fluxo em lote e mocks do DOM.
// Reatribui isBulkIncompleteFlowTrade apos carregar o arquivo para sobrescrever a
// implementacao real do proprio modulo e controlar o resultado do predicado no teste.
function render({ids = [], index = -1, editingId = null, trades = [], flowTrade = false, elements = {}} = {}) {
  const calls = [];
  const context = vm.createContext({
    bulkIncompleteEditIds: ids,
    bulkIncompleteEditIndex: index,
    editingId,
    trades,
    isBulkIncompleteFlowTrade(id) { calls.push(['flow-trade', id]); return flowTrade; },
    document: {getElementById(id) { calls.push(['target', id]); return elements[id] ?? null; }},
  });
  vm.runInContext(source, context, {filename: modulePath});
  context.isBulkIncompleteFlowTrade = id => { calls.push(['flow-trade', id]); return flowTrade; };
  vm.runInContext('updateTradeModalFlowUI()', context);
  return {calls};
}

// Caso de borda quando nenhum elemento do modal existe no DOM: todos os IDs sao consultados
// na ordem esperada, mas isBulkIncompleteFlowTrade nao e chamado porque nao ha fluxo ativo.
test('missing controls resolve all targets without consulting an empty flow', () => {
  const {calls} = render();
  assert.deepEqual(calls, [
    ['target', 'tradeModalTitle'],
    ['target', 'tradeModalFlow'],
    ['target', 'tradeModalFlowLabel'],
    ['target', 'tradeModalPrevBtn'],
    ['target', 'tradeModalNextBtn'],
    ['target', 'tradeModalSaveBtn'],
  ]);
});

// Garante no index.html que o script do modulo aparece exatamente uma vez e antes de app.js.
test('incomplete trade flow classic script loads once before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(scripts.filter(src => src === modulePath).length, 1);
  assert.ok(scripts.indexOf(modulePath) < scripts.indexOf('app.js'));
});

// Verifica o caso de DOM parcial (apenas titulo e botao salvar presentes) em edicao comum:
// deve aplicar os textos de "Editar Trade" / "Salvar Trade" antes de encerrar por falta dos controles de fluxo.
test('partial controls keep normal edit title and save text before returning', () => {
  const title = element();
  const save = element();
  render({editingId: 'trade-1', elements: {tradeModalTitle: title, tradeModalSaveBtn: save}});
  assert.equal(title.textContent, 'Editar Trade');
  assert.equal(save.textContent, 'Salvar Trade');
});

// Garante que, ao abrir o modal para novo registro (sem editingId nem fluxo ativo),
// o titulo volta para "Registrar Trade", a barra de fluxo e ocultada e os botoes de navegacao sao desabilitados.
test('inactive registration hides and resets the complete-flow controls', () => {
  const elements = {
    tradeModalTitle: element(),
    tradeModalFlow: element(),
    tradeModalFlowLabel: element(),
    tradeModalPrevBtn: element(),
    tradeModalNextBtn: element(),
    tradeModalSaveBtn: element(),
  };
  render({elements});
  assert.equal(elements.tradeModalTitle.textContent, 'Registrar Trade');
  assert.equal(elements.tradeModalSaveBtn.textContent, 'Salvar Trade');
  assert.equal(elements.tradeModalFlow.style.display, 'none');
  assert.equal(elements.tradeModalFlowLabel.textContent, '');
  assert.equal(elements.tradeModalPrevBtn.disabled, true);
  assert.equal(elements.tradeModalNextBtn.disabled, true);
});

// Testa um item intermediario no fluxo ativo (indice 1 de 3): deve exibir o titulo do fluxo,
// botao "Salvar e continuar", barra visivel (flex), rotulo com posicao e simbolo ("2 de 3 · WIN$")
// e ambos os botoes anterior/proximo habilitados.
test('active middle trade shows progress, symbol and enabled navigation', () => {
  const elements = {
    tradeModalTitle: element(),
    tradeModalFlow: element(),
    tradeModalFlowLabel: element(),
    tradeModalPrevBtn: element(),
    tradeModalNextBtn: element(),
    tradeModalSaveBtn: element(),
  };
  const {calls} = render({
    ids: ['a', 'b', 'c'],
    index: 1,
    editingId: 'b',
    trades: [{id: 'b', symbol: 'WIN$'}],
    flowTrade: true,
    elements,
  });
  assert.equal(elements.tradeModalTitle.textContent, 'Completar Trade Incompleto');
  assert.equal(elements.tradeModalSaveBtn.textContent, 'Salvar e continuar');
  assert.equal(elements.tradeModalFlow.style.display, 'flex');
  assert.equal(elements.tradeModalFlowLabel.textContent, 'Completar incompletos 2 de 3 · WIN$');
  assert.equal(elements.tradeModalPrevBtn.disabled, false);
  assert.equal(elements.tradeModalNextBtn.disabled, false);
  assert.deepEqual(calls.filter(call => call[0] === 'flow-trade'), [['flow-trade', 'b']]);
});

// Caso de borda com apenas um trade no fluxo e sem simbolo definido: omite o separador/simbolo
// no rotulo ("1 de 1"), mantem o texto "Salvar Trade" (sem "e continuar") e desabilita ambas as direcoes.
test('single active trade omits symbol suffix and disables both directions', () => {
  const elements = {
    tradeModalTitle: element(),
    tradeModalFlow: element(),
    tradeModalFlowLabel: element(),
    tradeModalPrevBtn: element(),
    tradeModalNextBtn: element(),
    tradeModalSaveBtn: element(),
  };
  render({ids: ['a'], index: 0, editingId: 'a', trades: [{id: 'a'}], flowTrade: true, elements});
  assert.equal(elements.tradeModalSaveBtn.textContent, 'Salvar Trade');
  assert.equal(elements.tradeModalFlowLabel.textContent, 'Completar incompletos 1 de 1');
  assert.equal(elements.tradeModalPrevBtn.disabled, true);
  assert.equal(elements.tradeModalNextBtn.disabled, true);
});
