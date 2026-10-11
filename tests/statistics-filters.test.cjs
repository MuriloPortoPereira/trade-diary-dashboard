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
const source = legacyPeriod && legacyAccount
  ? `${legacyPeriod}\n\n${legacyAccount}\n`
  : fs.readFileSync(path.join(root, modulePath), 'utf8');

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
  vm.runInContext(source, context, {filename: legacyPeriod ? 'app.js#statisticsFilters' : modulePath});
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
  vm.runInContext(source, context, {filename: legacyAccount ? 'app.js#statisticsFilters' : modulePath});
  vm.runInContext('onStatsAccountChange()', context);
  assert.equal(context.statsAccountPinned, true);
  assert.deepEqual(calls, [['pin', true], ['render', true]]);
});
