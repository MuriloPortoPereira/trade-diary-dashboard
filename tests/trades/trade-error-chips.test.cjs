/*
 * Objetivo:
 *   Validar a renderizacao dos chips de erros operacionais no formulario de trades
 *   (normalizacao, deduplicacao, marcacao de selecionados, codificacao no onclick e
 *   escape HTML).
 *
 * Modulo testado:
 *   src/modules/trades/presentation/trade-form.js (funcao renderErrorChips,
 *   confirmando tambem a migracao da declaracao legada de app.js e o carregamento
 *   sincrono no index.html).
 *
 * Estrategia de isolamento:
 *   Executa o script em uma sandbox node:vm fornecendo mocks de DEFAULT_TRADE_ERRORS,
 *   selectedErrors, document.getElementById e escapeHtml. Usa Proxy para garantir que
 *   nenhuma colecao seja lida quando o container alvo do DOM nao existe.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Sem o container errorChips, retorna antes de acessar erros padrao ou
 *     selecionados.
 *   - Listas vazias limpam o innerHTML anterior do container.
 *   - Faz trim, ignora entradas vazias/nao-string/falsy, deduplica preservando a
 *     ordem, marca chips ativos com classe "on", usa encodeURIComponent no handler
 *     inline e escapeHtml no rotulo.
 *   - Nao muta os arrays de entrada (defaults e selected).
 *   - Carrega uma unica vez como script classico sincrono antes de trade-log.js e
 *     app.js.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/trades/presentation/trade-form.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderErrorChips\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

// Helper de renderizacao em VM: injeta as listas de erros padrao e selecionados, o
// elemento alvo e um espiao de escapeHtml, executando renderErrorChips() e retornando
// o alvo e o historico de chamadas.
function render({defaults = [], selected = [], target = {innerHTML: 'before'}} = {}) {
  const calls = [];
  const context = vm.createContext({
    DEFAULT_TRADE_ERRORS: defaults,
    selectedErrors: selected,
    document: {getElementById(id) { calls.push(['target', id]); return target; }},
    escapeHtml(value) { calls.push(['escape', value]); return `escaped:${value}`; },
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderErrorChips' : modulePath});
  vm.runInContext('renderErrorChips()', context);
  return {target, calls};
}

// Caso de borda quando o elemento errorChips nao existe: usa um Proxy que lanca
// excecao em qualquer acesso para comprovar retorno imediato antes de ler defaults ou
// selected.
test('missing error chip target returns before reading configured or selected errors', () => {
  const unavailable = new Proxy([], {get() { throw new Error('errors accessed'); }});
  const {calls} = render({defaults: unavailable, selected: unavailable, target: null});
  assert.deepEqual(calls, [['target', 'errorChips']]);
});

// Verifica que listas vazias de erros limpam qualquer HTML previamente renderizado no
// container.
test('empty error collections clear the existing chip grid', () => {
  const {target, calls} = render();
  assert.equal(target.innerHTML, '');
  assert.deepEqual(calls, [['target', 'errorChips']]);
});

// Valida todo o pipeline de renderizacao: limpeza de espacos, descarte de itens
// invalidos (null, '', 0), deduplicacao entre defaults e selected, aplicacao da
// classe "on" aos selecionados, codificacao URL no onclick, escape de HTML no texto
// visivel e preservacao da imutabilidade dos arrays originais.
test('error chips preserve normalization, deduplication, selection, encoding and escaping', () => {
  const defaults = [' Erro base ', '', null, 'Erro base', 'FOMO/pressa'];
  const selected = ['FOMO/pressa', ' Personalizado & risco ', 'Personalizado & risco', 0];
  const defaultsBefore = JSON.stringify(defaults);
  const selectedBefore = JSON.stringify(selected);
  const {target, calls} = render({defaults, selected});
  assert.equal(target.innerHTML,
    '<button type="button" class="err-chip " onclick="toggleTradeError(decodeURIComponent(\'Erro%20base\'))">escaped:Erro base</button>' +
    '<button type="button" class="err-chip on" onclick="toggleTradeError(decodeURIComponent(\'FOMO%2Fpressa\'))">escaped:FOMO/pressa</button>' +
    '<button type="button" class="err-chip on" onclick="toggleTradeError(decodeURIComponent(\'Personalizado%20%26%20risco\'))">escaped:Personalizado & risco</button>');
  assert.deepEqual(calls, [
    ['target', 'errorChips'],
    ['escape', 'Erro base'],
    ['escape', 'FOMO/pressa'],
    ['escape', 'Personalizado & risco'],
  ]);
  assert.equal(JSON.stringify(defaults), defaultsBefore);
  assert.equal(JSON.stringify(selected), selectedBefore);
});

// Confirma no index.html que trade-form.js carrega uma unica vez, de forma sincrona
// (sem async/defer/module), e antes de seus consumidores (trade-log.js e app.js).
test('error chips load once as a synchronous classic script before trade consumers', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src/modules/trades/presentation/trade-log.js'));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
