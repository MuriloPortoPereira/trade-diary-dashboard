const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const {templateFiles, outputFile, renderTemplate} = require('../scripts/build-study-hub-template.cjs');
const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'src/modules/study-hub/presentation/study-hub-legacy-runtime.js'), 'utf8');
const mount = runtime.slice(0, runtime.indexOf('\n})();') + '\n})();'.length);

function mountedMarkup() {
  const host = {dataset: {}, classList: {add() {}}, innerHTML: ''};
  const context = vm.createContext({document: {getElementById: () => host}});
  vm.runInContext(fs.readFileSync(path.join(root, outputFile), 'utf8'), context);
  vm.runInContext(mount, context);
  return host.innerHTML;
}

test('StudyHub mounting preserves every UTF-8 byte of the existing template', () => {
  // Baseline b24cbed: actual string assigned to the host, not the encoded JS literal.
  const html = mountedMarkup();
  assert.equal(Buffer.byteLength(html), 151521);
  assert.equal(createHash('sha256').update(html).digest('hex'),
    '771f9d34ce5cde2f7e234eca7281c5fee9aa7eeae8cd0450218c63abb85f337d');
});

test('StudyHub template retains four module roots in order and its classic event bridges', () => {
  const html = mountedMarkup();
  const roots = ['mod-propfirm', 'mod-plano', 'mod-tradesim', 'mod-mental'];
  let previous = -1;
  for (const id of roots) {
    const at = html.indexOf(`id="${id}"`);
    assert.ok(at > previous); previous = at;
  }
  for (const handler of ['sh_pfTab', 'sh_ptTab', 'sh_tsRunAll', 'sh_fmSimular']) assert.ok(html.includes(handler));
  assert.equal(html.endsWith('\n'), false);
});

test('committed template asset is a deterministic compilation of the four authored HTML files', () => {
  const parts = templateFiles.map(file => fs.readFileSync(path.join(root, file), 'utf8'));
  const generated = renderTemplate(parts);
  assert.equal(fs.readFileSync(path.join(root, outputFile), 'utf8'), generated);
  const sandbox = {};
  for (const name of ['document', 'localStorage', 'fetch']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`template accessed ${name}`); }});
  }
  vm.runInContext(generated, vm.createContext(sandbox));
  assert.equal(sandbox.TradeDiaryStudyHubTemplate, mountedMarkup());
});

test('template generator preserves quotes, backslashes, literal interpolation text and Unicode', () => {
  const parts = ['<p title="a">${value} \\ path</p>\n', '<p>á &amp; a,b</p>\n',
    '<p>line\u2028separator\u2029end</p>\n', '<p>fim</p>\n'];
  const sandbox = {};
  vm.runInNewContext(renderTemplate(parts), sandbox);
  assert.equal(sandbox.TradeDiaryStudyHubTemplate,
    '<p title="a">${value} \\ path</p>\n\n<p>á &amp; a,b</p>\n\n<p>line\u2028separator\u2029end</p>\n\n<p>fim</p>');
  assert.throws(() => renderTemplate(parts.slice(0, 3)), /four/);
  assert.throws(() => renderTemplate([...parts.slice(0, 3), 'missing LF']), /LF/);
});
