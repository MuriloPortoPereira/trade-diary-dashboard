const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'src/app/application/bootstrap-app.js'), 'utf8');
const storagePath = 'src/app/infrastructure/app-state-storage.js';
const loadPath = 'src/app/application/load-app-state.js';
const keys = ['tl_trades', 'tl_config', 'tl_pm', 'tl_accounts', 'tl_activeAccount', 'tl_studyhub'];
const fields = ['trades', 'config', 'preMarketData', 'accounts', 'activeAccountId', 'studyHubState'];
const plain = value => JSON.parse(JSON.stringify(value));

function setup(stored = new Map()) {
  const calls = [];
  const context = vm.createContext({
    trades: [{id: 'old-trade'}], config: {theme: 'dark', old: true}, preMarketData: {old: {}},
    accounts: [{id: 'old-account', normalized: true}], activeAccountId: 'old-account', studyHubState: {plan: {old: true}},
    localStorage: {
      getItem(key) { calls.push(['read', key]); return stored.get(key) ?? null; },
      setItem(key, value) { calls.push(['write', key, value]); stored.set(key, String(value)); },
    },
    ensureDefaultStrategies(value) { calls.push(['strategies', value]); return value; },
    ensurePartnerHubConfig(value) { calls.push(['partners', value]); return value; },
    normalizeAccount(value, index, list) { calls.push(['account', value, index, list]); return {...value, normalized: true}; },
    mergeStudyHubState(value) { calls.push(['study', value]); return value; },
    recomputeAllIncomplete() { calls.push(['incomplete']); },
  });
  for (const [file, name] of [[storagePath, 'save'], [loadPath, 'load']]) {
    const absolute = path.join(root, file);
    if (fs.existsSync(absolute)) vm.runInContext(fs.readFileSync(absolute, 'utf8'), context, {filename: file});
    else {
      const declaration = app.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'));
      assert.ok(declaration, `Missing ${name}`);
      vm.runInContext(declaration[0], context);
    }
  }
  const before = Object.fromEntries(fields.map(field => [field, context[field]]));
  return {context, calls, stored, before};
}

test('save writes exactly six keys in order with JSON fields and a raw active account', () => {
  const {context, calls, stored, before} = setup();
  context.activeAccountId = null;
  assert.equal(context.save(), undefined);
  assert.deepEqual(calls.map(call => call[1]), keys);
  for (let index = 0; index < fields.length; index++) {
    const value = index === 4 ? null : JSON.stringify(before[fields[index]]);
    assert.deepEqual(calls[index], ['write', keys[index], value]);
  }
  assert.equal(stored.get('tl_activeAccount'), 'null');
});

test('save serializes each field when reached and retains earlier writes on serialization failure', () => {
  const {context, stored} = setup();
  context.trades = {toJSON() { context.config = {changed: true}; return []; }};
  context.save();
  assert.equal(stored.get('tl_config'), '{"changed":true}');
  stored.clear();
  const cyclic = {};
  cyclic.self = cyclic;
  context.config = cyclic;
  context.trades = [];
  assert.throws(() => context.save(), /circular/i);
  assert.deepEqual([...stored], [['tl_trades', '[]']]);
});

test('save propagates storage failure without rolling back or writing later keys', () => {
  const {context, stored} = setup();
  const failure = new Error('quota reached');
  const written = [];
  const original = context.localStorage.setItem;
  context.localStorage.setItem = (key, value) => {
    written.push(key);
    if (key === 'tl_accounts') throw failure;
    original(key, value);
  };
  assert.throws(() => context.save(), error => error === failure);
  assert.deepEqual(written, keys.slice(0, 4));
  assert.deepEqual([...stored.keys()], keys.slice(0, 3));
});

test('load without saved keys preserves defaults and runs normalizers before recomputing', () => {
  const {context, calls, before} = setup();
  assert.equal(context.load(), undefined);
  assert.deepEqual(calls.slice(0, 6), keys.map(key => ['read', key]));
  assert.deepEqual(calls.slice(6).map(call => call[0]), ['strategies', 'partners', 'incomplete']);
  for (const field of fields) assert.strictEqual(context[field], before[field]);
  assert.equal(calls.some(call => call[0] === 'write'), false);
});

test('save/load round-trip retains six payloads and normalizes accounts with original map arguments', () => {
  const saved = setup();
  saved.context.trades = [{id: 'trade', pnl: 0}];
  saved.context.config = {theme: 'light', old: true, nested: {replacement: true}};
  saved.context.preMarketData = {day: {done: true}};
  saved.context.accounts = [{id: 'one', normalized: true}, {id: 'two', normalized: true}];
  saved.context.activeAccountId = 'two';
  saved.context.studyHubState = {plan: {goal: 1}};
  saved.context.save();
  const restored = setup(saved.stored);
  restored.context.load();
  for (const field of fields) assert.deepEqual(plain(restored.context[field]), plain(saved.context[field]));
  assert.deepEqual(restored.calls.map(call => call[0]), [...Array(6).fill('read'), 'strategies', 'partners', 'account', 'account', 'study', 'incomplete']);
  const accounts = restored.calls.filter(call => call[0] === 'account');
  assert.deepEqual(accounts.map(call => call[2]), [0, 1]);
  assert.strictEqual(accounts[0][3], accounts[1][3]);
  assert.strictEqual(accounts[0][1], accounts[0][3][0]);
});

