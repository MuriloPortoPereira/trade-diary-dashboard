/*
 * Testes unitarios e de contrato para formatacao, resumo e validacao de backups.
 *
 * Modulo testado:
 * - `src/modules/data-transfer/infrastructure/trade-file-formats.js` (`TradeDiaryBackupFormat`)
 * - Wrappers e helpers correspondentes extraidos de `app.js`
 *   (`summarizeBackupData`, `formatBackupSummary`, `validateBackupData`).
 *
 * Estrategia de isolamento:
 * - Usa `vm.createContext` para carregar o modulo de formatos e as declaracoes de `app.js`
 *   sem depender de DOM, `localStorage`, rede ou estado global real da aplicacao.
 * - Injeta um stub de traducao `t(key, fallback)` que registra a ordem exata das chaves consultadas.
 *
 * Regras criticas garantidas:
 * - Contagem pura e imutavel de `trades`, `accounts`, dias de `preMarketData` e `generalDocs`.
 * - Tolerancia a valores nulos, primitivos ou colecoes malformadas sem lancar excecoes no resumo.
 * - Validacao estrita usando apenas chaves proprias reconhecidas, preservando as mensagens de erro exatas.
 * - Carregamento do script classico em `index.html` antes da camada de apresentacao e de `app.js`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const modulePath = 'src/modules/data-transfer/infrastructure/trade-file-formats.js';
// Extrai apenas as tres funcoes de interesse de app.js para executa-las isoladas no contexto VM.
const declarations = ['summarizeBackupData', 'formatBackupSummary', 'validateBackupData'].map(name => {
  const match = appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'));
  assert.ok(match, `Missing ${name}`);
  return match[0];
}).join('\n');
// Normaliza objetos criados dentro da VM (outro realm) para objetos JS planos antes do assert.deepEqual.
const plain = value => JSON.parse(JSON.stringify(value));

// Monta uma sandbox VM limpa com stub de traducao `t`, carrega o modulo de backup e injeta as funcoes de app.js.
function setup() {
  const calls = [];
  const context = vm.createContext({t: (key, fallback) => { calls.push(key); return fallback; }});
  const file = path.join(root, modulePath);
  if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: modulePath});
  vm.runInContext(declarations, context, {filename: 'app.js#backup-format'});
  return {context, calls};
}

// Verifica se o resumo contabiliza corretamente todas as colecoes validas, mantem idempotencia em chamadas repetidas e nao muta a entrada.
test('backup summary counts expected collections and own premarket days', () => {
  const {context} = setup();
  const data = {trades: [{}, {}], accounts: [{}], preMarketData: {mon: {}, tue: {}}, config: {generalDocs: [1, 2, 3]}};
  assert.deepEqual(plain(context.summarizeBackupData(data)), {trades: 2, accounts: 1, preMarketDays: 2, documents: 3});
  assert.deepEqual(plain(context.summarizeBackupData(data)), {trades: 2, accounts: 1, preMarketDays: 2, documents: 3});
  assert.equal(data.trades.length, 2);
});

// Garante que entradas ausentes, primitivas ou com colecoes de tipos inesperados retornem contagens zeradas sem erro.
test('backup summary ignores absent and wrong-shaped collections', () => {
  const {context} = setup();
  for (const value of [null, undefined, false, 7, '', {}, {trades: 'x', accounts: {}, preMarketData: [], config: {generalDocs: 'x'}}]) {
    assert.deepEqual(plain(context.summarizeBackupData(value)), {trades: 0, accounts: 0, preMarketDays: 0, documents: 0});
  }
});

// Valida que qualquer chave propria reconhecida do diario basta para aceitar o backup, rejeitando chaves herdadas via prototipo.
test('backup validation accepts a recognized own key without enforcing version or value', () => {
  const {context} = setup();
  for (const value of [{trades: null}, {config: undefined}, {version: 999, accounts: []}, {studyHubState: false}]) {
    assert.doesNotThrow(() => context.validateBackupData(value));
  }
  assert.throws(() => context.validateBackupData(Object.create({trades: []})), /Arquivo não parece ser um backup do diário\./);
});

// Confirma as mensagens de erro exatas para estruturas invalidas (primitivos, null, arrays) e objetos sem nenhuma chave reconhecida.
test('backup validation keeps exact errors for invalid shapes and unknown objects', () => {
  const {context} = setup();
  for (const value of [null, undefined, false, 0, '', []]) {
    assert.throws(() => context.validateBackupData(value), /Arquivo de backup inválido\./);
  }
  assert.throws(() => context.validateBackupData({version: 2}), /Arquivo não parece ser um backup do diário\./);
});

// Verifica a formatacao textual final do resumo, incluindo o separador visual e a ordem exata das chaves de traducao solicitadas.
test('formatted backup summary retains translated key order and separator', () => {
  const {context, calls} = setup();
  const result = context.formatBackupSummary({trades: [1, 2], accounts: [1], preMarketData: {one: {}, two: {}}, config: {generalDocs: [1, 2, 3]}});
  assert.equal(result, '2 trades · 1 contas · 2 dias de pré-mercado · 3 documentos');
  assert.deepEqual(calls, ['backup.trades', 'backup.accounts', 'backup.premarketDays', 'backup.documents']);
});

// Garante isolamento total do modulo (nenhum acesso a DOM/storage/globais na carga), API publica esperada e ordem correta de script em index.html.
test('backup format module is isolated and loads before classic consumers', () => {
  const sandbox = {};
  // Armadilhas com getters que lancam erro se o modulo tentar tocar globais proibidos na inicializacao.
  for (const name of ['document', 'localStorage', 'fetch', 'trades', 'accounts', 'config']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`backup format accessed ${name}`); }});
  }
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, modulePath), 'utf8'), context, {filename: modulePath});
  assert.deepEqual(Object.keys(context.TradeDiaryBackupFormat).sort(), ['createBackupPayload', 'summarizeBackupData', 'validateBackupData']);
  assert.deepEqual(plain(context.TradeDiaryBackupFormat.summarizeBackupData({trades: [1]})),
    {trades: 1, accounts: 0, preMarketDays: 0, documents: 0});

  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const index = scripts.findIndex(script => script.src === modulePath);
  assert.ok(index < scripts.findIndex(script => script.src === 'src/modules/data-transfer/presentation/data-transfer-page.js'));
  assert.ok(index < scripts.findIndex(script => script.src === 'app.js'));
  assert.match(appSource, /^function summarizeBackupData\(data\)\{/m);
  assert.match(appSource, /^function validateBackupData\(data\)\{/m);
});
