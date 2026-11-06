const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/trades/application/demo-data.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const names = [
  'buildTickmillDemoImport',
  'loadTickmillDemoImport',
  'buildSampleTrades',
  'ensureSampleStrategies',
  'loadSampleData',
  'addSampleTrades',
];
const legacySources = names.map(name => appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const source = legacySources.every(Boolean)
  ? legacySources.join('\n\n')
  : fs.readFileSync(path.join(root, modulePath), 'utf8');

class FixedDate extends Date {
  constructor(value) {
    super(value === undefined ? '2026-11-04T15:30:00.000Z' : value);
  }
}

function setup(overrides = {}) {
  const calls = [];
  let uidIndex = 0;
  const tickmillAccount = {id: 'tickmill-account', balance: 5000};
  const sandbox = {
    Date: FixedDate,
    DEFAULT_STRATEGIES: ['Al Brooks', 'Halt Vwap', 'PIVÔ Al Brooks', 'Trade de Impulso'],
    DEFAULT_TRADE_ERRORS: ['Saí cedo', 'FOMO', 'Overtrade', 'Entrou sem gatilho', 'Operou cansado', 'Hesitação na execução', 'Não aceitou stop', 'Aumentou lote no prejuízo'],
    accounts: [{id: 'account-a', balance: 2000}],
    activeAccountId: 'account-a',
    config: {balance: 1500, strategies: ['Setup VWAP']},
    trades: [],
    pendingImport: [],
    uid: () => `uid-${++uidIndex}`,
    getActiveAccount: () => sandbox.accounts.find(account => account.id === sandbox.activeAccountId),
    normalizeLooseText: value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
    normalizeStrategyName: value => String(value ?? '').trim().toLowerCase(),
    normalizeClockTime: value => String(value ?? '').trim(),
    formatClockMinutes: value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`,
    ensureTickmillAccount: () => { calls.push(['ensureTickmill']); return tickmillAccount; },
    setPendingImport: (list, options) => { calls.push(['pending', list.length, {...options}]); sandbox.pendingImport = list; },
    save: () => calls.push(['save']),
    renderTopbarAccount: () => calls.push(['topbarAccount']),
    updateTopbarStats: () => calls.push(['topbarStats']),
    showImportPreview: list => calls.push(['preview', list.length]),
    openModal: id => calls.push(['modal', id]),
    showLogAccountEditLockNotice: action => { calls.push(['lock', action]); return false; },
    showAppConfirm: (title, message, callback, options) => { calls.push(['confirm', title, message, {...options}]); sandbox.confirmCallback = callback; },
    refreshAll: () => calls.push(['refresh']),
    showAppNotice: (title, message) => calls.push(['notice', title, message]),
    ...overrides,
  };
  const ensureTickmillAccount = sandbox.ensureTickmillAccount;
  const context = vm.createContext(sandbox);
  vm.runInContext(source, context, {filename: legacySources.every(Boolean) ? 'app.js#demo-data' : modulePath});
  context.ensureTickmillAccount = ensureTickmillAccount;
  return {context, sandbox, calls};
}

test('sample generator preserves its deterministic 300-trade dataset and defaults', () => {
  const {context} = setup();
  const result = context.buildSampleTrades('account-a', '2026-11-04');
  const defaults = setup().context.buildSampleTrades();
  assert.deepEqual(JSON.parse(JSON.stringify(defaults)), JSON.parse(JSON.stringify(result)));
  assert.equal(result.length, 300);
  assert.equal(result[0].id, 'uid-1');
  assert.equal(result[0].accountId, 'account-a');
  assert.equal(result[0].date, '2026-10-26');
  assert.equal(result[0].pnl, 35);
  assert.deepEqual([...result[0].errors], []);
  assert.equal(result.at(-1).id, 'uid-300');
  assert.equal(result.every(trade => trade.images.length === 0 && trade.incomplete === false), true);
  const digest = crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex');
  assert.equal(digest, '59e941c718328e41a982852ec3af52edcd7dfe85d8ba6373bfb91983722276ba');
});

test('Tickmill demo keeps 40 remapped trades and import side-effect order', () => {
  const built = setup();
  built.context.buildSampleTrades = accountId => Array.from({length: 45}, (_, index) => ({id: `old-${index}`, accountId, value: index}));
  const list = built.context.buildTickmillDemoImport();
  assert.equal(list.length, 40);
  assert.deepEqual({...list[0]}, {id: 'tickmill-demo-1', positionId: 'tickmill-demo-1', accountId: 'tickmill-account', value: 0});
  assert.deepEqual({...list.at(-1)}, {id: 'tickmill-demo-40', positionId: 'tickmill-demo-40', accountId: 'tickmill-account', value: 39});

  const loaded = setup();
  loaded.context.buildTickmillDemoImport = () => [{id: 'demo'}];
  loaded.context.loadTickmillDemoImport();
  assert.equal(loaded.context.activeAccountId, 'tickmill-account');
  assert.deepEqual(loaded.calls, [
    ['ensureTickmill'],
    ['pending', 1, {accountId: 'tickmill-account', source: 'tickmill-demo'}],
    ['save'],
    ['topbarAccount'],
    ['topbarStats'],
    ['preview', 1],
    ['modal', 'csvConfirmModal'],
  ]);
});

test('sample strategies and automatic loading remain idempotent and ordered', () => {
  const {context, sandbox, calls} = setup({config: {balance: 1000, strategies: ['al brooks']}});
  context.ensureSampleStrategies();
  context.ensureSampleStrategies();
  assert.deepEqual(sandbox.config.strategies, ['al brooks', 'Halt Vwap']);
  context.buildSampleTrades = accountId => [{id: 'sample', accountId}];
  context.loadSampleData();
  assert.deepEqual(sandbox.trades, [{id: 'sample', accountId: 'account-a'}]);
  assert.equal(calls.at(-1)[0], 'save');
});

test('manual loading preserves lock guard, confirmation and callback effects', () => {
  const locked = setup({showLogAccountEditLockNotice: action => { lockedCalls.push(action); return true; }});
  const lockedCalls = [];
  locked.context.addSampleTrades();
  assert.deepEqual(lockedCalls, ['adicionar']);
  assert.equal(locked.sandbox.confirmCallback, undefined);

  const open = setup();
  open.context.buildSampleTrades = accountId => [{id: 'new-1', accountId}, {id: 'new-2', accountId}];
  open.context.addSampleTrades();
  assert.deepEqual(open.calls.slice(0, 2).map(call => call[0]), ['lock', 'confirm']);
  assert.equal(open.calls[1][1], 'Adicionar dados demo');
  assert.deepEqual(open.calls[1][3], {confirmText: 'Adicionar'});
  open.sandbox.confirmCallback();
  assert.deepEqual(open.sandbox.trades, [
    {id: 'new-1', accountId: 'account-a'},
    {id: 'new-2', accountId: 'account-a'},
  ]);
  assert.deepEqual(open.calls.slice(-3), [
    ['save'],
    ['refresh'],
    ['notice', 'Dados demo adicionados', '300 trades simulados foram adicionados ao histórico.'],
  ]);
});

test('extracted demo data remains one synchronous classic script before app.js', () => {
  if (legacySources.every(Boolean)) return;
  assert.equal(legacySources.filter(Boolean).length, 0);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
