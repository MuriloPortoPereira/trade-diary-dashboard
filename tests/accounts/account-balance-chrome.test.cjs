/*
 * Objetivo: Validar a sincronizacao dos indicadores de saldo da conta na barra
 * lateral (saldo atual, variacao/cor do resultado e contagem de trades).
 *
 * Modulo/arquivo testado: funcao `syncAccountBalanceChrome` em
 * `src/modules/accounts/presentation/accounts-workspace.js` (e remocao do legado em
 * `app.js`).
 *
 * Estrategia de isolamento: executa apenas o bloco da funcao extraido via regex em um
 * contexto `node:vm` com mocks de leitura de conta, trades, calculo de risco,
 * formatadores e `document`.
 *
 * Pontos-chave garantidos: retorno antecipado sem conta ativa, ordem de carregamento
 * do script classico em `index.html`, sequencia exata de chamadas, coloracao
 * verde/vermelha conforme P/L e fluxo de caixa, e tolerancia a elementos DOM
 * opcionais ausentes.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/accounts/presentation/accounts-workspace.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function syncAccountBalanceChrome\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8').match(/^function syncAccountBalanceChrome\([^]*?^\}/m)[0];

/*
 * Helper de execucao em sandbox: cria um contexto `vm` com dependencias simuladas
 * (`getActiveAccount`, `getAccountTrades`, `calcAccountRiskState`, formatadores e
 * DOM), registra a ordem de invocacoes em `calls` e chama `syncAccountBalanceChrome`
 * com parametros padrao (`useDefaults: true`) ou explicitos.
 */
function render({account = {id: 'acct-1'}, trades = [{id: 'trade-1'}], risk, elements = {}, useDefaults = false} = {}) {
  const calls = [];
  const context = vm.createContext({
    account,
    trades,
    getActiveAccount() { calls.push(['active']); return account; },
    getAccountTrades(id) { calls.push(['trades', id]); return trades; },
    calcAccountRiskState(acct, rows) { calls.push(['risk', acct, rows]); return risk; },
    fR(value) { calls.push(['money', value]); return `F:${value}`; },
    formatAccountBalanceChange(value) { calls.push(['change', value]); return 'formatted change'; },
    document: {getElementById(id) { calls.push(['target', id]); return elements[id] ?? null; }},
  });
  vm.runInContext(source, context, {filename: modulePath});
  const result = vm.runInContext(useDefaults
    ? 'syncAccountBalanceChrome()'
    : 'syncAccountBalanceChrome(account,trades)', context);
  return {calls, result};
}

/*
 * Caso de borda: quando nao ha conta ativa padrao (`account: null`), a avaliacao dos
 * argumentos padrao ainda resolve `getActiveAccount()` e
 * `getAccountTrades(undefined)`, mas a funcao retorna `null` imediatamente antes de
 * calcular risco ou tocar no DOM.
 */
test('missing default account still resolves its trades and returns before risk or DOM work', () => {
  const {calls, result} = render({account: null, useDefaults: true});
  assert.equal(result, null);
  assert.deepEqual(calls, [['active'], ['trades', undefined]]);
});

/*
 * Contrato de carregamento: garante que `accounts-workspace.js` aparece exatamente
 * uma vez em `index.html` e e carregado antes de `analytics-workspace.js` e `app.js`.
 */
test('account balance chrome classic script loads once before dashboard and app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(scripts.filter(src => src === modulePath).length, 1);
  assert.ok(scripts.indexOf(modulePath) < scripts.indexOf('src/modules/analytics/presentation/analytics-workspace.js'));
  assert.ok(scripts.indexOf(modulePath) < scripts.indexOf('app.js'));
});

/*
 * Fluxo principal: com conta ativa e elementos DOM presentes, atualiza saldo
 * formatado, texto e cor positiva (`var(--green)`) da variacao e contagem de trades,
 * retornando o estado de risco e respeitando a ordem exata das chamadas.
 */
test('default account updates balance, positive change and trade count and returns risk', () => {
  const account = {id: 'acct-1'};
  const trades = [{id: 'trade-1'}];
  const elements = {
    sideBalance: {textContent: 'before'},
    sideBalanceChange: {textContent: 'before', style: {color: 'before'}},
    sideTradeCount: {textContent: 'before'},
  };
  const risk = {currentBalance: 1234.5, totalPnl: 20, cashflowNet: -50};
  const {calls, result} = render({account, trades, risk, elements, useDefaults: true});
  assert.equal(result, risk);
  assert.equal(elements.sideBalance.textContent, 'F:1234.5');
  assert.equal(elements.sideBalanceChange.textContent, 'formatted change');
  assert.equal(elements.sideBalanceChange.style.color, 'var(--green)');
  assert.equal(elements.sideTradeCount.textContent, 1);
  assert.deepEqual(calls, [
    ['active'],
    ['trades', 'acct-1'],
    ['risk', account, trades],
    ['target', 'sideBalance'],
    ['money', 1234.5],
    ['target', 'sideBalanceChange'],
    ['change', risk],
    ['target', 'sideTradeCount'],
  ]);
});

/*
 * Regra visual de sinal: verifica que tanto P/L total negativo (mesmo com cashflow
 * positivo) quanto P/L zerado acompanhado de cashflow liquido negativo aplicam a cor
 * `var(--red)`.
 */
test('negative result or zero result with negative cashflow keeps the negative change color', () => {
  const pnlChange = {textContent: '', style: {color: ''}};
  render({
    risk: {currentBalance: 100, totalPnl: -1, cashflowNet: 10},
    elements: {sideBalanceChange: pnlChange},
  });
  assert.equal(pnlChange.style.color, 'var(--red)');

  const cashflowChange = {textContent: '', style: {color: ''}};
  render({
    risk: {currentBalance: 100, totalPnl: 0, cashflowNet: -1},
    elements: {sideBalanceChange: cashflowChange},
  });
  assert.equal(cashflowChange.style.color, 'var(--red)');
});

/*
 * Resiliencia a DOM parcial: quando os tres alvos opcionais nao existem no documento,
 * os formatadores (`fR` e `formatAccountBalanceChange`) nao sao chamados, mas os tres
 * IDs sao consultados e o objeto `risk` calculado continua sendo retornado.
 */
test('optional targets skip their formatters without changing the calculated return', () => {
  const risk = {currentBalance: 100, totalPnl: -1, cashflowNet: 0};
  const {calls, result} = render({risk});
  assert.equal(result, risk);
  assert.equal(calls.some(call => call[0] === 'money'), false);
  assert.equal(calls.some(call => call[0] === 'change'), false);
  assert.deepEqual(calls.filter(call => call[0] === 'target'), [
    ['target', 'sideBalance'],
    ['target', 'sideBalanceChange'],
    ['target', 'sideTradeCount'],
  ]);
});
