/*
 * Objetivo: Validar a atualizacao do indicador resumido da conta ativa na barra
 * superior (ponto de cor, nome bruto e rotulo do tipo de conta).
 *
 * Modulo/arquivo testado: funcao `renderTopbarAccount` em
 * `src/app/presentation/app-workspace.js` (confirmando remocao da declaracao legada
 * em `app.js`).
 *
 * Estrategia de isolamento: executa `app-workspace.js` em `node:vm` com mocks para os
 * tres nos opcionais do DOM (`acctDot`, `acctPillName`, `acctPillType`),
 * `getActiveAccount` e `acctTypeLabel`.
 *
 * Pontos-chave garantidos: retorno imediato sem conta ativa, imutabilidade do objeto
 * de conta, independencia entre elementos DOM opcionais e ordem sincrona de scripts
 * em `index.html`.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/app/presentation/app-workspace.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function renderTopbarAccount\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

/*
 * Helper de renderizacao em sandbox: cria os nos DOM configurados em `visible`,
 * registra cada acesso em `calls`, executa `renderTopbarAccount()` e devolve os nos
 * finais e o historico de chamadas.
 */
function render(account, visible = ['acctDot', 'acctPillName', 'acctPillType']) {
  const nodes = Object.fromEntries(visible.map(id => [id, {
    style: {background: 'before'},
    textContent: 'before',
  }]));
  const calls = [];
  const context = vm.createContext({
    document: {getElementById(id) { calls.push(['target', id]); return nodes[id] ?? null; }},
    getActiveAccount() { calls.push(['account']); return account; },
    acctTypeLabel(value) { calls.push(['type', value]); return `TYPE:${value}`; },
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#renderTopbarAccount' : modulePath});
  vm.runInContext('renderTopbarAccount()', context);
  return {nodes, calls};
}

/*
 * Guarda sem conta ativa: quando `getActiveAccount()` devolve `null`, a funcao
 * encerra antes de consultar qualquer elemento da topbar ou formatar tipo.
 */
test('missing active account returns before accessing topbar elements', () => {
  const {calls} = render(null);
  assert.deepEqual(calls, [['account']]);
});

/*
 * Atualizacao completa: aplica a cor de fundo no ponto, escreve o nome literal em
 * `textContent` (sem escape manual), preenche o tipo formatado na ordem esperada e
 * nao muta o objeto original.
 */
test('topbar account preserves color, raw name, type label and source object', () => {
  const account = {id: 'a', color: '#123456', name: 'Conta <Principal>', type: 'prop_pct'};
  const before = JSON.stringify(account);
  const {nodes, calls} = render(account);
  assert.equal(nodes.acctDot.style.background, '#123456');
  assert.equal(nodes.acctPillName.textContent, 'Conta <Principal>');
  assert.equal(nodes.acctPillType.textContent, 'TYPE:prop_pct');
  assert.deepEqual(calls.filter(call => call[0] === 'target').map(call => call[1]), ['acctDot', 'acctPillName', 'acctPillType']);
  assert.deepEqual(calls.filter(call => call[0] === 'type'), [['type', 'prop_pct']]);
  assert.equal(JSON.stringify(account), before);
});

/*
 * Elementos opcionais independentes: com apenas `acctDot` no DOM, `acctTypeLabel` nao
 * e chamado; com apenas `acctPillType`, somente o rotulo de tipo e calculado e
 * preenchido.
 */
test('topbar targets remain independently optional', () => {
  const account = {color: 'red', name: 'Conta', type: 'crypto'};
  const dotOnly = render(account, ['acctDot']);
  assert.equal(dotOnly.nodes.acctDot.style.background, 'red');
  assert.equal(dotOnly.calls.some(call => call[0] === 'type'), false);

  const typeOnly = render(account, ['acctPillType']);
  assert.equal(typeOnly.nodes.acctPillType.textContent, 'TYPE:crypto');
  assert.deepEqual(typeOnly.calls.filter(call => call[0] === 'type'), [['type', 'crypto']]);
});

/*
 * Contrato de carregamento: assegura que `app-workspace.js` e carregado uma vez de
 * forma sincrona em `index.html` antes de `accounts-workspace.js` e `app.js`.
 */
test('account summary loads once as a synchronous classic script before accounts page', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src/modules/accounts/presentation/accounts-workspace.js'));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
