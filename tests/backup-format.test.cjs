const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const modulePath = 'src/modules/data-transfer/infrastructure/backup-format.js';
const start = appSource.indexOf('function summarizeBackupData(');
const end = appSource.indexOf('\nfunction restoreBackupData(', start);
assert.ok(start >= 0 && end > start);
const plain = value => JSON.parse(JSON.stringify(value));

function setup() {
  const calls = [];
  const context = vm.createContext({t: (key, fallback) => { calls.push(key); return fallback; }});
  const file = path.join(root, modulePath);
  if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: modulePath});
  vm.runInContext(appSource.slice(start, end), context, {filename: 'app.js#backup-format'});
  return {context, calls};
}

test('backup summary counts expected collections and own premarket days', () => {
  const {context} = setup();
  const data = {trades: [{}, {}], accounts: [{}], preMarketData: {mon: {}, tue: {}}, config: {generalDocs: [1, 2, 3]}};
  assert.deepEqual(plain(context.summarizeBackupData(data)), {trades: 2, accounts: 1, preMarketDays: 2, documents: 3});
  assert.deepEqual(plain(context.summarizeBackupData(data)), {trades: 2, accounts: 1, preMarketDays: 2, documents: 3});
  assert.equal(data.trades.length, 2);
});

test('backup summary ignores absent and wrong-shaped collections', () => {
  const {context} = setup();
  for (const value of [null, undefined, false, 7, '', {}, {trades: 'x', accounts: {}, preMarketData: [], config: {generalDocs: 'x'}}]) {
    assert.deepEqual(plain(context.summarizeBackupData(value)), {trades: 0, accounts: 0, preMarketDays: 0, documents: 0});
  }
});

test('backup validation accepts a recognized own key without enforcing version or value', () => {
  const {context} = setup();
  for (const value of [{trades: null}, {config: undefined}, {version: 999, accounts: []}, {studyHubState: false}]) {
    assert.doesNotThrow(() => context.validateBackupData(value));
  }
  assert.throws(() => context.validateBackupData(Object.create({trades: []})), /Arquivo não parece ser um backup do diário\./);
});

test('backup validation keeps exact errors for invalid shapes and unknown objects', () => {
  const {context} = setup();
  for (const value of [null, undefined, false, 0, '', []]) {
    assert.throws(() => context.validateBackupData(value), /Arquivo de backup inválido\./);
  }
  assert.throws(() => context.validateBackupData({version: 2}), /Arquivo não parece ser um backup do diário\./);
});

test('formatted backup summary retains translated key order and separator', () => {
  const {context, calls} = setup();
  const result = context.formatBackupSummary({trades: [1, 2], accounts: [1], preMarketData: {one: {}, two: {}}, config: {generalDocs: [1, 2, 3]}});
  assert.equal(result, '2 trades · 1 contas · 2 dias de pré-mercado · 3 documentos');
  assert.deepEqual(calls, ['backup.trades', 'backup.accounts', 'backup.premarketDays', 'backup.documents']);
});
