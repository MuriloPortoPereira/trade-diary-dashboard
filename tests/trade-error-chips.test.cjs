const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/trades/presentation/trade-error-chips.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderErrorChips\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

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

test('missing error chip target returns before reading configured or selected errors', () => {
  const unavailable = new Proxy([], {get() { throw new Error('errors accessed'); }});
  const {calls} = render({defaults: unavailable, selected: unavailable, target: null});
  assert.deepEqual(calls, [['target', 'errorChips']]);
});

test('empty error collections clear the existing chip grid', () => {
  const {target, calls} = render();
  assert.equal(target.innerHTML, '');
  assert.deepEqual(calls, [['target', 'errorChips']]);
});

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

test('error chips load once as a synchronous classic script before trade consumers', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src/modules/trades/presentation/trade-images.js'));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
