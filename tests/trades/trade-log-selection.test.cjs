/*
 * Objetivo:
 *   Validar a barra de acoes em lote da tabela de trades (updateBulkBar):
 *   visibilidade, contagem de itens selecionados e incompletos, rotulos
 *   singular/plural dos botoes, dica contextual e sincronizacao do checkbox
 *   "selecionar todos" (chkAll).
 *
 * Modulo testado:
 *   src/modules/trades/presentation/trade-log.js (funcao updateBulkBar, alem de
 *   garantir que a declaracao legada foi removida de app.js e que o script carrega
 *   corretamente no index.html).
 *
 * Estrategia de isolamento:
 *   Executa o script em contexto node:vm com mocks de selectedTrades (Set),
 *   getSelectedIncompleteTrades e um DOM minimo contendo getElementById e
 *   querySelectorAll, registrando todas as consultas para validar curtos-circuitos e
 *   ordem de chamadas.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Sem o elemento bulkBar, resolve os alvos opcionais e retorna antes de consultar
 *     incompletos ou checkboxes.
 *   - Com multiplos itens e incompletos selecionados: exibe barra (classe 'show'),
 *     inclui contagem de incompletos no texto e no botao completar, oculta bulkHint e
 *     marca chkAll quando todos estao marcados.
 *   - Com apenas 1 item completo selecionado: usa o rotulo singular "Editar" (com
 *     icone de lapis) e omite sufixo de incompletos.
 *   - Com selecao vazia: remove classe 'show', reexibe bulkHint ('inline-flex'),
 *     restaura textos padrao dos botoes e desmarca chkAll.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/trades/presentation/trade-log.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function updateBulkBar\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

// Fabrica de elemento DOM simulado com classList (add/remove/contains) e valores
// sentinela ('before') para distinguir claramente propriedades alteradas das
// preservadas.
function createElement(extra = {}) {
  const classes = new Set();
  return {
    textContent: 'before',
    style: {display: 'before'},
    classList: {
      add(value) { classes.add(value); },
      remove(value) { classes.delete(value); },
      contains(value) { return classes.has(value); },
    },
    ...extra,
  };
}

// Helper de renderizacao em VM: configura selectedTrades, retorno de
// getSelectedIncompleteTrades, mapa de elementos do DOM e checkboxes visiveis na
// tabela, disparando updateBulkBar().
function render({selected = [], incomplete = [], elements = {}, checkboxes = []} = {}) {
  const calls = [];
  const context = vm.createContext({
    selectedTrades: new Set(selected),
    getSelectedIncompleteTrades() { calls.push(['incomplete']); return incomplete; },
    document: {
      getElementById(id) { calls.push(['target', id]); return elements[id] ?? null; },
      querySelectorAll(selector) { calls.push(['query', selector]); return checkboxes; },
    },
  });
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext('updateBulkBar()', context);
  return {calls};
}

// Caso de borda sem bulkBar no DOM: a funcao busca os 5 elementos da barra, mas
// retorna antes de chamar getSelectedIncompleteTrades ou consultar os checkboxes da
// tabela.
test('missing bulk bar returns after resolving optional controls without reading selection details', () => {
  const {calls} = render();
  assert.deepEqual(calls, [
    ['target', 'bulkBar'],
    ['target', 'bulkCount'],
    ['target', 'bulkHint'],
    ['target', 'bulkEditBtn'],
    ['target', 'bulkCompleteBtn'],
  ]);
});

// Verifica no index.html que trade-log.js carrega uma unica vez como script classico
// antes de app.js.
test('trade log selection classic script loads once before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(scripts.filter(src => src === modulePath).length, 1);
  assert.ok(scripts.indexOf(modulePath) < scripts.indexOf('app.js'));
});

// Cenario com 2 selecionados (1 incompleto) e todos os checkboxes da tabela marcados:
// ativa classe 'show', formata contagem composta, oculta dica, ajusta textos dos
// botoes e sincroniza chkAll para true apos consultar '#logTbody
// input[type=checkbox]'.
test('selected incomplete trades show the bar, counts, actions and checked select-all state', () => {
  const elements = {
    bulkBar: createElement(),
    bulkCount: createElement(),
    bulkHint: createElement(),
    bulkEditBtn: createElement(),
    bulkCompleteBtn: createElement(),
    chkAll: createElement({checked: false}),
  };
  const {calls} = render({
    selected: ['a', 'b'],
    incomplete: [{id: 'b'}],
    elements,
    checkboxes: [{checked: true}, {checked: true}],
  });
  assert.equal(elements.bulkBar.classList.contains('show'), true);
  assert.equal(elements.bulkCount.textContent, '2 selecionado(s) · 1 incompleto(s)');
  assert.equal(elements.bulkHint.style.display, 'none');
  assert.equal(elements.bulkEditBtn.textContent, '✏ Editar seleção');
  assert.equal(elements.bulkCompleteBtn.textContent, '✓ Completar incompletos (1)');
  assert.equal(elements.chkAll.checked, true);
  assert.deepEqual(calls.slice(-3), [
    ['incomplete'],
    ['target', 'chkAll'],
    ['query', '#logTbody input[type=checkbox]'],
  ]);
});

// Cenario com exatamente 1 trade completo selecionado: valida texto singular no botao
// editar, ausencia da parte "incompleto(s)" na contagem e rotulo padrao sem
// parenteses no botao completar.
test('single complete selection preserves singular edit text and complete-action fallback', () => {
  const elements = {
    bulkBar: createElement(),
    bulkCount: createElement(),
    bulkHint: createElement(),
    bulkEditBtn: createElement(),
    bulkCompleteBtn: createElement(),
  };
  render({selected: ['a'], elements});
  assert.equal(elements.bulkCount.textContent, '1 selecionado(s)');
  assert.equal(elements.bulkEditBtn.textContent, '✏ Editar');
  assert.equal(elements.bulkCompleteBtn.textContent, '✓ Completar incompletos');
});

// Caso de borda de selecao vazia: remove a classe 'show', preserva o bulkCount
// anterior sem sobrescrever, restaura bulkHint para 'inline-flex', reseta rotulos dos
// botoes e desmarca chkAll.
test('empty selection hides the bar, restores the hint and clears select-all', () => {
  const bar = createElement();
  bar.classList.add('show');
  const elements = {
    bulkBar: bar,
    bulkCount: createElement(),
    bulkHint: createElement(),
    bulkEditBtn: createElement(),
    bulkCompleteBtn: createElement(),
    chkAll: createElement({checked: true}),
  };
  render({elements, checkboxes: []});
  assert.equal(elements.bulkBar.classList.contains('show'), false);
  assert.equal(elements.bulkCount.textContent, 'before');
  assert.equal(elements.bulkHint.style.display, 'inline-flex');
  assert.equal(elements.bulkEditBtn.textContent, '✏ Editar seleção');
  assert.equal(elements.bulkCompleteBtn.textContent, '✓ Completar incompletos');
  assert.equal(elements.chkAll.checked, false);
});
