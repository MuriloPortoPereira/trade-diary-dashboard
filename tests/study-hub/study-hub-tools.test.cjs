/*
 * Testes unitarios e de contrato para as tres ferramentas interativas do Study Hub (Plano, TradeSim e Mental).
 *
 * Modulos testados:
 * - `src/modules/study-hub/presentation/study-hub-plan.js` (`TradeDiaryStudyHubPlan`)
 * - `src/modules/study-hub/presentation/study-hub-tradesim.js` (`TradeDiaryStudyHubTradeSim`)
 * - `src/modules/study-hub/presentation/study-hub-mental.js` (`TradeDiaryStudyHubMental`)
 * - `src/modules/study-hub/domain/study-hub-calculations.js` (calculos puros de ciclos, parciais e ruina)
 * - `src/modules/study-hub/infrastructure/study-hub-storage.js`.
 *
 * Estrategia de isolamento:
 * - `setup(kind, fields, saved)` instancia um contexto VM completo com PRNG LCG deterministico (`Math.random`),
 *   Proxy de contexto 2D de canvas, DOM sintetico sob demanda, `Chart`, `fetch` mockado (USDBRL = 6.25),
 *   `setTimeout`, `requestAnimationFrame` e `localStorage` em memoria.
 * - Verifica tambem a lista exata de metodos publicos (`publicNames`) retornada por cada fabrica.
 *
 * Regras criticas garantidas:
 * - Plano restaura ciclos salvos, atualiza cotacao assincrona via `fetch`, tolera `hubCiclos` corrompido (4 padroes) e propaga erro de quota em `ptSetCot`.
 * - TradeSim registra bindings de `input` e `resize` na criacao, adia execucao inicial para `setTimeout` no `load` e sincroniza sliders/inputs e RRR.
 * - Mental executa simulacoes, sincroniza `winRate`/`lossRate`, exporta historico CSV (`ferramentas_mentais_historico.csv`) e zera o log corretamente.
 * - Calculos puros preservam juros compostos, media ponderada de parciais, sequencias continuas/alternadas e limiares de perigo/ruina (`dead`/`danger`).
 * - Definir as fabricas nao produz efeitos colaterais no DOM/storage/timers nem vaza variaveis internas no global.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
// Mapeamento dos tipos de ferramenta para o nome exato da fabrica global exposta por cada modulo.
const factoryNames = {plan: 'TradeDiaryStudyHubPlan', simulator: 'TradeDiaryStudyHubTradeSim', mental: 'TradeDiaryStudyHubMental'};
// Contrato estrito da API publica que cada fabrica deve retornar (ordem e nomes exatos).
const publicNames = {
  plan: ['ptSetCot','ptTab','addCiclo','calcCiclos','calcParciais','calcBR','calcMetas','calcRecov','calcLosses','calcDD','clearDDHist','calcDDModo','calcDDFromPct','calcDDFromUSD','renderPlanilha','runSim','calcDT','calcDTVol','calcAcoesFull','calcAcoes','calcGerRisco'],
  simulator: ['tsRunAll','syncRange','syncInput','tsTab','buildIntraday'],
  mental: ['atualizarTabelaRec','atualizarTopbar','fmSimular','setN','syncLoss','syncWin','setRP','toggleLog','exportLog','clearLog'],
};
// Normaliza valores criados na VM para objetos JS planos antes de comparacoes profundas.
const plain = value => JSON.parse(JSON.stringify(value));

// Inicializa sandbox VM com canvas/DOM/Chart/fetch/PRNG deterministicos, instancia a fabrica `kind` e valida sua API publica.
function setup(kind, fields = {}, saved = {}) {
  const values = new Map(Object.entries(saved)), writes = [], loads = [], timers = [], frames = [], listeners = [], charts = [], downloads = [], elements = new Map();
  // Proxy generico de contexto 2D que aceita qualquer chamada de desenho (incluindo gradientes com `addColorStop`).
  const canvasContext = new Proxy({}, {get(target, name) { return target[name] ?? (() => ({addColorStop() {}})); }});
  const make = value => ({value, checked: false, innerHTML: '', textContent: '', style: {}, dataset: {},
    options: [], width: 500, height: 250, offsetWidth: 500, clientWidth: 500, clientHeight: 250,
    parentElement: {clientWidth: 500}, classList: {add() {}, remove() {}, toggle() {}},
    querySelectorAll: () => [], querySelector: () => null,
    getContext: () => canvasContext,
    addEventListener: (event, callback) => listeners.push([event, callback]),
    appendChild() {}, click() { downloads.push(this); },
    getBoundingClientRect: () => ({width: 500, height: 250}),
  });
  // Valores numericos pequenos por padrao para manter simulacoes Monte Carlo rapidas nos testes.
  const defaults = {'cycles':'2', 'days':'2', 'trades':'2', 'seqTrades':'4', 'tradesPerCycle':'2', 'nTrades':'4', 'sN':'5', 'cicNOps':'2'};
  const get = id => { if (!elements.has(id)) elements.set(id, make(fields[id] ?? defaults[id] ?? '')); return elements.get(id); };
  // Gerador congruencial linear (LCG) deterministico substituindo `Math.random`.
  let randomState = 1;
  const math = Object.create(Math); math.random = () => { randomState = (randomState * 1664525 + 1013904223) >>> 0; return randomState / 4294967296; };
  const c = vm.createContext({Math: math,
    document: {getElementById: get, querySelector: selector => get(selector), querySelectorAll: () => [], createElement: () => make(''), body: {appendChild() {}, removeChild() {}}},
    window: {devicePixelRatio: 1, addEventListener: (event, callback) => listeners.push([event, callback])},
    localStorage: {getItem: key => values.get(key) ?? null, setItem: (key, value) => { writes.push(key); values.set(key, String(value)); }},
    Chart: class { constructor(node, config) { charts.push(config); } destroy() {} },
    setTimeout: callback => timers.push(callback),
    requestAnimationFrame: callback => frames.push(callback),
    fetch: async () => ({json: async () => ({USDBRL: {bid: '6.25'}})}),
    URL: {createObjectURL: () => 'blob:test'}, Blob,
  });
  for (const file of ['domain/study-hub-calculations.js', 'infrastructure/study-hub-storage.js',
    'presentation/study-hub-plan.js', 'presentation/study-hub-tradesim.js', 'presentation/study-hub-mental.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'src/modules/study-hub', file), 'utf8'), c);
  }
  const api = c[factoryNames[kind]](callback => loads.push(callback));
  assert.deepEqual(Object.keys(api), publicNames[kind]);
  const rules = c.TradeDiaryStudyHubCalculations;
  return {api, rules, c, values, writes, loads, timers, frames, listeners, charts, downloads, get};
}

// Verifica inicializacao do Plano: restaura cotacao e ciclos salvos no `load`, atualiza cotacao apos `fetch` (6.25), permite ajuste manual (`ptSetCot`) e cria graficos.
test('plan preserves saved cycles, rate restoration and initialization order', async () => {
  const savedCycles = [{nome: 'Salvo', capInicio: 2000, gains: 200, rrr: 1}];
  const h = setup('plan', {cicCap: '2000', cicRisco: '1', cicNOps: '2'}, {cot: '6', hubCiclos: JSON.stringify(savedCycles)});
  assert.equal(h.loads.length, 1); assert.equal(h.writes.length, 0);
  h.loads[0]();
  assert.equal(h.get('cotInput').value, '6.00');
  assert.equal(JSON.parse(h.values.get('hubCiclos'))[0].nome, 'Salvo');
  assert.equal(h.writes[0], 'hubCiclos');
  await new Promise(setImmediate);
  assert.equal(h.values.get('cot'), '6.25');
  h.api.ptSetCot(7);
  assert.equal(h.get('plCot').value, '7.00'); assert.equal(h.values.get('cot'), '7');
  assert.ok(h.charts.length > 0);
});

// Garante resiliencia do Plano a `hubCiclos` JSON invalido (restaura 4 ciclos padrao) e propagacao de erro de quota em `ptSetCot`.
test('plan keeps malformed saved cycles fallback and rate errors propagating', () => {
  const h = setup('plan', {}, {hubCiclos: '{bad'});
  assert.doesNotThrow(() => h.loads[0]());
  assert.equal(JSON.parse(h.values.get('hubCiclos')).length, 4);
  h.c.localStorage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => h.api.ptSetCot(7), /quota/);
});

// Valida TradeSim: liga listeners de `input` (>= 12) e `resize` na criacao, adia execucao inicial para `setTimeout` no `load` e mantem sincronia slider/input e exibicao de RRR.
test('TradeSim preserves eager input bindings, deferred run and resize registration', () => {
  const h = setup('simulator', {'ts-capital': '1000', risk: '1', sl: '1', tp: '2'});
  assert.equal(h.loads.length, 1); assert.equal(h.timers.length, 0);
  assert.ok(h.listeners.some(([event]) => event === 'resize'));
  assert.ok(h.listeners.filter(([event]) => event === 'input').length >= 12);
  h.loads[0](); assert.equal(h.timers.length, 1);
  assert.doesNotThrow(() => h.timers[0]());
  assert.equal(h.get('id-sl').value, 1); assert.equal(h.get('id-dailyStop').value, 2);
  h.api.syncRange('risk', 'riskRange', 2, '%');
  assert.equal(h.get('risk').value, 2); assert.equal(h.get('riskRangeVal').textContent, '2%');
  h.api.syncInput('risk', 'riskRange', 3, '%');
  assert.equal(h.get('riskRange').value, 3); assert.equal(h.get('rrrDisplay').textContent, '1 : 2.00');
});

// Testa ferramentas mentais: carga inicial + rAF, sincronizacao complementar de `winRate`/`lossRate`, exportacao CSV do historico e bloqueio de exportacao apos `clearLog`.
test('mental simulation preserves history, export/reset and percent synchronization', () => {
  const h = setup('mental', {winRate: '60', lossRate: '40', capital: '1000', nTrades: '4'});
  assert.equal(h.loads.length, 1); assert.equal(h.writes.length, 0);
  h.loads[0]();
  h.frames.splice(0).forEach(callback => callback());
  h.api.syncLoss(); assert.equal(h.get('lossRate').value, 40);
  h.get('lossRate').value = '25'; h.api.syncWin(); assert.equal(h.get('winRate').value, 75);
  h.api.exportLog(); assert.equal(h.downloads.length, 1);
  assert.equal(h.downloads[0].download, 'ferramentas_mentais_historico.csv');
  h.api.clearLog(); h.api.exportLog(); assert.equal(h.downloads.length, 1);
  assert.equal(h.get('m-sims').textContent, 0);
});

// Verifica calculos puros compartilhados de Plano e Mental: capital composto (`calcCapFinal`), media ponderada de parciais (`calcParcMedia`), sequencias (`gerarContinuo`/`gerarAlternado`) e colunas de ruina (`calcCol`).
test('plan and mental pure calculations preserve compounding, partials and ruin thresholds', () => {
  const {rules} = setup('plan');
  assert.equal(rules.calcCapFinal(100, 10, 2, 2), 144);
  assert.equal(rules.calcParcMedia([75, 25], [1, 2]), 1.25);
  assert.equal(rules.calcParcMedia([0, 0], [1, 2]), 0);
  assert.deepEqual(plain(rules.gerarContinuo(100, 0.1, 2)), [
    {n: 1, res: 'L', pnl: -10, saldo: 90}, {n: 2, res: 'L', pnl: -9, saldo: 81}]);
  assert.deepEqual(plain(rules.gerarAlternado(100, 0.1, 2, 2)), [
    {n: 1, res: 'L', pnl: -10, saldo: 90}, {n: 2, res: 'W', pnl: 18, saldo: 108}]);
  assert.deepEqual(plain(rules.calcCol(100, 2, 1, [-1, 1], 30)), [
    {s: 0, dead: true, danger: false, res: -1}, {s: 0, dead: true, danger: false, res: 1}]);
  assert.equal(rules.calcCol(100, 1, 0.2, [-1], 90)[0].danger, true);
  assert.equal(rules.calcCol(100, 1, 0.2, [-1], 80)[0].danger, false);
});

// Comprova que avaliar os tres scripts de ferramentas define somente suas respectivas fabricas sem acessar DOM, storage, timers ou `window` e sem vazar globais internos.
test('tool definitions expose only factories without touching DOM, storage, timers or window', () => {
  const sandbox = {};
  for (const name of ['document','localStorage','window','Chart','setTimeout','requestAnimationFrame']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`definition accessed ${name}`); }});
  }
  const c = vm.createContext(sandbox);
  for (const file of ['study-hub-plan.js','study-hub-tradesim.js','study-hub-mental.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'src/modules/study-hub/presentation', file), 'utf8'), c);
  }
  for (const name of Object.values(factoryNames)) assert.equal(typeof c[name], 'function');
  for (const name of ['renderLog','LOG','ciclosRows','tsRunAll','ptSetCot']) assert.equal(c[name], undefined);
});
