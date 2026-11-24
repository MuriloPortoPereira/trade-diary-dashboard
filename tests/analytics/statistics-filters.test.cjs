/*
 * Objetivo:
 *   Validar os controles de filtro da pagina de Estatisticas (`toggleCustomPeriod` e
 *   `onStatsAccountChange`), assegurando exibicao/ocultacao da barra de periodo
 *   customizado, fixacao da conta selecionada (`statsAccountPinned`) e disparo
 *   ordenado de `renderStats`.
 *
 * Modulo da aplicacao testado:
 *   - `src/modules/analytics/presentation/analytics-workspace.js` (funcoes
 *     `toggleCustomPeriod` e `onStatsAccountChange`)
 *   - Remocao das declaracoes legadas em `app.js` e inclusao em `index.html`
 *
 * Estrategia de isolamento:
 *   - Extrai apenas as duas funcoes de controle via regex e as executa em contextos
 *     `node:vm` com mocks de `document.getElementById`, `renderStats` e propriedade
 *     monitorada `statsAccountPinned`.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Periodo `'custom'` exibe `customPeriodBar` (`display = 'flex'`) antes de chamar
 *     `renderStats`.
 *   - Periodos predefinidos (ex.: `'30'`) ocultam a barra (`display = 'none'`) sem
 *     alterar o valor do select.
 *   - Ausencia de `statPeriod` ou `customPeriodBar` nao gera excecao nem impede a
 *     renderizacao.
 *   - Troca manual de conta fixa `statsAccountPinned = true` antes de re-renderizar
 *     as estatisticas.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Confirma que ambas as funcoes de filtro foram removidas de `app.js` e extrai suas
// implementacoes diretamente de `analytics-workspace.js`.
const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/analytics/presentation/analytics-workspace.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacyPeriod = appSource.match(/^function toggleCustomPeriod\([^]*?^\}/m)?.[0];
const legacyAccount = appSource.match(/^function onStatsAccountChange\([^]*?^\}/m)?.[0];
assert.equal(legacyPeriod, undefined, 'legacy period declaration must be moved');
assert.equal(legacyAccount, undefined, 'legacy account declaration must be moved');
const moduleSource = fs.readFileSync(path.join(root, modulePath), 'utf8');
const source = ['toggleCustomPeriod', 'onStatsAccountChange'].map(name => moduleSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))[0]).join('\n\n');

// Garante em `index.html` o carregamento unico e sincrono classico do modulo antes de
// `app.js`.
test('statistics controls load once as a classic script before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});

// Auxiliar para exercitar `toggleCustomPeriod`: injeta os nos simulados `statPeriod`
// e `customPeriodBar` (podendo ser nulos) e registra a ordem das consultas ao DOM e
// do `renderStats`.
function togglePeriod({period = {value: 'custom'}, bar = {style: {display: 'before'}}} = {}) {
  const calls = [];
  const context = vm.createContext({
    document: {
      getElementById(id) {
        calls.push(['target', id]);
        return id === 'statPeriod' ? period : id === 'customPeriodBar' ? bar : null;
      },
    },
    renderStats() { calls.push(['render', 'stats']); },
  });
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext('toggleCustomPeriod()', context);
  return {bar, calls};
}

// Verifica que ao selecionar `'custom'` a barra de datas customizadas recebe
// `display: 'flex'` e o refresh das estatisticas acontece somente apos consultar os
// dois controles.
test('custom period shows its controls before rendering statistics', () => {
  const {bar, calls} = togglePeriod();
  assert.equal(bar.style.display, 'flex');
  assert.deepEqual(calls, [
    ['target', 'statPeriod'],
    ['target', 'customPeriodBar'],
    ['render', 'stats'],
  ]);
});

// Confirma que um periodo predefinido (como `'30'`) oculta a barra customizada
// (`'none'`) preservando intacto o valor selecionado no controle `statPeriod`.
test('predefined period hides custom controls and preserves the selected value', () => {
  const period = {value: '30'};
  const {bar} = togglePeriod({period});
  assert.equal(bar.style.display, 'none');
  assert.equal(period.value, '30');
});

// Testa a resiliencia a elementos ausentes: mesmo sem `statPeriod` nem
// `customPeriodBar`, a funcao nao falha e conclui invocando `renderStats`.
test('missing period defaults to custom and a missing bar does not skip rendering', () => {
  const {calls} = togglePeriod({period: null, bar: null});
  assert.deepEqual(calls, [
    ['target', 'statPeriod'],
    ['target', 'customPeriodBar'],
    ['render', 'stats'],
  ]);
});

// Usa `Object.defineProperty` em `statsAccountPinned` para comprovar que
// `onStatsAccountChange` marca a conta como fixada (`true`) antes de chamar
// `renderStats()`.
test('account change pins the current filter before rendering statistics', () => {
  const calls = [];
  let pinned = false;
  const sandbox = {
    renderStats() { calls.push(['render', pinned]); },
  };
  Object.defineProperty(sandbox, 'statsAccountPinned', {
    get() { return pinned; },
    set(value) { pinned = value; calls.push(['pin', value]); },
    configurable: true,
  });
  const context = vm.createContext(sandbox);
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext('onStatsAccountChange()', context);
  assert.equal(context.statsAccountPinned, true);
  assert.deepEqual(calls, [['pin', true], ['render', true]]);
});
