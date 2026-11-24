/*
 * Testes de integracao para o runtime legado do Study Hub e o aprimoramento de impacto intraday.
 *
 * Modulos testados:
 * - `src/modules/study-hub/presentation/study-hub-legacy-runtime.js` (montagem do template,
 *   closure de inicializacao e pontes `window.sh_*`)
 * - `src/modules/study-hub/presentation/study-hub-intraday.js` (`studyHubBuildIntradayRows`,
 *   `studyHubEnhanceIntradayImpact`)
 * - Colaboracao com todos os modulos de dominio, storage, template e ferramentas do Study Hub.
 *
 * Estrategia de isolamento:
 * - Carrega as dependencias do Study Hub em `vm.createContext` com uma arvore DOM simulada (`node()`),
 *   `window` com listeners rastreados, `localStorage`, `setTimeout` e `requestAnimationFrame`.
 * - Permite executar apenas a IIFE inicial de montagem (`runtime.slice(0, mountEnd)`) ou o runtime completo.
 *
 * Regras criticas garantidas:
 * - Montagem do template e idempotente (ignora host ausente ou ja marcado com `dataset.loaded = '1'`).
 * - A closure do runtime expoe apenas pontes `window.sh_*` sem vazar funcoes privadas no escopo global.
 * - `studyHubBuildIntradayRows` calcula projecoes de ganho/stop/alternado e respeita o limite maximo de 20 linhas.
 * - `studyHubEnhanceIntradayImpact` envolve cada ponte no maximo uma vez (idempotente), preservando argumentos e retornos.
 * - Ordem estrita e sincrona de todos os scripts do Study Hub em `index.html` apos `app.js`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const runtimePath = 'src/modules/study-hub/presentation/study-hub-legacy-runtime.js';
const intradayPath = 'src/modules/study-hub/presentation/study-hub-intraday.js';
const runtime = fs.readFileSync(path.join(root, runtimePath), 'utf8');
const intraday = fs.readFileSync(path.join(root, intradayPath), 'utf8');
// Delimita o fim da primeira IIFE do runtime (responsavel exclusivamente pela montagem do HTML no container host).
const mountEnd = runtime.indexOf('\n})();') + '\n})();'.length;

// Cria um elemento DOM simulado com suporte a `classList`, `dataset`, `children` e `value`.
function node(value = '') {
  const classes = new Set();
  return {
    value, textContent: '', innerHTML: '', dataset: {}, style: {}, children: [],
    classList: {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name),
      toggle(name, force) { if (force) classes.add(name); else classes.delete(name); },
    },
    appendChild(child) { this.children.push(child); },
    addEventListener() {},
    querySelectorAll: () => [],
  };
}

// Configura sandbox VM com todos os submodulos do Study Hub carregados antes do runtime legado e do enhancer intraday.
function setup({host = node(), readyState = 'loading'} = {}) {
  const elements = new Map([
    ['studyHubLegacyApp', host], ['hubCotBadge', node()], ['hubCot', node('5.8')],
    ['mod-propfirm', node()], ['mod-plano', node()], ['mod-tradesim', node()], ['mod-mental', node()],
    ['winRate', node('60')], ['lossRate', node('40')],
  ]);
  const listeners = [], timers = [], frames = [], errors = [], writes = [];
  const window = {
    Chart: class {}, location: {search: ''},
    addEventListener: (...args) => listeners.push(args),
    dispatchEvent() {},
  };
  const sandbox = {
    window,
    document: {
      readyState, body: node(),
      getElementById: id => elements.get(id) || null,
      querySelectorAll: () => [], createElement: () => node(), addEventListener() {},
    },
    localStorage: {getItem: () => null, setItem: (...args) => writes.push(args)},
    console: {error: (...args) => errors.push(args)},
    setTimeout: fn => timers.push(fn), clearTimeout() {},
    requestAnimationFrame: fn => frames.push(fn), URLSearchParams, Event,
    Chart: window.Chart,
  };
  const context = vm.createContext(sandbox);
  for (const file of ['domain/study-hub-calculations.js', 'infrastructure/study-hub-storage.js',
    'presentation/study-hub-propfirm.js', 'presentation/study-hub-plan.js',
    'presentation/study-hub-tradesim.js', 'presentation/study-hub-mental.js', 'presentation/study-hub-template.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'src/modules/study-hub', file), 'utf8'), context);
  }
  return {context, window, elements, listeners, timers, frames, errors, writes, host};
}

// Garante idempotencia da montagem do template: pula host `null` ou ja carregado, injeta os 4 modulos com `embed-mode` na primeira vez e nao sobrescreve na segunda.
test('StudyHub mounting skips absent/already loaded hosts and initializes an empty host once', () => {
  for (const host of [null, Object.assign(node(), {dataset: {loaded: '1'}, innerHTML: 'kept'})]) {
    const h = setup({host});
    vm.runInContext(runtime.slice(0, mountEnd), h.context);
    if (host) assert.equal(host.innerHTML, 'kept');
  }
  const h = setup();
  vm.runInContext(runtime.slice(0, mountEnd), h.context);
  assert.equal(h.host.dataset.loaded, '1');
  assert.ok(h.host.classList.contains('embed-mode'));
  for (const id of ['mod-propfirm', 'mod-plano', 'mod-tradesim', 'mod-mental']) {
    assert.ok(h.host.innerHTML.includes(`id="${id}"`));
  }
  h.host.innerHTML = 'kept';
  vm.runInContext(runtime.slice(0, mountEnd), h.context);
  assert.equal(h.host.innerHTML, 'kept');
});

// Verifica encapsulamento da closure (sem vazar renderizadores internos), ausencia de erros/escritas precoces e funcionamento das pontes de navegacao, taxas e cotacao.
test('StudyHub closure exports bridges without leaking private renderers and preserves navigation', () => {
  const h = setup();
  vm.runInContext(runtime, h.context);
  assert.equal(h.context.renderLog, undefined);
  assert.equal(h.context.hubSwitch, undefined);
  assert.equal(h.context.calcSimulador, undefined);
  assert.equal(h.errors.length, 0);
  assert.ok(h.listeners.filter(([name]) => name === 'load').length >= 5);
  assert.equal(h.writes.length, 0);
  h.window.sh_hubSwitch(2);
  assert.equal(h.elements.get('mod-tradesim').classList.contains('active'), true);
  assert.equal(h.elements.get('mod-propfirm').classList.contains('active'), false);
  h.window.sh_syncLoss();
  assert.equal(h.elements.get('lossRate').value, 40);
  h.elements.get('lossRate').value = '25';
  h.window.sh_syncWin();
  assert.equal(h.elements.get('winRate').value, 75);
  h.window.sh_hubSetCot(6.25);
  assert.equal(h.elements.get('hubCotBadge').textContent, 'R$ 6,25');
  h.window.sh_hubSetCot(0.01);
  assert.equal(h.elements.get('hubCotBadge').textContent, 'R$ 6,25');
});

// Valida o calculo da tabela intraday: ganho consecutivo, perda consecutiva, cenario alternado, flags `hitTarget`/`hitStop`, saldo restante e teto de 20 linhas.
test('intraday rows retain target/stop thresholds, capital projections and row limits', () => {
  const h = setup();
  vm.runInContext(intraday, h.context);
  const rows = h.window.studyHubBuildIntradayRows({
    capital: 1000, riskPct: 1, accountGainPct: 2,
    dailyStopPct: 3, dailyTargetPct: 4, stopAt: 3, targetAt: 2,
  });
  assert.equal(rows.length, 8);
  assert.deepEqual(JSON.parse(JSON.stringify(rows[1])), {
    n: 2, allGainPct: 4, allGainValue: 40, allStopPct: -2, allStopValue: -20,
    altPct: 1, altValue: 10, hitStop: false, hitTarget: true,
    stopRemaining: 1, targetRemaining: 0,
  });
  assert.equal(rows[2].hitStop, true);
  assert.equal(h.window.studyHubBuildIntradayRows({stopAt: 100, targetAt: 1}).length, 20);
});

// Confirma em `index.html` a sequencia exata dos 8 scripts sincronos classicos do Study Hub carregados imediatamente apos `app.js`.
test('StudyHub scripts execute synchronously after app.js with runtime before intraday', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attrs: match[1], src: match[1].match(/\bsrc=['"]([^'"]+)['"]/)?.[1],
  }));
  const appIndex = scripts.findIndex(script => script.src === 'app.js');
  const sequence = ['src/modules/study-hub/infrastructure/study-hub-storage.js',
    'src/modules/study-hub/presentation/study-hub-propfirm.js',
    'src/modules/study-hub/presentation/study-hub-plan.js',
    'src/modules/study-hub/presentation/study-hub-tradesim.js',
    'src/modules/study-hub/presentation/study-hub-mental.js',
    'src/modules/study-hub/presentation/study-hub-template.js', runtimePath, intradayPath];
  assert.deepEqual(scripts.slice(appIndex + 1).map(script => script.src), sequence);
  for (const src of sequence) {
    const matching = scripts.filter(script => script.src === src);
    assert.equal(matching.length, 1);
    assert.doesNotMatch(matching[0].attrs, /\b(?:async|defer|type|nomodule)\b/i);
  }
});

// Garante que chamar `studyHubEnhanceIntradayImpact()` multiplas vezes nao re-envolve `sh_buildIntraday` nem `sh_tsRunAll`, preservando argumentos, retornos e agendamentos em rAF.
test('intraday enhancer wraps each bridge once and preserves arguments and return values', () => {
  const h = setup();
  const calls = [];
  h.window.sh_buildIntraday = (...args) => { calls.push(['build', ...args]); return 'built'; };
  h.window.sh_tsRunAll = (...args) => { calls.push(['all', ...args]); return 'ran'; };
  vm.runInContext(intraday, h.context);
  h.window.studyHubEnhanceIntradayImpact();
  const build = h.window.sh_buildIntraday, run = h.window.sh_tsRunAll;
  h.window.studyHubEnhanceIntradayImpact();
  assert.equal(h.window.sh_buildIntraday, build);
  assert.equal(h.window.sh_tsRunAll, run);
  assert.equal(build(1, 'x'), 'built');
  assert.equal(run(2), 'ran');
  assert.deepEqual(calls, [['build', 1, 'x'], ['all', 2]]);
  assert.equal(h.frames.length, 2);
});
