const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/trades/presentation/incomplete-trade-flow.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function updateTradeModalFlowUI\([^]*?^\}/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function element(extra = {}) {
  return {textContent: 'before', style: {display: 'before'}, disabled: false, ...extra};
}

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
  vm.runInContext(source, context, {filename: legacy ? 'app.js#updateTradeModalFlowUI' : modulePath});
  vm.runInContext('updateTradeModalFlowUI()', context);
  return {calls};
}

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

test('partial controls keep normal edit title and save text before returning', () => {
  const title = element();
  const save = element();
  render({editingId: 'trade-1', elements: {tradeModalTitle: title, tradeModalSaveBtn: save}});
  assert.equal(title.textContent, 'Editar Trade');
  assert.equal(save.textContent, 'Salvar Trade');
});

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
