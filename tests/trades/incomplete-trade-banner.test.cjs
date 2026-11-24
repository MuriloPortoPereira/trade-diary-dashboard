/*
 * Objetivo:
 *   Validar o comportamento do banner de alerta de trades incompletos (exibicao,
 *   contagem, descarte persistente e ordem de carregamento).
 *
 * Modulo testado:
 *   src/modules/trades/presentation/trade-form.js (funcoes updateIncompleteBanner e
 *   dismissIncompleteBanner, alem de verificar que as declaracoes legadas ja foram
 *   removidas de app.js e registradas em index.html).
 *
 * Estrategia de isolamento:
 *   Carrega o codigo-fonte do modulo em um contexto isolado via node:vm, fornecendo
 *   mocks minimos de activeAccountId, getAccountTrades e document.getElementById,
 *   alem de registrar a ordem exata das chamadas para validar efeitos colaterais.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - O script do modulo deve carregar de forma classica antes de app.js.
 *   - As declaracoes legadas nao podem mais existir em app.js.
 *   - Trades incompletos sao contabilizados por truthiness sem mutar o array
 *     original.
 *   - Ausencia de elementos opcionais do DOM nao interrompe a consulta da conta nem a
 *     contagem.
 *   - O descarte manual (dismiss) oculta o banner e permanece ativo nas atualizacoes
 *     seguintes.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/trades/presentation/trade-form.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^let _incompleteBannerDismissed=false;[^]*?^function dismissIncompleteBanner\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

// Verifica no index.html que o modulo de formulario/banner e carregado como script
// classico e posicionado antes de app.js para disponibilizar as funcoes globais
// necessarias.
test('banner loads as a classic script before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const bannerIndex = html.indexOf(`<script src="${modulePath}"></script>`);
  const appIndex = html.indexOf('<script src="app.js"></script>');
  assert.ok(bannerIndex >= 0);
  assert.ok(bannerIndex < appIndex);
});

// Helper de execucao isolada em VM: injeta mocks de conta ativa, lista de trades e
// alvos do DOM (incompleteAlert e incompleteCount), grava o rastro de chamadas e
// serializa os trades antes/depois para garantir imutabilidade. Permite disparar
// updateIncompleteBanner() ou dismissIncompleteBanner().
function render({trades = [], alert = {style: {display: 'before'}}, count = {textContent: 'before'}, dismiss = false} = {}) {
  const calls = [];
  const before = JSON.stringify(trades);
  const context = vm.createContext({
    activeAccountId: 'acct-1',
    getAccountTrades(id) { calls.push(['trades', id]); return trades; },
    document: {
      getElementById(id) {
        calls.push(['target', id]);
        return id === 'incompleteAlert' ? alert : id === 'incompleteCount' ? count : null;
      },
    },
  });
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext(dismiss ? 'dismissIncompleteBanner()' : 'updateIncompleteBanner()', context);
  return {alert, count, calls, before, after: JSON.stringify(trades), context};
}

// Garante que trades com flag incomplete truthy (booleano true ou numerico 1) exibem
// o banner, atualizam o contador corretamente, preservam os dados originais e seguem
// a ordem de consulta esperada.
test('incomplete trades show the banner and preserve source rows', () => {
  const trades = [{id: 1, incomplete: true}, {id: 2, incomplete: false}, {id: 3, incomplete: 1}];
  const result = render({trades});
  assert.equal(result.alert.style.display, 'block');
  assert.equal(result.count.textContent, 2);
  assert.equal(result.after, result.before);
  assert.deepEqual(result.calls, [
    ['trades', 'acct-1'],
    ['target', 'incompleteAlert'],
    ['target', 'incompleteCount'],
  ]);
});

// Caso de borda sem trades incompletos (flag false ou ausente): o banner deve
// permanecer oculto e o contador deve receber o valor numerico 0.
test('zero incomplete trades hide the banner and render numeric zero', () => {
  const {alert, count} = render({trades: [{incomplete: false}, {}]});
  assert.equal(alert.style.display, 'none');
  assert.equal(count.textContent, 0);
});

// Caso de borda com elementos de DOM ausentes (null): a funcao deve tolerar alvos
// opcionais sem falhar e ainda executar a busca de trades da conta ativa e a
// tentativa de resolver os IDs.
test('optional banner targets do not skip account lookup or counting', () => {
  const {calls} = render({trades: [{incomplete: true}], alert: null, count: null});
  assert.deepEqual(calls, [
    ['trades', 'acct-1'],
    ['target', 'incompleteAlert'],
    ['target', 'incompleteCount'],
  ]);
});

// Verifica que dismissIncompleteBanner() oculta o banner mesmo havendo trades
// incompletos, atualiza o contador e mantem o estado descartado (sticky) em chamadas
// subsequentes de updateIncompleteBanner().
test('dismiss hides existing incompletes and remains sticky for later updates', () => {
  const alert = {style: {display: 'before'}};
  const count = {textContent: 'before'};
  const result = render({trades: [{incomplete: true}], alert, count, dismiss: true});
  assert.equal(alert.style.display, 'none');
  assert.equal(count.textContent, 1);
  vm.runInContext('updateIncompleteBanner()', result.context);
  assert.equal(alert.style.display, 'none');
  assert.equal(count.textContent, 1);
});
