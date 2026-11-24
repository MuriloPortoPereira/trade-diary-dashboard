/*
 * Testes de caracterizacao e paridade para serializacao e exportacao de trades em CSV.
 *
 * Modulos testados:
 * - `src/modules/data-transfer/infrastructure/trade-file-formats.js` (`TradeDiaryTradesCSV`)
 * - Wrappers legados em `app.js` (`TRADE_CSV_HEADERS`, `csvCell`, `buildTradesCSV`)
 * - Consumidor de exportacao em `src/modules/data-transfer/presentation/data-transfer-page.js` (`exportTradesCSV`).
 *
 * Estrategia de isolamento:
 * - Usa `characterize(label, api)` para executar a mesma suite de 9 testes tanto contra o
 *   serializador isolado (`TradeDiaryTradesCSV`) quanto contra os wrappers legados de `app.js`,
 *   assegurando 100% de paridade comportamental.
 * - `loadSerializerContext` instala getters armadilha para 19 globais proibidos (DOM, storage, rede, `trades`, etc.)
 *   garantindo pureza total do modulo de serializacao.
 *
 * Regras criticas garantidas:
 * - Todas as celulas sao envolvidas por aspas duplas, com escape `""`, preservando virgulas, CRLF, Unicode e formulas.
 * - Arrays sao unidos por `"; "` antes do escape; cabecalhos seguem ordem fixa de 22 colunas.
 * - `buildTradesCSV` nao muta entradas congeladas, mantem comportamento com `null`/primitivos/arrays esparsos
 *   e resolve `trades` atual quando chamada sem argumento.
 * - `exportTradesCSV` formata o nome datado com MIME UTF-8 e exibe aviso quando a lista filtrada esta vazia.
 */
const nodeTest = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

const appSource = fs.readFileSync(`${__dirname}/../../app.js`, 'utf8');
const exportActionsSource = fs.readFileSync(`${__dirname}/../../src/modules/data-transfer/presentation/data-transfer-page.js`, 'utf8');
const serializerPath = 'src/modules/data-transfer/infrastructure/trade-file-formats.js';
const serializerSource = fs.readFileSync(`${__dirname}/../../${serializerPath}`, 'utf8');
// Lista de globais de ambiente/navegador que o serializador puro e proibido de acessar.
const forbiddenGlobals = [
  'window', 'document', 'localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest',
  'WebSocket', 'navigator', 'indexedDB', 'caches', 'Chart', 'Blob', 'FileReader',
  'require', 'process', 'console', 'setTimeout', 'setInterval', 'trades',
];
// Cabecalho canonico de 22 colunas esperado no CSV exportado.
const header = 'date,symbol,direction,placedTime,openTime,exitDate,exitTime,entry,exit,stop,tp,qty,riskUsd,riskPct,r,pnl,status,market,strategy,emotion,errors,remarks';
const emptyRow = Array(22).fill('""').join(',');

// Extrai uma declaracao de funcao de app.js ou da pagina de data-transfer.
function declaration(name) {
  const match = [appSource, exportActionsSource].map(source => source.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))).find(Boolean);
  assert.ok(match, `Missing legacy function: ${name}`);
  return match[0];
}

// Carrega `trade-file-formats.js` em uma sandbox estrita onde qualquer acesso aos globais proibidos lanca erro.
function loadSerializerContext() {
  const sandbox = {};
  for (const name of forbiddenGlobals) {
    Object.defineProperty(sandbox, name, {
      get() { throw new Error(`Serializer must not access ${name}`); },
    });
  }
  const context = vm.createContext(sandbox);
  vm.runInContext(serializerSource, context, {filename: serializerPath});
  return context;
}

// Monta um contexto VM com os wrappers legados de `app.js` conectados ao serializador isolado.
function loadLegacyContext() {
  const context = vm.createContext({TradeDiaryTradesCSV: loadSerializerContext().TradeDiaryTradesCSV});
  const headers = appSource.match(/^const TRADE_CSV_HEADERS = .*;$/m);
  assert.ok(headers, 'Missing legacy headers');
  vm.runInContext([
    'let trades = [];', headers[0],
    ...['csvCell', 'buildTradesCSV', 'exportTradesCSV'].map(declaration),
  ].join('\n'), context, { filename: 'app.js (CSV declarations)' });
  return context;
}

