const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const modulePath = 'src/modules/data-transfer/application/restore-backup.js';
const moduleFile = path.join(root, modulePath);
const start = app.indexOf('function restoreBackupData(');
const end = app.indexOf('\nfunction exposeJsonExport(', start);
const source = fs.existsSync(moduleFile) ? fs.readFileSync(moduleFile, 'utf8') : app.slice(start, end);
assert.ok(source.includes('function restoreBackupData('));

function setup(overrides = {}) {
  const calls = [];
  const sandbox = {
    trades: [{id: 'old-trade'}], config: {theme: 'dark', nested: {old: true}},
    preMarketData: {old: {}}, accounts: [{id: 'old-account'}],
    activeAccountId: 'old-account', studyHubState: {old: true},
    ensureDefaultStrategies(value) { calls.push(['config', value]); return value; },
    normalizeAccount(value, index, list) { calls.push(['account', value, index, list]); return {...value, normalized: true}; },
    mergeStudyHubState(value) { calls.push(['study', value]); return {merged: value}; },
    ...overrides,
  };
  for (const name of ['document', 'localStorage', 'fetch']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`unexpected ${name} access`); }});
  }
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/modules/data-transfer/infrastructure/backup-format.js'), 'utf8'), context);
  vm.runInContext(`
    function validateBackupData(data){return TradeDiaryBackupFormat.validateBackupData(data);}
    function summarizeBackupData(data){return TradeDiaryBackupFormat.summarizeBackupData(data);}
    function createBackupPayload(){return {trades,config,preMarketData,accounts,activeAccountId,studyHubState};}
  `, context);
  vm.runInContext(source, context, {filename: modulePath});
  const before = Object.fromEntries(['trades', 'config', 'preMarketData', 'accounts', 'activeAccountId', 'studyHubState'].map(key => [key, context[key]]));
  return {context, calls, before};
}

test('backup restoration rejects invalid input before any state change or normalization', () => {
  for (const input of [null, [], {version: 2}, Object.create({trades: []})]) {
    const {context, calls, before} = setup();
    assert.throws(() => context.restoreBackupData(input), /Arquivo/);
    assert.deepEqual(calls, []);
    for (const key of Object.keys(before)) assert.strictEqual(context[key], before[key]);
  }
});

test('partial backup preserves omitted state and always normalizes existing config', () => {
  const {context, calls, before} = setup();
  const result = context.restoreBackupData({trades: 'invalid', config: null, preMarketData: [], accounts: [], activeAccountId: '', studyHubState: false});
  for (const key of Object.keys(before)) assert.strictEqual(context[key], before[key]);
  assert.deepEqual(calls, [['config', before.config]]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {trades: 1, accounts: 1, preMarketDays: 1, documents: 0});
});

test('full backup keeps references, shallow config merge, map callback arguments and summary', () => {
  const {context, calls, before} = setup();
  const data = {trades: [], config: {nested: {replacement: true}, generalDocs: [1, 2]},
    preMarketData: {one: {}, two: {}}, accounts: [{id: 'new'}, {id: 'second'}],
    activeAccountId: 'missing-but-truthy', studyHubState: {plan: {}}};
  const unchanged = JSON.stringify(data);
  const result = context.restoreBackupData(data);
  assert.strictEqual(context.trades, data.trades);
  assert.strictEqual(context.preMarketData, data.preMarketData);
  assert.notStrictEqual(context.config, before.config);
  assert.notStrictEqual(context.config, data.config);
  assert.equal(context.config.theme, 'dark');
  assert.strictEqual(context.config.nested, data.config.nested);
  assert.equal(context.activeAccountId, 'missing-but-truthy');
  assert.notStrictEqual(context.accounts, data.accounts);
  assert.equal(context.accounts[0].normalized, true);
  assert.strictEqual(context.studyHubState.merged, data.studyHubState);
  assert.deepEqual(calls.map(call => call[0]), ['config', 'account', 'account', 'study']);
  assert.deepEqual(calls.slice(1, 3).map(call => call.slice(1)), data.accounts.map((account, index) => [account, index, data.accounts]));
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {trades: 0, accounts: 2, preMarketDays: 2, documents: 2});
  assert.equal(JSON.stringify(data), unchanged);
});

test('restoration retains permissive config arrays, truthy study state and account fallback', () => {
  const {context, calls} = setup({activeAccountId: null});
  const data = {config: ['legacy'], accounts: [{id: 'first'}], activeAccountId: 0, studyHubState: 'legacy'};
  context.restoreBackupData(data);
  assert.equal(context.config[0], 'legacy');
  assert.equal(Array.isArray(context.config), false);
  assert.equal(context.activeAccountId, 'first');
  assert.deepEqual(calls.map(call => call[0]), ['config', 'account', 'study']);
  assert.equal(context.studyHubState.merged, 'legacy');
  const empty = setup({accounts: [], activeAccountId: null});
  empty.context.restoreBackupData({trades: []});
  assert.equal(empty.context.activeAccountId, null);
});

test('normalization errors propagate while retaining earlier mutations', () => {
  const error = new Error('normalization failed');
  const configFailure = setup({ensureDefaultStrategies() { throw error; }});
  const trades = [];
  assert.throws(() => configFailure.context.restoreBackupData({trades, config: {}, preMarketData: {new: {}}}), thrown => thrown === error);
  assert.strictEqual(configFailure.context.trades, trades);
  assert.strictEqual(configFailure.context.config, configFailure.before.config);
  assert.strictEqual(configFailure.context.preMarketData, configFailure.before.preMarketData);

  const accountFailure = setup({normalizeAccount(value, index) { if (index === 1) throw error; return value; }});
  const preMarketData = {new: {}};
  assert.throws(() => accountFailure.context.restoreBackupData({trades, preMarketData, accounts: [{}, {}], activeAccountId: 'new', studyHubState: {}}), thrown => thrown === error);
  assert.strictEqual(accountFailure.context.trades, trades);
  assert.strictEqual(accountFailure.context.preMarketData, preMarketData);
  assert.strictEqual(accountFailure.context.accounts, accountFailure.before.accounts);
  assert.equal(accountFailure.context.activeAccountId, accountFailure.before.activeAccountId);
  assert.strictEqual(accountFailure.context.studyHubState, accountFailure.before.studyHubState);
});

test('restoration workflow remains global and loads once before classic consumers', () => {
  assert.ok(fs.existsSync(moduleFile));
  assert.doesNotMatch(app, /^function restoreBackupData\(/m);
  assert.match(app, /restoreBackupData\(data\);/);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const index = scripts.findIndex(script => script.src === modulePath);
  assert.ok(index > scripts.findIndex(script => script.src === 'src/modules/data-transfer/infrastructure/backup-format.js'));
  assert.ok(index < scripts.findIndex(script => script.src === 'src/modules/data-transfer/presentation/import-tabs.js'));
  assert.ok(index < scripts.findIndex(script => script.src === 'app.js'));
});
