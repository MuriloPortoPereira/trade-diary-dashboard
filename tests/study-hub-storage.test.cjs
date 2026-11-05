const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const storage = fs.readFileSync(path.join(root, 'src/modules/study-hub/infrastructure/study-hub-storage.js'), 'utf8');
function setup(initial = {}) {
  const values = new Map(Object.entries(initial)), calls = [];
  const c = vm.createContext({localStorage: {
    getItem: key => { calls.push(['read', key]); return values.get(key) ?? null; },
    setItem: (key, value) => { calls.push(['write', key, value]); values.set(key, String(value)); },
  }});
  vm.runInContext(storage, c);
  const api = c.TradeDiaryStudyHubStorage;
  return {api, c, values, calls};
}
test('private storage preserves keys, raw reads, rates and missing defaults', () => {
  const h = setup({pfCot: '6.25suffix', cot: '0', pfState: '{bad', hubCiclos: '[]'});
  assert.equal(h.api.readPropFirmRate(), 6.25); assert.equal(h.api.readPlanRate(), 0);
  assert.equal(h.api.readPropFirmState(), '{bad'); assert.equal(h.api.readCycles(), '[]');
  assert.deepEqual(JSON.parse(JSON.stringify(h.api.readDiary())), []);
  assert.deepEqual(h.calls, [['read', 'pfCot'], ['read', 'cot'], ['read', 'pfState'], ['read', 'hubCiclos'], ['read', 'diary2026']]);
  const empty = setup();
  assert.equal(empty.api.readPropFirmRate(), 5.8); assert.equal(empty.api.readPlanRate(), 5.8);
  assert.equal(empty.api.readPropFirmState(), null); assert.equal(empty.api.readCycles(), null);
});
test('private storage preserves serialized payloads and original rate input', () => {
  const h = setup(), state = {cot: 5.8, v: '1.0', s_conta: '10000'}, cycles = [{capInicio: 1000}];
  const diary = [{data: '2026-11-05', obs: 'a,b\nlinha'}];
  h.api.writePropFirmRate(6.25); h.api.writePlanRate('7.10');
  h.api.writePropFirmState(state); h.api.writeCycles(cycles); h.api.writeDiary(diary);
  assert.deepEqual(h.calls, [['write', 'pfCot', 6.25], ['write', 'cot', '7.10'],
    ['write', 'pfState', JSON.stringify(state)], ['write', 'hubCiclos', JSON.stringify(cycles)], ['write', 'diary2026', JSON.stringify(diary)]]);
  assert.deepEqual(JSON.parse(JSON.stringify(h.api.readDiary())), diary);
});
test('private storage lets malformed data, access and serialization errors reach callers', () => {
  const h = setup({diary2026: '{bad'});
  assert.throws(() => h.api.readDiary(), error => error.name === 'SyntaxError');
  const circular = {}; circular.self = circular;
  assert.throws(() => h.api.writeCycles(circular), error => error.name === 'TypeError');
  assert.equal(h.calls.length, 1);
  h.c.localStorage.getItem = () => { throw new Error('blocked'); };
  h.c.localStorage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => h.api.readPropFirmState(), /blocked/); assert.throws(() => h.api.writeDiary([]), /quota/);
});
