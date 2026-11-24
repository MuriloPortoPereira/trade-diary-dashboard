/*
 * Objetivo:
 *   Caracterizar e garantir equivalencia exata entre o dominio puro de dimensionamento da simulacao
 *   (TradeDiarySimulationSizing) e os wrappers globais legados em app.js (toSimulationNumber,
 *   roundSimulationMoney e calculateSimulationSizing), cobrindo parsing, arredondamento monetario,
 *   clamping, overflow, imutabilidade e isolamento total de DOM/IO.
 *
 * Modulos testados:
 *   - src/modules/simulation/domain/simulation-calculations.js (TradeDiarySimulationSizing)
 *   - app.js (wrappers legados toSimulationNumber, roundSimulationMoney e calculateSimulationSizing)
 *
 * Estrategia de isolamento:
 *   Executa o script de dominio em uma sandbox node:vm blindada com getters armadilha para
 *   16 globals proibidos (window, document, storage, rede, Chart, require, process, timers etc.).
 *   Reaproveita a mesma suite de caracterizacao (`characterize`) tanto contra o dominio isolado
 *   quanto contra os wrappers extraidos de app.js para assegurar paridade comportamental de 100%.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - O script de dominio expoe somente os namespaces TradeDiarySimulationSizing e TradeDiarySimulationProjection,
 *     sem vazar funcoes globais soltas nem acessar DOM/IO.
 *   - index.html carrega simulation-calculations.js uma unica vez, de forma sincrona, antes de app.js.
 *   - toSimulationNumber preserva semantica de parseFloat e devolve o fallback inalterado em valores invalidos/nao-finitos.
 *   - roundSimulationMoney preserva arredondamento com epsilon (1.005 -> 1.01), comportamento de negativos (-1.005 -> -1)
 *     e retorno 0 para nao-finitos.
 *   - calculateSimulationSizing arredonda balance antes dos calculos monetarios, faz clamp de negativos para 0,
 *     mantem overflow legado com Number.MAX_VALUE, lanca TypeError em null e retorna objetos independentes sem mutar o input.
 */
const nodeTest = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

const functionNames = [
  'toSimulationNumber',
  'roundSimulationMoney',
  'calculateSimulationSizing',
];
const domainPath = 'src/modules/simulation/domain/simulation-calculations.js';
const domainSource = fs.readFileSync(`${__dirname}/../../${domainPath}`, 'utf8');
const forbiddenGlobals = [
  'window', 'document', 'localStorage', 'sessionStorage', 'fetch',
  'XMLHttpRequest', 'WebSocket', 'navigator', 'indexedDB', 'caches',
  'Chart', 'require', 'process', 'console', 'setTimeout', 'setInterval',
];

// Cria um contexto VM blindado onde qualquer acesso a APIs de browser, storage, rede ou Node
// dispara erro imediatamente, e avalia o arquivo puro de dominio nesse ambiente.
function loadDomainContext() {
  const sandbox = {};
  for (const name of forbiddenGlobals) {
    Object.defineProperty(sandbox, name, {
      get() { throw new Error(`Domain must not access ${name}`); },
    });
  }
  const context = vm.createContext(sandbox);
  vm.runInContext(domainSource, context, { filename: domainPath });
  return context;
}

// Extrai de app.js as tres declaracoes globais legadas de sizing e as executa sobre o contexto
// do dominio puro para validar que os wrappers globais preservam exatamente o mesmo comportamento.
function loadLegacyFunctions() {
  const source = fs.readFileSync(`${__dirname}/../../app.js`, 'utf8');
  const declarations = functionNames.map((name) => {
    // Estas tres declaracoes simples terminam na primeira chave de fechamento sem indentacao.
    const match = source.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'));
    assert.ok(match, `Missing legacy function: ${name}`);
    return match[0];
  });
  const context = loadDomainContext();
  vm.runInContext(declarations.join('\n\n'), context, { filename: 'app.js (sizing declarations)' });
  return Object.fromEntries(functionNames.map((name) => [name, context[name]]));
}

// Prova encapsulamento e pureza: apenas os dois namespaces publicos existem no escopo global da VM,
// TradeDiarySimulationSizing contem exatamente as 3 funcoes esperadas e nenhuma delas vaza como global.
nodeTest('domain exposes one namespace without leaking helpers or accessing DOM/IO', () => {
  const context = loadDomainContext();
  assert.deepEqual(
    Object.getOwnPropertyNames(context).filter((name) => !forbiddenGlobals.includes(name)),
    ['TradeDiarySimulationSizing', 'TradeDiarySimulationProjection'],
  );
  assert.deepEqual(Object.keys(context.TradeDiarySimulationSizing).sort(), [...functionNames].sort());
  for (const name of functionNames) assert.equal(context[name], undefined);
});

