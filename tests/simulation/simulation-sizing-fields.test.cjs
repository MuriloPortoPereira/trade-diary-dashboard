/*
 * Objetivo:
 *   Validar a sincronizacao dos campos monetarios de dimensionamento (risco, meta e
 *   stop em USD) a partir dos percentuais informados na UI da simulacao
 *   (syncSimulationMoneyFromPercent).
 *
 * Modulo testado:
 *   src/modules/simulation/presentation/simulation-panel.js (funcao
 *   syncSimulationMoneyFromPercent extraida do modulo, confirmando tambem que a
 *   declaracao legada foi removida de app.js e que a ordem de scripts no index.html
 *   esta correta).
 *
 * Estrategia de isolamento:
 *   Extrai somente a funcao syncSimulationMoneyFromPercent de simulation-panel.js e a
 *   executa em uma sandbox node:vm com mocks para activeAccountId,
 *   document.getElementById, getSimulationAccountSnapshot, toSimulationNumber,
 *   calculateSimulationSizing e setSimulationInputValue, gravando todas as chamadas
 *   em `calls` para auditar ordem exata, fallbacks e imutabilidade.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Quando os inputs do DOM estao ausentes, usa activeAccountId para buscar o
 *     snapshot e aplica os valores do snapshot como fallback em toSimulationNumber,
 *     sem mutar o snapshot original.
 *   - Projeta os tres valores calculados (simRisk, simGoalDay, simStopDay) com 2
 *     casas decimais e retorna o objeto `sizing` produzido por
 *     calculateSimulationSizing.
 *   - Valores explicitos no DOM (incluindo '0' em simRiskPct) prevalecem sobre os
 *     fallbacks do snapshot.
 *   - simulation-panel.js carrega uma unica vez apos simulation-calculations.js e
 *     antes de app.js.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/simulation/presentation/simulation-panel.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function syncSimulationMoneyFromPercent\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8').match(/^function syncSimulationMoneyFromPercent\([^]*?^\}/m)[0];

// Helper de execucao em VM: monta inputs simulados a partir de `values`, injeta
// espias para snapshot, parsing numerico, calculo de sizing e escrita nos inputs,
// executa syncSimulationMoneyFromPercent() e devolve o historico completo de chamadas
// e o valor retornado.
function render({activeAccountId = 'active-1', values = {}, snapshot, sizing} = {}) {
  const calls = [];
  const elements = Object.fromEntries(Object.entries(values).map(([id, value]) => [id, {value}]));
  const context = vm.createContext({
    activeAccountId,
    document: {getElementById(id) { calls.push(['target', id]); return elements[id] ?? null; }},
    getSimulationAccountSnapshot(id) { calls.push(['snapshot', id]); return snapshot; },
    toSimulationNumber(value, fallback) {
      calls.push(['number', value, fallback]);
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    },
    calculateSimulationSizing(input) {
      calls.push(['calculate', JSON.parse(JSON.stringify(input))]);
      return sizing;
    },
    setSimulationInputValue(id, value, digits) { calls.push(['set', id, value, digits]); },
  });
  vm.runInContext(source, context, {filename: modulePath});
  const result = vm.runInContext('syncSimulationMoneyFromPercent()', context);
  return {calls, result};
}

// Caso de borda sem controles no DOM: verifica uso de activeAccountId no snapshot,
// passagem de undefined + fallback do snapshot para cada campo em toSimulationNumber,
// chamada de calculateSimulationSizing, projecao dos 3 campos monetarios com 2
// decimais e imutabilidade do snapshot.
test('missing controls use active-account fallbacks and project all calculated money fields', () => {
  const snapshot = {balance: 1000, riskPct: 1, goalPct: 5, stopPct: 3};
  const sizing = {riskUsd: 10, goalUsd: 50, stopUsd: 30};
  const before = JSON.stringify(snapshot);
  const {calls, result} = render({snapshot, sizing});
  assert.equal(result, sizing);
  assert.equal(JSON.stringify(snapshot), before);
  assert.deepEqual(calls, [
    ['target', 'simAccount'],
    ['snapshot', 'active-1'],
    ['target', 'simBalance'],
    ['number', undefined, 1000],
    ['target', 'simRiskPct'],
    ['number', undefined, 1],
    ['target', 'simGoalPct'],
    ['number', undefined, 5],
    ['target', 'simStopPct'],
    ['number', undefined, 3],
    ['calculate', {balance: 1000, riskPct: 1, goalPct: 5, stopPct: 3}],
    ['set', 'simRisk', 10, 2],
    ['set', 'simGoalDay', 50, 2],
    ['set', 'simStopDay', 30, 2],
  ]);
});

// Verifica no index.html que simulation-panel.js carrega uma unica vez apos o dominio
// simulation-calculations.js e antes de app.js.
test('simulation sizing fields classic script loads once after domain and before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  const domainPath = 'src/modules/simulation/domain/simulation-calculations.js';
  assert.equal(scripts.filter(src => src === modulePath).length, 1);
  assert.ok(scripts.indexOf(domainPath) < scripts.indexOf(modulePath));
  assert.ok(scripts.indexOf(modulePath) < scripts.indexOf('app.js'));
});

// Cenario com conta selecionada e campos preenchidos explicitamente (incluindo risco
// '0'): garante que 0 nao cai no fallback do snapshot, que os valores convertidos vao
// na ordem correta para calculateSimulationSizing e que os 3 campos monetarios sao
// atualizados com 2 casas decimais.
test('selected account and explicit fields preserve conversion and projection order including zero', () => {
  const snapshot = {balance: 900, riskPct: 9, goalPct: 8, stopPct: 7};
  const sizing = {riskUsd: 0, goalUsd: 37.5, stopUsd: 15};
  const {calls, result} = render({
    values: {simAccount: 'acct-2', simBalance: '1500.50', simRiskPct: '0', simGoalPct: '2.5', simStopPct: '1'},
    snapshot,
    sizing,
  });
  assert.equal(result, sizing);
  assert.deepEqual(calls.filter(call => call[0] === 'snapshot'), [['snapshot', 'acct-2']]);
  assert.deepEqual(calls.filter(call => call[0] === 'calculate'), [
    ['calculate', {balance: 1500.5, riskPct: 0, goalPct: 2.5, stopPct: 1}],
  ]);
  assert.deepEqual(calls.filter(call => call[0] === 'set'), [
    ['set', 'simRisk', 0, 2],
    ['set', 'simGoalDay', 37.5, 2],
    ['set', 'simStopDay', 15, 2],
  ]);
});
