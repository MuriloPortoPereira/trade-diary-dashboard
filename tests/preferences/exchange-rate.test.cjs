/*
 * Objetivo do arquivo:
 *   Validar o modulo de cotacao USD/BRL: definicao manual com validacao e
 *   arredondamento (setCotacao), busca assincrona com controle de spinner e falha
 *   silenciosa (fetchCotacao), inicializacao com agendamento recorrente (initCotacao)
 *   e ordem de carregamento do script no index.html.
 *
 * Modulo/arquivo testado:
 *   src/modules/preferences/infrastructure/exchange-rate.js (com deteccao de
 *   fallback para declaracoes legadas em app.js).
 *
 * Estrategia de isolamento:
 *   Carrega o modulo em uma sandbox node:vm com localStorage em memoria (Map),
 *   nos DOM simulados para inputs/badges/botao de atualizar, fetch substituivel,
 *   setInterval capturado e hooks opcionais do StudyHub (sh_hubSetCot / hubSetCot).
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Valores abaixo do piso valido (ex.: '0.5') sao ignorados; valores validos
 *     sao arredondados para 2 casas decimais, persistidos em 'appCotacao',
 *     refletidos nos inputs/badge e propagados ao StudyHub com precedencia sh_hubSetCot > hubSetCot.
 *   - fetchCotacao adiciona e sempre remove a classe 'spinning', mesmo em falha offline,
 *     sem alterar cotacaoAtual em caso de erro.
 *   - initCotacao restaura o valor salvo no input, dispara fetch imediato e agenda
 *     atualizacao automatica a cada 5 minutos (300000 ms).
 *   - Script classico unico carregado antes de bootstrap-app.js e app.js.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/preferences/infrastructure/exchange-rate.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const declarations = appSource.match(/^let cotacaoAtual[^\n]*\nlet cotacaoInterval[^\n]*/m)?.[0];
const functionNames = ['setCotacao', 'fetchCotacao', 'initCotacao'];
const legacyFunctions = functionNames.map(name => appSource.match(new RegExp(`^(?:async )?function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const legacy = declarations && legacyFunctions.every(Boolean);
const source = legacy
  ? `${declarations}\n\n${legacyFunctions.join('\n\n')}`
  : fs.readFileSync(path.join(root, modulePath), 'utf8');

// Monta a sandbox vm com cotacao inicial no localStorage, nos de UI da cotacao,
// implementacao customizavel de fetch, captura de setInterval e qual callback do
// StudyHub ('sh' ou 'hub') estara disponivel em window.
function setup({stored = '5.80', fetchImpl, studyHub = 'sh'} = {}) {
  const calls = [];
  const nodes = {
    cotInput: {value: ''},
    hubCot: {value: ''},
    hubCotBadge: {textContent: ''},
    cotRefreshBtn: {classList: {add: value => calls.push(['add', value]), remove: value => calls.push(['remove', value])}},
  };
  const storage = new Map([['appCotacao', stored]]);
  const sandbox = {
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => { calls.push(['store', key, value]); storage.set(key, String(value)); },
    },
    document: {getElementById: id => nodes[id] ?? null},
    window: {},
    fetch: fetchImpl ?? (async () => ({json: async () => ({USDBRL: {bid: '6.127'}})})),
    setInterval: (callback, delay) => { calls.push(['interval', callback.name, delay]); return 77; },
  };
  if (studyHub === 'sh') sandbox.window.sh_hubSetCot = value => calls.push(['sh', value]);
  if (studyHub === 'hub') sandbox.window.hubSetCot = value => calls.push(['hub', value]);
  const context = vm.createContext(sandbox);
  vm.runInContext(source, context, {filename: legacy ? 'app.js#exchange-rate' : modulePath});
  return {context, calls, nodes, storage};
}

// Verifica setCotacao: rejeita valor fora da faixa ('0.5'), arredonda '5.876' -> 5.88,
// atualiza localStorage/inputs/badge e usa sh_hubSetCot quando presente, com fallback para hubSetCot.
test('setting a quote preserves validation, rounding, storage and StudyHub precedence', () => {
  const current = setup();
  current.context.setCotacao('0.5');
  assert.equal(vm.runInContext('cotacaoAtual', current.context), 5.8);
  current.context.setCotacao('5.876');
  assert.equal(vm.runInContext('cotacaoAtual', current.context), 5.88);
  assert.equal(current.storage.get('appCotacao'), '5.88');
  assert.equal(current.nodes.cotInput.value, '5.88');
  assert.equal(current.nodes.hubCot.value, '5.88');
  assert.equal(current.nodes.hubCotBadge.textContent, 'R$ 5.88');
  assert.deepEqual(current.calls.slice(-2), [['store', 'appCotacao', 5.88], ['sh', 5.88]]);

  const fallback = setup({studyHub: 'hub'});
  fallback.context.setCotacao(6);
  assert.deepEqual(fallback.calls.at(-1), ['hub', 6]);
});

// Testa fetchCotacao em sucesso (bid '6.127' -> 6.13) e em erro de rede (mantem 5.8
// sem rejeitar a Promise), garantindo ciclo completo add/remove da classe 'spinning'.
test('fetch preserves success, silent failure and spinner cleanup', async () => {
  const success = setup();
  await success.context.fetchCotacao();
  assert.equal(vm.runInContext('cotacaoAtual', success.context), 6.13);
  assert.deepEqual(success.calls.filter(call => ['add', 'remove'].includes(call[0])), [
    ['add', 'spinning'], ['remove', 'spinning'],
  ]);

  const failure = setup({fetchImpl: async () => { throw new Error('offline'); }});
  await failure.context.fetchCotacao();
  assert.equal(vm.runInContext('cotacaoAtual', failure.context), 5.8);
  assert.deepEqual(failure.calls, [['add', 'spinning'], ['remove', 'spinning']]);
});

// Garante que initCotacao preenche o input com o valor salvo ('6.25'), agenda fetchCotacao
// a cada 300000 ms (5 minutos) e dispara uma busca imediata (acionando o spinner).
test('initialization restores the input, fetches immediately and schedules five minutes', async () => {
  const current = setup({stored: '6.25'});
  current.context.initCotacao();
  assert.equal(current.nodes.cotInput.value, '6.25');
  assert.deepEqual(current.calls.find(call => call[0] === 'interval').slice(1), ['fetchCotacao', 300000]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(current.calls.some(call => call[0] === 'add'), true);
});

// Confirma no index.html que exchange-rate.js e um unico script classico sincrono
// carregado antes de bootstrap-app.js e app.js.
test('exchange rate remains one synchronous classic script before bootstrap and app.js', () => {
  if (legacy) return;
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf(modulePath) < html.indexOf('src/app/application/bootstrap-app.js'));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
