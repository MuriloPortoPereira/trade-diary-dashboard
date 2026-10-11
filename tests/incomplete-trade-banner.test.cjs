const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/trades/presentation/incomplete-trade-banner.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^let _incompleteBannerDismissed=false;[^]*?^function dismissIncompleteBanner\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

test('banner loads as a classic script before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const bannerIndex = html.indexOf(`<script src="${modulePath}"></script>`);
  const appIndex = html.indexOf('<script src="app.js"></script>');
  assert.ok(bannerIndex >= 0);
  assert.ok(bannerIndex < appIndex);
});

function render({trades = [], alert = {style: {display: 'before'}}, count = {textContent: 'before'}, dismiss = false} = {}) {
  const calls = [];
  const before = JSON.stringify(trades);
  const context = vm.createContext({
    activeAccountId: 'acct-1',
    getAccountTrades(id) { calls.push(['trades', id]); return trades; },
    document: {
      getElementById(id) {
        calls.push(['target', id]);
        return id === 'incompleteAlert' ? alert : id === 'incompleteCount' ? count : null;
      },
    },
  });
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext(dismiss ? 'dismissIncompleteBanner()' : 'updateIncompleteBanner()', context);
  return {alert, count, calls, before, after: JSON.stringify(trades), context};
}

test('incomplete trades show the banner and preserve source rows', () => {
  const trades = [{id: 1, incomplete: true}, {id: 2, incomplete: false}, {id: 3, incomplete: 1}];
  const result = render({trades});
  assert.equal(result.alert.style.display, 'block');
  assert.equal(result.count.textContent, 2);
  assert.equal(result.after, result.before);
  assert.deepEqual(result.calls, [
    ['trades', 'acct-1'],
    ['target', 'incompleteAlert'],
    ['target', 'incompleteCount'],
  ]);
});

test('zero incomplete trades hide the banner and render numeric zero', () => {
  const {alert, count} = render({trades: [{incomplete: false}, {}]});
  assert.equal(alert.style.display, 'none');
  assert.equal(count.textContent, 0);
});

test('optional banner targets do not skip account lookup or counting', () => {
  const {calls} = render({trades: [{incomplete: true}], alert: null, count: null});
  assert.deepEqual(calls, [
    ['trades', 'acct-1'],
    ['target', 'incompleteAlert'],
    ['target', 'incompleteCount'],
  ]);
});

test('dismiss hides existing incompletes and remains sticky for later updates', () => {
  const alert = {style: {display: 'before'}};
  const count = {textContent: 'before'};
  const result = render({trades: [{incomplete: true}], alert, count, dismiss: true});
  assert.equal(alert.style.display, 'none');
  assert.equal(count.textContent, 1);
  vm.runInContext('updateIncompleteBanner()', result.context);
  assert.equal(alert.style.display, 'none');
  assert.equal(count.textContent, 1);
});
