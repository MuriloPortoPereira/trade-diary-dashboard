/*
 * Objetivo:
 *   Validar o preenchimento dos selects/datalist do formulario de trades e a alternancia
 *   dos chips de erro (populateSelects e toggleTradeError).
 *
 * Modulo testado:
 *   src/modules/trades/presentation/trade-form.js
 *   (funcoes populateSelects e toggleTradeError, alem de verificar a remocao do legado em app.js
 *   e o carregamento sincrono no index.html).
 *
 * Estrategia de isolamento:
 *   Carrega o script de apresentacao em uma sandbox node:vm com mocks de config, accounts,
 *   activeAccountId, selectedErrors, document.getElementById e espias para onAccountChange,
 *   renderErrorChips e autoDisc (reaplicados apos runInContext para interceptar chamadas internas).
 *
 * Pontos-chave e regras criticas garantidas:
 *   - populateSelects preserva a ordem e os rotulos brutos das opcoes, seleciona a conta ativa,
 *     zera selectedErrors e encadeia onAccountChange seguido de renderErrorChips.
 *   - Tolera a ausencia de qualquer select/datalist opcional sem impedir os efeitos finais.
 *   - Quando config.symbols esta ausente, limpa o datalist symbolsList.
 *   - toggleTradeError ignora rotulos em branco sem disparar renderizacao ou recalculo de disciplina.
 *   - toggleTradeError aplica trim, adiciona/remove o erro selecionado e chama renderErrorChips + autoDisc(true).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/trades/presentation/trade-form.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const names = ['populateSelects', 'toggleTradeError'];
const legacyParts = names.map(name => appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const legacy = legacyParts.every(Boolean) ? legacyParts.join('\n\n') : undefined;
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');

// Helper de preparacao do contexto em VM: cria os elementos DOM esperados (excluindo IDs em `missing`),
// popula config com emocoes, estrategias, mercados e simbolos, e registra em `calls` as invocacoes
// a onAccountChange, renderErrorChips e autoDisc. Reinjeta os espias apos executar o arquivo do modulo.
function setup({missing = [], selectedErrors = ['Anterior']} = {}) {
  const ids = ['t-emotion', 't-emo-before', 't-emo-after', 't-strategy', 't-market', 't-account', 'symbolsList'];
  const elements = Object.fromEntries(ids.filter(id => !missing.includes(id)).map(id => [id, {innerHTML: 'old', value: 'old'}]));
  const calls = [];
  const context = vm.createContext({
    config: {
      emotions: ['Calma', 'Medo & foco'],
      strategies: ['Setup A', '<Setup B>'],
      markets: ['EUA', 'B3'],
      symbols: ['US30', 'EURUSD'],
    },
    accounts: [{id: 'a1', name: 'Principal'}, {id: 'a2', name: 'Secundária'}],
    activeAccountId: 'a2',
    selectedErrors,
    document: {getElementById: id => elements[id] ?? null},
    onAccountChange: () => calls.push(['account']),
    renderErrorChips: () => calls.push(['chips']),
    autoDisc: force => calls.push(['discipline', force]),
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#trade-form-options' : modulePath});
  context.renderErrorChips = () => calls.push(['chips']);
  context.onAccountChange = () => calls.push(['account']);
  context.autoDisc = force => calls.push(['discipline', force]);
  return {context, elements, calls};
}

// Fluxo nominal de populateSelects: valida o HTML gerado para emocoes (nos 3 selects), estrategias,
// mercados, contas (com selecao da conta ativa a2) e datalist de simbolos, alem de limpar selectedErrors
// e disparar onAccountChange antes de renderErrorChips.
test('populate selects preserves option order, raw labels and active account', () => {
  const {context, elements, calls} = setup();
  context.populateSelects();
  const emotionOptions = '<option value="">—</option><option>Calma</option><option>Medo & foco</option>';
  assert.equal(elements['t-emotion'].innerHTML, emotionOptions);
  assert.equal(elements['t-emo-before'].innerHTML, emotionOptions);
  assert.equal(elements['t-emo-after'].innerHTML, emotionOptions);
  assert.equal(elements['t-strategy'].innerHTML, '<option value="">— Estratégia —</option><option>Setup A</option><option><Setup B></option>');
  assert.equal(elements['t-market'].innerHTML, '<option value="">— Mercado —</option><option>EUA</option><option>B3</option>');
  assert.equal(elements['t-account'].innerHTML, '<option value="a1">Principal</option><option value="a2">Secundária</option>');
  assert.equal(elements['t-account'].value, 'a2');
  assert.equal(elements.symbolsList.innerHTML, '<option value="US30"><option value="EURUSD">');
  assert.equal(context.selectedErrors.length, 0);
  assert.deepEqual(calls, [['account'], ['chips']]);
});

// Caso de borda sem nenhum dos selects/datalist no DOM: a funcao nao deve lancar erro
// e precisa manter os efeitos colaterais finais (limpeza de selectedErrors, onAccountChange e renderErrorChips).
test('populate tolerates every optional select while retaining final effects', () => {
  const {context, calls} = setup({missing: ['t-emotion', 't-emo-before', 't-emo-after', 't-strategy', 't-market', 't-account', 'symbolsList']});
  context.populateSelects();
  assert.equal(context.selectedErrors.length, 0);
  assert.deepEqual(calls, [['account'], ['chips']]);
});

// Caso de borda quando config.symbols nao esta definido: garante que symbolsList recebe string vazia.
test('missing symbols config retains the empty datalist behavior', () => {
  const {context, elements} = setup();
  delete context.config.symbols;
  context.populateSelects();
  assert.equal(elements.symbolsList.innerHTML, '');
});

// Caso de borda de toggleTradeError com texto composto apenas por espacos: deve ser ignorado
// sem alterar selectedErrors e sem invocar renderErrorChips ou autoDisc.
test('toggle ignores blank labels without rendering or recalculating', () => {
  const {context, calls} = setup();
  context.toggleTradeError('   ');
  assert.deepEqual([...context.selectedErrors], ['Anterior']);
  assert.deepEqual(calls, []);
});

// Valida adicao com trim e remocao de erro existente via toggleTradeError, confirmando que
// cada alternancia re-renderiza os chips e recalcula a disciplina com force = true.
test('toggle trims and adds or removes errors before recalculating discipline', () => {
  const {context, calls} = setup({selectedErrors: ['FOMO', 'Stop']});
  context.toggleTradeError('  Hesitação  ');
  assert.deepEqual([...context.selectedErrors], ['FOMO', 'Stop', 'Hesitação']);
  context.toggleTradeError('FOMO');
  assert.deepEqual([...context.selectedErrors], ['Stop', 'Hesitação']);
  assert.deepEqual(calls, [
    ['chips'], ['discipline', true], ['chips'], ['discipline', true],
  ]);
});

// Verifica remocao do legado em app.js e carregamento unico e sincrono de trade-form.js
// antes de trade-log.js e app.js no index.html.
test('trade form loads once before its dependent presentation components', () => {
  for (const part of legacyParts) assert.equal(part, undefined);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const chipsIndex = scripts.findIndex(script => script.src === 'src/modules/trades/presentation/trade-form.js');
  const optionsIndex = scripts.findIndex(script => script.src === modulePath);
  const noticeIndex = scripts.findIndex(script => script.src === 'src/modules/trades/presentation/trade-log.js');
  const appIndex = scripts.findIndex(script => script.src === 'app.js');
  assert.ok(chipsIndex === optionsIndex && optionsIndex < noticeIndex && noticeIndex < appIndex);
});
