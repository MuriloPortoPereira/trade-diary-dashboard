const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/documents/presentation/document-media.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderDocumentMedia\([^]*?^\}/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

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
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderDocumentMedia' : modulePath});
  return {html: vm.runInContext('renderDocumentMedia(entry)', context, {filename: 'renderDocumentMedia()'}), calls};
}

test('empty media keeps distinct trade and document messages', () => {
  assert.equal(render({kind: 'trade'}, []).html, '<div class="doc-media-empty">Nenhuma imagem salva neste trade.</div>');
  assert.equal(render({kind: 'general'}, []).html, '<div class="doc-media-empty">Sem mídia vinculada a este documento.</div>');
  assert.equal(render(undefined, []).html, '<div class="doc-media-empty">Sem mídia vinculada a este documento.</div>');
});

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

test('media propagates image lookup and text conversion failures', () => {
  const lookupContext = vm.createContext({
    getDocumentEntryImages() { throw new Error('lookup failed'); },
    escapeHtml: String,
  });
  vm.runInContext(source, lookupContext);
  assert.throws(() => vm.runInContext('renderDocumentMedia({})', lookupContext), /lookup failed/);

  assert.throws(
    () => render({}, [{name: {toString() { throw new Error('name failed'); }}, dataUrl: 'x'}]),
    /name failed/,
  );
});
