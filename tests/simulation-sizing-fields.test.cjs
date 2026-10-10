const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/simulation/presentation/simulation-sizing-fields.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function syncSimulationMoneyFromPercent\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

function render({activeAccountId = 'active-1', values = {}, snapshot, sizing} = {}) {
  const calls = [];
  const elements = Object.fromEntries(Object.entries(values).map(([id, value]) => [id, {value}]));
  const context = vm.createContext({
    activeAccountId,
    document: {getElementById(id) { calls.push(['target', id]); return elements[id] ?? null; }},
    getSimulationAccountSnapshot(id) { calls.push(['snapshot', id]); return snapshot; },
    toSimulationNumber(value, fallback) {
      calls.push(['number', value, fallback]);
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    },
    calculateSimulationSizing(input) {
      calls.push(['calculate', JSON.parse(JSON.stringify(input))]);
      return sizing;
    },
    setSimulationInputValue(id, value, digits) { calls.push(['set', id, value, digits]); },
  });
  vm.runInContext(source, context, {filename: modulePath});
  const result = vm.runInContext('syncSimulationMoneyFromPercent()', context);
  return {calls, result};
}

test('missing controls use active-account fallbacks and project all calculated money fields', () => {
  const snapshot = {balance: 1000, riskPct: 1, goalPct: 5, stopPct: 3};
  const sizing = {riskUsd: 10, goalUsd: 50, stopUsd: 30};
  const before = JSON.stringify(snapshot);
  const {calls, result} = render({snapshot, sizing});
  assert.equal(result, sizing);
  assert.equal(JSON.stringify(snapshot), before);
  assert.deepEqual(calls, [
    ['target', 'simAccount'],
    ['snapshot', 'active-1'],
    ['target', 'simBalance'],
    ['number', undefined, 1000],
    ['target', 'simRiskPct'],
    ['number', undefined, 1],
    ['target', 'simGoalPct'],
    ['number', undefined, 5],
    ['target', 'simStopPct'],
    ['number', undefined, 3],
    ['calculate', {balance: 1000, riskPct: 1, goalPct: 5, stopPct: 3}],
    ['set', 'simRisk', 10, 2],
    ['set', 'simGoalDay', 50, 2],
    ['set', 'simStopDay', 30, 2],
  ]);
});

test('simulation sizing fields classic script loads once after domain and before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  const domainPath = 'src/modules/simulation/domain/calculate-simulation-sizing.js';
  assert.equal(scripts.filter(src => src === modulePath).length, 1);
  assert.ok(scripts.indexOf(domainPath) < scripts.indexOf(modulePath));
  assert.ok(scripts.indexOf(modulePath) < scripts.indexOf('app.js'));
});

test('selected account and explicit fields preserve conversion and projection order including zero', () => {
  const snapshot = {balance: 900, riskPct: 9, goalPct: 8, stopPct: 7};
  const sizing = {riskUsd: 0, goalUsd: 37.5, stopUsd: 15};
  const {calls, result} = render({
    values: {simAccount: 'acct-2', simBalance: '1500.50', simRiskPct: '0', simGoalPct: '2.5', simStopPct: '1'},
    snapshot,
    sizing,
  });
  assert.equal(result, sizing);
  assert.deepEqual(calls.filter(call => call[0] === 'snapshot'), [['snapshot', 'acct-2']]);
  assert.deepEqual(calls.filter(call => call[0] === 'calculate'), [
    ['calculate', {balance: 1500.5, riskPct: 0, goalPct: 2.5, stopPct: 1}],
  ]);
  assert.deepEqual(calls.filter(call => call[0] === 'set'), [
    ['set', 'simRisk', 0, 2],
    ['set', 'simGoalDay', 37.5, 2],
    ['set', 'simStopDay', 15, 2],
  ]);
});
