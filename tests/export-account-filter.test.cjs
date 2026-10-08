const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/data-transfer/presentation/export-account-filter.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderExportAccountFilter\([^]*?^\}/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

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

test('missing export account select returns before reading accounts', () => {
  const accounts = new Proxy([], {get() { throw new Error('accounts accessed'); }});
  const {calls} = render({accounts, select: null});
  assert.deepEqual(calls, ['exportAccount']);
});

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

test('export account filter retains an existing selection and clears a missing one', () => {
  const accounts = [{id: 'first', name: 'Primeira'}, {id: 'second', name: 'Segunda'}];
  assert.equal(render({accounts, select: createSelect('second')}).select.value, 'second');
  assert.equal(render({accounts, select: createSelect('removed')}).select.value, '');
});

test('export account filter loads once as a synchronous classic script before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
