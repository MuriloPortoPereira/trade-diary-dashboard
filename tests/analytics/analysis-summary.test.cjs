/*
 * Objetivo:
 *   Validar o comportamento de renderizacao do widget de resumo de analise
 *   (`renderAnalysisSummary`), garantindo a preservacao do contrato legado apos
 *   sua extracao de `app.js` para a camada compartilhada de apresentacao.
 *
 * Modulo da aplicacao testado:
 *   - `src/shared/presentation/analysis-widgets.js` (funcao `renderAnalysisSummary`)
 *   - Integridade de remocao em `app.js` e ordem de carregamento em `index.html`
 *
 * Estrategia de isolamento:
 *   - Verifica no carregamento do teste que a declaracao legada foi removida de `app.js`.
 *   - Extrai apenas a funcao `renderAnalysisSummary` do modulo-alvo via regex e a executa
 *     em uma sandbox isolada de `node:vm`, injetando mocks minimos de `document.getElementById`
 *     e `escapeHtml` sem depender de navegador ou estado global da aplicacao.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Preservacao da ordem dos chips, classes de tom (`safe`, `danger`), valores e escape HTML.
 *   - Imutabilidade do array de entrada passado para a renderizacao.
 *   - Filtragem de itens falsy e manutencao dos defaults legados (como o travessao "—" e tom vazio).
 *   - Limpeza segura do container para listas vazias, entradas nao-array ou argumento omitido.
 *   - Retorno antecipado (guard clause) quando o elemento alvo nao existe no DOM, sem ler `items`.
 *   - Inclusao unica como script classico sincrono em `index.html` antes dos consumidores.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Resolve a raiz do projeto, confirma que `renderAnalysisSummary` nao existe mais em `app.js`
// e extrai somente a declaracao dessa funcao do modulo compartilhado de widgets.
const root = path.resolve(__dirname, '../..');
const modulePath = 'src/shared/presentation/analysis-widgets.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderAnalysisSummary\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const moduleSource = fs.readFileSync(path.join(root, modulePath), 'utf8');
const source = ["renderAnalysisSummary"].map(name => moduleSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))[0]).join('\n\n');

// Auxiliar de renderizacao em sandbox `vm`: cria um no DOM simulado com `innerHTML: 'before'`,
// valida que a consulta usa o id esperado (`'target'`), fornece `escapeHtml` realista para
// detectar regressao de XSS/escape e retorna o HTML final gravado no container.
function render(items, visible = true) {
  const node = {innerHTML: 'before'};
  const context = vm.createContext({
    document: {getElementById(id) { assert.equal(id, 'target'); return visible ? node : null; }},
    escapeHtml(value) {
      return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    },
    items,
  });
  vm.runInContext(source, context, {filename: modulePath});
  assert.equal(vm.runInContext('renderAnalysisSummary("target", items)', context), undefined);
  return node.innerHTML;
}

// Garante que multiplos chips sao renderizados na ordem original, aplicando corretamente as
// classes de tom, escapando caracteres especiais em rotulos/valores/subtitulos e sem mutar `items`.
test('analysis summary preserves order, tones, values and escaping', () => {
  const items = [
    {tone: 'safe', label: '<Forte>', value: '10 & 2', sub: 'primeiro'},
    {tone: 'danger', label: 'Fraco', value: '0', sub: '<risco>'},
  ];
  const before = JSON.stringify(items);
  const html = render(items);
  assert.equal((html.match(/class="analysis-summary-chip /g) ?? []).length, 2);
  assert.ok(html.indexOf('&lt;Forte&gt;') < html.indexOf('Fraco'));
  assert.match(html, /analysis-summary-chip safe/);
  assert.match(html, /analysis-summary-chip danger/);
  assert.match(html, /10 &amp; 2/);
  assert.match(html, /&lt;risco&gt;/);
  assert.equal(JSON.stringify(items), before);
});

// Verifica o caso de borda de itens falsy e campos ausentes ou zerados: entradas `null`/`false`/
// `undefined` sao descartadas, enquanto objetos vazios ou com `0` preservam o fallback legado ("—" e tom vazio).
test('falsy items are filtered while missing fields keep legacy defaults', () => {
  const html = render([null, false, undefined, {}, {value: 0, tone: 0, label: 0, sub: 0}]);
  assert.equal((html.match(/class="analysis-summary-chip /g) ?? []).length, 2);
  assert.equal((html.match(/analysis-summary-value">—/g) ?? []).length, 2);
  assert.equal((html.match(/analysis-summary-chip "/g) ?? []).length, 2);
});

// Confirma que listas vazias, tipos invalidos (`null`, string) ou chamada sem o segundo parametro
// limpam o conteudo anterior do elemento alvo sem lancar excecao.
test('empty, non-array and default items clear existing content', () => {
  assert.equal(render([]), '');
  assert.equal(render(null), '');
  assert.equal(render('invalid'), '');
  const context = vm.createContext({
    document: {getElementById() { return {innerHTML: 'before'}; }},
    escapeHtml: String,
  });
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('renderAnalysisSummary("target")', context), undefined);
});

// Testa a protecao de alvo ausente usando um Proxy que lanca erro em qualquer acesso:
// se o elemento DOM nao existir, a funcao deve encerrar imediatamente antes de tocar em `items`.
test('missing target returns before reading or normalizing items', () => {
  const throwing = new Proxy([], {get() { throw new Error('items accessed'); }});
  assert.equal(render(throwing, false), 'before');
});

// Assegura que o script do widget esta registrado exatamente uma vez em `index.html`, de forma
// sincrona classica (sem `async`, `defer` ou `type="module"`) e carregado antes de `psychology-page.js` e `app.js`.
test('analysis summary loads once as a synchronous classic script before consumers', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src/modules/psychology/presentation/psychology-page.js'));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