// Registra a bateria completa de testes de caracterizacao para validar paridade entre duas implementacoes/interfaces CSV.
function characterize(label, api) {
  const test = (name, callback) => nodeTest(`${label}: ${name}`, callback);

  // Verifica que todos os tipos escalares (undefined, null, numeros, -0, NaN, Infinity, BigInt, Symbol, objetos) sao convertidos e cercados por aspas.
  test('quotes every cell and preserves scalar conversion', () => {
    for (const [value, expected] of [
      [undefined, '""'], [null, '""'], ['', '""'], ['  ', '"  "'],
      [0, '"0"'], [-0, '"0"'], [false, '"false"'], [true, '"true"'],
      [1.005, '"1.005"'], [NaN, '"NaN"'], [Infinity, '"Infinity"'],
      [12n, '"12"'], [Symbol('x'), '"Symbol(x)"'], [{}, '"[object Object]"'],
    ]) assert.equal(api.csvCell(value), expected);
  });

  // Garante duplicacao de aspas internas (`""`) preservando virgulas, quebras CR/LF, caracteres Unicode e texto de formula sem sanitizacao silenciosa.
  test('escapes quotes but retains commas, CR, LF, Unicode and formula text', () => {
    assert.equal(api.csvCell('ação,"A"\r\nB\nC\rD'), '"ação,""A""\r\nB\nC\rD"');
    assert.equal(api.csvCell('=SUM(A1:A2)'), '"=SUM(A1:A2)"');
  });

  // Valida serializacao de arrays (incluindo aninhados e esparsos) juntando elementos com `"; "` antes de aplicar escape e aspas.
  test('joins arrays with semicolon-space before quoting', () => {
    assert.equal(api.csvCell([]), '""');
    assert.equal(api.csvCell(['a,b', '"c"', null, undefined, '', 0, false]), '"a,b; ""c""; ; ; ; 0; false"');
    assert.equal(api.csvCell([['a', 'b'], , 'c']), '"a,b; ; c"');
  });

  // Confirma que listas vazias ou valores nao-array emitem somente a linha de cabecalho terminada em LF.
  test('empty or non-array lists emit only headers and LF', () => {
    for (const list of [[], null, false, 0, '', 'invalid', {}, {length: 1}]) {
      assert.equal(api.buildTradesCSV(list), header + '\n');
    }
  });

  // Verifica que a ordem das colunas depende exclusivamente de `TRADE_CSV_HEADERS`, ignorando a ordem de insercao das chaves e propriedades extras.
  test('keeps column order independently of object order and ignores extra fields', () => {
    const trade = {extra: 'ignored'};
    header.split(',').reverse().forEach(name => { trade[name] = name; });
    assert.equal(api.buildTradesCSV([trade]), header + '\n' +
      '"date","symbol","direction","placedTime","openTime","exitDate","exitTime","entry","exit","stop","tp","qty","riskUsd","riskPct","r","pnl","status","market","strategy","emotion","errors","remarks"');
  });

  // Valida ordem de linhas, celulas ausentes como `""`, separador LF e ausencia de nova linha extra apos a ultima linha.
  test('keeps row order, missing values, LF separators and no final row newline', () => {
    const first = {date: '2026-09-10', symbol: 'EURUSD', errors: ['pressa', '"erro"'], remarks: 'linha 1\nlinha 2'};
    const expectedFirst = ['"2026-09-10"', '"EURUSD"', ...Array(18).fill('""'), '"pressa; ""erro"""', '"linha 1\nlinha 2"'].join(',');
    assert.equal(api.buildTradesCSV([first, {}]), header + '\n' + expectedFirst + '\n' + emptyRow);
  });

  // Garante fidelidade nos casos de borda: `null`/`undefined` na lista lancam TypeError, primitivos geram linha vazia e arrays esparsos preservam buracos.
  test('retains null-row TypeError and primitive/sparse-row behavior', () => {
    for (const row of [null, undefined]) {
      assert.throws(() => api.buildTradesCSV([row]), {name: 'TypeError'});
    }
    assert.equal(api.buildTradesCSV([0, false, 'text']), header + '\n' + [emptyRow, emptyRow, emptyRow].join('\n'));
    assert.equal(api.buildTradesCSV(Array(2)), header + '\n\n');
  });

  // Confirma leitura de propriedades herdadas via prototipo e propagacao exata de erros lancados por `toString()`.
  test('reads inherited fields and propagates conversion errors', () => {
    const trade = Object.create({date: 'inherited'});
    assert.equal(api.buildTradesCSV([trade]), header + '\n"inherited",' + Array(21).fill('""').join(','));
    const error = new Error('conversion failed');
    const value = {toString() { throw error; }};
    assert.throws(() => api.csvCell(value), thrown => thrown === error);
    assert.throws(() => api.buildTradesCSV([{remarks: value}]), thrown => thrown === error);
  });

  // Garante pureza e imutabilidade: listas, objetos e arrays congelados podem ser serializados repetidamente sem alteracao.
  test('does not mutate input lists, records or arrays', () => {
    const errors = Object.freeze(['a', 'b']);
    const record = Object.freeze({date: '2026-09-10', errors});
    const list = Object.freeze([record]);
    assert.equal(api.buildTradesCSV(list), api.buildTradesCSV(list));
    assert.deepEqual(list, [{date: '2026-09-10', errors: ['a', 'b']}]);
  });
}

