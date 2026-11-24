/*
 * Objetivo: Testar a renderizacao da lista de aportes e retiradas da conta ativa
 * exibida na pagina de configuracao/setup (`renderSetupCashflowList`).
 *
 * Modulo/arquivo testado: funcao `renderSetupCashflowList` em
 * `src/modules/accounts/presentation/accounts-workspace.js` (confirmando remocao de
 * `app.js`).
 *
 * Estrategia de isolamento: executa o modulo em `node:vm` com mocks de DOM
 * (`setupCashflowList`), leitura de conta ativa, consulta/calculo de cashflows,
 * formatadores (`fR`, `fDate`) e `escapeHtml`.
 *
 * Pontos-chave garantidos: guarda de container ausente, limpeza do HTML sem conta
 * ativa, mensagem de lista vazia, resumo com sinal/cor, escape de notas, handlers
 * `deleteSetupCashflow` por ID, imutabilidade do array de fluxos e carregamento
 * sincrono antes de `app.js`.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/accounts/presentation/accounts-workspace.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderSetupCashflowList\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

/*
 * Helper de renderizacao em sandbox: instancia o container simulado
 * `setupCashflowList` (ou `null` quando `visible: false`), injeta conta ativa, lista
 * de movimentacoes e resumo, executa `renderSetupCashflowList()` e devolve o HTML
 * final, as chamadas gravadas e os fluxos.
 */
function render({account = {id: 'account-a'}, flows = [], summary = {deposits: 0, withdrawals: 0, net: 0}, visible = true} = {}) {
  const node = {innerHTML: 'before'};
  const calls = [];
  const context = vm.createContext({
    document: {getElementById(id) { calls.push(['target', id]); return visible ? node : null; }},
    getActiveAccount() { calls.push(['account']); return account; },
    getAccountCashflows(value) { calls.push(['flows', value]); return flows; },
    calcAccountCashflow(value) { calls.push(['calculate', value]); return summary; },
    fR(value) { calls.push(['money', value]); return `R$${value}`; },
    fDate(value) { calls.push(['date', value]); return `D:${value}`; },
    escapeHtml(value) {
      calls.push(['escape', value]);
      return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    },
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderSetupCashflowList' : modulePath});
  vm.runInContext('renderSetupCashflowList()', context);
  return {html: node.innerHTML, calls, flows};
}

/*
 * Guarda de container ausente: sem `#setupCashflowList` no DOM, retorna antes mesmo
 * de consultar `getActiveAccount()`.
 */
test('missing target returns before resolving the active account', () => {
  const {html, calls} = render({visible: false});
  assert.equal(html, 'before');
  assert.deepEqual(calls, [['target', 'setupCashflowList']]);
});

/*
 * Conta ativa ausente: limpa o container (`innerHTML = ''`) e encerra sem consultar
 * fluxos nem calcular totais.
 */
test('missing active account clears the target before cashflow work', () => {
  const {html, calls} = render({account: null});
  assert.equal(html, '');
  assert.deepEqual(calls, [['target', 'setupCashflowList'], ['account']]);
});

/*
 * Conta sem movimentacoes: consulta fluxos e resumo passando o objeto da conta ativa
 * e exibe a mensagem padrao de lista vazia.
 */
test('empty setup cashflows keep the message after lookup and calculation', () => {
  const account = {id: 'account-a'};
  const {html, calls} = render({account});
  assert.equal(html, '<div class="account-cashflow-empty">Nenhum aporte ou retirada na conta ativa.</div>');
  assert.deepEqual(calls.slice(0, 4).map(call => call[0]), ['target', 'account', 'flows', 'calculate']);
  assert.equal(calls.find(call => call[0] === 'flows')[1], account);
  assert.equal(calls.find(call => call[0] === 'calculate')[1], account);
});

/*
 * Lista preenchida: valida totais de aportes/retiradas e liquido positivo (`+R$100`
 * verde), ordenacao das linhas, classes por tipo, formatacao de data, escape HTML na
 * nota, fallback `—`, handlers `deleteSetupCashflow('<id>')` e imutabilidade dos
 * registros originais.
 */
test('setup rows preserve summary, order, formatting, escaping and id handlers', () => {
  const flows = [
    {id: 'deposit-1', type: 'deposit', date: '2026-10-01', amount: 125, note: 'Aporte <principal>'},
    {id: 'withdrawal-2', type: 'withdrawal', date: '2026-10-02', amount: 25, note: ''},
  ];
  const before = JSON.stringify(flows);
  const {html} = render({flows, summary: {deposits: 125, withdrawals: 25, net: 100}});
  assert.match(html, /Aportes: <b>R\$125<\/b>/);
  assert.match(html, /Retiradas: <b>R\$25<\/b>/);
  assert.match(html, /class="text-green">\+R\$100<\/b>/);
  assert.ok(html.indexOf('deposit-1') < html.indexOf('withdrawal-2'));
  assert.match(html, /class="text-green">Aporte<\/span>/);
  assert.match(html, /class="text-red">Retirada<\/span>/);
  assert.match(html, /D:2026-10-01/);
  assert.match(html, /Aporte &lt;principal&gt;/);
  assert.match(html, />—<\/span>/);
  assert.match(html, /deleteSetupCashflow\('deposit-1'\)/);
  assert.match(html, /deleteSetupCashflow\('withdrawal-2'\)/);
  assert.equal(JSON.stringify(flows), before);
});

/*
 * Caso de borda de saldo liquido negativo e tipo desconhecido: aplica `text-red` sem
 * sinal `+` no total liquido e usa o fallback visual verde `Aporte` para tipos
 * desconhecidos.
 */
test('negative setup net and unknown flow type keep legacy tones and labels', () => {
  const {html} = render({
    flows: [{id: 'other-1', type: 'other', date: '', amount: 10, note: null}],
    summary: {deposits: 0, withdrawals: 10, net: -10},
  });
  assert.match(html, /class="text-red">R\$-10<\/b>/);
  assert.match(html, /class="text-green">Aporte<\/span>/);
});

/*
 * Contrato de carregamento: garante script classico sincrono unico em `index.html`
 * antes de `app.js` e definicao de `renderSetupCashflowList` anterior a
 * `renderSetup`.
 */
test('setup cashflow renderer loads once as a synchronous classic script before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(source.indexOf('function renderSetupCashflowList(') < source.indexOf('function renderSetup('));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
