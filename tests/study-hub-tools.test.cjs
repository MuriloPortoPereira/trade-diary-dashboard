const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const factoryNames = {plan: 'TradeDiaryStudyHubPlan', simulator: 'TradeDiaryStudyHubTradeSim', mental: 'TradeDiaryStudyHubMental'};
const publicNames = {
  plan: ['ptSetCot','ptTab','addCiclo','calcCiclos','calcParciais','calcBR','calcMetas','calcRecov','calcLosses','calcDD','clearDDHist','calcDDModo','calcDDFromPct','calcDDFromUSD','renderPlanilha','runSim','calcDT','calcDTVol','calcAcoesFull','calcAcoes','calcGerRisco'],
  simulator: ['tsRunAll','syncRange','syncInput','tsTab','buildIntraday'],
  mental: ['atualizarTabelaRec','atualizarTopbar','fmSimular','setN','syncLoss','syncWin','setRP','toggleLog','exportLog','clearLog'],
};
const plain = value => JSON.parse(JSON.stringify(value));

function setup(kind, fields = {}, saved = {}) {
  const values = new Map(Object.entries(saved)), writes = [], loads = [], timers = [], frames = [], listeners = [], charts = [], downloads = [], elements = new Map();
  const canvasContext = new Proxy({}, {get(target, name) { return target[name] ?? (() => ({addColorStop() {}})); }});
  const make = value => ({value, checked: false, innerHTML: '', textContent: '', style: {}, dataset: {},
    options: [], width: 500, height: 250, offsetWidth: 500, clientWidth: 500, clientHeight: 250,
    parentElement: {clientWidth: 500}, classList: {add() {}, remove() {}, toggle() {}},
    querySelectorAll: () => [], querySelector: () => null,
    getContext: () => canvasContext,
    addEventListener: (event, callback) => listeners.push([event, callback]),
    appendChild() {}, click() { downloads.push(this); },
    getBoundingClientRect: () => ({width: 500, height: 250}),
  });
  const defaults = {'cycles':'2', 'days':'2', 'trades':'2', 'seqTrades':'4', 'tradesPerCycle':'2', 'nTrades':'4', 'sN':'5', 'cicNOps':'2'};
  const get = id => { if (!elements.has(id)) elements.set(id, make(fields[id] ?? defaults[id] ?? '')); return elements.get(id); };
  let randomState = 1;
  const math = Object.create(Math); math.random = () => { randomState = (randomState * 1664525 + 1013904223) >>> 0; return randomState / 4294967296; };
  const c = vm.createContext({Math: math,
    document: {getElementById: get, querySelector: selector => get(selector), querySelectorAll: () => [], createElement: () => make(''), body: {appendChild() {}, removeChild() {}}},
    window: {devicePixelRatio: 1, addEventListener: (event, callback) => listeners.push([event, callback])},
    localStorage: {getItem: key => values.get(key) ?? null, setItem: (key, value) => { writes.push(key); values.set(key, String(value)); }},
    Chart: class { constructor(node, config) { charts.push(config); } destroy() {} },
    setTimeout: callback => timers.push(callback),
    requestAnimationFrame: callback => frames.push(callback),
    fetch: async () => ({json: async () => ({USDBRL: {bid: '6.25'}})}),
    URL: {createObjectURL: () => 'blob:test'}, Blob,
  });
  for (const file of ['domain/study-hub-calculations.js', 'infrastructure/study-hub-storage.js',
    'presentation/study-hub-plan.js', 'presentation/study-hub-tradesim.js', 'presentation/study-hub-mental.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'src/modules/study-hub', file), 'utf8'), c);
  }
  const api = c[factoryNames[kind]](callback => loads.push(callback));
  assert.deepEqual(Object.keys(api), publicNames[kind]);
  const rules = c.TradeDiaryStudyHubCalculations;
  return {api, rules, c, values, writes, loads, timers, frames, listeners, charts, downloads, get};
}

test('plan preserves saved cycles, rate restoration and initialization order', async () => {
  const savedCycles = [{nome: 'Salvo', capInicio: 2000, gains: 200, rrr: 1}];
  const h = setup('plan', {cicCap: '2000', cicRisco: '1', cicNOps: '2'}, {cot: '6', hubCiclos: JSON.stringify(savedCycles)});
  assert.equal(h.loads.length, 1); assert.equal(h.writes.length, 0);
  h.loads[0]();
  assert.equal(h.get('cotInput').value, '6.00');
  assert.equal(JSON.parse(h.values.get('hubCiclos'))[0].nome, 'Salvo');
  assert.equal(h.writes[0], 'hubCiclos');
  await new Promise(setImmediate);
  assert.equal(h.values.get('cot'), '6.25');
  h.api.ptSetCot(7);
  assert.equal(h.get('plCot').value, '7.00'); assert.equal(h.values.get('cot'), '7');
  assert.ok(h.charts.length > 0);
});

test('plan keeps malformed saved cycles fallback and rate errors propagating', () => {
  const h = setup('plan', {}, {hubCiclos: '{bad'});
  assert.doesNotThrow(() => h.loads[0]());
  assert.equal(JSON.parse(h.values.get('hubCiclos')).length, 4);
  h.c.localStorage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => h.api.ptSetCot(7), /quota/);
});

