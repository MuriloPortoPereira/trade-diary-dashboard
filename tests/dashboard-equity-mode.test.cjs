const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/analytics/presentation/dashboard-equity-mode.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function toggleEqMode\([^]*?^\}/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

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
  vm.runInContext(source, context, {filename: legacy ? 'app.js#toggleEqMode' : modulePath});
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
