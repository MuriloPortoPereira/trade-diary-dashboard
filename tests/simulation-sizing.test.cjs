const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

const functionNames = [
  'toSimulationNumber',
  'roundSimulationMoney',
  'calculateSimulationSizing',
];

function loadLegacyFunctions() {
  const source = fs.readFileSync(`${__dirname}/../app.js`, 'utf8');
  const declarations = functionNames.map((name) => {
    // These three simple declarations end at their first unindented brace.
    const match = source.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'));
    assert.ok(match, `Missing legacy function: ${name}`);
    return match[0];
  });
  const context = vm.createContext({});
  vm.runInContext(declarations.join('\n\n'), context, { filename: 'app.js (sizing declarations)' });
  return context;
}

const api = loadLegacyFunctions();

function sizing(input) {
  // Spread into this realm so strict equality compares values, not VM prototypes.
  return { ...api.calculateSimulationSizing(input) };
}

test('legacy functions load without DOM or storage and keep public signatures', () => {
  for (const name of functionNames) assert.equal(typeof api[name], 'function');
  assert.equal(api.toSimulationNumber.length, 1);
  assert.equal(api.roundSimulationMoney.length, 1);
  assert.equal(api.calculateSimulationSizing.length, 0);
  assert.equal(api.document, undefined);
  assert.equal(api.localStorage, undefined);
});

test('number parsing retains parseFloat semantics', () => {
  const cases = [
    [12.5, 12.5], [' 12.5 ', 12.5], ['12abc', 12], ['1,5', 1],
    ['1e2', 100], ['0x10', 0], [-3, -3], ['-.25', -0.25],
  ];
  for (const [input, expected] of cases) {
    assert.equal(api.toSimulationNumber(input), expected, String(input));
  }
});

test('invalid and nonfinite numbers use the supplied fallback unchanged', () => {
  for (const input of [undefined, null, '', ' ', 'invalid', true, NaN, Infinity, -Infinity, 'Infinity']) {
    assert.equal(api.toSimulationNumber(input), 0, String(input));
    assert.equal(api.toSimulationNumber(input, 55), 55, String(input));
  }
  assert.equal(api.toSimulationNumber('invalid', 'fallback'), 'fallback');
  assert.equal(api.toSimulationNumber('invalid', null), null);
  assert.equal(api.toSimulationNumber('invalid', Infinity), Infinity);
  assert.equal(api.toSimulationNumber('2', 55), 2);
});

test('money rounding retains epsilon and negative rounding behavior', () => {
  const cases = [
    [1.005, 1.01], [2.675, 2.68], [-1.005, -1], [-2.675, -2.67],
    ['12.345tail', 12.35], [0, 0], [-0.001, -0],
    [undefined, 0], ['invalid', 0], [NaN, 0], [Infinity, 0], [-Infinity, 0],
  ];
  for (const [input, expected] of cases) {
    assert.equal(api.roundSimulationMoney(input), expected, String(input));
  }
});

test('sizing defaults all seven fields to zero', () => {
  const expected = { balance: 0, riskPct: 0, goalPct: 0, stopPct: 0, riskUsd: 0, goalUsd: 0, stopUsd: 0 };
  assert.deepEqual(sizing(), expected);
  assert.deepEqual(sizing({}), expected);
  assert.deepEqual(sizing({ balance: undefined, riskPct: undefined }), expected);
});

test('sizing calculates the nominal plan', () => {
  assert.deepEqual(sizing({ balance: 1000, riskPct: 1, goalPct: 5, stopPct: 3 }), {
    balance: 1000, riskPct: 1, goalPct: 5, stopPct: 3,
    riskUsd: 10, goalUsd: 50, stopUsd: 30,
  });
});

test('sizing accepts strings and preserves fractional and above-100 percentages', () => {
  assert.deepEqual(sizing({ balance: ' 1000usd', riskPct: '0.125', goalPct: '125', stopPct: '1,5' }), {
    balance: 1000, riskPct: 0.125, goalPct: 125, stopPct: 1,
    riskUsd: 1.25, goalUsd: 1250, stopUsd: 10,
  });
});

test('sizing clamps negative inputs and normalizes invalid values', () => {
  const expected = { balance: 0, riskPct: 0, goalPct: 0, stopPct: 0, riskUsd: 0, goalUsd: 0, stopUsd: 0 };
  assert.deepEqual(sizing({ balance: -1000, riskPct: -1, goalPct: -5, stopPct: -3 }), expected);
  assert.deepEqual(sizing({ balance: NaN, riskPct: Infinity, goalPct: -Infinity, stopPct: 'invalid' }), expected);
  assert.deepEqual(sizing({ balance: null, riskPct: '', goalPct: false, stopPct: ' ' }), expected);
});

test('sizing rounds balance before calculating money amounts', () => {
  assert.deepEqual(sizing({ balance: 1.005, riskPct: 50, goalPct: 100, stopPct: 200 }), {
    balance: 1.01, riskPct: 50, goalPct: 100, stopPct: 200,
    riskUsd: 0.51, goalUsd: 1.01, stopUsd: 2.02,
  });
});

test('finite inputs retain existing overflow behavior', () => {
  assert.equal(api.roundSimulationMoney(Number.MAX_VALUE), Infinity);
  assert.deepEqual(sizing({ balance: Number.MAX_VALUE, riskPct: 1, goalPct: 0, stopPct: 100 }), {
    balance: Infinity, riskPct: 1, goalPct: 0, stopPct: 100,
    riskUsd: 0, goalUsd: 0, stopUsd: 0,
  });
  assert.deepEqual(sizing({ balance: 1000, riskPct: Number.MAX_VALUE }), {
    balance: 1000, riskPct: Number.MAX_VALUE, goalPct: 0, stopPct: 0,
    riskUsd: 0, goalUsd: 0, stopUsd: 0,
  });
});

test('null sizing input keeps its TypeError contract', () => {
  assert.throws(() => api.calculateSimulationSizing(null), { name: 'TypeError' });
});

test('sizing preserves input and returns independent objects', () => {
  const input = Object.freeze({ balance: '1000', riskPct: '1', goalPct: '5', stopPct: '3', extra: 'keep' });
  const first = api.calculateSimulationSizing(input);
  const second = api.calculateSimulationSizing(input);
  assert.notStrictEqual(first, second);
  first.riskUsd = 999;
  assert.equal(second.riskUsd, 10);
  assert.deepEqual(input, { balance: '1000', riskPct: '1', goalPct: '5', stopPct: '3', extra: 'keep' });
});
