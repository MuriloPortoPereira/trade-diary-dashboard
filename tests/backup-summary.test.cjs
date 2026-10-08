const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/data-transfer/presentation/backup-summary.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderBackupSummary\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

function render({data, useDefault = false, target = {textContent: 'before'}} = {}) {
  const calls = [];
  const payload = {kind: 'current'};
  const context = vm.createContext({
    input: data,
    document: {getElementById(id) { calls.push(['target', id]); return target; }},
    createBackupPayload() { calls.push(['payload']); return payload; },
    formatBackupSummary(value) { calls.push(['format', value]); return '2 trades · 1 conta'; },
    t(key, fallback) { calls.push(['translate', key, fallback]); return 'Backup traduzido'; },
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderBackupSummary' : modulePath});
  vm.runInContext(useDefault ? 'renderBackupSummary()' : 'renderBackupSummary(input)', context, {filename: modulePath});
  return {target, calls, payload, context, data};
}

test('missing backup summary target returns before translating or formatting explicit data', () => {
  const data = {trades: [1]};
  const {calls} = render({data, target: null});
  assert.deepEqual(calls, [['target', 'backupSummary']]);
});

test('backup summary preserves translated prefix, separator, formatted data and input', () => {
  const data = {trades: [{id: 1}]};
  const before = JSON.stringify(data);
  const {target, calls} = render({data});
  assert.equal(target.textContent, 'Backup traduzido: 2 trades · 1 conta');
  assert.deepEqual(calls, [
    ['target', 'backupSummary'],
    ['translate', 'backup.current', 'Backup atual'],
    ['format', data],
  ]);
  assert.equal(JSON.stringify(data), before);
});

test('omitted data resolves the current backup payload before looking up the target', () => {
  const {target, calls, payload} = render({useDefault: true});
  assert.equal(target.textContent, 'Backup traduzido: 2 trades · 1 conta');
  assert.deepEqual(calls, [
    ['payload'],
    ['target', 'backupSummary'],
    ['translate', 'backup.current', 'Backup atual'],
    ['format', payload],
  ]);
});

test('backup summary loads once as a synchronous classic script before its consumers', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src/modules/data-transfer/presentation/export-account-filter.js'));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
