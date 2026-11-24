/*
 * Objetivo do arquivo:
 *   Validar a renderizacao da pagina de notificacoes operacionais (renderNotificationsPage):
 *   coleta de alertas da conta ativa, copia defensiva dos objetos de alerta, mensagem
 *   de estado vazio, propagacao de falhas e registro do script no index.html.
 *
 * Modulo/arquivo testado:
 *   Funcao renderNotificationsPage em src/modules/notifications/presentation/notifications-page.js
 *   (com assercao imediata de que a declaracao legada foi removida de app.js).
 *
 * Estrategia de isolamento:
 *   Extrai renderNotificationsPage e executa em uma sandbox node:vm com stubs que
 *   verificam identidade dos argumentos (conta e trades) passados a buildOperationalAlerts
 *   e capturam os argumentos enviados a renderStatusList.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Fluxo exato: getActiveAccount -> getAccountTrades(activeAccountId) ->
 *     buildOperationalAlerts(acct, trades) -> renderStatusList('notificationFeed', ...).
 *   - Os alertas passados a renderStatusList sao copias rasas (novo array e novos objetos),
 *     evitando mutacao acidental dos objetos originais.
 *   - Cada invocacao rele activeAccountId dinamicamente e preserva o texto padrao de feed vazio.
 *   - Falhas (ex.: buildOperationalAlerts retornando null) propagam sem renderizar feed parcial.
 *   - Script classico sincrono carregado uma unica vez antes de app.js no index.html.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/notifications/presentation/notifications-page.js';
const legacy = fs.readFileSync(path.join(root, 'app.js'), 'utf8')
  .match(/^function renderNotificationsPage\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8')
  .match(/^function renderNotificationsPage\([^]*?^\}/m)[0];

// Prepara o contexto vm com conta 'a', um trade de amostra e espias que confirmam que
// buildOperationalAlerts recebe exatamente a conta e trades consultados antes de renderStatusList.
function harness(alerts) {
  const account = {id: 'a'};
  const rows = [{id: 'trade-a'}];
  const calls = [];
  const context = vm.createContext({
    activeAccountId: 'a',
    getActiveAccount() { calls.push('account'); return account; },
    getAccountTrades(id) { calls.push(['trades', id]); return rows; },
    buildOperationalAlerts(acct, trades) {
      assert.equal(acct, account);
      assert.equal(trades, rows);
      calls.push('alerts');
      return alerts;
    },
    renderStatusList(...args) { calls.push(args); },
  });
  vm.runInContext(source, context);
  return {context, calls};
}

// Verifica que renderNotificationsPage consulta conta/trades/alertas em ordem, envia para
// 'notificationFeed' com mensagem vazia padrao e entrega copias (novo array e novos itens) sem mutar alertas.
test('notifications renders copied alerts for the active account without mutation', () => {
  const alerts = [{tone: 'warn', title: 'Limite', summary: 'Atenção', action: 'showPage("setup")', extra: 3}];
  const {context, calls} = harness(alerts);
  assert.equal(vm.runInContext('renderNotificationsPage()', context), undefined);
  assert.deepEqual(calls.slice(0, 3), ['account', ['trades', 'a'], 'alerts']);
  const [target, rendered, empty] = calls[3];
  assert.equal(target, 'notificationFeed');
  assert.equal(empty, 'Tudo dentro do esperado agora.');
  assert.equal(JSON.stringify(rendered), JSON.stringify(alerts));
  assert.notEqual(rendered, alerts);
  assert.notEqual(rendered[0], alerts[0]);
  assert.equal(alerts[0].extra, 3);
});

// Garante que mudar activeAccountId entre duas chamadas faz consultar os trades da nova
// conta ('a' e depois 'b') e mantem a mensagem de estado vazio quando nao ha alertas.
test('notifications preserves the empty feed message and current account on each call', () => {
  const {context, calls} = harness([]);
  vm.runInContext('renderNotificationsPage(); activeAccountId="b"; renderNotificationsPage()', context);
  assert.deepEqual(calls.filter(call => Array.isArray(call) && call[0] === 'trades'), [['trades', 'a'], ['trades', 'b']]);
  for (const call of calls.filter(call => Array.isArray(call) && call[0] === 'notificationFeed')) {
    assert.equal(call[1].length, 0);
    assert.equal(call[2], 'Tudo dentro do esperado agora.');
  }
});

// Caso buildOperationalAlerts retorne null, o erro de .map() propaga imediatamente antes
// de chamar renderStatusList, impedindo a exibicao de um feed incompleto.
test('notifications propagates alert failures without rendering a partial feed', () => {
  const {context, calls} = harness(null);
  assert.throws(() => vm.runInContext('renderNotificationsPage()', context), /map/);
  assert.equal(calls.length, 3);
});

// Confirma no index.html o carregamento unico e sincrono de notifications-page.js antes de app.js.
test('notifications registers once as a synchronous classic script before app initialization', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)];
  const tag = tags.filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tag.length, 1);
  assert.doesNotMatch(tag[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
