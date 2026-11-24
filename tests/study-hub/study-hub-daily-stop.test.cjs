const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const filename = path.join(__dirname, '../../src/modules/study-hub/presentation/study-hub-tradesim.js');
const source = fs.readFileSync(filename, 'utf8');

function simulateSequence(outcomes, overrides = {}) {
  const values = {
    'ts-capital': 1000, risk: 1, dailyStop: 2, dailyTarget: 1, sl: 1, tp: 3,
    trades: 10, wr: 50, days: 60, cycles: 200, seqTrades: outcomes.length, tradesPerCycle: 10,
    ...overrides,
  };
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

test('não marca limite de perda quando o dia continua com lucro após uma perda', () => {
  assert.deepEqual(simulateSequence([true, false]), [false, false]);
});

test('marca o limite quando as perdas acumuladas atingem exatamente o valor diário', () => {
  assert.deepEqual(simulateSequence([false, false]), [false, true]);
});

test('marca o limite quando uma perda ultrapassa o valor diário', () => {
  assert.deepEqual(simulateSequence([false], {risk: 3}), [true]);
});

test('não marca o limite antes de atingir a perda diária', () => {
  assert.deepEqual(simulateSequence([false]), [false]);
});

test('não marca limite de perda em um dia com resultado zero', () => {
  assert.deepEqual(simulateSequence([true, false], {tp: 1}), [false, false]);
});

test('reinicia o resultado diário após o bloqueio sem bloquear lucro no dia seguinte', () => {
  assert.deepEqual(simulateSequence([false, false, true, false]), [false, true, false, false]);
});

test('reinicia o resultado ao completar a quantidade de operações do dia', () => {
  assert.deepEqual(simulateSequence([true, true, false, false], {trades: 2, tp: 1}), [false, false, false, true]);
});
