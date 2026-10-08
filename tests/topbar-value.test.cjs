const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/app/presentation/topbar-value.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderTopbarValue\([^]*?^\}/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function render({id = 'topbarMetric', item, density = 'full', target = {textContent: 'before', title: 'before'}} = {}) {
  const calls = [];
  const context = vm.createContext({
    inputId: id,
    topbarValueCache: item === undefined ? {} : {[id]: item},
    topbarDensity: density,
    document: {getElementById(value) { calls.push(['target', value]); return target; }},
    setTopbarClass(...args) { calls.push(['class', ...args]); },
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderTopbarValue' : modulePath});
  vm.runInContext('renderTopbarValue(inputId)', context);
  return {target, calls};
}

test('missing cache item still looks up the target and returns without mutation', () => {
  const target = {textContent: 'before', title: 'before'};
  const {calls} = render({target});
  assert.deepEqual(calls, [['target', 'topbarMetric']]);
  assert.deepEqual(target, {textContent: 'before', title: 'before'});
});

test('missing target returns without applying the cached value or class', () => {
  const item = {full: 'US$ 1.000', compact: 'US$ 1k', cls: 'positive', baseClass: 'tb-value'};
  const {calls} = render({item, target: null});
  assert.deepEqual(calls, [['target', 'topbarMetric']]);
});

test('topbar value preserves density selection, full title and class arguments', () => {
  const item = {full: 'US$ 1.000', compact: 'US$ 1k', cls: 'positive', baseClass: 'tb-value'};
  const full = render({item});
  assert.equal(full.target.textContent, 'US$ 1.000');
  assert.equal(full.target.title, 'US$ 1.000');
  assert.deepEqual(full.calls, [
    ['target', 'topbarMetric'],
    ['class', full.target, 'tb-value', 'positive'],
  ]);

  const compact = render({item, density: 'compact'});
  assert.equal(compact.target.textContent, 'US$ 1k');
  assert.equal(compact.target.title, 'US$ 1.000');
  assert.deepEqual(compact.calls[1], ['class', compact.target, 'tb-value', 'positive']);
});
