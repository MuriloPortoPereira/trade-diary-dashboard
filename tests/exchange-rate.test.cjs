const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/preferences/infrastructure/exchange-rate.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const declarations = appSource.match(/^let cotacaoAtual[^\n]*\nlet cotacaoInterval[^\n]*/m)?.[0];
const functionNames = ['setCotacao', 'fetchCotacao', 'initCotacao'];
const legacyFunctions = functionNames.map(name => appSource.match(new RegExp(`^(?:async )?function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const legacy = declarations && legacyFunctions.every(Boolean);
const source = legacy
  ? `${declarations}\n\n${legacyFunctions.join('\n\n')}`
  : fs.readFileSync(path.join(root, modulePath), 'utf8');

function setup({stored = '5.80', fetchImpl, studyHub = 'sh'} = {}) {
  const calls = [];
  const nodes = {
    cotInput: {value: ''},
    hubCot: {value: ''},
    hubCotBadge: {textContent: ''},
    cotRefreshBtn: {classList: {add: value => calls.push(['add', value]), remove: value => calls.push(['remove', value])}},
  };
  const storage = new Map([['appCotacao', stored]]);
  const sandbox = {
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => { calls.push(['store', key, value]); storage.set(key, String(value)); },
    },
    document: {getElementById: id => nodes[id] ?? null},
    window: {},
    fetch: fetchImpl ?? (async () => ({json: async () => ({USDBRL: {bid: '6.127'}})})),
    setInterval: (callback, delay) => { calls.push(['interval', callback.name, delay]); return 77; },
  };
  if (studyHub === 'sh') sandbox.window.sh_hubSetCot = value => calls.push(['sh', value]);
  if (studyHub === 'hub') sandbox.window.hubSetCot = value => calls.push(['hub', value]);
  const context = vm.createContext(sandbox);
  vm.runInContext(source, context, {filename: legacy ? 'app.js#exchange-rate' : modulePath});
  return {context, calls, nodes, storage};
}

test('setting a quote preserves validation, rounding, storage and StudyHub precedence', () => {
  const current = setup();
  current.context.setCotacao('0.5');
  assert.equal(vm.runInContext('cotacaoAtual', current.context), 5.8);
  current.context.setCotacao('5.876');
  assert.equal(vm.runInContext('cotacaoAtual', current.context), 5.88);
  assert.equal(current.storage.get('appCotacao'), '5.88');
  assert.equal(current.nodes.cotInput.value, '5.88');
  assert.equal(current.nodes.hubCot.value, '5.88');
  assert.equal(current.nodes.hubCotBadge.textContent, 'R$ 5.88');
  assert.deepEqual(current.calls.slice(-2), [['store', 'appCotacao', 5.88], ['sh', 5.88]]);

  const fallback = setup({studyHub: 'hub'});
  fallback.context.setCotacao(6);
  assert.deepEqual(fallback.calls.at(-1), ['hub', 6]);
});

test('fetch preserves success, silent failure and spinner cleanup', async () => {
  const success = setup();
  await success.context.fetchCotacao();
  assert.equal(vm.runInContext('cotacaoAtual', success.context), 6.13);
  assert.deepEqual(success.calls.filter(call => ['add', 'remove'].includes(call[0])), [
    ['add', 'spinning'], ['remove', 'spinning'],
  ]);

  const failure = setup({fetchImpl: async () => { throw new Error('offline'); }});
  await failure.context.fetchCotacao();
  assert.equal(vm.runInContext('cotacaoAtual', failure.context), 5.8);
  assert.deepEqual(failure.calls, [['add', 'spinning'], ['remove', 'spinning']]);
});

test('initialization restores the input, fetches immediately and schedules five minutes', async () => {
  const current = setup({stored: '6.25'});
  current.context.initCotacao();
  assert.equal(current.nodes.cotInput.value, '6.25');
  assert.deepEqual(current.calls.find(call => call[0] === 'interval').slice(1), ['fetchCotacao', 300000]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(current.calls.some(call => call[0] === 'add'), true);
});

test('exchange rate remains one synchronous classic script before bootstrap and app.js', () => {
  if (legacy) return;
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src/app/application/bootstrap-app.js'));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
