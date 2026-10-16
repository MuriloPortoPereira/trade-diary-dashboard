const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const preparationPath = 'src/modules/data-transfer/application/prepare-trade-import.js';
const rulesPath = 'src/modules/data-transfer/domain/import-trade-rules.js';
const candidates = [app];
if (fs.existsSync(path.join(root, preparationPath))) candidates.push(fs.readFileSync(path.join(root, preparationPath), 'utf8'));
const names = ['calcImportMissingFields', 'prepareImportedTrades', 'setPendingImport', 'clearPendingImport',
  'getPendingImportAccountId', 'getTradeImportPositionKey', 'normalizeDocImages'];
const declarations = names.map(name => {
  const match = candidates.map(source => source.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))).find(Boolean);
  assert.ok(match, `Missing ${name}`);
  return match[0];
}).join('\n');
const plain = value => JSON.parse(JSON.stringify(value));

function setup() {
  const calls = [];
  let sequence = 0;
  class DateStub { toISOString() { calls.push('time'); return `2026-10-15T00:00:0${++sequence}.000Z`; } }
  const context = vm.createContext({Date: DateStub, activeAccountId: 'active', pendingImport: [], pendingImportMeta: null,
    uid() { calls.push('id'); return 'generated-id'; },
    getMarket(symbol) { calls.push(['market', symbol]); return 'derived-market'; },
    mtTradeStatus(pnl) { calls.push(['status', pnl]); return pnl === 7 ? 'WIN' : 'OPEN'; },
    normalizeClockTime(value) { calls.push(['clock', value]); return value ? `clock:${value}` : ''; },
  });
  const rulesFile = path.join(root, rulesPath);
  if (fs.existsSync(rulesFile)) vm.runInContext(fs.readFileSync(rulesFile, 'utf8'), context);
  vm.runInContext(declarations, context);
  return {context, calls};
}

test('missing import fields preserve truthiness, order, closed statuses and nullable exit semantics', () => {
  const {context} = setup();
  assert.deepEqual(Array.from(context.calcImportMissingFields({}, 'WIN')), ['entry', 'stop', 'strategy', 'emotion', 'followedPlan', 'exit']);
  const filled = {entry: 1, stop: -1, strategy: ' ', emotion: ' ', followedPlan: 'nao', exit: 0};
  assert.deepEqual(Array.from(context.calcImportMissingFields(filled, 'LOSS')), []);
  for (const status of ['OPEN', 'win', undefined]) {
    assert.deepEqual(Array.from(context.calcImportMissingFields({...filled, entry: 0, stop: 0, exit: null}, status)), ['entry', 'stop']);
  }
  assert.throws(() => context.calcImportMissingFields(null, 'WIN'), /null/);
});

test('preparation retains extra data and zero/false values while cloning only the existing array fields', () => {
  const {context, calls} = setup();
  const errors = Object.freeze(['one']);
  const missing = Object.freeze(['custom', 'entry', 'custom']);
  const nested = {};
  const trade = Object.freeze({id: 'known', accountId: 'own', market: 'own-market', status: 'WIN', entry: 1, stop: 1,
    strategy: 's', emotion: 'e', followedPlan: 'sim', exit: 0, errors, missing_fields: missing,
    planDeviation: false, discipline: 0, confidence: false, hesitation: 'false', nested,
    images: [{dataUrl: 'data:image', name: '', extra: true}, null, {}], createdAt: 'created', updatedAt: 'updated'});
  const prepared = context.prepareImportedTrades([trade], {accountId: 'chosen', seedLabel: 'unused'})[0];
  assert.notStrictEqual(prepared, trade);
  assert.strictEqual(prepared.nested, nested);
  assert.equal(prepared.accountId, 'own');
  assert.equal(prepared.market, 'own-market');
  assert.equal(prepared.resultType, 'WIN');
  assert.equal(prepared.planDeviation, false);
  assert.equal(prepared.discipline, 0);
  assert.equal(prepared.confidence, false);
  assert.equal(prepared.hesitation, true);
  assert.notStrictEqual(prepared.errors, errors);
  assert.deepEqual(Array.from(prepared.errors), ['one']);
  assert.deepEqual(Array.from(prepared.missing_fields), ['custom', 'entry']);
  assert.equal(prepared.incomplete, true);
  assert.deepEqual(plain(prepared.images), [{name: 'imagem', dataUrl: 'data:image'}]);
  assert.equal(prepared.createdAt, 'created');
  assert.equal(prepared.updatedAt, 'updated');
  assert.deepEqual(calls, [['clock', undefined], ['clock', undefined], ['clock', undefined]]);
});

