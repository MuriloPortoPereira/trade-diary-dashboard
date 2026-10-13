const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/trades/presentation/trade-plan-deviation.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function togglePlanDeviation\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

test('plan deviation loads once as a classic script before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});

function toggle({deviation = {disabled: true, style: {opacity: '0.5'}, placeholder: 'before'}, followed = {value: ''}} = {}) {
  const calls = [];
  const context = vm.createContext({
    document: {
      getElementById(id) {
        calls.push(['target', id]);
        return id === 't-plan-deviation' ? deviation : id === 't-followedplan' ? followed : null;
      },
    },
    autoDisc() { calls.push(['discipline']); },
  });
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext('togglePlanDeviation()', context);
  return {deviation, followed, calls};
}

test('missing deviation field returns before reading plan or updating discipline', () => {
  const followed = new Proxy({}, {get() { throw new Error('followed plan accessed'); }});
  const {calls} = toggle({deviation: null, followed});
  assert.deepEqual(calls, [['target', 't-plan-deviation']]);
});

test('followed plan enables the field and keeps the optional-detail placeholder', () => {
  const result = toggle({followed: {value: 'sim'}});
  assert.equal(result.deviation.disabled, false);
  assert.equal(result.deviation.style.opacity, '1');
  assert.equal(result.deviation.placeholder, 'Opcional: algum detalhe mesmo seguindo o plano?');
  assert.deepEqual(result.calls, [
    ['target', 't-plan-deviation'],
    ['target', 't-followedplan'],
    ['discipline'],
  ]);
});

test('deviated plan keeps the execution-change placeholder', () => {
  const {deviation} = toggle({followed: {value: 'nao'}});
  assert.equal(deviation.placeholder, 'O que mudou na execução, entrada, saída ou gestão?');
});

test('missing followed-plan field retains the empty-value fallback and still updates discipline', () => {
  const {deviation, calls} = toggle({followed: null});
  assert.equal(deviation.placeholder, 'O que mudou na execução, entrada, saída ou gestão?');
  assert.deepEqual(calls.at(-1), ['discipline']);
});
