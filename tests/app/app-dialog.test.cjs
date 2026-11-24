/*
 * Objetivo do arquivo:
 *   Testar o sistema central de dialogos da aplicacao (abertura, fechamento,
 *   confirmacao com validacao de texto obrigatorio e wrappers de confirmacao, aviso e
 *   prompt com fallback nativo).
 *
 * Modulo/arquivo testado:
 *   Funcoes openAppDialog, closeAppDialog, confirmAppDialog, showAppConfirm,
 *   showAppNotice e showAppPrompt em src/app/presentation/app-workspace.js
 *   (verificando tambem que nao existem mais declaracoes legadas em app.js).
 *
 * Estrategia de isolamento:
 *   Extrai as seis funcoes do arquivo de apresentacao e as executa em um contexto
 *   node:vm com um DOM simulado (objetos leves com classList, style e focus),
 *   setTimeout sincrono para inspecionar foco adiado e mocks das caixas nativas
 *   confirm/alert/prompt do navegador.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Projecao completa de opcoes, valores padrao, classe de perigo e foco no input.
 *   - Validacao exata (case-sensitive) de requiredValue antes de aceitar confirmacao.
 *   - Fechamento do modal e limpeza de appDialogState antes de invocar onConfirm,
 *     evitando reentrada em cliques duplicados.
 *   - Fallback transparente para window.confirm/alert/prompt quando o modal HTML nao
 *     esta presente no DOM.
 *   - Ordem de carregamento no index.html antes de consumidores como
 *     accounts-workspace.js.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/app/presentation/app-workspace.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const names = ['openAppDialog', 'closeAppDialog', 'confirmAppDialog', 'showAppConfirm', 'showAppNotice', 'showAppPrompt'];
const legacyParts = names.map(name => appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const legacy = legacyParts.every(Boolean) ? legacyParts.join('\n\n') : undefined;
const moduleSource = fs.readFileSync(path.join(root, modulePath), 'utf8');
const source = legacy ?? ["openAppDialog", "closeAppDialog", "confirmAppDialog", "showAppConfirm", "showAppNotice", "showAppPrompt"].map(name => moduleSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))[0]).join('\n\n');

// Cria um elemento DOM simulado com propriedades de texto/input, estilo inline,
// manipulacao de classes via Set e rastreamento de chamadas ao metodo focus().
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

// Configura a sandbox vm com todos os elementos do modal de dialogo (ou sem o
// container principal quando withModal=false para testar fallbacks nativos), alem de
// interceptar setTimeout, confirm, alert e prompt.
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

// Garante que openAppDialog preenche titulo, mensagem, campo de entrada, rotulo,
// placeholder, estilo btn-danger, classe 'open', estado interno e agenda foco no
// input.
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

// Valida os textos e estilos padrao quando nenhuma opcao e passada (sem input visivel
// e botao primario) e confirma retorno false sem alterar estado caso o modal nao
// exista.
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

// Confirma que closeAppDialog remove a classe 'open' do modal e zera appDialogState.
test('close dialog removes the class and clears state', () => {
  const {context, elements} = setup();
  context.openAppDialog({message: 'Teste'});
  context.closeAppDialog();
  assert.equal(elements.appDialogModal.classList.contains('open'), false);
  assert.equal(context.appDialogState, null);
});

// Verifica a trava de seguranca para confirmacoes destrutivas: divergencia de caixa
// ('apagar' vs 'APAGAR') exibe a mensagem de erro, mantem o modal aberto e nao chama
// onConfirm.
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

// Garante a ordem critica na confirmacao valida: primeiro fecha o modal e limpa o
// estado, depois entrega o valor digitado ao callback; uma segunda chamada
// subsequente vira no-op.
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

// Testa o mapeamento de argumentos dos helpers de alto nivel (showAppConfirm,
// showAppNotice e showAppPrompt) para o estado interno do modal e entrega do valor.
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

// Verifica o caminho de fallback quando o modal nao existe no DOM: delega para
// confirm, alert e prompt nativos do navegador, disparando callbacks apenas quando
// aceito.
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

// Valida que as funcoes de dialogo foram removidas de app.js e que app-workspace.js e
// incluido uma unica vez como script sincrono apos language-selector.js e antes de
// accounts-workspace.js e app.js no index.html.
test('application dialog loads once as a classic script before every consumer and leaves app.js clean', () => {
  for (const part of legacyParts) assert.equal(part, undefined);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const dialogIndex = scripts.findIndex(script => script.src === modulePath);
  const languageIndex = scripts.findIndex(script => script.src === 'src/modules/preferences/presentation/language-selector.js');
  const accountFormIndex = scripts.findIndex(script => script.src === 'src/modules/accounts/presentation/accounts-workspace.js');
  const appIndex = scripts.findIndex(script => script.src === 'app.js');
  assert.ok(languageIndex < dialogIndex && dialogIndex < accountFormIndex && accountFormIndex < appIndex);
});