test('preparation keeps dependency order, independent timestamp calls and falsey defaults', () => {
  const {context, calls} = setup();
  const prepared = context.prepareImportedTrades([{pnl: 7, symbol: 'ES', placedTime: '9', openTime: 0, exitTime: '10',
    errors: 'invalid', missing_fields: 'invalid', images: null, resultType: '', planDeviation: 0}])[0];
  assert.deepEqual(calls, [['status', 7], 'id', ['market', 'ES'], ['clock', '9'], ['clock', 0], ['clock', '10'], 'time', 'time']);
  assert.equal(prepared.id, 'generated-id');
  assert.equal(prepared.accountId, 'active');
  assert.equal(prepared.market, 'derived-market');
  assert.equal(prepared.status, 'WIN');
  assert.equal(prepared.resultType, 'WIN');
  assert.equal(prepared.planDeviation, 0);
  assert.equal(prepared.discipline, null);
  assert.equal(prepared.hesitation, false);
  assert.equal(prepared.placedTime, 'clock:9');
  assert.equal(prepared.openTime, '');
  assert.equal(prepared.exitTime, 'clock:10');
  assert.deepEqual(plain(prepared.errors), []);
  assert.deepEqual(plain(prepared.images), []);
  assert.equal(prepared.createdAt, '2026-10-15T00:00:01.000Z');
  assert.equal(prepared.updatedAt, '2026-10-15T00:00:02.000Z');
});

test('preparation preserves list guards, sparse holes, current account defaults and thrown errors', () => {
  const {context, calls} = setup();
  for (const list of [undefined, null, {}, 'invalid']) assert.equal(context.prepareImportedTrades(list).length, 0);
  assert.deepEqual(calls, []);
  const sparse = new Array(2);
  sparse[1] = {id: 'known', accountId: 'own'};
  const result = context.prepareImportedTrades(sparse);
  assert.equal(result.length, 2);
  assert.equal(0 in result, false);
  context.activeAccountId = 'next';
  assert.equal(context.prepareImportedTrades([{}])[0].accountId, 'next');
  assert.equal(context.prepareImportedTrades([{}], {accountId: 'chosen'})[0].accountId, 'chosen');
  assert.throws(() => context.prepareImportedTrades([], null), /null/);
  assert.throws(() => context.prepareImportedTrades([null]), /null/);
  const failure = new Error('normalizer failed');
  context.normalizeDocImages = () => { throw failure; };
  assert.throws(() => context.prepareImportedTrades([{}]), error => error === failure);
});

test('pending imports preserve target precedence, per-trade preparation and clearing', () => {
  const {context} = setup();
  const list = [{id: 'one'}, {id: 'two', accountId: 'own'}];
  const prepared = context.setPendingImport(list, {accountId: '', source: 'csv'});
  assert.strictEqual(prepared, context.pendingImport);
  assert.notStrictEqual(prepared, list);
  assert.equal(prepared[0].accountId, 'own');
  assert.equal(prepared[1].accountId, 'own');
  assert.deepEqual(plain(context.pendingImportMeta), {accountId: 'own', source: 'csv'});
  assert.equal(context.getPendingImportAccountId(), 'own');
  context.pendingImportMeta = null;
  context.pendingImport = [{accountId: 'from-list'}];
  assert.equal(context.getPendingImportAccountId(), 'from-list');
  context.clearPendingImport();
  assert.equal(context.pendingImport.length, 0);
  assert.equal(context.pendingImportMeta, null);
  assert.equal(context.getPendingImportAccountId(), 'active');
  context.setPendingImport([], {accountId: 'explicit'});
  assert.deepEqual(plain(context.pendingImportMeta), {accountId: 'explicit', source: 'import'});
});

