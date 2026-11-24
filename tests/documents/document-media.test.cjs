/*
 * Objetivo: Validar a renderizacao da galeria de midia vinculada a documentos e trades
 * (`renderDocumentMedia`), cobrindo estados vazios, escape de atributos e propagacao de falhas.
 * Modulo/arquivo testado: funcao `renderDocumentMedia` em
 * `src/modules/documents/presentation/documents-page.js` (confirmando remocao de `app.js`).
 * Estrategia de isolamento: executa o bloco extraido em `node:vm`, reinstalando o spy de
 * `getDocumentEntryImages` apos o carregamento do codigo para interceptar a resolucao de imagens,
 * junto com um mock completo de `escapeHtml`.
 * Pontos-chave garantidos: mensagens vazias distintas entre trade e documento geral, preservacao
 * da ordem e das `data:` URLs, escape seguro do atributo `alt` com fallback `"Mídia vinculada"`,
 * indices de `removeDocumentImage`, nao mutacao do array, propagacao de erros e ordem de script.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/documents/presentation/documents-page.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderDocumentMedia\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const moduleSource = fs.readFileSync(path.join(root, modulePath), 'utf8');
const sources = [moduleSource, fs.readFileSync(path.join(root, 'src/modules/trades/domain/trade-rules.js'), 'utf8')];
const source = ["formatDocDate", "normalizeDocImages", "formatDocumentSelection", "getDocumentEntryImages", "renderDocumentMedia", "renderDocFolderIcon"].map(name => sources.map(source => source.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))).find(Boolean)[0]).join('\n\n');

/*
 * Helper de renderizacao em sandbox: prepara um contexto `vm` com `entry`, spy de
 * `getDocumentEntryImages` (reaplicado apos `vm.runInContext` para prevalecer sobre a definicao
 * extraida no bundle) e `escapeHtml`, retornando o HTML renderizado e o historico de chamadas.
 */
function render(entry, images) {
  const calls = [];
  const context = vm.createContext({
    entry,
    getDocumentEntryImages(value) {
      calls.push(value);
      return images;
    },
    escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    },
  });
  const lookup = context.getDocumentEntryImages;
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderDocumentMedia' : modulePath});
  context.getDocumentEntryImages = lookup;
  return {html: vm.runInContext('renderDocumentMedia(entry)', context, {filename: 'renderDocumentMedia()'}), calls};
}

/*
 * Estados vazios diferenciados: entradas `kind: 'trade'` exibem aviso especifico de trade,
 * enquanto documentos gerais ou `undefined` exibem a mensagem generica de documento sem midia.
 */
test('empty media keeps distinct trade and document messages', () => {
  assert.equal(render({kind: 'trade'}, []).html, '<div class="doc-media-empty">Nenhuma imagem salva neste trade.</div>');
  assert.equal(render({kind: 'general'}, []).html, '<div class="doc-media-empty">Sem mídia vinculada a este documento.</div>');
  assert.equal(render(undefined, []).html, '<div class="doc-media-empty">Sem mídia vinculada a este documento.</div>');
});

/*
 * Renderizacao de galeria: garante ordem das miniaturas, preservacao integra das `data:` URLs,
 * escape HTML no atributo `alt`, texto padrao `"Mídia vinculada"` para nome vazio, handlers
 * `removeDocumentImage(0/1)`, chamada unica ao lookup e imutabilidade da colecao de imagens.
 */
test('media preserves order, raw data URLs, escaped alt text and removal indices', () => {
  const images = [
    {name: 'Antes <&"', dataUrl: 'data:image/png;base64,first'},
    {name: '', dataUrl: 'data:image/jpeg;base64,second'},
  ];
  const {html, calls} = render({id: 'doc:1'}, images);
  assert.ok(html.indexOf('first') < html.indexOf('second'));
  assert.match(html, /src="data:image\/png;base64,first"/);
  assert.match(html, /alt="Antes &lt;&amp;&quot;"/);
  assert.match(html, /alt="Mídia vinculada"/);
  assert.match(html, /onclick="removeDocumentImage\(0\)"/);
  assert.match(html, /onclick="removeDocumentImage\(1\)"/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].id, 'doc:1');
  assert.deepEqual(images, [
    {name: 'Antes <&"', dataUrl: 'data:image/png;base64,first'},
    {name: '', dataUrl: 'data:image/jpeg;base64,second'},
  ]);
});

/*
 * Propagacao de erros: garante que `renderDocumentMedia` nao engole excecoes lancadas durante
 * a busca de imagens (`getDocumentEntryImages`) nem na conversao de texto do nome da imagem.
 */
test('media propagates image lookup and text conversion failures', () => {
  const lookupContext = vm.createContext({
    getDocumentEntryImages() { throw new Error('lookup failed'); },
    escapeHtml: String,
  });
  const lookup = lookupContext.getDocumentEntryImages;
  vm.runInContext(source, lookupContext);
  lookupContext.getDocumentEntryImages = lookup;
  assert.throws(() => vm.runInContext('renderDocumentMedia({})', lookupContext), /lookup failed/);

  assert.throws(
    () => render({}, [{name: {toString() { throw new Error('name failed'); }}, dataUrl: 'x'}]),
    /name failed/,
  );
});

/*
 * Contrato de carregamento: confirma inclusao unica e sincrona de `documents-page.js` em
 * `index.html` antes de `app.js`.
 */
test('document media loads once as a synchronous classic script before its consumer', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});