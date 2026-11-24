/*
 * Objetivo do arquivo:
 *   Validar toda a camada de persistencia de estado da aplicacao (salvamento em
 *   localStorage, leitura bruta e hidratacao com normalizacao/recalculo), incluindo
 *   tratamento de falhas parciais, JSON corrompido e ordem exata das chaves.
 *
 * Modulos/arquivos testados:
 *   - src/app/infrastructure/app-state-storage.js (save e readPersistedAppState)
 *   - src/app/application/load-app-state.js (load) (com verificacao de limpeza em
 *     app.js e invocacao em bootstrap-app.js).
 *
 * Estrategia de isolamento:
 *   Carrega ambos os scripts em um contexto node:vm com um localStorage simulado
 *   baseado em Map e stubs espiados para normalizadores (estrategias, parceiros,
 *   contas, studyHub e recomputeAllIncomplete), permitindo injetar erros cirurgicos
 *   em qualquer chave ou etapa do ciclo.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - save() grava exatamente as 6 chaves tl_* na ordem definida, serializando JSON
 *     sob demanda e gravando activeAccountId sem JSON.stringify.
 *   - Erros de serializacao ou cota em save() propagam sem rollback das chaves ja
 *     gravadas.
 *   - load() le todas as 6 chaves antes de fazer parse, faz shallow-merge de config,
 *     normaliza contas preservando os argumentos de Array.prototype.map e engole
 *     falhas sem quebrar o boot, mantendo atribuicoes anteriores ao ponto de erro.
 *   - readPersistedAppState() retorna valores brutos sem aplicar estado e propaga
 *     erros.
 *   - Os scripts nao executam IO no carregamento e respeitam a ordem classica no
 *     index.html.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'src/app/application/bootstrap-app.js'), 'utf8');
const storagePath = 'src/app/infrastructure/app-state-storage.js';
const loadPath = 'src/app/application/load-app-state.js';
const keys = ['tl_trades', 'tl_config', 'tl_pm', 'tl_accounts', 'tl_activeAccount', 'tl_studyhub'];
const fields = ['trades', 'config', 'preMarketData', 'accounts', 'activeAccountId', 'studyHubState'];

// Converte objetos criados dentro da sandbox vm para estruturas JS puras do host,
// evitando falsas falhas de assert.deepEqual por prototipos de contextos distintos.
const plain = value => JSON.parse(JSON.stringify(value));

// Prepara o ambiente vm com estado previo conhecido, localStorage instrumentado e
// normalizadores espiados; retorna referencias iniciais (before) para validar
// identidade.
function setup(stored = new Map()) {
  const calls = [];
  const context = vm.createContext({
    trades: [{id: 'old-trade'}], config: {theme: 'dark', old: true}, preMarketData: {old: {}},
    accounts: [{id: 'old-account', normalized: true}], activeAccountId: 'old-account', studyHubState: {plan: {old: true}},
    localStorage: {
      getItem(key) { calls.push(['read', key]); return stored.get(key) ?? null; },
      setItem(key, value) { calls.push(['write', key, value]); stored.set(key, String(value)); },
    },
    ensureDefaultStrategies(value) { calls.push(['strategies', value]); return value; },
    ensurePartnerHubConfig(value) { calls.push(['partners', value]); return value; },
    normalizeAccount(value, index, list) { calls.push(['account', value, index, list]); return {...value, normalized: true}; },
    mergeStudyHubState(value) { calls.push(['study', value]); return value; },
    recomputeAllIncomplete() { calls.push(['incomplete']); },
  });
  const ensureDefaultStrategies = context.ensureDefaultStrategies;
  for (const [file, name] of [[storagePath, 'save'], [loadPath, 'load']]) {
    const absolute = path.join(root, file);
    if (fs.existsSync(absolute)) vm.runInContext(fs.readFileSync(absolute, 'utf8'), context, {filename: file});
    else {
      const declaration = app.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'));
      assert.ok(declaration, `Missing ${name}`);
      vm.runInContext(declaration[0], context);
    }
  }
  context.ensureDefaultStrategies = ensureDefaultStrategies;
  const before = Object.fromEntries(fields.map(field => [field, context[field]]));
  return {context, calls, stored, before};
}

// Verifica que save() retorna undefined e grava exatamente as 6 chaves esperadas em
// ordem, serializando cinco delas como JSON e passando tl_activeAccount em formato
// bruto (ex.: null -> 'null').
test('save writes exactly six keys in order with JSON fields and a raw active account', () => {
  const {context, calls, stored, before} = setup();
  context.activeAccountId = null;
  assert.equal(context.save(), undefined);
  assert.deepEqual(calls.map(call => call[1]), keys);
  for (let index = 0; index < fields.length; index++) {
    const value = index === 4 ? null : JSON.stringify(before[fields[index]]);
    assert.deepEqual(calls[index], ['write', keys[index], value]);
  }
  assert.equal(stored.get('tl_activeAccount'), 'null');
});

// Garante avaliacao sequencial de cada campo durante save(): um toJSON em trades que
// altera config reflete no valor gravado em tl_config, e uma referencia circular em
// config lanca erro preservando tl_trades ja gravado anteriormente.
test('save serializes each field when reached and retains earlier writes on serialization failure', () => {
  const {context, stored} = setup();
  context.trades = {toJSON() { context.config = {changed: true}; return []; }};
  context.save();
  assert.equal(stored.get('tl_config'), '{"changed":true}');
  stored.clear();
  const cyclic = {};
  cyclic.self = cyclic;
  context.config = cyclic;
  context.trades = [];
  assert.throws(() => context.save(), /circular/i);
  assert.deepEqual([...stored], [['tl_trades', '[]']]);
});

// Confirma que uma falha de escrita no localStorage (ex.: quota excedida em
// tl_accounts) interrompe o salvamento propagando o erro original, sem reverter as 3
// chaves anteriores.
test('save propagates storage failure without rolling back or writing later keys', () => {
  const {context, stored} = setup();
  const failure = new Error('quota reached');
  const written = [];
  const original = context.localStorage.setItem;
  context.localStorage.setItem = (key, value) => {
    written.push(key);
    if (key === 'tl_accounts') throw failure;
    original(key, value);
  };
  assert.throws(() => context.save(), error => error === failure);
  assert.deepEqual(written, keys.slice(0, 4));
  assert.deepEqual([...stored.keys()], keys.slice(0, 3));
});

// Quando o localStorage esta vazio, load() le as 6 chaves, mantem as referencias
// padrao em memoria intactas, executa normalizadores globais + recomputeAllIncomplete
// e nao grava nada.
test('load without saved keys preserves defaults and runs normalizers before recomputing', () => {
  const {context, calls, before} = setup();
  assert.equal(context.load(), undefined);
  assert.deepEqual(calls.slice(0, 6), keys.map(key => ['read', key]));
  assert.deepEqual(calls.slice(6).map(call => call[0]), ['strategies', 'partners', 'incomplete']);
  for (const field of fields) assert.strictEqual(context[field], before[field]);
  assert.equal(calls.some(call => call[0] === 'write'), false);
});

// Testa o ciclo completo save -> load em um contexto novo: recupera todos os 6
// payloads com fidelidade e confirma que normalizeAccount recebe (item, indice,
// arrayOriginal) de .map().
test('save/load round-trip retains six payloads and normalizes accounts with original map arguments', () => {
  const saved = setup();
  saved.context.trades = [{id: 'trade', pnl: 0}];
  saved.context.config = {theme: 'light', old: true, nested: {replacement: true}};
  saved.context.preMarketData = {day: {done: true}};
  saved.context.accounts = [{id: 'one', normalized: true}, {id: 'two', normalized: true}];
  saved.context.activeAccountId = 'two';
  saved.context.studyHubState = {plan: {goal: 1}};
  saved.context.save();
  const restored = setup(saved.stored);
  restored.context.load();
  for (const field of fields) assert.deepEqual(plain(restored.context[field]), plain(saved.context[field]));
  assert.deepEqual(restored.calls.map(call => call[0]), [...Array(6).fill('read'), 'strategies', 'partners', 'account', 'account', 'study', 'incomplete']);
  const accounts = restored.calls.filter(call => call[0] === 'account');
  assert.deepEqual(accounts.map(call => call[2]), [0, 1]);
  assert.strictEqual(accounts[0][3], accounts[1][3]);
  assert.strictEqual(accounts[0][1], accounts[0][3][0]);
});

// Valida retrocompatibilidade com estado parcial: mescla superficialmente config
// mantendo chaves padrao ('theme'), aceita lista vazia de contas, ignora
// activeAccountId vazio e preserva intactas as referencias dos campos ausentes no
// storage.
test('partial legacy state shallow-merges config, keeps absent fields and accepts empty accounts', () => {
  const {context, before, calls} = setup(new Map([
    ['tl_config', '{"nested":{"new":true}}'], ['tl_accounts', '[]'], ['tl_activeAccount', ''],
  ]));
  context.load();
  assert.equal(context.config.theme, 'dark');
  assert.strictEqual(context.config.nested, calls[6][1].nested);
  assert.deepEqual(plain(context.config.nested), {new: true});
  assert.notStrictEqual(context.config, before.config);
  assert.equal(context.accounts.length, 0);
  assert.equal(context.activeAccountId, before.activeAccountId);
  assert.strictEqual(context.trades, before.trades);
  assert.strictEqual(context.preMarketData, before.preMarketData);
  assert.strictEqual(context.studyHubState, before.studyHubState);
});

// Garante que load() realiza todas as leituras de localStorage antes de aplicar
// qualquer campo: se a leitura falhar na 6a chave (tl_studyhub), engole a excecao e
// nenhum campo muda.
test('load reads all keys before parsing and swallows storage access failures without applying payloads', () => {
  const {context, calls, before} = setup(new Map([['tl_trades', '[]']]));
  const original = context.localStorage.getItem;
  context.localStorage.getItem = key => { if (key === 'tl_studyhub') throw new Error('denied'); return original(key); };
  assert.doesNotThrow(() => context.load());
  assert.deepEqual(calls, keys.slice(0, 5).map(key => ['read', key]));
  for (const field of fields) assert.strictEqual(context[field], before[field]);
});

// Verifica o comportamento frente a JSON invalido em tl_config: tl_trades ja aplicado
// permanece atualizado, mas o erro aborta o restante do load() sem lancar excecao.
test('malformed saved config leaves previously loaded trades applied and stops later work', () => {
  const {context, calls, before} = setup(new Map([['tl_trades', '[]'], ['tl_config', '{bad'], ['tl_pm', '{}']]));
  assert.doesNotThrow(() => context.load());
  assert.equal(context.trades.length, 0);
  assert.strictEqual(context.config, before.config);
  assert.strictEqual(context.preMarketData, before.preMarketData);
  assert.deepEqual(calls.map(call => call[0]), Array(6).fill('read'));
});

// Caso normalizeAccount lance erro em uma das contas, mantem
// trades/config/preMarketData ja hidratados, nao substitui o array de contas antigo e
// interrompe efeitos posteriores.
test('account normalization failure keeps earlier assignments and prevents account replacement and later effects', () => {
  const {context, calls, before} = setup(new Map([
    ['tl_trades', '[]'], ['tl_config', '{"theme":"light"}'], ['tl_pm', '{"new":{}}'],
    ['tl_accounts', '[{"id":"first"},{"id":"second"}]'], ['tl_activeAccount', 'next'], ['tl_studyhub', '{}'],
  ]));
  context.normalizeAccount = (account, index) => { calls.push(['normalize', index]); if (index === 1) throw new Error('invalid account'); return account; };
  assert.doesNotThrow(() => context.load());
  assert.equal(context.trades.length, 0);
  assert.equal(context.config.theme, 'light');
  assert.deepEqual(plain(context.preMarketData), {new: {}});
  assert.strictEqual(context.accounts, before.accounts);
  assert.equal(context.activeAccountId, before.activeAccountId);
  assert.strictEqual(context.studyHubState, before.studyHubState);
  assert.deepEqual(calls.slice(6).map(call => call[0]), ['strategies', 'partners', 'normalize', 'normalize']);
});

// Testa valores JSON validos porem permissivos (null, false) e assegura que uma
// excecao em recomputeAllIncomplete e capturada sem desfazer o estado ja carregado.
test('load preserves permissive parsed values and catches recomputation errors after assignments', () => {
  const {context, before} = setup(new Map([
    ['tl_trades', 'null'], ['tl_config', 'false'], ['tl_pm', 'null'], ['tl_accounts', '[]'], ['tl_studyhub', 'null'],
  ]));
  context.recomputeAllIncomplete = () => { throw new Error('invalid trades'); };
  assert.doesNotThrow(() => context.load());
  assert.equal(context.trades, null);
  assert.deepEqual(plain(context.config), plain(before.config));
  assert.equal(context.preMarketData, null);
  assert.equal(context.accounts.length, 0);
  assert.equal(context.studyHubState, null);
});

// Valida o contrato puro de readPersistedAppState(): devolve as strings brutas (mesmo
// JSON invalido) sem mutar estado global e propaga erros reais do localStorage.
test('raw state reader returns unparsed values without applying state or swallowing storage errors', () => {
  const {context, calls, before} = setup(new Map([['tl_trades', '{invalid'], ['tl_activeAccount', 'chosen']]));
  const raw = context.readPersistedAppState();
  assert.deepEqual(plain(raw), {trades: '{invalid', config: null, preMarketData: null, accounts: null, activeAccountId: 'chosen', studyHubState: null});
  assert.deepEqual(calls, keys.map(key => ['read', key]));
  for (const field of fields) assert.strictEqual(context[field], before[field]);
  const failure = new Error('storage blocked');
  context.localStorage.getItem = () => { throw failure; };
  assert.throws(() => context.readPersistedAppState(), error => error === failure);
});

// Confirma que carregar os dois scripts nao toca em document/localStorage/fetch,
// verifica ordem e atributos no index.html, limpeza de app.js, chamada em
// bootstrap-app.js e a substituicao injetavel de readPersistedAppState() dentro de
// load().
test('classic persistence scripts initialize without IO and load runs through a replaceable raw read contract', () => {
  const sandbox = {trades: ['old'], config: {}, preMarketData: {}, accounts: [], activeAccountId: 'active', studyHubState: {},
    ensureDefaultStrategies: value => value, ensurePartnerHubConfig: value => value,
    normalizeAccount: value => value, mergeStudyHubState: value => value, recomputeAllIncomplete() {}};
  for (const name of ['document', 'localStorage', 'fetch']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`unexpected IO access: ${name}`); }});
  }
  const context = vm.createContext(sandbox);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  let previous = -1;
  for (const file of [storagePath, loadPath]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
    const matches = scripts.filter(script => script.src === file);
    assert.equal(matches.length, 1);
    assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
    const index = scripts.findIndex(script => script.src === file);
    assert.ok(index > previous && index < scripts.findIndex(script => script.src === 'app.js'));
    previous = index;
  }
  assert.equal(typeof context.save, 'function');
  assert.doesNotMatch(app, /^function (?:save|load)\(/m);
  assert.doesNotMatch(app, /\bload\(\);/);
  assert.match(bootstrap, /\bload\(\);/);
  context.readPersistedAppState = () => ({trades: '[]'});
  context.load();
  assert.deepEqual(plain(context.trades), []);
});
