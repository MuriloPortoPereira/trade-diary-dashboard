/*
 * Objetivo:
 *   Validar a renderizacao das miniaturas (previews) de imagens anexadas a um trade no formulario
 *   (ordem, atributos src/title brutos, estilos inline e indices dos botoes de remocao).
 *
 * Modulo testado:
 *   src/modules/trades/presentation/trade-form.js
 *   (funcao renderImagePreviews, verificando tambem a migracao da declaracao legada de app.js
 *   e o registro sincrono no index.html).
 *
 * Estrategia de isolamento:
 *   Executa o modulo em uma sandbox node:vm fornecendo apenas tradeImages e um stub minimalista
 *   de document.getElementById. Usa Proxy no caso de container ausente para assegurar retorno antecipado.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Sem o elemento t-images-preview, retorna antes de acessar o array tradeImages.
 *   - Lista vazia de imagens limpa o conteudo HTML anterior do preview.
 *   - Preserva a ordem exata das imagens, URLs (dataUrl/blob), titulos brutos, dimensoes 80x60
 *     e indices sequenciais em removeTradeImage(i), sem mutar o array original.
 *   - Carrega uma unica vez como script classico sincrono antes de app.js.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/trades/presentation/trade-form.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderImagePreviews\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

// Helper de renderizacao em VM: injeta o array `images` em tradeImages e um elemento simulado
// de preview, executa renderImagePreviews() e retorna o elemento atualizado junto com os IDs consultados.
function render(images, preview = {innerHTML: 'before'}) {
  const calls = [];
  const context = vm.createContext({
    tradeImages: images,
    document: {getElementById(id) { calls.push(id); return preview; }},
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderImagePreviews' : modulePath});
  vm.runInContext('renderImagePreviews()', context);
  return {preview, calls};
}

// Caso de borda sem o container t-images-preview no DOM: um Proxy que dispara erro em qualquer leitura
// comprova que a funcao retorna imediatamente sem tocar em tradeImages.
test('missing trade image preview returns before reading the image list', () => {
  const images = new Proxy([], {get() { throw new Error('tradeImages accessed'); }});
  const {calls} = render(images, null);
  assert.deepEqual(calls, ['t-images-preview']);
});

// Verifica que uma lista vazia substitui o HTML previo do container por string vazia.
test('empty trade image list clears the existing preview', () => {
  const {preview} = render([]);
  assert.equal(preview.innerHTML, '');
});

// Valida o HTML completo gerado para multiplas imagens: ordem preservada (dataUrl antes de blob),
// campos title sem alteracao, estilos inline de miniatura e botao de exclusao com indices 0 e 1,
// garantindo tambem imutabilidade do array de entrada.
test('trade image previews preserve order, raw fields, styles and removal indices', () => {
  const images = [
    {name: 'Antes <setup>', dataUrl: 'data:image/png;base64,AAA'},
    {name: 'Depois & saída', dataUrl: 'blob:trade-image'},
  ];
  const before = JSON.stringify(images);
  const {preview} = render(images);
  assert.equal(preview.innerHTML,
    '<div style="position:relative;display:inline-block"><img src="data:image/png;base64,AAA" style="width:80px;height:60px;object-fit:cover;border-radius:6px;border:1px solid var(--border2)" title="Antes <setup>"><button onclick="removeTradeImage(0)" style="position:absolute;top:-4px;right:-4px;background:var(--red);border:none;border-radius:50%;width:16px;height:16px;color:white;font-size:10px">✕</button></div>' +
    '<div style="position:relative;display:inline-block"><img src="blob:trade-image" style="width:80px;height:60px;object-fit:cover;border-radius:6px;border:1px solid var(--border2)" title="Depois & saída"><button onclick="removeTradeImage(1)" style="position:absolute;top:-4px;right:-4px;background:var(--red);border:none;border-radius:50%;width:16px;height:16px;color:white;font-size:10px">✕</button></div>');
  assert.match(preview.innerHTML, /^<div style="position:relative;display:inline-block">/);
  assert.ok(preview.innerHTML.indexOf('data:image/png;base64,AAA') < preview.innerHTML.indexOf('blob:trade-image'));
  assert.match(preview.innerHTML, /title="Antes <setup>"/);
  assert.match(preview.innerHTML, /title="Depois & saída"/);
  assert.match(preview.innerHTML, /onclick="removeTradeImage\(0\)"/);
  assert.match(preview.innerHTML, /onclick="removeTradeImage\(1\)"/);
  assert.equal((preview.innerHTML.match(/width:80px;height:60px/g) || []).length, 2);
  assert.equal(JSON.stringify(images), before);
});

// Confirma no index.html que trade-form.js e incluido uma unica vez como script classico sincrono antes de app.js.
test('trade image previews load once as a synchronous classic script before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
