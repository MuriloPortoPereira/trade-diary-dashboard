const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/analytics/presentation/dashboard-equity-mode.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function toggleEqMode\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

test('equity mode loads once as a classic script after dashboard and before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf('src/modules/analytics/presentation/dashboard-page.js') < html.indexOf(modulePath));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});

function toggle(initialMode, {withButton = true} = {}) {
  const calls = [];
  let mode = initialMode;
  const button = withButton ? {
    value: 'before',
    set textContent(value) { this.value = value; calls.push(['text', value]); },
    get textContent() { return this.value; },
  } : null;
  const sandbox = {
    document: {getElementById(id) { calls.push(['target', id]); return button; }},
    renderDashboard() { calls.push(['render', mode]); },
  };
  Object.defineProperty(sandbox, 'eqMode', {
    get() { return mode; },
    set(value) { mode = value; calls.push(['mode', value]); },
    configurable: true,
  });
  const context = vm.createContext(sandbox);
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext('toggleEqMode()', context);
  return {mode, button, calls};
}

test('value mode switches to percentage before updating the button and dashboard', () => {
  const result = toggle('value');
  assert.equal(result.mode, 'pct');
  assert.equal(result.button.textContent, '$ valor');
  assert.deepEqual(result.calls, [
    ['mode', 'pct'],
    ['target', 'eqModeBtn'],
    ['text', '$ valor'],
    ['render', 'pct'],
  ]);
});

test('percentage mode switches back to value with the percentage action label', () => {
  const result = toggle('pct');
  assert.equal(result.mode, 'value');
  assert.equal(result.button.textContent, '% retorno');
  assert.deepEqual(result.calls.at(-1), ['render', 'value']);
});

test('unknown mode retains the legacy fallback to value', () => {
  const result = toggle('unknown');
  assert.equal(result.mode, 'value');
  assert.equal(result.button.textContent, '% retorno');
});

test('missing mode button still toggles state before rendering the dashboard', () => {
  const result = toggle('value', {withButton: false});
  assert.deepEqual(result.calls, [
    ['mode', 'pct'],
    ['target', 'eqModeBtn'],
    ['render', 'pct'],
  ]);
});
