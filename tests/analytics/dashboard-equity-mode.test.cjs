/*
 * Objetivo:
 *   Testar a alternancia do modo de exibicao da curva de patrimonio (`toggleEqMode`)
 *   entre valor monetario (`value`) e retorno percentual (`pct`), incluindo a ordem exata
 *   de mutacao de estado, atualizacao do rotulo do botao e re-renderizacao do dashboard.
 *
 * Modulo da aplicacao testado:
 *   - `src/modules/analytics/presentation/analytics-workspace.js` (funcao `toggleEqMode`)
 *   - Remocao do legado em `app.js` e ordem de declaracao/carregamento em `index.html`
 *
 * Estrategia de isolamento:
 *   - Extrai apenas `toggleEqMode` do modulo de analytics e a executa em `node:vm`.
 *   - Usa `Object.defineProperty` para interceptar leitura/escrita da variavel global `eqMode`
 *     e um setter em `button.textContent` para registrar a sequencia cronologica exata dos efeitos colaterais.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Alternancia `value` -> `pct` (rotulo `'$ valor'`) e `pct` -> `value` (rotulo `'% retorno'`).
 *   - Ordem obrigatoria: atualizar `eqMode`, atualizar o botao `eqModeBtn` e so entao chamar `renderDashboard`.
 *   - Fallback legado para `'value'` diante de qualquer valor desconhecido em `eqMode`.
 *   - Resiliencia quando o botao `eqModeBtn` nao esta presente no DOM.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Confirma que `toggleEqMode` saiu de `app.js` e extrai sua implementacao do modulo de workspace.
const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/analytics/presentation/analytics-workspace.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function toggleEqMode\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const moduleSource = fs.readFileSync(path.join(root, modulePath), 'utf8');
const source = ['toggleEqMode'].map(name => moduleSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))[0]).join('\n\n');

// Garante que `analytics-workspace.js` e carregado uma unica vez de forma sincrona classica
// antes de `app.js` e que `renderDashboard` e declarado antes de `toggleEqMode` no modulo.
test('equity mode loads once as a classic script after dashboard and before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(moduleSource.indexOf('function renderDashboard(') < moduleSource.indexOf('function toggleEqMode('));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});

// Auxiliar de execucao: cria uma sandbox que rastreia em `calls` cada alteracao em `eqMode`,
// busca por `eqModeBtn`, escrita em `textContent` e invocacao de `renderDashboard`, permitindo
// simular a presenca ou ausencia do botao no DOM.
function toggle(initialMode, {withButton = true} = {}) {
  const calls = [];
  let mode = initialMode;
  const button = withButton ? {
    value: 'before',
    set textContent(value) { this.value = value; calls.push(['text', value]); },
    get textContent() { return this.value; },
  } : null;
  const sandbox = {
    document: {getElementById(id) { calls.push(['target', id]); return button; }},
    renderDashboard() { calls.push(['render', mode]); },
  };
  Object.defineProperty(sandbox, 'eqMode', {
    get() { return mode; },
    set(value) { mode = value; calls.push(['mode', value]); },
    configurable: true,
  });
  const context = vm.createContext(sandbox);
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext('toggleEqMode()', context);
  return {mode, button, calls};
}

// Verifica a transicao de `'value'` para `'pct'`: o modo muda primeiro, depois o botao passa a
// oferecer o retorno para `'$ valor'` e por fim `renderDashboard` e acionado ja enxergando `'pct'`.
test('value mode switches to percentage before updating the button and dashboard', () => {
  const result = toggle('value');
  assert.equal(result.mode, 'pct');
  assert.equal(result.button.textContent, '$ valor');
  assert.deepEqual(result.calls, [
    ['mode', 'pct'],
    ['target', 'eqModeBtn'],
    ['text', '$ valor'],
    ['render', 'pct'],
  ]);
});

// Verifica o caminho inverso: de `'pct'` volta para `'value'`, atualiza o rotulo do botao para
// `'% retorno'` e dispara `renderDashboard` com o modo atualizado.
test('percentage mode switches back to value with the percentage action label', () => {
  const result = toggle('pct');
  assert.equal(result.mode, 'value');
  assert.equal(result.button.textContent, '% retorno');
  assert.deepEqual(result.calls.at(-1), ['render', 'value']);
});

// Confirma o comportamento defensivo legado: qualquer estado inesperado/desconhecido converge para `'value'`.
test('unknown mode retains the legacy fallback to value', () => {
  const result = toggle('unknown');
  assert.equal(result.mode, 'value');
  assert.equal(result.button.textContent, '% retorno');
});

// Garante que a ausencia do elemento `eqModeBtn` no DOM nao interrompe a troca de modo nem o refresh do dashboard.
test('missing mode button still toggles state before rendering the dashboard', () => {
  const result = toggle('value', {withButton: false});
  assert.deepEqual(result.calls, [
    ['mode', 'pct'],
    ['target', 'eqModeBtn'],
    ['render', 'pct'],
  ]);
});
