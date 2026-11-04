const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const domainPath = 'src/modules/study-hub/domain/study-hub-calculations.js';
const statePath = 'src/modules/study-hub/application/study-hub-state.js';
const pagePath = 'src/modules/study-hub/presentation/study-hub-page.js';
const domainSource = fs.readFileSync(path.join(root, domainPath), 'utf8');
const stateSource = fs.readFileSync(path.join(root, statePath), 'utf8');
const pageSource = fs.readFileSync(path.join(root, pagePath), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

function setup(values = {}) {
  const elements = new Map(Object.entries(values).map(([id, value]) => [id, {
    value, textContent: '', options: [], events: [],
    dispatchEvent(event) { this.events.push(event.type); },
  }]));
  const calls = [], storage = new Map();
  const context = vm.createContext({
    SIMULATION_ENTRY_DEFAULTS: {riskPct: 1, rrr: 1.1, goalPct: 10, stopPct: 2},
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    document: {getElementById: id => elements.get(id) || null, querySelectorAll: () => []},
    Event,
    Date: class extends Date { static now() { return 123456; } },
    localStorage: {setItem: (key, value) => storage.set(key, value)},
    trades: [], config: {}, preMarketData: {}, accounts: [], activeAccountId: 'a',
  });
  vm.runInContext(domainSource, context);
  vm.runInContext(stateSource, context);
  context.studyHubState = context.defaultStudyHubState();
  vm.runInContext(pageSource, context);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/app/infrastructure/app-state-storage.js'), 'utf8'), context);
  const save = context.save;
  context.save = () => { calls.push('save'); save(); };
  const renderNative = context.renderStudyHub;
  context.renderStudyHub = () => calls.push('render');
  return {context, elements, calls, storage, renderNative};
}

test('StudyHub defaults stay independent and merge partial backups without dropping extensions', () => {
  const {context: c} = setup();
  const first = c.defaultStudyHubState(), second = c.defaultStudyHubState();
  assert.deepEqual(Object.keys(first), ['propfirm', 'plan', 'simulator', 'mental']);
  assert.equal(first.propfirm.accountSize, 100000);
  assert.equal(first.propfirm.dailyDdPct, 2);
  assert.equal(first.plan.dailyGoal, 10);
  assert.equal(first.simulator.rrr, 1.1);
  first.mental.focus = 1;
  assert.equal(second.mental.focus, 4);
  const extension = {keep: true};
  const partial = Object.freeze({propfirm: Object.freeze({riskPct: 0, custom: 'x'}), extension});
  const merged = c.mergeStudyHubState(partial);
  assert.equal(merged.propfirm.riskPct, 0);
  assert.equal(merged.propfirm.accountSize, 100000);
  assert.equal(merged.propfirm.custom, 'x');
  assert.equal(merged.extension, extension);
  assert.equal(merged.plan.title, 'Plano Principal');
  assert.notEqual(merged.propfirm, partial.propfirm);
  for (const input of [null, undefined, false, 10, 'bad']) {
    assert.deepEqual(plain(c.mergeStudyHubState(input)), plain(c.defaultStudyHubState()));
  }
});

test('native form readers preserve zero fallbacks, partial numeric parsing and empty text', () => {
  const {context: c} = setup({studyPropAccount: '25000abc', studyPropRisk: '0', studyPropFee: '',
    studyPlanTitle: '', studyPlanMaxTrades: '0', studyPlanDailyStop: '3.5',
    studySimTrades: '12.8', studySimRuns: '20', studyMentalFocus: '0', studyMentalStress: '5'});
  assert.equal(c.getStudyPropForm().accountSize, 25000);
  assert.equal(c.getStudyPropForm().riskPct, 1);
  assert.equal(c.getStudyPropForm().feePct, 2);
  assert.equal(c.getStudyPlanForm().title, '');
  assert.equal(c.getStudyPlanForm().maxTrades, 4);
  assert.equal(c.getStudyPlanForm().dailyStop, 3.5);
  assert.equal(c.getStudySimForm().trades, 12);
  assert.equal(c.getStudySimForm().seed, 1);
  c.studyHubState.simulator.seed = 0;
  assert.equal(c.getStudySimForm().seed, 123456);
  assert.equal(c.getStudyMentalForm().focus, 4);
  assert.equal(c.getStudyMentalForm().stress, 5);
});

test('native save handlers persist the same state to tl_studyhub before refreshing', () => {
  const {context: c, calls, storage} = setup({studyPropAccount: '25000', studyPlanTitle: 'Novo plano',
    studyMentalFocus: '5', studySimCapital: '5000', studySimTrades: '7'});
  for (const handler of ['saveStudyPropFirm', 'saveStudyPlan', 'saveStudyMental',
    'syncStudySimulatorFromPropfirm', 'runStudySimulation']) {
    calls.length = 0;
    c[handler]();
    assert.deepEqual(calls, ['save', 'render']);
    assert.deepEqual(JSON.parse(storage.get('tl_studyhub')), plain(c.studyHubState));
  }
  assert.equal(c.studyHubState.propfirm.accountSize, 25000);
  assert.equal(c.studyHubState.plan.title, 'Novo plano');
  assert.equal(c.studyHubState.mental.focus, 5);
  assert.equal(c.studyHubState.simulator.capital, 5000);
  assert.equal(c.studyHubState.simulator.trades, 7);
  assert.equal(c.studyHubState.simulator.seed, 123456);
});

test('legacy input adapters preserve event order, tolerant select matching and custom fallback', () => {
  const {context: c, elements} = setup({amount: '', ratio: ''});
  c.setStudyHubLegacyValue('missing', 3);
  c.setStudyHubLegacyValue('amount', null);
  c.setStudyHubLegacyValue('amount', 0);
  assert.equal(elements.get('amount').value, '0');
  assert.deepEqual(elements.get('amount').events, ['input', 'change']);
  const select = elements.get('ratio');
  select.options = [{value: '1.1000'}, {value: 'custom'}];
  c.setStudyHubLegacySelectValue('ratio', 1.1);
  assert.equal(select.value, '1.1000');
  c.setStudyHubLegacySelectValue('ratio', 2);
  assert.equal(select.value, 'custom');
  assert.deepEqual(select.events, ['input', 'change', 'input', 'change']);
});

test('native page keeps tab fallback, bridge order and deferred intraday enhancement', () => {
  const {context: c, elements, calls, renderNative} = setup();
  const frames = [], account = {id: 'a'}, rows = [];
  elements.set('studyHubLegacyApp', {classList: {add: () => calls.push('embed')}});
  c.getActiveAccount = () => account;
  c.getAccountTrades = () => rows;
  c.calcAccountRiskState = (acct, trades) => { assert.equal(acct, account); assert.equal(trades, rows); return {}; };
  c.syncStudyHubLegacyInputs = key => calls.push(`sync:${key}`);
  c.buildStudyHubStatuses = () => [];
  c.renderStatusList = id => calls.push(id);
  c.requestAnimationFrame = fn => frames.push(fn);
  c.window = {
    sh_hubSwitch: index => calls.push(`switch:${index}`),
    sh_legacyInit: key => calls.push(`init:${key}`),
    studyHubEnhanceIntradayImpact: () => calls.push('enhance'),
  };
  for (const key of ['PropFirm', 'Plan', 'Simulation', 'Mental']) c[`renderStudy${key}`] = () => calls.push(`panel:${key}`);
  for (const [key, index, panel] of [['unknown', 0, 'PropFirm'], ['plano', 1, 'Plan'],
    ['tradesim', 2, 'Simulation'], ['mental', 3, 'Mental']]) {
    calls.length = 0;
    c.studyHubTab = key;
    renderNative();
    const normalized = key === 'unknown' ? 'propfirm' : key;
    assert.equal(c.studyHubTab, normalized);
    assert.deepEqual(calls, ['embed', `switch:${index}`, `sync:${normalized}`, `init:${normalized}`,
      'studyHubRuntimeStatus', `panel:${panel}`]);
  }
  assert.equal(frames.length, 1);
  frames[0]();
  assert.equal(calls.at(-1), 'enhance');
});

test('propfirm and mental snapshots preserve deductions, risk limits, defaults and thresholds', () => {
  const {context: c} = setup();
  const params = Object.freeze({accountSize: 10000, riskPct: 1, dailyDdPct: 2, maxDdPct: 10,
    targetPct: 10, payoutPct: 80, taxPct: 5, feePct: 5, fxRate: 5, rrr: 2});
  assert.deepEqual(plain(c.getStudyPropSnapshot(params)), {
    accountSize: 10000, riskUsd: 100, dailyLimitUsd: 200, maxLimitUsd: 1000,
    targetUsd: 1000, payoutGrossUsd: 800, payoutNetUsd: 720, payoutNetBrl: 3600,
    tradeTargetUsd: 200, tradesToTarget: 5, dailyStopTrades: 2, maxStopTrades: 10,
    breakevenWr: 33.33333333333333,
  });
  assert.equal(c.getStudyPropSnapshot({...params, taxPct: 120}).payoutNetUsd, 40.000000000000036);
  assert.equal(c.getStudyPropSnapshot({...params, accountSize: -10}).riskUsd, 0);
  assert.equal(c.getStudyPropSnapshot({...params, fxRate: 0}).payoutNetBrl, 720);
  for (const [focus, energy, stress, discipline, score, tone] of [
    [4, 4, 2, 4, 80, 'safe'], [3, 3, 4, 3, 55, 'warn'],
    [2, 2, 5, 2, 35, 'danger'], [10, 10, 0, 10, 100, 'safe'],
  ]) assert.deepEqual(plain(c.getStudyMentalSnapshot({focus, energy, stress, discipline})), {score, tone});
  assert.equal(c.countStudyChecklistItems(' a, , b\n c '), 3);
  assert.equal(c.countStudyChecklistItems(null), 0);
});

test('native simulation preserves compounded outcomes, minimum trades, zero capital and reproducibility', () => {
  const {context: c} = setup();
  const allWins = c.buildStudySimulation({capital: 100, riskPct: 10, winRate: 100,
    rrr: 2, runs: 1, trades: 1, seed: 1});
  assert.equal(allWins.labels.length, 6);
  assert.equal(allWins.positiveRate, 1);
  for (const [index, expected] of [100, 120, 144, 172.8, 207.36, 248.832].entries()) {
    assert.ok(Math.abs(allWins.p10[index] - expected) < 1e-10);
    assert.equal(allWins.p10[index], allWins.p90[index]);
  }
  const allLosses = c.buildStudySimulation({capital: 100, riskPct: 100, winRate: 0,
    rrr: 1, runs: 20, trades: 5, seed: 1});
  assert.deepEqual(plain(allLosses.p50), [100, 0, 0, 0, 0, 0]);
  assert.equal(allLosses.positiveRate, 0);
  assert.equal(c.buildStudySimulation({capital: 0, trades: 5, runs: 20}).positiveRate, 1);
  const params = Object.freeze({capital: 1000, riskPct: 2, winRate: 55, rrr: 1.1, runs: 20, trades: 10, seed: 7});
  const result = c.buildStudySimulation(params);
  assert.deepEqual(plain(c.buildStudySimulation(params)), plain(result));
  assert.notDeepEqual(plain(c.buildStudySimulation({...params, seed: 8})), plain(result));
  assert.ok(result.p10.every((value, index) => value <= result.p50[index] && result.p50[index] <= result.p90[index]));
  const rand = c.seededRand(1);
  assert.deepEqual([rand(), rand(), rand()], [0.6270739405881613, 0.002735721180215478, 0.5274470399599522]);
});

test('snapshot and simulation wrappers resolve the current state on each argument-free call', () => {
  const {context: c} = setup();
  assert.equal(c.getStudyPropSnapshot().accountSize, 100000);
  assert.equal(c.getStudyMentalSnapshot().score, 80);
  assert.equal(c.buildStudySimulation().labels.length, 31);
  c.studyHubState = {
    propfirm: {accountSize: 500, riskPct: 2},
    mental: {focus: 1, energy: 1, stress: 5, discipline: 1},
    simulator: {capital: 100, riskPct: 100, winRate: 100, rrr: 1, runs: 20, trades: 5, seed: 1},
  };
  assert.equal(c.getStudyPropSnapshot().riskUsd, 10);
  assert.equal(c.getStudyMentalSnapshot().score, 20);
  assert.equal(c.buildStudySimulation().p50[5], 3200);
  c.studyHubState.propfirm = {accountSize: 1000, riskPct: 3};
  c.studyHubState.simulator = {...c.studyHubState.simulator, capital: 10, riskPct: 0};
  assert.equal(c.getStudyPropSnapshot().riskUsd, 30);
  assert.equal(c.buildStudySimulation().p50[5], 10);
});

test('StudyHub domain consumes explicit input without DOM, IO or application state', () => {
  const sandbox = {};
  for (const name of ['document', 'localStorage', 'fetch', 'studyHubState', 'accounts', 'config']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`domain accessed ${name}`); }});
  }
  const c = vm.createContext(sandbox);
  vm.runInContext(domainSource, c);
  const domain = c.TradeDiaryStudyHubCalculations;
  assert.equal(domain.countStudyChecklistItems('a,b\nc'), 3);
  assert.equal(domain.getStudyPropSnapshot({accountSize: 100, riskPct: 2}).riskUsd, 2);
  assert.equal(domain.getStudyMentalSnapshot({focus: 4, energy: 4, stress: 2, discipline: 4}).score, 80);
  assert.equal(domain.buildStudySimulation({capital: 100, riskPct: 100, winRate: 0,
    runs: 20, trades: 5}).positiveRate, 0);
});

test('native modules load once as classic scripts before application initialization and consumers', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attrs: match[1], src: match[1].match(/\bsrc=['"]([^'"]+)['"]/)?.[1],
  }));
  const index = name => scripts.findIndex(script => script.src === name);
  for (const name of [domainPath, statePath, pagePath]) {
    const matches = scripts.filter(script => script.src === name);
    assert.equal(matches.length, 1);
    assert.doesNotMatch(matches[0].attrs, /\b(?:async|defer|type|nomodule)\b/i);
    assert.ok(index(name) < index('app.js'));
    assert.ok(index(name) < index('src/app/application/load-app-state.js'));
  }
  assert.ok(index(domainPath) < index(pagePath));
  assert.ok(index(statePath) < index(pagePath));
});
