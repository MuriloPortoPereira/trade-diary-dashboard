/*
 * Testes unitarios para a renderizacao do seletor de contas na exportacao
 * personalizada.
 *
 * Modulo testado:
 * - `src/modules/data-transfer/presentation/data-transfer-page.js`
 *   (`renderExportAccountFilter`).
 *
 * Estrategia de isolamento:
 * - Executa o modulo em `vm.createContext` com um mock minimo de `<select>`
 *   (`createSelect`) e espias para `document.getElementById` e `escapeHtml`.
 * - Em um dos testes usa `Proxy` no array `accounts` para assegurar que a colecao nao
 *   e lida quando o elemento `<select>` nao existe no DOM.
 *
 * Regras criticas garantidas:
 * - A declaracao legada foi removida de `app.js`.
 * - Opcao inicial padrao `Todas` com valor vazio, seguida das contas na ordem
 *   original.
 * - Nomes de conta passam por `escapeHtml` para prevenir XSS, mantendo os IDs
 *   intactos.
 * - Selecao anterior valida e preservada; selecao de conta inexistente e limpa para
 *   `''`.
 * - Inclusao unica e sincrona do script em `index.html` antes de `app.js`.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/data-transfer/presentation/data-transfer-page.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

// Garante que a funcao legada ja foi migrada para fora de app.js.
const legacy = appSource.match(/^function renderExportAccountFilter\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

// Cria um mock de elemento <select> que sincroniza `options` automaticamente quando
// `innerHTML` e atualizado.
function createSelect(value = '') {
  let html = '';
  return {
    value,
    options: [],
    get innerHTML() { return html; },
    set innerHTML(next) {
      html = next;
      this.options = [...next.matchAll(/<option value="([^"]*)">/g)].map(match => ({value: match[1]}));
    },
  };
}

// Monta a sandbox VM com `accounts`, `escapeHtml` e `document.getElementById`,
// executando `renderExportAccountFilter()`.
function render({accounts = [], select = createSelect(), escapeHtml = value => `escaped:${value}`} = {}) {
  const calls = [];
  const context = vm.createContext({
    accounts,
    escapeHtml(value) { calls.push(value); return escapeHtml(value); },
    document: {getElementById(id) { calls.push(id); return select; }},
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderExportAccountFilter' : modulePath});
  vm.runInContext('renderExportAccountFilter()', context);
  return {select, calls};
}

// Verifica retorno antecipado quando #exportAccount esta ausente, comprovando via
// Proxy que `accounts` nem sequer e acessado.
test('missing export account select returns before reading accounts', () => {
  const accounts = new Proxy([], {get() { throw new Error('accounts accessed'); }});
  const {calls} = render({accounts, select: null});
  assert.deepEqual(calls, ['exportAccount']);
});

// Garante ordem preservada das opcoes, IDs brutos no atributo `value`, escape HTML
// dos nomes e nao mutacao do array `accounts`.
test('export account options preserve order, raw ids and escaped names', () => {
  const accounts = [
    {id: 'first', name: 'Conta <Principal>'},
    {id: 'second', name: 'Conta & Reserva'},
  ];
  const before = JSON.stringify(accounts);
  const {select, calls} = render({accounts, escapeHtml: value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')});
  assert.equal(select.innerHTML, '<option value="">Todas</option><option value="first">Conta &lt;Principal&gt;</option><option value="second">Conta &amp; Reserva</option>');
  assert.deepEqual(calls, ['exportAccount', 'Conta <Principal>', 'Conta & Reserva']);
  assert.equal(JSON.stringify(accounts), before);
});

// Confirma que uma conta selecionada ainda existente e mantida, enquanto uma conta
// removida reseta o filtro para '' ("Todas").
test('export account filter retains an existing selection and clears a missing one', () => {
  const accounts = [{id: 'first', name: 'Primeira'}, {id: 'second', name: 'Segunda'}];
  assert.equal(render({accounts, select: createSelect('second')}).select.value, 'second');
  assert.equal(render({accounts, select: createSelect('removed')}).select.value, '');
});

// Valida em index.html que o script de apresentacao carrega uma vez, sem
// async/defer/module, antes de app.js.
test('export account filter loads once as a synchronous classic script before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
