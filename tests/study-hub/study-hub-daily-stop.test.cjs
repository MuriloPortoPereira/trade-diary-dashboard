/*
 * Testes unitarios para a marcacao de limite de perda diaria (`daily-stop`) na
 * sequencia aleatoria do TradeSim.
 *
 * Modulo testado:
 * - `src/modules/study-hub/presentation/study-hub-tradesim.js`
 *   (`TradeDiaryStudyHubTradeSim`, `tsTab`).
 *
 * Estrategia de isolamento:
 * - Executa o modulo em `vm.createContext` com mocks leves de DOM
 *   (`document.getElementById`, `createElement` com `classList`) e sobrescreve
 *   `Math.random` com uma sequencia deterministica de vitorias (`true -> 0.1`) e
 *   derrotas (`false -> 0.9`).
 * - Usa `timeout: 1000` na VM e valida que nenhum sorteio alem de `outcomes.length` e
 *   consumido.
 *
 * Regras criticas garantidas:
 * - O limite de perda diaria considera o resultado liquido acumulado do dia, nao
 *   apenas uma perda isolada.
 * - A classe `daily-stop` e aplicada quando a perda diaria atinge exatamente ou
 *   ultrapassa `dailyStop`.
 * - Dia com resultado liquido positivo ou zerado (`0`) nao dispara `daily-stop`.
 * - Apos acionar o bloqueio ou completar a cota diaria de operacoes (`trades`), o
 *   acumulador diario e reiniciado.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const filename = path.join(__dirname, '../../src/modules/study-hub/presentation/study-hub-tradesim.js');
const source = fs.readFileSync(filename, 'utf8');

// Executa a aba `seqRandom` com resultados deterministicos (`true` = ganho, `false` =
// perda) e retorna quais celulas receberam a classe `daily-stop`.
function simulateSequence(outcomes, overrides = {}) {
  const values = {
    'ts-capital': 1000, risk: 1, dailyStop: 2, dailyTarget: 1, sl: 1, tp: 3,
    trades: 10, wr: 50, days: 60, cycles: 200, seqTrades: outcomes.length, tradesPerCycle: 10,
    ...overrides,
  };

  // Fabrica minima de `classList` baseada em Set para rastrear classes
  // adicionadas/removidas em cada celula.
  const classList = () => {
    const names = new Set();
    return {add: name => names.add(name), remove: name => names.delete(name), contains: name => names.has(name)};
  };
  const nodes = new Map(Object.entries(values).map(([id, value]) => [id, {value: String(value), addEventListener() {}}]));
  const cells = [];
  nodes.set('tradeSeqViz', {innerHTML: '', appendChild: cell => cells.push(cell)});
  nodes.set('seqStats', {innerHTML: ''});
  nodes.set('seqRandom', {classList: classList()});
  let index = 0;
  const context = vm.createContext({
    // Com `wr = 50`, retornar 0.1 garante ganho (< 0.5) e 0.9 garante perda (>= 0.5).
    Math: Object.assign(Object.create(Math), {random: () => {
      assert.ok(index < outcomes.length, 'A sequência não deve consumir sorteios extras.');
      return outcomes[index++] ? 0.1 : 0.9;
    }}),
    document: {
      getElementById: id => nodes.get(id) || null,
      createElement: () => ({classList: classList()}),
    },
    window: {addEventListener() {}},
  });
  vm.runInContext(source, context, {filename, timeout: 1000});
  const simulator = context.TradeDiaryStudyHubTradeSim(() => {});
  const button = {classList: classList(), closest: () => ({querySelectorAll: () => []})};
  simulator.tsTab(button, 'seqRandom');
  return cells.map(cell => cell.classList.contains('daily-stop'));
}

// Ganho inicial (+3R) seguido de perda (-1R) mantem o dia no lucro (+2R), logo nao
// marca `daily-stop`.
test('não marca limite de perda quando o dia continua com lucro após uma perda', () => {
  assert.deepEqual(simulateSequence([true, false]), [false, false]);
});

// Duas perdas consecutivas (-1% + -1% = -2%) atingem exatamente `dailyStop: 2` e
// marcam a segunda celula.
test('marca o limite quando as perdas acumuladas atingem exatamente o valor diário', () => {
  assert.deepEqual(simulateSequence([false, false]), [false, true]);
});

// Uma unica perda com `risk: 3` ja ultrapassa `dailyStop: 2` e marca `daily-stop`
// imediatamente.
test('marca o limite quando uma perda ultrapassa o valor diário', () => {
  assert.deepEqual(simulateSequence([false], {risk: 3}), [true]);
});

// Uma unica perda (-1%) abaixo de `dailyStop: 2` ainda nao deve disparar bloqueio
// diario.
test('não marca o limite antes de atingir a perda diária', () => {
  assert.deepEqual(simulateSequence([false]), [false]);
});

// Ganho +1R seguido de perda -1R deixa o saldo diario em zero (breakeven), sem marcar
// limite de perda.
test('não marca limite de perda em um dia com resultado zero', () => {
  assert.deepEqual(simulateSequence([true, false], {tp: 1}), [false, false]);
});

// Apos duas perdas acionarem o bloqueio no dia 1, o dia 2 comeca zerado; ganho
// seguido de perda no dia 2 nao dispara stop.
test('reinicia o resultado diário após o bloqueio sem bloquear lucro no dia seguinte', () => {
  assert.deepEqual(simulateSequence([false, false, true, false]), [false, true, false, false]);
});

// Com `trades: 2` por dia, os dois ganhos fecham o dia 1; as duas perdas seguintes
// ocorrem no dia 2 zerado e atingem o stop no 4o trade.
test('reinicia o resultado ao completar a quantidade de operações do dia', () => {
  assert.deepEqual(simulateSequence([true, true, false, false], {trades: 2, tp: 1}), [false, false, false, true]);
});
