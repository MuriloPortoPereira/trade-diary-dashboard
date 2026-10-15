const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const start = source.indexOf('function createBackupPayload(');
const end = source.indexOf('\nfunction summarizeBackupData(', start);
assert.ok(start >= 0 && end > start);

function setup() {
  const trades = [{id: 'trade'}];
  const config = {theme: 'dark'};
  const preMarketData = {monday: {}};
  const accounts = [{id: 'account'}];
  const studyHubState = {plan: {}};
  let clockCalls = 0;
  class DateStub {
    toISOString() { return `2026-10-${String(++clockCalls).padStart(2, '0')}T00:00:00.000Z`; }
  }
  const context = vm.createContext({Date: DateStub, trades, config, preMarketData, accounts,
    activeAccountId: 'account', studyHubState});
  const modulePath = path.join(root, 'src/modules/data-transfer/infrastructure/backup-format.js');
  vm.runInContext(fs.readFileSync(modulePath, 'utf8'), context, {filename: modulePath});
  vm.runInContext(source.slice(start, end), context, {filename: 'app.js#createBackupPayload'});
  return {context, trades, config, preMarketData, accounts, studyHubState, getClockCalls: () => clockCalls};
}

test('backup payload keeps version, field order, and one ISO timestamp per call', () => {
  const {context, getClockCalls} = setup();
  const first = context.createBackupPayload();
  const second = context.createBackupPayload();
  assert.deepEqual(Object.keys(first), ['version', 'exportedAt', 'trades', 'config', 'preMarketData',
    'accounts', 'activeAccountId', 'studyHubState']);
  assert.equal(first.version, 2);
  assert.equal(first.exportedAt, '2026-10-01T00:00:00.000Z');
  assert.equal(second.exportedAt, '2026-10-02T00:00:00.000Z');
  assert.equal(getClockCalls(), 2);
  assert.notStrictEqual(first, second);
});

test('backup payload retains collection references and current globals', () => {
  const {context, trades, config, preMarketData, accounts, studyHubState} = setup();
  const first = context.createBackupPayload();
  assert.strictEqual(first.trades, trades);
  assert.strictEqual(first.config, config);
  assert.strictEqual(first.preMarketData, preMarketData);
  assert.strictEqual(first.accounts, accounts);
  assert.strictEqual(first.studyHubState, studyHubState);
  assert.equal(first.activeAccountId, 'account');

  const nextTrades = [{id: 'next'}];
  context.trades = nextTrades;
  context.activeAccountId = null;
  const next = context.createBackupPayload();
  assert.strictEqual(next.trades, nextTrades);
  assert.equal(next.activeAccountId, null);
  assert.strictEqual(first.trades, trades);
  assert.equal(first.activeAccountId, 'account');
});