test('pending state stays intact when preparation fails before the replacement is complete', () => {
  const {context} = setup();
  const previous = [{id: 'old'}], meta = {accountId: 'old'};
  context.pendingImport = previous;
  context.pendingImportMeta = meta;
  assert.throws(() => context.setPendingImport([{id: 'first'}, null]), /null/);
  assert.strictEqual(context.pendingImport, previous);
  assert.strictEqual(context.pendingImportMeta, meta);
});

test('position keys preserve falsey positions and account fallback order without coercing IDs', () => {
  const {context} = setup();
  for (const trade of [undefined, null, {}, {positionId: 0}, {positionId: ''}]) assert.equal(context.getTradeImportPositionKey(trade), '');
  assert.equal(context.getTradeImportPositionKey({positionId: 7}), 'default::7');
  assert.equal(context.getTradeImportPositionKey({positionId: '007'}, ''), 'active::007');
  assert.equal(context.getTradeImportPositionKey({positionId: 7, accountId: 'own'}, 'fallback'), 'own::7');
  context.activeAccountId = '';
  assert.equal(context.getTradeImportPositionKey({positionId: 7}, null), 'default::7');
});

test('import rules initialize and run without DOM, clocks, IDs or application state', () => {
  const sandbox = {};
  for (const name of ['document', 'localStorage', 'fetch', 'Date', 'uid', 'trades', 'pendingImport', 'activeAccountId']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`unexpected rule access: ${name}`); }});
  }
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, rulesPath), 'utf8'), context);
  const rules = context.TradeDiaryImportTradeRules;
  assert.deepEqual(Object.keys(rules).sort(), ['calcImportMissingFields', 'createImportedTradeFilter']);
  assert.deepEqual(Array.from(rules.calcImportMissingFields({}, 'OPEN')), ['entry', 'stop', 'strategy', 'emotion', 'followedPlan']);
  const candidates = [{id: 'old'}, {id: 'new'}, {id: 'new'}];
  assert.deepEqual(candidates.filter(rules.createImportedTradeFilter([{id: 'old'}], () => '')), [candidates[1]]);
});

test('deduplication preserves ID types, rejected-position reuse, input references and resolver errors', () => {
  const {context} = setup();
  const rules = context.TradeDiaryImportTradeRules;
  const existing = [{id: 1, position: 'existing'}];
  const candidates = [{id: 'duplicate-position', position: 'existing'}, {id: 1, position: 'available'},
    {id: '1', position: 'available'}, {id: 'other', position: 'available'}, {id: 'plain'}, {id: 'plain'}];
  const before = JSON.stringify({existing, candidates});
  const resolve = trade => trade.position || '';
  const accepted = candidates.filter(rules.createImportedTradeFilter(existing, resolve));
  assert.deepEqual(accepted, [candidates[2], candidates[4]]);
  assert.strictEqual(accepted[0], candidates[2]);
  assert.deepEqual(candidates.filter(rules.createImportedTradeFilter(existing, resolve)), accepted);
  assert.equal(JSON.stringify({existing, candidates}), before);
  const failure = new Error('key failed');
  assert.throws(() => rules.createImportedTradeFilter(existing, () => { throw failure; }), error => error === failure);
  const predicate = rules.createImportedTradeFilter([], () => { throw failure; });
  assert.throws(() => predicate({}), error => error === failure);
});

test('preparation and rules load once before consumers as classic scripts without initial IO', () => {
  const sandbox = {};
  for (const name of ['document', 'localStorage', 'FileReader', 'fetch', 'activeAccountId', 'pendingImport']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`unexpected initialization access: ${name}`); }});
  }
  const context = vm.createContext(sandbox);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  let previous = -1;
  for (const file of [rulesPath, preparationPath]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
    const matches = scripts.filter(script => script.src === file);
    assert.equal(matches.length, 1);
    assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
    const index = scripts.findIndex(script => script.src === file);
    assert.ok(index > previous && index < scripts.findIndex(script => script.src === 'src/modules/data-transfer/presentation/import-workflow.js'));
    previous = index;
  }
  for (const name of names.filter(name => !['calcImportMissingFields', 'normalizeDocImages'].includes(name))) {
    assert.equal(typeof context[name], 'function');
    assert.doesNotMatch(app, new RegExp(`^function ${name}\\(`, 'm'));
  }
});
