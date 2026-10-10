const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/accounts/presentation/risk-tags.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderTags\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

function render({type = 'emotion', config = {}, target = {innerHTML: 'before'}, ensuredConfig = config, counts = {}} = {}) {
  const calls = [];
  const context = vm.createContext({
    type,
    config,
    document: {getElementById(id) { calls.push(['target', id]); return target; }},
    ensureDefaultStrategies(value) { calls.push(['ensure', value]); return ensuredConfig; },
    tagConfigKey(value) {
      calls.push(['key', value]);
      return {strategy: 'strategies', emotion: 'emotions', market: 'markets'}[value] || value;
    },
    strategyUsageCount(value) { calls.push(['usage', value]); return counts[value] || 0; },
    escapeHtml(value) { calls.push(['escape', value]); return `[${value}]`; },
  });
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext('renderTags(type)', context);
  return {calls, target, config: vm.runInContext('config', context)};
}

test('missing tag target returns before reading or normalizing configuration', () => {
  const {calls} = render({type: 'market', target: null});
  assert.deepEqual(calls, [['target', 'marketTags']]);
});

test('risk tags classic script loads once before setup page and app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(scripts.filter(src => src === modulePath).length, 1);
  assert.ok(scripts.indexOf(modulePath) < scripts.indexOf('src/modules/accounts/presentation/risk-setup-page.js'));
  assert.ok(scripts.indexOf(modulePath) < scripts.indexOf('app.js'));
});

test('common tags preserve order, escaping, indices and removal handlers', () => {
  const config = {emotions: ['Calma', 'Medo <alto>']};
  const {calls, target} = render({config});
  assert.equal(target.innerHTML,
    '<div class="tag"><span>[Calma]</span><button class="tag-delete-btn" onclick="removeTag(\'emotion\',0)" title="Excluir" aria-label="Excluir [Calma]">×</button></div>' +
    '<div class="tag"><span>[Medo <alto>]</span><button class="tag-delete-btn" onclick="removeTag(\'emotion\',1)" title="Excluir" aria-label="Excluir [Medo <alto>]">×</button></div>');
  assert.deepEqual(calls.filter(call => call[0] === 'key'), [['key', 'emotion']]);
  assert.equal(calls.some(call => call[0] === 'ensure'), false);
  assert.equal(calls.some(call => call[0] === 'usage'), false);
});

test('non-array tag configuration is replaced with an empty list', () => {
  const config = {markets: 'invalid'};
  const {target, config: result} = render({type: 'market', config});
  assert.equal(target.innerHTML, '');
  assert.equal(Array.isArray(result.markets), true);
  assert.equal(result.markets.length, 0);
  assert.equal(config.markets, result.markets);
});

test('strategy tags use ensured configuration, counts and edit/delete controls', () => {
  const original = {strategies: ['old']};
  const ensured = {strategies: ['Breakout', 'Pullback']};
  const {calls, target, config} = render({
    type: 'strategy',
    config: original,
    ensuredConfig: ensured,
    counts: {Breakout: 2},
  });
  assert.equal(config, ensured);
  assert.equal(target.innerHTML,
    '<div class="tag strategy-tag"><span>[Breakout]</span><span class="tag-count">2</span><button class="tag-edit-btn" onclick="editStrategy(0)" title="Editar" aria-label="Editar [Breakout]">✎</button><button class="tag-delete-btn" onclick="deleteStrategy(0)" title="[Excluir da lista (2 trade(s) usam esta estratégia)]" aria-label="Excluir [Breakout]">×</button></div>' +
    '<div class="tag strategy-tag"><span>[Pullback]</span><button class="tag-edit-btn" onclick="editStrategy(1)" title="Editar" aria-label="Editar [Pullback]">✎</button><button class="tag-delete-btn" onclick="deleteStrategy(1)" title="[Excluir da lista]" aria-label="Excluir [Pullback]">×</button></div>');
  assert.deepEqual(calls.filter(call => call[0] === 'ensure'), [['ensure', original]]);
  assert.deepEqual(calls.filter(call => call[0] === 'usage'), [['usage', 'Breakout'], ['usage', 'Pullback']]);
});