// Executa a mesma suite de caracterizacao tanto no namespace isolado quanto nos wrappers globais legados.
characterize('isolated CSV serializer', loadSerializerContext().TradeDiaryTradesCSV);
characterize('legacy CSV wrappers', loadLegacyContext());

// Verifica a superficie exata de simbolos globais expostos por `trade-file-formats.js` (sem vazamento de helpers internos nem IO na carga).
nodeTest('format endpoint exposes existing globals and CSV namespace without helper leaks or initial IO', () => {
  const context = loadSerializerContext();
  assert.deepEqual(Object.getOwnPropertyNames(context).filter(name => !forbiddenGlobals.includes(name)).sort(), [
    'TradeDiaryBackupFormat', 'TradeDiaryDelimitedRows', 'TradeDiaryTradesCSV',
    'cleanMTCell', 'normalizeDate', 'normalizeImportHeader', 'parseGenericTradeRows',
    'parseMT4Raw', 'parseMT5Rows', 'parseMTNumber', 'parseSpreadsheetRows',
  ].sort());
  assert.deepEqual(Object.keys(context.TradeDiaryTradesCSV).sort(), ['TRADE_CSV_HEADERS', 'buildTradesCSV', 'csvCell']);
  assert.equal(context.TradeDiaryTradesCSV.buildTradesCSV(), header + '\n');
});

// Confirma que a constante legada `TRADE_CSV_HEADERS` aponta para a mesma referencia de array do serializador isolado.
nodeTest('legacy header alias shares the serializer column array', () => {
  const context = loadLegacyContext();
  assert.equal(vm.runInContext('TRADE_CSV_HEADERS', context), context.TradeDiaryTradesCSV.TRADE_CSV_HEADERS);
  assert.equal(vm.runInContext('TRADE_CSV_HEADERS.join(",")', context), header);
});

// Valida em index.html que todos os scripts locais sao classicos/sincronos e que o serializador carrega entre simulacao e app.js.
nodeTest('HTML loads serializer once between sizing and app.js as synchronous classic scripts', () => {
  const html = fs.readFileSync(`${__dirname}/../../index.html`, 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1],
    src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const localScripts = scripts.filter(script => script.src && !script.src.startsWith('https://'));
  const csvOrder = ['src/modules/simulation/domain/simulation-calculations.js', serializerPath, 'app.js'];
  assert.deepEqual(localScripts.map(script => script.src).filter(src => csvOrder.includes(src)), csvOrder);
  for (const script of localScripts) {
    assert.doesNotMatch(script.attributes, /\b(?:async|defer|nomodule)\b/i);
    const type = script.attributes.match(/\btype\s*=\s*['"]([^'"]*)['"]/i)?.[1];
    assert.ok(type === undefined || type === '' || type === 'text/javascript');
  }
});

// Garante que `buildTradesCSV()` sem argumento (ou `undefined`) resolve dinamicamente a variavel global `trades`, enquanto `null` gera apenas o cabecalho.
nodeTest('global buildTradesCSV keeps signature and resolves current trades on each default call', () => {
  const context = loadLegacyContext();
  assert.equal(context.buildTradesCSV.length, 0);
  assert.equal(context.csvCell.length, 1);
  assert.equal(context.buildTradesCSV(), header + '\n');
  vm.runInContext('trades = [{date: "first"}]', context);
  const first = header + '\n"first",' + Array(21).fill('""').join(',');
  assert.equal(context.buildTradesCSV(), first);
  assert.equal(context.buildTradesCSV(undefined), first);
  vm.runInContext('trades = [{}]', context);
  assert.equal(context.buildTradesCSV(), header + '\n' + emptyRow);
  assert.equal(context.buildTradesCSV(null), header + '\n');
});

// Verifica o consumidor `exportTradesCSV`: envia payload CSV, nome datado e MIME UTF-8 para `downloadTextFile`, ou mostra aviso quando a entrada e vazia/invalida.
nodeTest('export consumer keeps CSV payload, filename, MIME and empty-list notice', () => {
  const context = loadLegacyContext();
  const downloads = [], notices = [];
  context.downloadTextFile = (...args) => downloads.push(args);
  context.showAppNotice = (...args) => notices.push(args);
  vm.runInContext('Date = class extends Date { toISOString() { return "2026-09-10T12:00:00.000Z"; } }', context);
  assert.equal(context.exportTradesCSV([{}], 'filtered'), undefined);
  assert.deepEqual(downloads, [[header + '\n' + emptyRow, 'filtered_2026-09-10.csv', 'text/csv;charset=utf-8']]);
  for (const input of [[], null, {}]) assert.equal(context.exportTradesCSV(input, 'empty'), undefined);
  assert.equal(downloads.length, 1);
  assert.deepEqual(notices, Array(3).fill(['Exportar CSV', 'Nenhum trade encontrado para esses filtros.']));
});
