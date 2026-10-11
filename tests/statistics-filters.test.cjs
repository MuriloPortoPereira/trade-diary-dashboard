const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/analytics/presentation/statistics-filters.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacyPeriod = appSource.match(/^function toggleCustomPeriod\([^]*?^\}/m)?.[0];
const legacyAccount = appSource.match(/^function onStatsAccountChange\([^]*?^\}/m)?.[0];
assert.equal(legacyPeriod, undefined, 'legacy period declaration must be moved');
assert.equal(legacyAccount, undefined, 'legacy account declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

test('statistics filters load once as a classic script after tabs and before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf('src/modules/analytics/presentation/statistics-tabs.js') < html.indexOf(modulePath));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});

function togglePeriod({period = {value: 'custom'}, bar = {style: {display: 'before'}}} = {}) {
  const calls = [];
  const context = vm.createContext({
    document: {
      getElementById(id) {
        calls.push(['target', id]);
        return id === 'statPeriod' ? period : id === 'customPeriodBar' ? bar : null;
      },
    },
    renderStats() { calls.push(['render', 'stats']); },
  });
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext('toggleCustomPeriod()', context);
  return {bar, calls};
}

test('custom period shows its controls before rendering statistics', () => {
  const {bar, calls} = togglePeriod();
  assert.equal(bar.style.display, 'flex');
  assert.deepEqual(calls, [
    ['target', 'statPeriod'],
    ['target', 'customPeriodBar'],
    ['render', 'stats'],
  ]);
});

test('predefined period hides custom controls and preserves the selected value', () => {
  const period = {value: '30'};
  const {bar} = togglePeriod({period});
  assert.equal(bar.style.display, 'none');
  assert.equal(period.value, '30');
});

test('missing period defaults to custom and a missing bar does not skip rendering', () => {
  const {calls} = togglePeriod({period: null, bar: null});
  assert.deepEqual(calls, [
    ['target', 'statPeriod'],
    ['target', 'customPeriodBar'],
    ['render', 'stats'],
  ]);
});

test('account change pins the current filter before rendering statistics', () => {
  const calls = [];
  let pinned = false;
  const sandbox = {
    renderStats() { calls.push(['render', pinned]); },
  };
  Object.defineProperty(sandbox, 'statsAccountPinned', {
    get() { return pinned; },
    set(value) { pinned = value; calls.push(['pin', value]); },
    configurable: true,
  });
  const context = vm.createContext(sandbox);
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext('onStatsAccountChange()', context);
  assert.equal(context.statsAccountPinned, true);
  assert.deepEqual(calls, [['pin', true], ['render', true]]);
});
