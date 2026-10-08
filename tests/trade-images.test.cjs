const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/trades/presentation/trade-images.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderImagePreviews\([^]*?^\}/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

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

test('missing trade image preview returns before reading the image list', () => {
  const images = new Proxy([], {get() { throw new Error('tradeImages accessed'); }});
  const {calls} = render(images, null);
  assert.deepEqual(calls, ['t-images-preview']);
});

test('empty trade image list clears the existing preview', () => {
  const {preview} = render([]);
  assert.equal(preview.innerHTML, '');
});

test('trade image previews preserve order, raw fields, styles and removal indices', () => {
  const images = [
    {name: 'Antes <setup>', dataUrl: 'data:image/png;base64,AAA'},
    {name: 'Depois & saída', dataUrl: 'blob:trade-image'},
  ];
  const before = JSON.stringify(images);
  const {preview} = render(images);
  assert.match(preview.innerHTML, /^<div style="position:relative;display:inline-block">/);
  assert.ok(preview.innerHTML.indexOf('data:image/png;base64,AAA') < preview.innerHTML.indexOf('blob:trade-image'));
  assert.match(preview.innerHTML, /title="Antes <setup>"/);
  assert.match(preview.innerHTML, /title="Depois & saída"/);
  assert.match(preview.innerHTML, /onclick="removeTradeImage\(0\)"/);
  assert.match(preview.innerHTML, /onclick="removeTradeImage\(1\)"/);
  assert.equal((preview.innerHTML.match(/width:80px;height:60px/g) || []).length, 2);
  assert.equal(JSON.stringify(images), before);
});
