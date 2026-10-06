const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const modulePath = 'src/shared/presentation/status-list.js';
const legacy = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/^function renderStatusList\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

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

test('status list preserves default and custom empty messages', () => {
  assert.match(render([]), /Sem alertas críticos[^]*Nada para mostrar no momento\./);
  assert.match(render([], {emptyMessage: 'Sem avisos'}), /Sem alertas críticos[^]*Sem avisos/);
  assert.equal((render([]).match(/class="status-item info"/g) ?? []).length, 1);
});

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

test('missing target returns before accessing items; null items still throws when target exists', () => {
  assert.equal(render(null, {visible: false}), 'before');
  assert.throws(() => render(null), /length/);
});

test('legacy empty message and action handlers retain their existing interpolation behavior', () => {
  assert.match(render([], {emptyMessage: '<b>raw</b>'}), /<b>raw<\/b>/);
  const html = render([{tone: 'custom', actionFn: 'run("x")', actionLabel: '<Open>'}]);
  assert.match(html, /status-item custom/);
  assert.match(html, /onclick="run\("x"\)"/);
  assert.match(html, /&lt;Open&gt;/);
});

test('status list loads once as a synchronous classic script before its consumers', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)].filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src/modules/psychology/presentation/psychology-statistics.js'));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