test('TradeSim preserves eager input bindings, deferred run and resize registration', () => {
  const h = setup('simulator', {'ts-capital': '1000', risk: '1', sl: '1', tp: '2'});
  assert.equal(h.loads.length, 1); assert.equal(h.timers.length, 0);
  assert.ok(h.listeners.some(([event]) => event === 'resize'));
  assert.ok(h.listeners.filter(([event]) => event === 'input').length >= 12);
  h.loads[0](); assert.equal(h.timers.length, 1);
  assert.doesNotThrow(() => h.timers[0]());
  assert.equal(h.get('id-sl').value, 1); assert.equal(h.get('id-dailyStop').value, 2);
  h.api.syncRange('risk', 'riskRange', 2, '%');
  assert.equal(h.get('risk').value, 2); assert.equal(h.get('riskRangeVal').textContent, '2%');
  h.api.syncInput('risk', 'riskRange', 3, '%');
  assert.equal(h.get('riskRange').value, 3); assert.equal(h.get('rrrDisplay').textContent, '1 : 2.00');
});

test('mental simulation preserves history, export/reset and percent synchronization', () => {
  const h = setup('mental', {winRate: '60', lossRate: '40', capital: '1000', nTrades: '4'});
  assert.equal(h.loads.length, 1); assert.equal(h.writes.length, 0);
  h.loads[0]();
  h.frames.splice(0).forEach(callback => callback());
  h.api.syncLoss(); assert.equal(h.get('lossRate').value, 40);
  h.get('lossRate').value = '25'; h.api.syncWin(); assert.equal(h.get('winRate').value, 75);
  h.api.exportLog(); assert.equal(h.downloads.length, 1);
  assert.equal(h.downloads[0].download, 'ferramentas_mentais_historico.csv');
  h.api.clearLog(); h.api.exportLog(); assert.equal(h.downloads.length, 1);
  assert.equal(h.get('m-sims').textContent, 0);
});

test('plan and mental pure calculations preserve compounding, partials and ruin thresholds', () => {
  const {rules} = setup('plan');
  assert.equal(rules.calcCapFinal(100, 10, 2, 2), 144);
  assert.equal(rules.calcParcMedia([75, 25], [1, 2]), 1.25);
  assert.equal(rules.calcParcMedia([0, 0], [1, 2]), 0);
  assert.deepEqual(plain(rules.gerarContinuo(100, 0.1, 2)), [
    {n: 1, res: 'L', pnl: -10, saldo: 90}, {n: 2, res: 'L', pnl: -9, saldo: 81}]);
  assert.deepEqual(plain(rules.gerarAlternado(100, 0.1, 2, 2)), [
    {n: 1, res: 'L', pnl: -10, saldo: 90}, {n: 2, res: 'W', pnl: 18, saldo: 108}]);
  assert.deepEqual(plain(rules.calcCol(100, 2, 1, [-1, 1], 30)), [
    {s: 0, dead: true, danger: false, res: -1}, {s: 0, dead: true, danger: false, res: 1}]);
  assert.equal(rules.calcCol(100, 1, 0.2, [-1], 90)[0].danger, true);
  assert.equal(rules.calcCol(100, 1, 0.2, [-1], 80)[0].danger, false);
});

test('tool definitions expose only factories without touching DOM, storage, timers or window', () => {
  const sandbox = {};
  for (const name of ['document','localStorage','window','Chart','setTimeout','requestAnimationFrame']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`definition accessed ${name}`); }});
  }
  const c = vm.createContext(sandbox);
  for (const file of ['study-hub-plan.js','study-hub-tradesim.js','study-hub-mental.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'src/modules/study-hub/presentation', file), 'utf8'), c);
  }
  for (const name of Object.values(factoryNames)) assert.equal(typeof c[name], 'function');
  for (const name of ['renderLog','LOG','ciclosRows','tsRunAll','ptSetCot']) assert.equal(c[name], undefined);
});
