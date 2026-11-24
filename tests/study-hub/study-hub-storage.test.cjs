/*
 * Testes unitarios para a camada de persistencia privada do Study Hub (`localStorage`).
 *
 * Modulo testado:
 * - `src/modules/study-hub/infrastructure/study-hub-storage.js` (`TradeDiaryStudyHubStorage`).
 *
 * Estrategia de isolamento:
 * - Executa o arquivo de infraestrutura em `vm.createContext` fornecendo apenas um mock de `localStorage`
 *   baseado em `Map` que registra toda leitura (`read`) e escrita (`write`) em `calls`.
 *
 * Regras criticas garantidas:
 * - Chaves exatas no `localStorage`: `pfCot`, `cot`, `pfState`, `hubCiclos` e `diary2026`.
 * - Valores padrao quando ausentes (`5.8` para cotacoes, `null` para strings brutas, `[]` para diario)
 *   e suporte a zero explicito (`'0' -> 0`) e parse parcial (`'6.25suffix' -> 6.25`).
 * - Preservacao da entrada original ao gravar cotacoes e serializacao JSON para estado, ciclos e diario.
 * - Propagacao transparente de erros de `JSON.parse`, `JSON.stringify` (circular) e excecoes de `localStorage`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const storage = fs.readFileSync(path.join(root, 'src/modules/study-hub/infrastructure/study-hub-storage.js'), 'utf8');

// Monta sandbox VM com um mock instrumentado de `localStorage` inicializado a partir de `initial`.
function setup(initial = {}) {
  const values = new Map(Object.entries(initial)), calls = [];
  const c = vm.createContext({localStorage: {
    getItem: key => { calls.push(['read', key]); return values.get(key) ?? null; },
    setItem: (key, value) => { calls.push(['write', key, value]); values.set(key, String(value)); },
  }});
  vm.runInContext(storage, c);
  const api = c.TradeDiaryStudyHubStorage;
  return {api, c, values, calls};
}

// Verifica nomes exatos das chaves lidas, parse numerico das cotacoes (inclusive `0`), leitura bruta de `pfState`/`hubCiclos` e fallbacks quando o storage esta vazio.
test('private storage preserves keys, raw reads, rates and missing defaults', () => {
  const h = setup({pfCot: '6.25suffix', cot: '0', pfState: '{bad', hubCiclos: '[]'});
  assert.equal(h.api.readPropFirmRate(), 6.25); assert.equal(h.api.readPlanRate(), 0);
  assert.equal(h.api.readPropFirmState(), '{bad'); assert.equal(h.api.readCycles(), '[]');
  assert.deepEqual(JSON.parse(JSON.stringify(h.api.readDiary())), []);
  assert.deepEqual(h.calls, [['read', 'pfCot'], ['read', 'cot'], ['read', 'pfState'], ['read', 'hubCiclos'], ['read', 'diary2026']]);
  const empty = setup();
  assert.equal(empty.api.readPropFirmRate(), 5.8); assert.equal(empty.api.readPlanRate(), 5.8);
  assert.equal(empty.api.readPropFirmState(), null); assert.equal(empty.api.readCycles(), null);
});

// Valida que escritas de cotacao preservam o valor original passado e que estado, ciclos e diario sao serializados em JSON com round-trip fiel.
test('private storage preserves serialized payloads and original rate input', () => {
  const h = setup(), state = {cot: 5.8, v: '1.0', s_conta: '10000'}, cycles = [{capInicio: 1000}];
  const diary = [{data: '2026-11-05', obs: 'a,b\nlinha'}];
  h.api.writePropFirmRate(6.25); h.api.writePlanRate('7.10');
  h.api.writePropFirmState(state); h.api.writeCycles(cycles); h.api.writeDiary(diary);
  assert.deepEqual(h.calls, [['write', 'pfCot', 6.25], ['write', 'cot', '7.10'],
    ['write', 'pfState', JSON.stringify(state)], ['write', 'hubCiclos', JSON.stringify(cycles)], ['write', 'diary2026', JSON.stringify(diary)]]);
  assert.deepEqual(JSON.parse(JSON.stringify(h.api.readDiary())), diary);
});

// Confirma que a camada de storage nao mascara erros: JSON invalido no diario, objeto circular na escrita e falhas de acesso/quota do `localStorage` chegam ao chamador.
test('private storage lets malformed data, access and serialization errors reach callers', () => {
  const h = setup({diary2026: '{bad'});
  assert.throws(() => h.api.readDiary(), error => error.name === 'SyntaxError');
  const circular = {}; circular.self = circular;
  assert.throws(() => h.api.writeCycles(circular), error => error.name === 'TypeError');
  assert.equal(h.calls.length, 1);
  h.c.localStorage.getItem = () => { throw new Error('blocked'); };
  h.c.localStorage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => h.api.readPropFirmState(), /blocked/); assert.throws(() => h.api.writeDiary([]), /quota/);
});