test('partial legacy state shallow-merges config, keeps absent fields and accepts empty accounts', () => {
  const {context, before, calls} = setup(new Map([
    ['tl_config', '{"nested":{"new":true}}'], ['tl_accounts', '[]'], ['tl_activeAccount', ''],
  ]));
  context.load();
  assert.equal(context.config.theme, 'dark');
  assert.strictEqual(context.config.nested, calls[6][1].nested);
  assert.deepEqual(plain(context.config.nested), {new: true});
  assert.notStrictEqual(context.config, before.config);
  assert.equal(context.accounts.length, 0);
  assert.equal(context.activeAccountId, before.activeAccountId);
  assert.strictEqual(context.trades, before.trades);
  assert.strictEqual(context.preMarketData, before.preMarketData);
  assert.strictEqual(context.studyHubState, before.studyHubState);
});

test('load reads all keys before parsing and swallows storage access failures without applying payloads', () => {
  const {context, calls, before} = setup(new Map([['tl_trades', '[]']]));
  const original = context.localStorage.getItem;
  context.localStorage.getItem = key => { if (key === 'tl_studyhub') throw new Error('denied'); return original(key); };
  assert.doesNotThrow(() => context.load());
  assert.deepEqual(calls, keys.slice(0, 5).map(key => ['read', key]));
  for (const field of fields) assert.strictEqual(context[field], before[field]);
});

test('malformed saved config leaves previously loaded trades applied and stops later work', () => {
  const {context, calls, before} = setup(new Map([['tl_trades', '[]'], ['tl_config', '{bad'], ['tl_pm', '{}']]));
  assert.doesNotThrow(() => context.load());
  assert.equal(context.trades.length, 0);
  assert.strictEqual(context.config, before.config);
  assert.strictEqual(context.preMarketData, before.preMarketData);
  assert.deepEqual(calls.map(call => call[0]), Array(6).fill('read'));
});

test('account normalization failure keeps earlier assignments and prevents account replacement and later effects', () => {
  const {context, calls, before} = setup(new Map([
    ['tl_trades', '[]'], ['tl_config', '{"theme":"light"}'], ['tl_pm', '{"new":{}}'],
    ['tl_accounts', '[{"id":"first"},{"id":"second"}]'], ['tl_activeAccount', 'next'], ['tl_studyhub', '{}'],
  ]));
  context.normalizeAccount = (account, index) => { calls.push(['normalize', index]); if (index === 1) throw new Error('invalid account'); return account; };
  assert.doesNotThrow(() => context.load());
  assert.equal(context.trades.length, 0);
  assert.equal(context.config.theme, 'light');
  assert.deepEqual(plain(context.preMarketData), {new: {}});
  assert.strictEqual(context.accounts, before.accounts);
  assert.equal(context.activeAccountId, before.activeAccountId);
  assert.strictEqual(context.studyHubState, before.studyHubState);
  assert.deepEqual(calls.slice(6).map(call => call[0]), ['strategies', 'partners', 'normalize', 'normalize']);
});

test('load preserves permissive parsed values and catches recomputation errors after assignments', () => {
  const {context, before} = setup(new Map([
    ['tl_trades', 'null'], ['tl_config', 'false'], ['tl_pm', 'null'], ['tl_accounts', '[]'], ['tl_studyhub', 'null'],
  ]));
  context.recomputeAllIncomplete = () => { throw new Error('invalid trades'); };
  assert.doesNotThrow(() => context.load());
  assert.equal(context.trades, null);
  assert.deepEqual(plain(context.config), plain(before.config));
  assert.equal(context.preMarketData, null);
  assert.equal(context.accounts.length, 0);
  assert.equal(context.studyHubState, null);
});

test('raw state reader returns unparsed values without applying state or swallowing storage errors', () => {
  const {context, calls, before} = setup(new Map([['tl_trades', '{invalid'], ['tl_activeAccount', 'chosen']]));
  const raw = context.readPersistedAppState();
  assert.deepEqual(plain(raw), {trades: '{invalid', config: null, preMarketData: null, accounts: null, activeAccountId: 'chosen', studyHubState: null});
  assert.deepEqual(calls, keys.map(key => ['read', key]));
  for (const field of fields) assert.strictEqual(context[field], before[field]);
  const failure = new Error('storage blocked');
  context.localStorage.getItem = () => { throw failure; };
  assert.throws(() => context.readPersistedAppState(), error => error === failure);
});

test('classic persistence scripts initialize without IO and load runs through a replaceable raw read contract', () => {
  const sandbox = {trades: ['old'], config: {}, preMarketData: {}, accounts: [], activeAccountId: 'active', studyHubState: {},
    ensureDefaultStrategies: value => value, ensurePartnerHubConfig: value => value,
    normalizeAccount: value => value, mergeStudyHubState: value => value, recomputeAllIncomplete() {}};
  for (const name of ['document', 'localStorage', 'fetch']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`unexpected IO access: ${name}`); }});
  }
  const context = vm.createContext(sandbox);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  let previous = -1;
  for (const file of [storagePath, loadPath]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
    const matches = scripts.filter(script => script.src === file);
    assert.equal(matches.length, 1);
    assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
    const index = scripts.findIndex(script => script.src === file);
    assert.ok(index > previous && index < scripts.findIndex(script => script.src === 'app.js'));
    previous = index;
  }
  assert.equal(typeof context.save, 'function');
  assert.doesNotMatch(app, /^function (?:save|load)\(/m);
  assert.doesNotMatch(app, /\bload\(\);/);
  assert.match(bootstrap, /\bload\(\);/);
  context.readPersistedAppState = () => ({trades: '[]'});
  context.load();
  assert.deepEqual(plain(context.trades), []);
});
