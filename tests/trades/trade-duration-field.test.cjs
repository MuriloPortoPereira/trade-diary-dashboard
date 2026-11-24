/*
 * Objetivo:
 *   Validar o calculo e preenchimento do campo de duracao do trade no formulario
 *   (leitura dos campos de data/hora, fallback de data de saida e formatacao do
 *   resultado).
 *
 * Modulo testado:
 *   src/modules/trades/presentation/trade-form.js (funcao updateTradeDurationField,
 *   alem de assegurar que a definicao legada foi removida de app.js e que o script e
 *   carregado corretamente no index.html).
 *
 * Estrategia de isolamento:
 *   Executa o modulo em uma sandbox node:vm com mocks para document.getElementById,
 *   getTradeDurationMinutes e formatDurationMinutes, capturando a sequencia exata de
 *   leituras de DOM e chamadas de dependencias.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Se o campo alvo t-duration nao existir, retorna imediatamente sem ler outros
 *     inputs.
 *   - O modulo e carregado uma unica vez como script classico antes de app.js.
 *   - Datas e horarios preenchidos sao repassados intactos ao calculador e
 *     formatador.
 *   - Quando a data de saida esta ausente, recorre a uma nova leitura da data de
 *     entrada; quando a duracao calculada e null, limpa o campo de duracao.
 *   - Duracao igual a 0 minutos e tratada como valor valido e formatada, nunca como
 *     vazio.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/trades/presentation/trade-form.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function updateTradeDurationField\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

// Helper de execucao em VM: cria inputs simulados a partir do mapa `values`, injeta
// espias para getElementById, getTradeDurationMinutes e formatDurationMinutes e
// invoca updateTradeDurationField(). O objeto passado para getTradeDurationMinutes e
// clonado via JSON para evitar diferencas de prototipo entre realms.
function render({values = {}, duration = null, formatted = 'formatted'} = {}) {
  const calls = [];
  const elements = Object.fromEntries(Object.entries(values).map(([id, value]) => [id, {value}]));
  const context = vm.createContext({
    document: {getElementById(id) { calls.push(['target', id]); return elements[id] ?? null; }},
    getTradeDurationMinutes(trade) {
      calls.push(['duration', JSON.parse(JSON.stringify(trade))]);
      return duration;
    },
    formatDurationMinutes(minutes) { calls.push(['format', minutes]); return formatted; },
  });
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext('updateTradeDurationField()', context);
  return {calls, elements};
}

// Caso de borda sem o elemento t-duration no DOM: deve fazer retorno antecipado logo
// apos consultar t-duration, sem ler datas/horarios nem chamar as funcoes de calculo.
test('missing duration target returns before reading form fields or calculating', () => {
  const {calls} = render();
  assert.deepEqual(calls, [['target', 't-duration']]);
});

// Verifica no index.html que o script classico do formulario e incluido uma unica vez
// antes de app.js.
test('trade duration field classic script loads once before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(scripts.filter(src => src === modulePath).length, 1);
  assert.ok(scripts.indexOf(modulePath) < scripts.indexOf('app.js'));
});

// Fluxo nominal completo: valida a ordem de leitura dos campos de data/hora, o objeto
// montado
// para getTradeDurationMinutes, a chamada a formatDurationMinutes e o valor escrito
// em t-duration.
test('duration field preserves dates, times, dependency calls and formatted value', () => {
  const {calls, elements} = render({
    values: {
      't-duration': 'before',
      't-date': '2026-01-02',
      't-exitdate': '2026-01-03',
      't-opentime': '09:15',
      't-exittime': '11:45',
    },
    duration: 1590,
    formatted: '1d 2h 30m',
  });
  assert.equal(elements['t-duration'].value, '1d 2h 30m');
  assert.deepEqual(calls, [
    ['target', 't-duration'],
    ['target', 't-date'],
    ['target', 't-exitdate'],
    ['target', 't-opentime'],
    ['target', 't-exittime'],
    ['duration', {date: '2026-01-02', exitDate: '2026-01-03', openTime: '09:15', exitTime: '11:45'}],
    ['format', 1590],
  ]);
});

// Caso de borda sem t-exitdate e com calculo retornando null: verifica o fallback que
// rele t-date como exitDate, passa horarios vazios e limpa t-duration sem chamar
// formatDurationMinutes.
test('missing exit date falls back to a second read of entry date and null clears value', () => {
  const {calls, elements} = render({
    values: {'t-duration': 'before', 't-date': '2026-02-04'},
    duration: null,
  });
  assert.equal(elements['t-duration'].value, '');
  assert.deepEqual(calls, [
    ['target', 't-duration'],
    ['target', 't-date'],
    ['target', 't-exitdate'],
    ['target', 't-date'],
    ['target', 't-opentime'],
    ['target', 't-exittime'],
    ['duration', {date: '2026-02-04', exitDate: '2026-02-04', openTime: '', exitTime: ''}],
  ]);
});

// Caso de borda de duracao igual a zero (falsy em JS): garante que 0 nao seja
// confundido com ausencia de valor, chamando formatDurationMinutes(0) e exibindo o
// texto formatado.
test('zero duration is formatted instead of treated as empty', () => {
  const {calls, elements} = render({values: {'t-duration': 'before'}, duration: 0, formatted: '0 min'});
  assert.equal(elements['t-duration'].value, '0 min');
  assert.deepEqual(calls.slice(-2), [['duration', {date: '', exitDate: '', openTime: '', exitTime: ''}], ['format', 0]]);
});
