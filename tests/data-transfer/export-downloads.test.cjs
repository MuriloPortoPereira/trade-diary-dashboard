/*
 * Testes unitarios e de contrato para exportacao de backups JSON, filtros e downloads CSV.
 *
 * Modulos testados:
 * - `src/modules/data-transfer/infrastructure/browser-file-io.js`
 * - `src/modules/data-transfer/application/transfer-workflows.js`
 * - `src/modules/data-transfer/presentation/data-transfer-page.js`
 *
 * Estrategia de isolamento:
 * - Localiza as 10 funcoes de exportacao nos arquivos fonte e executa em uma sandbox `vm.createContext`.
 * - Simula APIs de navegador (`document.createElement`, `Blob`, `URL.createObjectURL/revokeObjectURL`,
 *   `setTimeout`) e fixa a data em 15/02/2024 (ano bissexto) via `FixedDate`.
 * - Captura todas as chamadas em ordem cronologica (`calls`) e enfileira timers (`tasks`) para disparo manual.
 *
 * Regras criticas garantidas:
 * - Ordem exata de criacao do anchor, Blob, Object URL, clique e revogacao agendada (1000 ms).
 * - Diferenca de tratamento quando `URL.revokeObjectURL` nao existe entre download de texto e JSON.
 * - Propagacao de erros de clique e serializacao circular sem agendar limpeza posterior.
 * - Filtros inclusivos de data, normalizacao de simbolos, aliases de conta e limites de ano bissexto (fev/2024 = dia 29).
 * - Carregamento limpo dos scripts em `index.html` sem IO na inicializacao e sem duplicatas em `app.js`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePaths = [
  'src/modules/data-transfer/infrastructure/browser-file-io.js',
  'src/modules/data-transfer/application/transfer-workflows.js',
  'src/modules/data-transfer/presentation/data-transfer-page.js',
];
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const sources = [app, ...modulePaths.filter(file => fs.existsSync(path.join(root, file)))
  .map(file => fs.readFileSync(path.join(root, file), 'utf8'))];
const names = ['exposeJsonExport', 'exportJSON', 'downloadTextFile', 'normalizeExportSymbols',
  'getTradesForCustomExport', 'readCustomExportFilters', 'exportTradesCSV', 'exportCSV', 'exportCSVCustom', 'exportCSVMonth'];
// Extrai cada funcao alvo das fontes disponiveis garantindo que nenhuma esteja ausente.
const declarations = names.map(name => {
  const declaration = sources.map(source => source.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]).find(Boolean);
  assert.ok(declaration, `Missing ${name}`);
  return declaration;
}).join('\n');

// Cria a sandbox VM com mocks de navegador, relogio congelado em 2024-02-15 (ano bissexto) e suporte a overrides por teste.
function setup(overrides = {}) {
  const calls = [], tasks = [];
  const payload = {version: 2, trades: [{symbol: 'ES'}]};
  // Mock de tag <a> que registra atribuicoes de href/download e o clique sintetico.
  const anchor = {
    set href(value) { calls.push(['href', value]); },
    set download(value) { calls.push(['filename', value]); },
    click() { calls.push(['click']); },
  };
  // Subclasse de Date que retorna 2024-02-15 quando instanciada sem argumentos, preservando datas explicitas.
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [2024, 1, 15, 12])); }
    toISOString() { return '2024-02-15T12:00:00.000Z'; }
  }
  const context = vm.createContext({
    Date: FixedDate, activeAccountId: 'active',
    document: {createElement(tag) { calls.push(['element', tag]); return anchor; }, getElementById() { return null; }},
    Blob: class { constructor(parts, options) { calls.push(['blob', Array.from(parts), options.type]); } },
    URL: {createObjectURL() { calls.push(['url']); return 'blob:export'; }, revokeObjectURL(url) { calls.push(['revoke', url]); }},
    setTimeout(fn, delay) { calls.push(['timer', delay]); tasks.push(fn); },
    createBackupPayload() { calls.push(['payload']); return payload; },
    renderBackupSummary(value) { calls.push(['summary', value]); },
    showAppNotice(...args) { calls.push(['notice', ...args]); },
    buildTradesCSV(rows) { calls.push(['csv', rows]); return 'CSV'; },
    getAccountTrades(id) { calls.push(['account', id]); return []; },
    ...overrides,
  });
  vm.runInContext(declarations, context);
  return {context, calls, tasks, payload};
}

// Verifica MIME padrao (`text/csv`), sequencia completa de download via anchor, revogacao adiada da URL e passagem direta de valores nulos.
test('text download preserves MIME defaults, operation order and delayed URL revocation', () => {
  const {context, calls, tasks} = setup();
  assert.equal(context.downloadTextFile('a,b', 'trades.csv'), undefined);
  assert.deepEqual(calls, [['element', 'a'], ['blob', ['a,b'], 'text/csv'], ['url'],
    ['href', 'blob:export'], ['filename', 'trades.csv'], ['click'], ['timer', 1000]]);
  const revoked = [];
  context.URL.revokeObjectURL = url => revoked.push(url);
  tasks[0]();
  assert.deepEqual(revoked, ['blob:export']);
  calls.length = 0;
  context.downloadTextFile(null, 'raw', null);
  assert.deepEqual(calls[1], ['blob', [null], null]);
});

// Garante compatibilidade historica: downloadTextFile ignora o timer sem revokeObjectURL, enquanto exportJSON agenda e lanca no callback.
test('missing revocation skips the text timer while JSON retains its existing callback error', () => {
  const {context, calls, tasks} = setup();
  delete context.URL.revokeObjectURL;
  context.downloadTextFile('CSV', 'file');
  assert.equal(tasks.length, 0);
  context.exportJSON();
  assert.equal(tasks.length, 1);
  assert.deepEqual(calls.at(-1), ['timer', 1000]);
  assert.throws(tasks[0], /revokeObjectURL/);
});

// Valida exportacao JSON formatada (2 espacos), atualizacao do resumo de backup, nome datado do arquivo e limpeza da Object URL.
test('JSON export keeps pretty payload, summary, filename and unguarded revocation order', () => {
  const {context, calls, tasks, payload} = setup();
  assert.equal(context.exposeJsonExport(), JSON.stringify(payload, null, 2));
  assert.deepEqual(calls, [['payload']]);
  calls.length = 0;
  assert.equal(context.exportJSON(), undefined);
  assert.deepEqual(calls, [['payload'], ['summary', payload], ['element', 'a'],
    ['blob', [JSON.stringify(payload, null, 2)], 'application/json'], ['url'],
    ['href', 'blob:export'], ['filename', 'tradelog_backup_2024-02-15.json'], ['click'], ['timer', 1000]]);
  tasks[0]();
  assert.deepEqual(calls.at(-1), ['revoke', 'blob:export']);
});

// Confirma que falhas no clique ou JSON com referencia circular propagam a excecao sem deixar timers pendentes.
test('download and serialization errors propagate without scheduling later cleanup', () => {
  const failure = new Error('click failed');
  const text = setup({document: {createElement() { return {click() { throw failure; }}; }}});
  assert.throws(() => text.context.downloadTextFile('CSV', 'file'), error => error === failure);
  assert.equal(text.tasks.length, 0);
  const json = setup();
  json.payload.self = json.payload;
  assert.throws(() => json.context.exportJSON(), /circular/i);
  assert.deepEqual(json.calls.map(call => call[0]), ['payload', 'summary', 'element']);
  assert.equal(json.tasks.length, 0);
});

// Testa normalizacao de simbolos e filtragem personalizada (datas inclusivas, case-insensitivity em status/simbolo, market exato, fallback de conta e imutabilidade).
test('export filters preserve inclusive dates, aliases, matching, references and source order', () => {
  const rows = [
    {date: '2024-02-01', symbol: 'es', status: 'win', market: 'futures'},
    {date: '2024-02-29', symbol: 'NQ', status: 'WIN', market: 'futures'},
    {date: '2024-03-01', symbol: 'ES', status: 'WIN', market: 'futures'},
    {symbol: 'ES', status: 'WIN', market: 'futures'},
    {date: '2024-02-15', symbol: 'ES', status: 'LOSS', market: 'futures'},
    {date: '2024-02-15', symbol: 'ES', status: 'WIN', market: 'Futures'},
  ];
  const accountCalls = [];
  const {context} = setup({getAccountTrades(id) { accountCalls.push(id); return rows; }});
  const before = JSON.stringify(rows);
  assert.deepEqual(Array.from(context.normalizeExportSymbols(' es, Nq;ES\nYM ')), ['ES', 'NQ', 'ES', 'YM']);
  const result = context.getTradesForCustomExport({start: '2024-02-01', end: '2024-02-29', symbols: 'es nq', status: ' win ', market: ' futures ', account: ' chosen '});
  assert.deepEqual(result, rows.slice(0, 2));
  assert.strictEqual(result[0], rows[0]);
  assert.deepEqual(accountCalls, ['chosen']);
  const all = context.getTradesForCustomExport();
  assert.deepEqual(all, rows);
  assert.notStrictEqual(all, rows);
  context.activeAccountId = 'next';
  context.getTradesForCustomExport({accountId: '   ', account: 'ignored'});
  assert.deepEqual(accountCalls, ['chosen', 'active', 'next']);
  assert.equal(JSON.stringify(rows), before);
  assert.throws(() => context.getTradesForCustomExport(null), /null/);
});

// Verifica leitura dos inputs de filtro no DOM tanto quando os elementos estao ausentes quanto quando preenchidos.
test('export controls tolerate missing fields and retain raw date and account values', () => {
  const {context} = setup();
  assert.deepEqual(JSON.parse(JSON.stringify(context.readCustomExportFilters())), {from: '', to: '', accountId: ''});
  const values = {exportStartDate: '2024-02-02', exportEndDate: '2024-02-18', exportAccount: 'chosen'};
  context.document.getElementById = id => ({value: values[id]});
  assert.deepEqual(JSON.parse(JSON.stringify(context.readCustomExportFilters())), {from: values.exportStartDate, to: values.exportEndDate, accountId: 'chosen'});
});

// Testa as tres acoes de exportacao CSV (todos, personalizado e mes atual), validando calculo de ultimo dia em ano bissexto (29/02/2024) e nomes de arquivo.
test('CSV actions preserve active/custom/month selection, leap-year limits and filenames', () => {
  const selected = [{symbol: 'ES'}];
  const {context, calls} = setup({getAccountTrades(id) { calls.push(['account', id]); return selected; }});
  const downloads = [];
  context.downloadTextFile = (...args) => downloads.push(args);
  context.exportCSV();
  assert.deepEqual(calls, [['account', 'active'], ['csv', selected]]);
  assert.deepEqual(downloads, [['CSV', 'trades_todos_2024-02-15.csv', 'text/csv;charset=utf-8']]);
  const filters = [];
  context.getTradesForCustomExport = value => { filters.push(value); return selected; };
  const custom = {from: 'start', to: 'end', accountId: 'custom'};
  context.readCustomExportFilters = () => custom;
  context.exportCSVCustom();
  context.activeAccountId = 'next';
  context.exportCSVMonth();
  assert.strictEqual(filters[0], custom);
  assert.deepEqual(JSON.parse(JSON.stringify(filters[1])), {from: '2024-02-01', to: '2024-02-29', accountId: 'next'});
  assert.deepEqual(downloads.slice(1), [['CSV', 'trades_personalizado_2024-02-15.csv', 'text/csv;charset=utf-8'], ['CSV', 'trades_mes_2024-02-15.csv', 'text/csv;charset=utf-8']]);
});

// Garante ordem estrita de carregamento dos scripts classicos em index.html, ausencia de IO durante avaliacao inicial e remocao das funcoes legadas de app.js.
test('export scripts load once as classic globals without executing IO during initialization', () => {
  const sandbox = {};
  // Intercepta qualquer acesso indevido a APIs de browser ou estado da aplicacao no momento da carga dos scripts.
  for (const name of ['document', 'localStorage', 'fetch', 'Blob', 'URL', 'setTimeout', 'activeAccountId', 'getAccountTrades']) {
    Object.defineProperty(sandbox, name, {get() { throw new Error(`unexpected initialization access: ${name}`); }});
  }
  const context = vm.createContext(sandbox);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  let previous = scripts.findIndex(script => script.src === 'src/modules/data-transfer/infrastructure/trade-file-formats.js');
  assert.ok(previous >= 0);
  for (const file of modulePaths) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
    const matches = scripts.filter(script => script.src === file);
    assert.equal(matches.length, 1);
    assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
    const index = scripts.findIndex(script => script.src === file);
    assert.ok(index > previous && index < scripts.findIndex(script => script.src === 'app.js'));
    previous = index;
  }
  for (const name of names) {
    assert.equal(typeof context[name], 'function', name);
    assert.doesNotMatch(app, new RegExp(`^function ${name}\\(`, 'm'));
  }
});
