/*
 * Testes unitarios para a renderizacao do resumo de backup na tela de transferencia de dados.
 *
 * Modulo testado:
 * - `src/modules/data-transfer/presentation/data-transfer-page.js` (`renderBackupSummary`).
 *
 * Estrategia de isolamento:
 * - Executa o arquivo da camada de apresentacao em uma sandbox `vm.createContext`
 *   com mocks para `document.getElementById`, `createBackupPayload`, `formatBackupSummary` e `t`.
 * - Registra a sequencia exata de chamadas em `calls` para verificar curto-circuitos e ordem de efeitos.
 *
 * Regras criticas garantidas:
 * - A declaracao legada `renderBackupSummary` nao existe mais em `app.js`.
 * - Se o elemento `#backupSummary` nao existir, a funcao encerra antes de traduzir ou formatar.
 * - Quando o argumento `data` e omitido, o payload atual e resolvido via `createBackupPayload()` antes da busca no DOM.
 * - O script e carregado exatamente uma vez de forma sincrona classica em `index.html` antes de `app.js`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/data-transfer/presentation/data-transfer-page.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
// Confirma que a implementacao antiga foi removida de app.js apos a refatoracao.
const legacy = appSource.match(/^function renderBackupSummary\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

// Helper de renderizacao: prepara contexto VM com espias para DOM/payload/formatacao/traducao e invoca renderBackupSummary.
function render({data, useDefault = false, target = {textContent: 'before'}} = {}) {
  const calls = [];
  const payload = {kind: 'current'};
  const context = vm.createContext({
    input: data,
    document: {getElementById(id) { calls.push(['target', id]); return target; }},
    createBackupPayload() { calls.push(['payload']); return payload; },
    formatBackupSummary(value) { calls.push(['format', value]); return '2 trades · 1 conta'; },
    t(key, fallback) { calls.push(['translate', key, fallback]); return 'Backup traduzido'; },
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderBackupSummary' : modulePath});
  vm.runInContext(useDefault ? 'renderBackupSummary()' : 'renderBackupSummary(input)', context, {filename: modulePath});
  return {target, calls, payload, context, data};
}

// Garante que, na ausencia do elemento alvo no DOM, a funcao retorna imediatamente sem traduzir nem formatar dados explicitos.
test('missing backup summary target returns before translating or formatting explicit data', () => {
  const data = {trades: [1]};
  const {calls} = render({data, target: null});
  assert.deepEqual(calls, [['target', 'backupSummary']]);
});

// Verifica o formato final "<prefixo traduzido>: <resumo>", a ordem das chamadas e a imutabilidade do objeto de entrada.
test('backup summary preserves translated prefix, separator, formatted data and input', () => {
  const data = {trades: [{id: 1}]};
  const before = JSON.stringify(data);
  const {target, calls} = render({data});
  assert.equal(target.textContent, 'Backup traduzido: 2 trades · 1 conta');
  assert.deepEqual(calls, [
    ['target', 'backupSummary'],
    ['translate', 'backup.current', 'Backup atual'],
    ['format', data],
  ]);
  assert.equal(JSON.stringify(data), before);
});

// Valida o parametro padrao da funcao: ao omitir `data`, `createBackupPayload()` e avaliado antes da consulta ao elemento DOM.
test('omitted data resolves the current backup payload before looking up the target', () => {
  const {target, calls, payload} = render({useDefault: true});
  assert.equal(target.textContent, 'Backup traduzido: 2 trades · 1 conta');
  assert.deepEqual(calls, [
    ['payload'],
    ['target', 'backupSummary'],
    ['translate', 'backup.current', 'Backup atual'],
    ['format', payload],
  ]);
});

// Verifica em index.html que o modulo de apresentacao e incluido uma unica vez como script sincrono classico antes de app.js.
test('backup summary loads once as a synchronous classic script before its consumers', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
