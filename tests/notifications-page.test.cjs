const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/notifications/presentation/notifications-page.js';
const legacy = fs.readFileSync(path.join(root, 'app.js'), 'utf8')
  .match(/^function renderNotificationsPage\([^]*?^\}/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

function harness(alerts) {
  const account = {id: 'a'};
  const rows = [{id: 'trade-a'}];
  const calls = [];
  const context = vm.createContext({
    activeAccountId: 'a',
    getActiveAccount() { calls.push('account'); return account; },
    getAccountTrades(id) { calls.push(['trades', id]); return rows; },
    buildOperationalAlerts(acct, trades) {
      assert.equal(acct, account);
      assert.equal(trades, rows);
      calls.push('alerts');
      return alerts;
    },
    renderStatusList(...args) { calls.push(args); },
  });
  vm.runInContext(source, context);
  return {context, calls};
}

test('notifications renders copied alerts for the active account without mutation', () => {
  const alerts = [{tone: 'warn', title: 'Limite', summary: 'Atenção', action: 'showPage("setup")', extra: 3}];
  const {context, calls} = harness(alerts);
  assert.equal(vm.runInContext('renderNotificationsPage()', context), undefined);
  assert.deepEqual(calls.slice(0, 3), ['account', ['trades', 'a'], 'alerts']);
  const [target, rendered, empty] = calls[3];
  assert.equal(target, 'notificationFeed');
  assert.equal(empty, 'Tudo dentro do esperado agora.');
  assert.equal(JSON.stringify(rendered), JSON.stringify(alerts));
  assert.notEqual(rendered, alerts);
  assert.notEqual(rendered[0], alerts[0]);
  assert.equal(alerts[0].extra, 3);
});

test('notifications preserves the empty feed message and current account on each call', () => {
  const {context, calls} = harness([]);
  vm.runInContext('renderNotificationsPage(); activeAccountId="b"; renderNotificationsPage()', context);
  assert.deepEqual(calls.filter(call => Array.isArray(call) && call[0] === 'trades'), [['trades', 'a'], ['trades', 'b']]);
  for (const call of calls.filter(call => Array.isArray(call) && call[0] === 'notificationFeed')) {
    assert.equal(call[1].length, 0);
    assert.equal(call[2], 'Tudo dentro do esperado agora.');
  }
});

test('notifications propagates alert failures without rendering a partial feed', () => {
  const {context, calls} = harness(null);
  assert.throws(() => vm.runInContext('renderNotificationsPage()', context), /map/);
  assert.equal(calls.length, 3);
});