// Verifica no index.html que tanto simulation-calculations.js quanto app.js sao carregados exatamente
// uma vez, na ordem correta e como scripts classicos sincronos (sem async, defer, nomodule ou module).
nodeTest('HTML loads the domain once before app.js using synchronous classic scripts', () => {
  const html = fs.readFileSync(`${__dirname}/../../index.html`, 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map((match) => ({
    attributes: match[1],
    src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const domainScripts = scripts.filter((script) => script.src === domainPath);
  const appScripts = scripts.filter((script) => script.src === 'app.js');
  assert.equal(domainScripts.length, 1);
  assert.equal(appScripts.length, 1);
  assert.ok(scripts.indexOf(domainScripts[0]) < scripts.indexOf(appScripts[0]));
  for (const script of [...domainScripts, ...appScripts]) {
    assert.doesNotMatch(script.attributes, /\b(?:async|defer|nomodule)\b/i);
    const type = script.attributes.match(/\btype\s*=\s*['"]([^'"]*)['"]/i)?.[1];
    assert.ok(type === undefined || type === '' || type === 'text/javascript');
  }
});

// Suite parametrizada de caracterizacao executada duas vezes: uma contra o dominio isolado e outra
// contra os wrappers legados de app.js, garantindo que ambos obedecam rigorosamente aos mesmos contratos.
function characterize(label, api) {
  const test = (name, callback) => nodeTest(`${label}: ${name}`, callback);

  // Helper que chama calculateSimulationSizing e copia o resultado para o realm local.
  function sizing(input) {
    // Espalha neste realm para que a igualdade estrita compare valores, nao prototipos da VM.
    return { ...api.calculateSimulationSizing(input) };
  }

  // Valida assinatura publica (arity/.length) das 3 funcoes e ausencia de document/localStorage no objeto API.
  test('legacy functions load without DOM or storage and keep public signatures', () => {
    for (const name of functionNames) assert.equal(typeof api[name], 'function');
    assert.equal(api.toSimulationNumber.length, 1);
    assert.equal(api.roundSimulationMoney.length, 1);
    assert.equal(api.calculateSimulationSizing.length, 0);
    assert.equal(api.document, undefined);
    assert.equal(api.localStorage, undefined);
  });

  // Confirma que toSimulationNumber segue parseFloat (espacos, sufixos, virgula truncada, notacao cientifica, '0x10' -> 0).
  test('number parsing retains parseFloat semantics', () => {
    const cases = [
      [12.5, 12.5], [' 12.5 ', 12.5], ['12abc', 12], ['1,5', 1],
      ['1e2', 100], ['0x10', 0], [-3, -3], ['-.25', -0.25],
    ];
    for (const [input, expected] of cases) {
      assert.equal(api.toSimulationNumber(input), expected, String(input));
    }
  });

  // Casos de borda para entradas invalidas ou nao-finitas: retorna 0 por padrao ou devolve o fallback
  // exatamente como foi fornecido (numero, string, null ou Infinity).
  test('invalid and nonfinite numbers use the supplied fallback unchanged', () => {
    for (const input of [undefined, null, '', ' ', 'invalid', true, NaN, Infinity, -Infinity, 'Infinity']) {
      assert.equal(api.toSimulationNumber(input), 0, String(input));
      assert.equal(api.toSimulationNumber(input, 55), 55, String(input));
    }
    assert.equal(api.toSimulationNumber('invalid', 'fallback'), 'fallback');
    assert.equal(api.toSimulationNumber('invalid', null), null);
    assert.equal(api.toSimulationNumber('invalid', Infinity), Infinity);
    assert.equal(api.toSimulationNumber('2', 55), 2);
  });

  // Valida roundSimulationMoney em casos sensiveis de ponto flutuante (1.005, 2.675), negativos (-1.005, -2.675, -0.001),
  // strings com sufixo e retorno 0 para undefined/NaN/Infinity.
  test('money rounding retains epsilon and negative rounding behavior', () => {
    const cases = [
      [1.005, 1.01], [2.675, 2.68], [-1.005, -1], [-2.675, -2.67],
      ['12.345tail', 12.35], [0, 0], [-0.001, -0],
      [undefined, 0], ['invalid', 0], [NaN, 0], [Infinity, 0], [-Infinity, 0],
    ];
    for (const [input, expected] of cases) {
      assert.equal(api.roundSimulationMoney(input), expected, String(input));
    }
  });

  // Garante que chamada sem argumentos, objeto vazio ou campos undefined retorna todos os 7 campos zerados.
  test('sizing defaults all seven fields to zero', () => {
    const expected = { balance: 0, riskPct: 0, goalPct: 0, stopPct: 0, riskUsd: 0, goalUsd: 0, stopUsd: 0 };
    assert.deepEqual(sizing(), expected);
    assert.deepEqual(sizing({}), expected);
    assert.deepEqual(sizing({ balance: undefined, riskPct: undefined }), expected);
  });

  // Fluxo nominal: calcula riskUsd (1% = 10), goalUsd (5% = 50) e stopUsd (3% = 30) sobre saldo 1000.
  test('sizing calculates the nominal plan', () => {
    assert.deepEqual(sizing({ balance: 1000, riskPct: 1, goalPct: 5, stopPct: 3 }), {
      balance: 1000, riskPct: 1, goalPct: 5, stopPct: 3,
      riskUsd: 10, goalUsd: 50, stopUsd: 30,
    });
  });

  // Valida aceitacao de strings com sufixo/virgula, percentuais fracionarios (0.125%) e acima de 100% (125%).
  test('sizing accepts strings and preserves fractional and above-100 percentages', () => {
    assert.deepEqual(sizing({ balance: ' 1000usd', riskPct: '0.125', goalPct: '125', stopPct: '1,5' }), {
      balance: 1000, riskPct: 0.125, goalPct: 125, stopPct: 1,
      riskUsd: 1.25, goalUsd: 1250, stopUsd: 10,
    });
  });

  // Casos de borda com negativos, NaN, Infinity, null, strings vazias e booleanos: tudo e normalizado/limitado a 0.
  test('sizing clamps negative inputs and normalizes invalid values', () => {
    const expected = { balance: 0, riskPct: 0, goalPct: 0, stopPct: 0, riskUsd: 0, goalUsd: 0, stopUsd: 0 };
    assert.deepEqual(sizing({ balance: -1000, riskPct: -1, goalPct: -5, stopPct: -3 }), expected);
    assert.deepEqual(sizing({ balance: NaN, riskPct: Infinity, goalPct: -Infinity, stopPct: 'invalid' }), expected);
    assert.deepEqual(sizing({ balance: null, riskPct: '', goalPct: false, stopPct: ' ' }), expected);
  });

  // Verifica ordem de arredondamento: o saldo 1.005 e arredondado para 1.01 antes de calcular riskUsd/goalUsd/stopUsd.
  test('sizing rounds balance before calculating money amounts', () => {
    assert.deepEqual(sizing({ balance: 1.005, riskPct: 50, goalPct: 100, stopPct: 200 }), {
      balance: 1.01, riskPct: 50, goalPct: 100, stopPct: 200,
      riskUsd: 0.51, goalUsd: 1.01, stopUsd: 2.02,
    });
  });

  // Caso de borda de overflow numerico com Number.MAX_VALUE: preserva Infinity em balance/roundSimulationMoney
  // e zera os campos monetarios derivados quando a multiplicacao transborda para nao-finito.
  test('finite inputs retain existing overflow behavior', () => {
    assert.equal(api.roundSimulationMoney(Number.MAX_VALUE), Infinity);
    assert.deepEqual(sizing({ balance: Number.MAX_VALUE, riskPct: 1, goalPct: 0, stopPct: 100 }), {
      balance: Infinity, riskPct: 1, goalPct: 0, stopPct: 100,
      riskUsd: 0, goalUsd: 0, stopUsd: 0,
    });
    assert.deepEqual(sizing({ balance: 1000, riskPct: Number.MAX_VALUE }), {
      balance: 1000, riskPct: Number.MAX_VALUE, goalPct: 0, stopPct: 0,
      riskUsd: 0, goalUsd: 0, stopUsd: 0,
    });
  });

  // Garante que passar null diretamente mantem o contrato legado de lancar TypeError na desestruturacao.
  test('null sizing input keeps its TypeError contract', () => {
    assert.throws(() => api.calculateSimulationSizing(null), { name: 'TypeError' });
  });

  // Verifica imutabilidade e isolamento de retorno: objeto congelado (Object.freeze) nao e mutado
  // e chamadas repetidas retornam instancias independentes.
  test('sizing preserves input and returns independent objects', () => {
    const input = Object.freeze({ balance: '1000', riskPct: '1', goalPct: '5', stopPct: '3', extra: 'keep' });
    const first = api.calculateSimulationSizing(input);
    const second = api.calculateSimulationSizing(input);
    assert.notStrictEqual(first, second);
    first.riskUsd = 999;
    assert.equal(second.riskUsd, 10);
    assert.deepEqual(input, { balance: '1000', riskPct: '1', goalPct: '5', stopPct: '3', extra: 'keep' });
  });
}

characterize('isolated domain', loadDomainContext().TradeDiarySimulationSizing);
characterize('legacy wrappers', loadLegacyFunctions());
