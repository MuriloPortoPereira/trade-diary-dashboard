const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/simulation/presentation/simulation-panel.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const names = ['applySimulationAccountSnapshot', 'resetSimulationEntryDefaults', 'loadSimFromAccount', 'renderSimulation'];
const legacyParts = names.map(name => appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const legacy = legacyParts.every(Boolean) ? legacyParts.join('\n\n') : undefined;
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function element(extra = {}) {
  return {style: {}, value: '', innerHTML: '', textContent: '', readOnly: false, ...extra};
}

function setup({accountValue = 'manual', optionCount = 2, rrrValue = '1', sizing} = {}) {
  const options = Array.from({length: optionCount}, () => ({}));
  const elements = {
    simAccount: element({value: accountValue, options, appendChild(option) { this.options.push(option); }}),
    simBalance: element({value: '1000'}),
    simRRR: element({value: rrrValue}),
    simRRRCustom: element({value: '1.5'}),
    simN: element({value: '20'}),
    simWR: element({value: '55'}),
    simRisk: element({value: '10'}),
    simGoalDay: element({value: '50'}),
    simStopDay: element({value: '30'}),
    simCards: element(),
    simSummary: element(),
    simPlan: element(),
  };
  const calls = [];
  const resolvedSizing = sizing ?? {riskUsd: 10, goalUsd: 50, stopUsd: 30, goalPct: 5, stopPct: 3};
  const context = vm.createContext({
    document: {
      getElementById: id => elements[id] ?? null,
      createElement: tag => ({tag, value: '', textContent: ''}),
    },
    accounts: [{id: 'a1', name: 'Principal'}, {id: 'a2', name: 'Reserva'}],
    activeAccountId: 'a1',
    getSimulationAccountSnapshot: id => ({accountId: id, balance: 1200, winRatePct: 58, riskPct: 1, goalPct: 5, stopPct: 3, rrr: 1.5}),
    setSimulationInputValue: (id, value, decimals) => calls.push(['field', id, value, decimals]),
    clampSimulationWinRatePct: value => Number(value),
    setSimulationRrrInput: value => calls.push(['rrr', value]),
    syncSimulationMoneyFromPercent: () => { calls.push(['sync']); return resolvedSizing; },
    toSimulationNumber: (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback,
    buildMonteCarloBalanceProjection: args => {
      calls.push(['projection', args]);
      return {labels: [0, 1], scenarios: [[1000, 1010], [1000, 990]], medianLine: [1000, 1005], goalBalance: 1050, stopBalance: 970, probPositive: 60, probGoal: 40, probStop: 10};
    },
    fR: value => Number(value).toFixed(2),
    TIPS: new Proxy({}, {get: (_, key) => `tip:${String(key)}`}),
    mkCard: card => `<card>${card.lbl}:${card.val}</card>`,
    buildSimulationPlan: args => { calls.push(['plan', args]); return {tone: 'safe', title: 'Plano', summary: 'Resumo', expectancyUsd: 2}; },
    escapeHtml: String,
    mkChart: (id, config) => calls.push(['chart', id, config]),
    CHART_OPTS: {plugins: {}},
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#simulation-panel' : modulePath});
  return {context, elements, calls};
}

test('account snapshot updates balance, lock and derived fields in order', () => {
  const {context, elements, calls} = setup();
  vm.runInContext("applySimulationAccountSnapshot('a2')", context);
  assert.equal(elements.simBalance.value, '1200.00');
  assert.equal(elements.simBalance.readOnly, true);
  assert.deepEqual(calls, [
    ['field', 'simWR', 58, 1],
    ['field', 'simRiskPct', 1, 2],
    ['field', 'simGoalPct', 5, 2],
    ['field', 'simStopPct', 3, 2],
    ['rrr', 1.5],
    ['sync'],
  ]);
});

test('entry reset uses selected account and falls back from manual to active account', () => {
  const selected = setup({accountValue: 'a2'});
  vm.runInContext('resetSimulationEntryDefaults()', selected.context);
  assert.equal(selected.elements.simBalance.readOnly, true);
  const manual = setup({accountValue: 'manual'});
  vm.runInContext('resetSimulationEntryDefaults()', manual.context);
  assert.equal(manual.elements.simBalance.readOnly, true);
});

test('manual load unlocks balance, applies manual snapshot and renders', () => {
  const {context, elements, calls} = setup({accountValue: 'manual'});
  vm.runInContext('loadSimFromAccount()', context);
  assert.equal(elements.simBalance.readOnly, false);
  assert.equal(calls.filter(call => call[0] === 'projection').length, 1);
  assert.equal(calls.filter(call => call[0] === 'chart').length, 1);
});

test('account load applies its snapshot before rendering', () => {
  const {context, elements, calls} = setup({accountValue: 'a2'});
  vm.runInContext('loadSimFromAccount()', context);
  assert.equal(elements.simBalance.readOnly, true);
  assert.ok(calls.findIndex(call => call[0] === 'field') < calls.findIndex(call => call[0] === 'projection'));
});

test('simulation renderer preserves account options, custom RRR, cards, summary, plan and chart', () => {
  const {context, elements, calls} = setup({accountValue: 'manual', optionCount: 1, rrrValue: 'custom'});
  vm.runInContext('renderSimulation()', context);
  assert.equal(elements.simAccount.options.length, 3);
  assert.equal(elements.simAccount.value, 'manual');
  assert.equal(elements.simRRRCustom.style.display, 'block');
  const projection = calls.find(call => call[0] === 'projection')[1];
  assert.equal(projection.rrr, 1.5);
  assert.equal(projection.scenarioCount, 100);
  assert.equal((elements.simCards.innerHTML.match(/<card>/g) || []).length, 4);
  assert.match(elements.simSummary.innerHTML, /40%/);
  assert.match(elements.simSummary.innerHTML, /10%/);
  assert.match(elements.simPlan.innerHTML, /Plano/);
  const chart = calls.find(call => call[0] === 'chart');
  assert.equal(chart[1], 'simChart');
  assert.equal(chart[2].data.datasets.length, 5);
});
