/*
 * Objetivo: Validar a geracao de icones SVG decorativos das pastas e acoes do modulo de
 * documentos (`renderDocFolderIcon`).
 * Modulo/arquivo testado: funcao `renderDocFolderIcon` em
 * `src/modules/documents/presentation/documents-page.js` (confirmando remocao de `app.js`).
 * Estrategia de isolamento: extrai as funcoes auxiliares de documentos e executa em contexto
 * `node:vm` puro, sem necessidade de DOM ou estado global.
 * Pontos-chave garantidos: wrapper `.doc-folder-icon` com `aria-hidden="true"` para acessibilidade,
 * geometria SVG distinta para cada tipo suportado (`plus`, `calendar`, `file`, `folder`), fallback
 * para `'file'` em entradas invalidas/ausentes e carregamento sincrono antes de `app.js`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/documents/presentation/documents-page.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderDocFolderIcon\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const moduleSource = fs.readFileSync(path.join(root, modulePath), 'utf8');
const sources = [moduleSource, fs.readFileSync(path.join(root, 'src/modules/trades/domain/trade-rules.js'), 'utf8')];
const source = ["formatDocDate", "normalizeDocImages", "formatDocumentSelection", "getDocumentEntryImages", "renderDocumentMedia", "renderDocFolderIcon"].map(name => sources.map(source => source.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))).find(Boolean)[0]).join('\n\n');

/*
 * Helper de execucao em sandbox: cria um contexto `vm` minimo, avalia o codigo extraido e invoca
 * `renderDocFolderIcon` passando `type` ou sem argumentos (`useArgument: false`).
 */
function icon(type, useArgument = true) {
  const context = vm.createContext({type});
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderDocFolderIcon' : modulePath});
  return vm.runInContext(useArgument ? 'renderDocFolderIcon(type)' : 'renderDocFolderIcon()', context);
}

/*
 * Contrato estrutural e de acessibilidade: todos os quatro tipos suportados compartilham o mesmo
 * wrapper `<span class="doc-folder-icon">` envolvendo um `<svg viewBox="0 0 24 24" aria-hidden="true">`.
 */
test('folder icons keep the shared wrapper and accessible SVG contract', () => {
  for (const type of ['plus', 'calendar', 'file', 'folder']) {
    const html = icon(type);
    assert.match(html, /^<span class="doc-folder-icon"><svg viewBox="0 0 24 24" aria-hidden="true">/);
    assert.match(html, /<\/svg><\/span>$/);
  }
});

/*
 * Identidade visual por tipo: garante que `plus`, `calendar`, `file` e `folder` mantem seus
 * respectivos comandos de `path` SVG sem regressoes.
 */
test('each supported folder type preserves its distinct path data', () => {
  assert.match(icon('plus'), /M12 5v14M5 12h14/);
  assert.match(icon('calendar'), /M7 3v4M17 3v4M4 9h16/);
  assert.match(icon('file'), /M14 3v5h5M9 13h6M9 17h4/);
  assert.match(icon('folder'), /M3 7h7l2 2h9v10/);
});

/*
 * Fallback defensivo: tipo desconhecido (`'missing'`), string vazia, `null` e chamada sem
 * argumento devem produzir exatamente o mesmo HTML do icone `'file'`.
 */
test('unknown, empty, null and omitted types retain the file fallback', () => {
  const file = icon('file');
  assert.equal(icon('missing'), file);
  assert.equal(icon(''), file);
  assert.equal(icon(null), file);
  assert.equal(icon(undefined, false), file);
});

/*
 * Contrato de carregamento: assegura que `documents-page.js` aparece uma unica vez como script
 * classico sincrono em `index.html` antes de `app.js`.
 */
test('folder icons load once as a synchronous classic script before documents page', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});