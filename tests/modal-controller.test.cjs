const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/app/presentation/modal-controller.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const names = ['openModal', 'closeModal'];
const legacyParts = names.map(name => appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const legacy = legacyParts.every(Boolean) ? legacyParts.join('\n\n') : undefined;
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function classList() {
  const classes = new Set();
  return {
    add(name) { classes.add(name); },
    remove(name) { classes.delete(name); },
    contains(name) { return classes.has(name); },
  };
}

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

test('missing edited trade still resets and updates flow without filling', () => {
  const {context, calls} = setup({trades: []});
  context.openModal('tradeModal', 'missing');
  assert.deepEqual(calls, [['lock', 'editar'], ['populate'], ['reset'], ['flow']]);
});

test('new trade applies current date and duration before flow update', () => {
  const {context, elements, calls} = setup();
  context.openModal('tradeModal');
  assert.equal(context.editingId, null);
  assert.equal(elements['t-date'].value, '2026-10-13');
  assert.deepEqual(calls, [
    ['lock', 'adicionar'], ['populate'], ['reset'], ['duration'], ['flow'],
  ]);
});

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
