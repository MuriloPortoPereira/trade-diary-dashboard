const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function setup(initial = {}, fields = {}) {
  const store = new Map(Object.entries(initial)), reads = [], writes = [], loads = [], charts = [], alerts = [], downloads = [];
  const elements = new Map();
  const node = value => ({value, textContent: '', innerHTML: '', style: {}, options: [],
    classList: {toggle() {}}, querySelectorAll: () => [], click() { downloads.push(this); }});
  const get = id => { if (!elements.has(id)) elements.set(id, node(fields[id] ?? '')); return elements.get(id); };
  const c = vm.createContext({document: {getElementById: get, querySelectorAll: () => [],
    createElement: () => node(''), body: {appendChild() {}, removeChild() {}}},
    localStorage: {getItem: key => { reads.push(key); return store.get(key) ?? null; },
      setItem: (key, value) => { writes.push([key, value]); store.set(key, String(value)); }},
    Chart: class { constructor(element, config) { charts.push(config); } destroy() {} },
    Date: class extends Date { static now() { return 123456; } },
    alert: value => alerts.push(value),
    FileReader: class { readAsText(file) { this.onload({target: {result: file.text}}); } },
    URL: {createObjectURL: () => 'blob:test'}, Blob});
  for (const file of ['domain/study-hub-calculations.js', 'infrastructure/study-hub-storage.js', 'presentation/study-hub-propfirm.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'src/modules/study-hub', file), 'utf8'), c);
  }
  const api = c.TradeDiaryStudyHubPropFirm(fn => loads.push(fn));
  return {api, math: c.TradeDiaryStudyHubCalculations, c, store, reads, writes, loads, charts, alerts, downloads, get};
}

test('propfirm creation defers load and calculator preserves sizing, chart and state format', () => {
  const h = setup({pfCot: '6.25'}, {s_conta: '10000', s_ddmax: '10', s_dddaily: '2',
    s_stops: '20', s_rrr: '2', s_step: '1', s_fim: '10'});
  assert.deepEqual(h.reads, ['pfCot']); assert.equal(h.loads.length, 1); assert.equal(h.writes.length, 0);
  h.api.calcSimulador();
  assert.equal(h.get('s_risco_usd').textContent, '$50,00');
  assert.equal(h.get('s_alvo_usd').textContent, '$100,00');
  assert.equal(h.get('s_meta_trades').textContent, '10 trades');
  assert.equal(h.charts[0].data.labels.length, 10);
  const state = JSON.parse(h.store.get('pfState'));
  assert.equal(state.cot, 6.25); assert.equal(state.v, '1.0'); assert.equal(state.ts, 123456);
  assert.equal(state.s_conta, '10000'); assert.equal(state.s_stops, '20');
  assert.equal(Object.hasOwn(state, 's_step'), false);
});

test('JSON restoration applies rate before fields and retains caller error policies', () => {
  const h = setup();
  h.api.importFase({target: {files: [{name: 'config.json', text: JSON.stringify({cot: 6, s_conta: '1234'})}]}}, 'f2');
  assert.deepEqual(h.alerts, []); assert.equal(h.writes[0][0], 'pfCot');
  assert.equal(h.get('gCot').value, '6.00'); assert.equal(h.get('s_conta').value, '1234');
  h.c.localStorage.setItem = () => { throw new Error('quota'); };
  assert.doesNotThrow(() => h.api.calcSimulador());
  assert.throws(() => h.api.pfSetCot(7), /quota/);
});

test('phase CSV imports and exports preserve permissive fields and filename', () => {
  const h = setup();
  h.api.importFase({target: {files: []}}, 'f2');
  h.api.importFase({target: {files: [{name: 'config.csv', text: 's_conta, 4567\ns_stops,20\nignored,'}]}}, 'f2');
  assert.equal(h.get('s_conta').value, '4567'); assert.equal(h.get('s_stops').value, '20');
  assert.deepEqual(h.alerts, []);
  h.api.importFase({target: {files: [{name: 'bad.json', text: '{bad'}]}}, 'f1');
  assert.deepEqual(h.alerts, ['Erro ao importar arquivo']);
  h.api.exportFase('f2'); assert.equal(h.downloads.length, 1);
  assert.match(h.downloads[0].download, /^propfirm_config_\d{4}-\d{2}-\d{2}\.json$/);
});

test('load restores saved pfState before the hub rate takes precedence for final calculations', () => {
  const h = setup({pfCot: '5.8', pfState: JSON.stringify({cot: 6, s_conta: '25000', s_stops: '50'})},
    {hubCot: '6.5'});
  h.loads[0]();
  assert.deepEqual(h.reads, ['pfCot', 'pfState']);
  assert.equal(h.writes[0][0], 'pfCot'); assert.equal(h.writes[0][1], 6);
  assert.equal(h.get('gCot').value, '6.50'); assert.equal(h.get('s_conta').value, '25000');
  assert.equal(h.store.get('pfCot'), '6');
  const stateWrites = h.writes.filter(([key]) => key === 'pfState').map(([, value]) => JSON.parse(value));
  assert.equal(stateWrites[0].s_conta, '');
  assert.equal(stateWrites.at(-1).s_conta, '25000'); assert.equal(stateWrites.at(-1).cot, 6.5);
  assert.deepEqual(h.alerts, []);
  const malformed = setup({pfCot: '6.25', pfState: '{bad'});
  assert.doesNotThrow(() => malformed.loads[0]());
  assert.equal(JSON.parse(malformed.store.get('pfState')).cot, 6.25);
});

test('legacy payout, integer steps and scenarios retain deductions, fallbacks and limits', () => {
  const {math} = setup();
  assert.equal(math.liqBRL(1000, 80, 5, 10, 5), 3420);
  assert.deepEqual(JSON.parse(JSON.stringify(math.genSteps(0.1, 0.3))), [0.1, 0.2, 0.3]);
  assert.equal(math.genSteps(-1, -1).length, 40); assert.equal(math.genSteps(0.0001, 100).length, 200);
  const rows = math.gerarCenarios(1);
  assert.equal(rows.length, 65); assert.equal(rows[0].type, 'pos'); assert.equal(rows[1].type, 'neg');
  assert.equal(rows.find(row => row.n === 2 && row.w === 1).type, 'zero');
});

test('defining the PropFirm factory has no DOM, storage or chart effects and exposes no helpers', () => {
  const sandbox = {};
  for (const name of ['document', 'localStorage', 'Chart']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`definition accessed ${name}`); }});
  }
  const c = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/modules/study-hub/presentation/study-hub-propfirm.js'), 'utf8'), c);
  assert.equal(typeof c.TradeDiaryStudyHubPropFirm, 'function');
  assert.equal(c.calcSimulador, undefined); assert.equal(c.collectState, undefined); assert.equal(c.globalCot, undefined);
});
