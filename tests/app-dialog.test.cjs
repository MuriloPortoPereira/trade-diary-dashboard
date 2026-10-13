const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/app/presentation/app-dialog.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const names = ['openAppDialog', 'closeAppDialog', 'confirmAppDialog', 'showAppConfirm', 'showAppNotice', 'showAppPrompt'];
const legacyParts = names.map(name => appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const legacy = legacyParts.every(Boolean) ? legacyParts.join('\n\n') : undefined;
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function element(extra = {}) {
  const classes = new Set();
  return {
    textContent: '', value: '', placeholder: '', style: {}, className: '',
    classList: {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name),
    },
    focus() { this.focused = true; },
    ...extra,
  };
}

function setup({withModal = true, confirmResult = false, promptResult = null} = {}) {
  const elements = {
    appDialogModal: withModal ? element() : null,
    appDialogTitle: element(),
    appDialogBody: element(),
    appDialogInputWrap: element(),
    appDialogInput: element(),
    appDialogInputLabel: element(),
    appDialogError: element(),
    appDialogConfirmBtn: element(),
  };
  const calls = [];
  const context = vm.createContext({
    appDialogState: null,
    document: {getElementById: id => elements[id] ?? null},
    setTimeout: callback => { calls.push(['timeout']); callback(); },
    confirm: message => { calls.push(['confirm', message]); return confirmResult; },
    alert: message => calls.push(['alert', message]),
    prompt: (message, value) => { calls.push(['prompt', message, value]); return promptResult; },
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#app-dialog' : modulePath});
  return {context, elements, calls};
}

test('open dialog projects defaults, options, state and deferred input focus', () => {
  const {context, elements, calls} = setup();
  const action = () => {};
  const opened = context.openAppDialog({
    title: 'Excluir', message: 'Confirma?', input: true, inputLabel: 'Código',
    inputValue: 'ABC', inputPlaceholder: 'Digite', confirmText: 'Excluir', danger: true,
    requiredValue: 'ABC', onConfirm: action,
  });
  assert.equal(opened, true);
  assert.equal(elements.appDialogTitle.textContent, 'Excluir');
  assert.equal(elements.appDialogBody.textContent, 'Confirma?');
  assert.equal(elements.appDialogError.textContent, '');
  assert.equal(elements.appDialogInputWrap.style.display, 'block');
  assert.equal(elements.appDialogInputLabel.textContent, 'Código');
  assert.equal(elements.appDialogInput.value, 'ABC');
  assert.equal(elements.appDialogInput.placeholder, 'Digite');
  assert.equal(elements.appDialogConfirmBtn.textContent, 'Excluir');
  assert.equal(elements.appDialogConfirmBtn.className, 'btn btn-danger');
  assert.equal(elements.appDialogModal.classList.contains('open'), true);
  assert.equal(context.appDialogState.onConfirm, action);
  assert.equal(elements.appDialogInput.focused, true);
  assert.deepEqual(calls, [['timeout']]);
});

test('open dialog keeps legacy defaults and returns false without the modal', () => {
  const present = setup();
  assert.equal(present.context.openAppDialog(), true);
  assert.equal(present.elements.appDialogTitle.textContent, 'Confirmar ação');
  assert.equal(present.elements.appDialogBody.textContent, '');
  assert.equal(present.elements.appDialogInputWrap.style.display, 'none');
  assert.equal(present.elements.appDialogInputLabel.textContent, 'Valor');
  assert.equal(present.elements.appDialogConfirmBtn.textContent, 'Confirmar');
  assert.equal(present.elements.appDialogConfirmBtn.className, 'btn btn-primary');
  const missing = setup({withModal: false});
  assert.equal(missing.context.openAppDialog({title: 'Ignorado'}), false);
  assert.equal(missing.context.appDialogState, null);
});

test('close dialog removes the class and clears state', () => {
  const {context, elements} = setup();
  context.openAppDialog({message: 'Teste'});
  context.closeAppDialog();
  assert.equal(elements.appDialogModal.classList.contains('open'), false);
  assert.equal(context.appDialogState, null);
});

test('confirmation enforces the exact required value and keeps dialog open', () => {
  const {context, elements} = setup();
  let called = false;
  context.openAppDialog({input: true, requiredValue: 'APAGAR', errorText: 'Texto inválido', onConfirm: () => { called = true; }});
  elements.appDialogInput.value = 'apagar';
  context.confirmAppDialog();
  assert.equal(elements.appDialogError.textContent, 'Texto inválido');
  assert.equal(elements.appDialogModal.classList.contains('open'), true);
  assert.equal(called, false);
});

test('successful confirmation closes before delivering the input value', () => {
  const {context, elements} = setup();
  const calls = [];
  context.openAppDialog({input: true, onConfirm: value => calls.push([value, elements.appDialogModal.classList.contains('open')])});
  elements.appDialogInput.value = 'Novo nome';
  context.confirmAppDialog();
  assert.deepEqual(calls, [['Novo nome', false]]);
  assert.equal(context.appDialogState, null);
  context.confirmAppDialog();
  assert.equal(calls.length, 1);
});

test('confirm, notice and prompt wrappers preserve modal option mapping', () => {
  const {context, elements} = setup();
  let value = null;
  context.showAppConfirm('Título', 'Mensagem', () => {}, {confirmText: 'Sim', danger: true});
  assert.equal(context.appDialogState.confirmText, 'Sim');
  assert.equal(context.appDialogState.danger, true);
  context.showAppNotice('Aviso', 'Texto');
  assert.equal(context.appDialogState.confirmText, 'OK');
  assert.equal(context.appDialogState.onConfirm, null);
  context.showAppPrompt('Nome', 'Informe', 'Atual', next => { value = next; }, {inputLabel: 'Novo', inputPlaceholder: 'Valor', requiredValue: 'X'});
  assert.equal(context.appDialogState.input, true);
  assert.equal(context.appDialogState.inputLabel, 'Novo');
  assert.equal(context.appDialogState.inputPlaceholder, 'Valor');
  assert.equal(context.appDialogState.requiredValue, 'X');
  elements.appDialogInput.value = 'X';
  context.confirmAppDialog();
  assert.equal(value, 'X');
});

test('wrappers retain native confirm, alert and prompt fallbacks', () => {
  const accepted = setup({withModal: false, confirmResult: true, promptResult: 'Resposta'});
  const values = [];
  accepted.context.showAppConfirm('Título', 'Confirmar?', () => values.push('confirmed'));
  accepted.context.showAppNotice('Aviso', 'Mensagem');
  accepted.context.showAppPrompt('Entrada', 'Digite', 'Inicial', value => values.push(value));
  assert.deepEqual(accepted.calls, [
    ['confirm', 'Confirmar?'], ['alert', 'Mensagem'], ['prompt', 'Digite', 'Inicial'],
  ]);
  assert.deepEqual(values, ['confirmed', 'Resposta']);

  const rejected = setup({withModal: false, confirmResult: false, promptResult: null});
  let called = false;
  rejected.context.showAppConfirm('', 'Não', () => { called = true; });
  rejected.context.showAppPrompt('', 'Não', '', () => { called = true; });
  assert.equal(called, false);
});
