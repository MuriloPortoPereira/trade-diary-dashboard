/*
 * Objetivo do arquivo:
 *   Testar o controlador generico de modais (openModal e closeModal), cobrindo
 *   bloqueios de edicao em tradeModal, criacao vs edicao de trades, abertura de
 *   accountModal e modais genericos, alem da limpeza de fluxo ao fechar.
 *
 * Modulo/arquivo testado:
 *   Funcoes openModal e closeModal em src/app/presentation/app-workspace.js
 *   (verificando tambem a remocao definitiva de declaracoes legadas em app.js).
 *
 * Estrategia de isolamento:
 *   Extrai apenas openModal e closeModal e executa-as em uma sandbox node:vm com
 *   elementos de modal simulados, Date deterministico e espias que registram a
 *   sequencia exata de efeitos colaterais (bloqueio, selects, reset, preenchimento,
 *   duracao, fluxo, lista de contas e limpeza em lote).
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Quando a conta bloqueia edicao, openModal('tradeModal', ...) retorna false
 *     imediatamente sem tocar em editingId ou no DOM.
 *   - Ao editar trade existente, executa lock -> populate -> reset -> fill -> flow;
 *     se o ID nao for encontrado, pula apenas fill.
 *   - Ao criar novo trade, define editingId=null, preenche data atual (YYYY-MM-DD)
 *     e recalcula duracao antes de atualizar a UI de fluxo.
 *   - accountModal oculta o formulario e renderiza lista de contas; modais genericos
 *     apenas alternam a classe 'open'.
 *   - closeModal limpa o fluxo em lote (clearBulkIncompleteFlow) exclusivamente
 *     para tradeModal.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/app/presentation/app-workspace.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const names = ['openModal', 'closeModal'];
const legacyParts = names.map(name => appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const legacy = legacyParts.every(Boolean) ? legacyParts.join('\n\n') : undefined;
const moduleSource = fs.readFileSync(path.join(root, modulePath), 'utf8');
const source = legacy ?? ["openModal", "closeModal"].map(name => moduleSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))[0]).join('\n\n');

// Fabrica leve de classList baseada em Set para simular manipulacao de classes CSS.
function classList() {
  const classes = new Set();
  return {
    add(name) { classes.add(name); },
    remove(name) { classes.delete(name); },
    contains(name) { return classes.has(name); },
  };
}

// Monta a sandbox vm com modais simulados, data fixa ('2026-10-13'), estado de bloqueio
// configuravel e callbacks instrumentados para verificar a ordem de execucao.
function setup({locked = false, trades = [{id: 't1'}]} = {}) {
  const elements = {
    tradeModal: {classList: classList()},
    accountModal: {classList: classList()},
    csvConfirmModal: {classList: classList()},
    accountForm: {style: {display: 'block'}},
    't-date': {value: ''},
  };
  const calls = [];
  class FixedDate {
    toISOString() { return '2026-10-13T12:34:56.000Z'; }
  }
  const context = vm.createContext({
    editingId: 'previous',
    trades,
    Date: FixedDate,
    document: {getElementById: id => elements[id]},
    showLogAccountEditLockNotice: action => { calls.push(['lock', action]); return locked; },
    populateSelects: () => calls.push(['populate']),
    resetForm: () => calls.push(['reset']),
    fillForm: trade => calls.push(['fill', trade]),
    updateTradeDurationField: () => calls.push(['duration']),
    updateTradeModalFlowUI: () => calls.push(['flow']),
    renderAccountList: () => calls.push(['accounts']),
    clearBulkIncompleteFlow: () => calls.push(['clearBulk']),
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#modal-controller' : modulePath});
  return {context, elements, calls};
}

// Garante que, com a trava de conta ativa, tanto editar quanto adicionar no tradeModal
// retornam false antes de modificar editingId ou adicionar a classe 'open'.
test('trade modal lock returns false before changing state or DOM', () => {
  const {context, elements, calls} = setup({locked: true});
  assert.equal(context.openModal('tradeModal', 't1'), false);
  assert.equal(context.editingId, 'previous');
  assert.equal(elements.tradeModal.classList.contains('open'), false);
  assert.deepEqual(calls, [['lock', 'editar']]);
  calls.length = 0;
  assert.equal(context.openModal('tradeModal'), false);
  assert.deepEqual(calls, [['lock', 'adicionar']]);
});

// Verifica o fluxo completo de edicao de um trade encontrado: define editingId, abre o
// modal e dispara em ordem lock('editar'), populate, reset, fill(trade) e flow.
test('editing a trade preserves lookup and form effect order', () => {
  const trade = {id: 't1', symbol: 'US30'};
  const {context, elements, calls} = setup({trades: [trade]});
  assert.equal(context.openModal('tradeModal', 't1'), undefined);
  assert.equal(context.editingId, 't1');
  assert.equal(elements.tradeModal.classList.contains('open'), true);
  assert.deepEqual(calls, [
    ['lock', 'editar'], ['populate'], ['reset'], ['fill', trade], ['flow'],
  ]);
});

// Caso o ID informado para edicao nao exista na lista de trades, mantem populate, reset
// e flow sem chamar fillForm com valor indefinido.
test('missing edited trade still resets and updates flow without filling', () => {
  const {context, calls} = setup({trades: []});
  context.openModal('tradeModal', 'missing');
  assert.deepEqual(calls, [['lock', 'editar'], ['populate'], ['reset'], ['flow']]);
});

// No modo de criacao (sem ID), zera editingId, preenche a data de hoje via FixedDate
// e executa duration antes de atualizar a interface de fluxo do modal.
test('new trade applies current date and duration before flow update', () => {
  const {context, elements, calls} = setup();
  context.openModal('tradeModal');
  assert.equal(context.editingId, null);
  assert.equal(elements['t-date'].value, '2026-10-13');
  assert.deepEqual(calls, [
    ['lock', 'adicionar'], ['populate'], ['reset'], ['duration'], ['flow'],
  ]);
});

// Confirma comportamentos independentes: accountModal esconde accountForm e chama
// renderAccountList; modais genericos como csvConfirmModal abrem sem efeitos colaterais.
test('account and generic modals preserve their independent behavior', () => {
  const account = setup();
  account.context.openModal('accountModal', 'unexpected-id');
  assert.equal(account.context.editingId, 'unexpected-id');
  assert.equal(account.elements.accountModal.classList.contains('open'), true);
  assert.equal(account.elements.accountForm.style.display, 'none');
  assert.deepEqual(account.calls, [['accounts']]);
  const generic = setup();
  generic.context.openModal('csvConfirmModal');
  assert.equal(generic.elements.csvConfirmModal.classList.contains('open'), true);
  assert.deepEqual(generic.calls, []);
});

// Valida que closeModal remove a classe 'open' em qualquer modal, mas dispara
// clearBulkIncompleteFlow exclusivamente ao fechar tradeModal.
test('closing removes open state and only trade modal clears bulk flow', () => {
  const trade = setup();
  trade.elements.tradeModal.classList.add('open');
  trade.context.closeModal('tradeModal');
  assert.equal(trade.elements.tradeModal.classList.contains('open'), false);
  assert.deepEqual(trade.calls, [['clearBulk']]);
  const generic = setup();
  generic.elements.csvConfirmModal.classList.add('open');
  generic.context.closeModal('csvConfirmModal');
  assert.equal(generic.elements.csvConfirmModal.classList.contains('open'), false);
  assert.deepEqual(generic.calls, []);
});

// Assegura que app.js nao contem mais openModal/closeModal e que app-workspace.js
// carrega uma unica vez como script sincrono antes de profile-page.js e app.js.
test('modal and navigation declarations share one synchronous workspace before app.js', () => {
  for (const part of legacyParts) assert.equal(part, undefined);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const profileIndex = scripts.findIndex(script => script.src === 'src/modules/profile/presentation/profile-page.js');
  const modalIndex = scripts.findIndex(script => script.src === modulePath);
  const navigationIndex = scripts.findIndex(script => script.src === 'src/app/presentation/app-workspace.js');
  const appIndex = scripts.findIndex(script => script.src === 'app.js');
  assert.ok(modalIndex === navigationIndex && modalIndex < profileIndex && profileIndex < appIndex);
});
