/*
 * Objetivo do arquivo:
 *   Testar a funcao renderTopbarValue responsavel por aplicar valores em cache na
 *   barra superior conforme o modo de densidade ('full' ou 'compact'), preservando o
 *   tooltip completo (title) e as classes CSS.
 *
 * Modulo/arquivo testado:
 *   Funcao renderTopbarValue em src/app/presentation/app-workspace.js (com assercao
 *   imediata de que a declaracao legada foi removida de app.js).
 *
 * Estrategia de isolamento:
 *   Executa o bloco da topbar em uma sandbox node:vm injetando topbarValueCache,
 *   topbarDensity, um document.getElementById rastreado e um stub de setTopbarClass.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Item ausente no cache consulta o elemento alvo e retorna sem mutar DOM nem
 *     classes.
 *   - Elemento alvo ausente no DOM (null) retorna sem chamar setTopbarClass.
 *   - No modo 'full', textContent e title recebem item.full; no modo 'compact',
 *     textContent recebe item.compact enquanto title preserva o texto completo
 *     (item.full).
 *   - Carregamento sincrono unico no index.html antes de app.js.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/app/presentation/app-workspace.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderTopbarValue\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const moduleSource = fs.readFileSync(path.join(root, modulePath), 'utf8');
const source = ["renderTopbarValue", "renderTopbarAccount", "updateTopbarStats"].map(name => moduleSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))[0]).join('\n\n');

// Executa renderTopbarValue(id) em um contexto vm isolado com cache, densidade e no
// alvo configuraveis, devolvendo o alvo final e o log de chamadas a
// DOM/setTopbarClass.
function render({id = 'topbarMetric', item, density = 'full', target = {textContent: 'before', title: 'before'}} = {}) {
  const calls = [];
  const context = vm.createContext({
    inputId: id,
    topbarValueCache: item === undefined ? {} : {[id]: item},
    topbarDensity: density,
    document: {getElementById(value) { calls.push(['target', value]); return target; }},
    setTopbarClass(...args) { calls.push(['class', ...args]); },
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderTopbarValue' : modulePath});
  vm.runInContext('renderTopbarValue(inputId)', context);
  return {target, calls};
}

// Quando nao existe entrada correspondente em topbarValueCache, faz o lookup no DOM
// mas encerra sem alterar textContent/title nem chamar setTopbarClass.
test('missing cache item still looks up the target and returns without mutation', () => {
  const target = {textContent: 'before', title: 'before'};
  const {calls} = render({target});
  assert.deepEqual(calls, [['target', 'topbarMetric']]);
  assert.deepEqual(target, {textContent: 'before', title: 'before'});
});

// Quando getElementById retorna null, evita erro de referencia nula e nao invoca
// setTopbarClass.
test('missing target returns without applying the cached value or class', () => {
  const item = {full: 'US$ 1.000', compact: 'US$ 1k', cls: 'positive', baseClass: 'tb-value'};
  const {calls} = render({item, target: null});
  assert.deepEqual(calls, [['target', 'topbarMetric']]);
});

// Valida a selecao de densidade ('full' vs 'compact'): o texto visivel muda para 'US$
// 1k' no modo compacto, mas title permanece 'US$ 1.000' e setTopbarClass recebe os
// mesmos argumentos.
test('topbar value preserves density selection, full title and class arguments', () => {
  const item = {full: 'US$ 1.000', compact: 'US$ 1k', cls: 'positive', baseClass: 'tb-value'};
  const full = render({item});
  assert.equal(full.target.textContent, 'US$ 1.000');
  assert.equal(full.target.title, 'US$ 1.000');
  assert.deepEqual(full.calls, [
    ['target', 'topbarMetric'],
    ['class', full.target, 'tb-value', 'positive'],
  ]);

  const compact = render({item, density: 'compact'});
  assert.equal(compact.target.textContent, 'US$ 1k');
  assert.equal(compact.target.title, 'US$ 1.000');
  assert.deepEqual(compact.calls[1], ['class', compact.target, 'tb-value', 'positive']);
});

// Confirma no index.html que app-workspace.js e carregado uma vez de forma sincrona
// antes de app.js.
test('topbar value loads once as a synchronous classic script before app consumers', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
