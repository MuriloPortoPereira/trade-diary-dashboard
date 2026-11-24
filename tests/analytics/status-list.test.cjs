/*
 * Objetivo:
 *   Validar o widget reutilizavel de lista de status/alertas (`renderStatusList`),
 *   cobrindo mensagens de estado vazio, ordenacao, escape HTML, precedencia entre acoes
 *   (`actionFn` vs `actionPage`), guard clauses e compatibilidade com comportamento legado.
 *
 * Modulo da aplicacao testado:
 *   - `src/shared/presentation/analysis-widgets.js` (funcao `renderStatusList`)
 *   - Remocao da declaracao legada em `app.js` e ordem de carga em `index.html`
 *
 * Estrategia de isolamento:
 *   - Extrai apenas `renderStatusList` do modulo compartilhado e a executa em `node:vm`
 *     com mock de `document.getElementById` e `escapeHtml` completo.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Estado vazio exibe bloco `info` com titulo "Sem alertas críticos" e mensagem padrao ou customizada.
 *   - Itens preenchidos preservam ordem, tom (fallback `info`), titulo (fallback `Atualização`),
 *     escape HTML de conteudo e imutabilidade do array original.
 *   - Regras de truthiness para `value` (`0` e `false` ocultam, `'0'` exibe) e precedencia de `actionFn` sobre `actionPage`.
 *   - Alvo DOM ausente retorna antes de ler `items`; ja `items = null` com alvo existente lanca erro de `.length`.
 *   - Preservacao do comportamento legado de interpolacao em `emptyMessage` e `actionFn`, escapando `actionLabel`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
// Confirma que `renderStatusList` saiu de `app.js` e extrai sua declaracao de `analysis-widgets.js`.
const root = path.resolve(__dirname, '../..');
const modulePath = 'src/shared/presentation/analysis-widgets.js';
const legacy = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/^function renderStatusList\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const moduleSource = fs.readFileSync(path.join(root, modulePath), 'utf8');
const source = ["renderStatusList"].map(name => moduleSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))[0]).join('\n\n');

// Auxiliar de renderizacao em sandbox `vm`: prepara o container `'target'` (ou `null` quando
// `visible: false`), injeta `escapeHtml` completo e permite invocar com ou sem o terceiro argumento `emptyMessage`.
function render(items, {visible = true, emptyMessage} = {}) {
  const node = {innerHTML: 'before'}, context = vm.createContext({
    document: {getElementById(id) { assert.equal(id, 'target'); return visible ? node : null; }},
    escapeHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'),
    items,
  });
  vm.runInContext(source, context);
  assert.equal(vm.runInContext(emptyMessage === undefined ? 'renderStatusList("target", items)' : `renderStatusList("target", items, ${JSON.stringify(emptyMessage)})`, context), undefined);
  return node.innerHTML;
}

// Verifica a renderizacao de lista vazia tanto com a mensagem padrao ("Nada para mostrar no momento.")
// quanto com mensagem customizada, gerando exatamente um item com classe `status-item info`.
test('status list preserves default and custom empty messages', () => {
  assert.match(render([]), /Sem alertas críticos[^]*Nada para mostrar no momento\./);
  assert.match(render([], {emptyMessage: 'Sem avisos'}), /Sem alertas críticos[^]*Sem avisos/);
  assert.equal((render([]).match(/class="status-item info"/g) ?? []).length, 1);
});

// Garante que itens preenchidos mantem a ordem de entrada, aplicam tom `warn` ou fallback `info`,
// escapam caracteres HTML em titulo/resumo/valor, usam titulo padrao "Atualização" e nao mutam `before`.
test('filled rows preserve order, tones, fallback title and HTML escaping', () => {
  const before = [
    {tone: 'warn', title: '<Alerta>', summary: 'a & b', value: '3 < 5'},
    {summary: 'segundo'},
  ];
  const snapshot = JSON.stringify(before);
  const html = render(before);
  assert.equal((html.match(/class="status-item /g) ?? []).length, 2);
  assert.ok(html.indexOf('&lt;Alerta&gt;') < html.indexOf('segundo'));
  assert.match(html, /status-item warn/);
  assert.match(html, /status-item info/);
  assert.match(html, /a &amp; b/);
  assert.match(html, /3 &lt; 5/);
  assert.match(html, /Atualização/);
  assert.equal(JSON.stringify(before), snapshot);
});

// Valida as regras de exibicao de valor e acao: `value` so e renderizado quando truthy (apenas `'0'`,
// excluindo `0` e `false`), `actionFn` prevalece sobre `actionPage`, e `actionLabel` ausente assume `'Abrir'`.
test('value and action controls retain truthy rules and action precedence', () => {
  const html = render([
    {value: 0, actionFn: 'openLegacy()', actionPage: 'profile', actionLabel: 'Ver'},
    {value: '0', actionPage: 'log'},
    {value: false},
  ]);
  assert.equal((html.match(/class="status-item-value"/g) ?? []).length, 1);
  assert.match(html, /onclick="openLegacy\(\)"/);
  assert.doesNotMatch(html, /showPage\('profile'\)/);
  assert.match(html, /onclick="showPage\('log'\)"/);
  assert.match(html, />Abrir<\/button>/);
});

// Testa o contrato de erro/guard clause: sem alvo DOM a funcao retorna antes de inspecionar `items`
// (mantendo `'before'`), mas com alvo presente `items = null` continua lancando TypeError ao ler `.length`.
test('missing target returns before accessing items; null items still throws when target exists', () => {
  assert.equal(render(null, {visible: false}), 'before');
  assert.throws(() => render(null), /length/);
});

// Documenta e preserva o comportamento legado exato de interpolacao: `emptyMessage` e `actionFn`
// nao sao escapados (compatibilidade com chamadores existentes), enquanto `actionLabel` e escapado.
test('legacy empty message and action handlers retain their existing interpolation behavior', () => {
  assert.match(render([], {emptyMessage: '<b>raw</b>'}), /<b>raw<\/b>/);
  const html = render([{tone: 'custom', actionFn: 'run("x")', actionLabel: '<Open>'}]);
  assert.match(html, /status-item custom/);
  assert.match(html, /onclick="run\("x"\)"/);
  assert.match(html, /&lt;Open&gt;/);
});

// Garante que `analysis-widgets.js` carrega uma unica vez de forma sincrona classica em `index.html`
// antes de `psychology-page.js` e `app.js`.
test('status list loads once as a synchronous classic script before its consumers', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)].filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src/modules/psychology/presentation/psychology-page.js'));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
