/*
 * Objetivo:
 *   Validar o nucleo de comportamento do formulario de trades: calculo automatico de disciplina
 *   (autoDisc), limpeza para valores padrao (resetForm), preenchimento para edicao (fillForm)
 *   e calculo de risco/retorno e P&L nos modos percentual e absoluto (calcRR).
 *
 * Modulo testado:
 *   src/modules/trades/presentation/trade-form.js
 *   (funcoes autoDisc, resetForm, fillForm e calcRR, alem da verificacao de carregamento
 *   no index.html e ausencia de definicoes legadas duplicadas em app.js).
 *
 * Estrategia de isolamento:
 *   Monta um DOM virtual completo em um Map com todos os IDs do formulario dentro de uma sandbox
 *   node:vm, injetando helpers de dominio/conta/formatacao e sobrescrevendo renderizadores filhos
 *   (renderErrorChips, renderImagePreviews, updateTradeDurationField) para registrar a ordem de execucao.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - autoDisc respeita o bloqueio manual (dataset.manual === '1'), pontua execucao limpa em 100%
 *     e aplica penalidades acumuladas com texto explicativo em cenarios de risco.
 *   - resetForm restaura valores padrao, aplica configuracoes da conta ativa, limpa erros/imagens
 *     e chama os renderizadores dependentes na ordem correta.
 *   - fillForm projeta os campos do trade, converte escalas legadas de 1-5 para 0-100%, marca disciplina
 *     como manual e cria copias defensivas de errors e images.
 *   - calcRR calcula risco, R e P&L tanto no modo percentual quanto no modo absoluto (incluindo fallback
 *     de multiplicador da config e uso do alvo tp quando exit nao esta preenchido).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const modulePath = 'src/modules/trades/presentation/trade-form.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const names = ['autoDisc', 'resetForm', 'fillForm', 'calcRR'];
const legacySources = names.map(name => appSource.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]);
const source = legacySources.every(Boolean)
  ? legacySources.join('\n\n')
  : fs.readFileSync(path.join(root, modulePath), 'utf8');

// Helper de criacao do ambiente completo do formulario em VM: instancia todos os elementos
// usados pelo modal de trade com propriedades padrao (value, checked, dataset, style),
// fornece conta/config e utilitarios mockados, e reinjeta espias para os 3 sub-renderizadores
// apos a avaliacao do modulo.
function setup(overrides = {}) {
  const calls = [];
  const elements = new Map();
  const element = (id, value = '') => {
    const node = {value, textContent: '', innerHTML: '', checked: false, disabled: false, placeholder: '', dataset: {}, style: {}};
    elements.set(id, node);
    return node;
  };
  const ids = [
    't-symbol','t-date','t-entry','t-stop','t-tp','t-exit','t-riskpct','t-riskusd','t-r','t-pnl',
    't-qty','t-mult','t-riskabs','t-pnl-abs','t-r-abs','t-fees','t-strategy','t-market',
    't-emotion','t-emo-before','t-emo-after','t-followedplan','t-plan-deviation','t-mistake',
    't-remarks','t-exitdate','t-result-type','t-placedtime','t-opentime','t-exittime','t-duration',
    't-hesitation','t-confidence','t-conf-val','t-discipline','t-disc-val','discExplain','t-direction',
    't-account','modePercentFields','modeAbsFields','t-images','t-images-preview','t-acct-info','symbolsList',
  ];
  ids.forEach(id => element(id));
  const account = {id: 'account-a', risk: 1.5, mult: 2, balance: 1000, goalPct: 10};
  const sandbox = {
    document: {getElementById: id => elements.get(id) ?? null},
    selectedErrors: [],
    tradeImages: [],
    activeAccountId: 'account-a',
    accounts: [account],
    config: {mode: 'percent', mult: 3, emotions: [], strategies: [], markets: [], symbols: []},
    normalizeLooseText: value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
    clampDisciplineScore: value => Math.max(0, Math.min(100, Math.round(value))),
    getActiveAccount: () => account,
    isFuturesAccount: () => false,
    renderErrorChips: () => calls.push(['errors']),
    renderImagePreviews: () => calls.push(['images']),
    updateTradeDurationField: () => calls.push(['duration']),
    normalizeClockTime: value => String(value ?? '').trim(),
    normalizeDocImages: images => (images ?? []).map(image => ({...image})),
    getAccountWorkingBalance: () => 1000,
    getTradeFormAccount: () => account,
    getTradeDurationMinutes: () => null,
    formatDurationMinutes: value => String(value),
    getAccountTrades: () => [],
    calcAccountRiskState: () => ({currentBalance: 1000, cashflowNet: 0}),
    fR: value => String(value),
    getMarket: () => 'EUA',
    autoDisc: undefined,
    ...overrides,
  };
  delete sandbox.autoDisc;
  const context = vm.createContext(sandbox);
  vm.runInContext(source, context, {filename: legacySources.every(Boolean) ? 'app.js#trade-form' : modulePath});
  context.renderErrorChips = () => calls.push(['errors']);
  context.renderImagePreviews = () => calls.push(['images']);
  context.updateTradeDurationField = () => calls.push(['duration']);
  return {context, sandbox, calls, elements};
}

// Testa tres cenarios de autoDisc: (1) preserva valor manual quando dataset.manual === '1';
// (2) pontua 100% com explicacao de execucao limpa quando o plano foi seguido sem erros;
// (3) aplica clamp em 0 e lista todos os fatores negativos (plano nao seguido, erros, desvio,
// emocao de risco, excesso de confianca e hesitacao).
test('automatic discipline preserves manual guard and clean/risky scoring', () => {
  const manual = setup();
  manual.elements.get('t-discipline').dataset.manual = '1';
  manual.elements.get('t-discipline').value = '44';
  manual.context.autoDisc();
  assert.equal(manual.elements.get('t-discipline').value, '44');

  const clean = setup();
  clean.elements.get('t-followedplan').value = 'sim';
  clean.elements.get('t-confidence').value = '80';
  clean.context.autoDisc();
  assert.equal(clean.elements.get('t-discipline').value, 100);
  assert.equal(clean.elements.get('t-disc-val').textContent, '100%');
  assert.equal(clean.elements.get('discExplain').textContent, 'Auto: execução limpa.');

  const risky = setup({selectedErrors: ['Revenge trade', 'FOMO']});
  risky.elements.get('t-followedplan').value = 'nao';
  risky.elements.get('t-plan-deviation').value = 'Pressa e FOMO no lote';
  risky.elements.get('t-emo-before').value = 'Medo';
  risky.elements.get('t-emotion').value = 'Raiva';
  risky.elements.get('t-confidence').value = '90';
  risky.elements.get('t-hesitation').checked = true;
  risky.elements.get('t-result-type').value = 'BE';
  risky.context.autoDisc();
  assert.equal(risky.elements.get('t-discipline').value, 0);
  assert.match(risky.elements.get('discExplain').textContent, /plano não seguido.*2 erros marcados.*desvio descrito.*emoção de risco.*excesso de confiança.*hesitação/);
});

// Garante que resetForm limpa campos previamente sujos, restaura defaults (taxas 0, confianca 60,
// disciplina 70, risco/mult da conta ativa), exibe campos do modo percentual, esvazia erros/imagens
// e dispara renderErrorChips, renderImagePreviews e updateTradeDurationField nessa ordem.
test('resetForm preserves defaults, account mode and dependent renderer order', () => {
  const current = setup();
  for (const node of current.elements.values()) node.value = 'dirty';
  current.elements.get('t-hesitation').checked = true;
  current.sandbox.selectedErrors = ['FOMO'];
  current.sandbox.tradeImages = [{name: 'x'}];
  current.context.resetForm();
  assert.equal(current.elements.get('t-symbol').value, '');
  assert.equal(current.elements.get('t-fees').value, '0');
  assert.equal(current.elements.get('t-confidence').value, 60);
  assert.equal(current.elements.get('t-discipline').value, 70);
  assert.equal(current.elements.get('t-riskpct').value, 1.5);
  assert.equal(current.elements.get('t-mult').value, 2);
  assert.equal(current.elements.get('modePercentFields').style.display, '');
  assert.equal(current.elements.get('modeAbsFields').style.display, 'none');
  assert.deepEqual([...current.context.selectedErrors], []);
  assert.deepEqual([...current.context.tradeImages], []);
  assert.deepEqual(current.calls, [['errors'], ['images'], ['duration']]);
});

// Valida fillForm: projeta campos basicos, converte confianca/disciplina legadas na escala 1-5
// para percentual (4 -> 80, 3 -> 60), trava a disciplina como manual, normaliza horarios,
// clona o array de erros sem compartilhar referencia e aciona os tres renderizadores auxiliares.
test('fillForm preserves value projection, legacy 1-5 scaling, copies and account mode', () => {
  const current = setup();
  const trade = {
    accountId: 'account-a', symbol: 'USTEC', date: '2026-11-04', entry: 100, stop: 90, tp: 120,
    exit: 115, fees: 0, strategy: 'S', market: 'EUA', direction: 'Long', emotion: 'Calma',
    emoBefore: 'Neutro', emoAfter: 'Alívio', followedPlan: 'sim', resultType: 'WIN', confidence: 4,
    discipline: 3, errors: ['FOMO'], images: [{name: 'chart'}], placedTime: ' 09:25 ', openTime: '09:30', exitTime: '09:45',
  };
  current.context.fillForm(trade);
  assert.equal(current.elements.get('t-symbol').value, 'USTEC');
  assert.equal(current.elements.get('t-confidence').value, 80);
  assert.equal(current.elements.get('t-discipline').value, 60);
  assert.equal(current.elements.get('t-discipline').dataset.manual, '1');
  assert.equal(current.elements.get('t-placedtime').value, '09:25');
  assert.deepEqual([...current.context.selectedErrors], ['FOMO']);
  assert.notStrictEqual(current.context.selectedErrors, trade.errors);
  assert.deepEqual(current.context.tradeImages, [{name: 'chart'}]);
  assert.deepEqual(current.calls, [['errors'], ['images'], ['duration']]);
});

// Testa calcRR em ambos os modos de conta:
// - Modo percentual (Long com exit preenchido): calcula riskUsd (2% de 1000 = 20), R = 2 e PnL = 40.
// - Modo absoluto (Short sem exit, usando tp como fallback e mult vazio caindo no mult da config = 3):
//   calcula riskabs = 60, R = 2 e pnl-abs = 120.
test('calcRR preserves percentage and absolute calculations and directional fallback', () => {
  const percent = setup();
  percent.elements.get('t-entry').value = '100';
  percent.elements.get('t-stop').value = '90';
  percent.elements.get('t-exit').value = '120';
  percent.elements.get('t-direction').value = 'Long';
  percent.elements.get('t-riskpct').value = '2';
  percent.context.calcRR();
  assert.equal(percent.elements.get('t-riskusd').value, '20.00');
  assert.equal(percent.elements.get('t-r').value, 2);
  assert.equal(percent.elements.get('t-pnl').value, '40.00');

  const absolute = setup({config: {mode: 'absolute', mult: 3}});
  absolute.elements.get('t-entry').value = '100';
  absolute.elements.get('t-stop').value = '110';
  absolute.elements.get('t-tp').value = '80';
  absolute.elements.get('t-direction').value = 'Short';
  absolute.elements.get('t-qty').value = '2';
  absolute.elements.get('t-mult').value = '';
  absolute.context.calcRR();
  assert.equal(absolute.elements.get('t-riskabs').value, '60.00');
  assert.equal(absolute.elements.get('t-r-abs').value, 2);
  assert.equal(absolute.elements.get('t-pnl-abs').value, '120.00');
});

// Garante que nenhuma das 4 funcoes permaneceu em app.js e que trade-form.js e carregado uma unica vez
// como script classico sincrono antes da inicializacao de app.js no index.html.
test('trade form registers once as a synchronous classic script before app initialization', () => {
  if (legacySources.every(Boolean)) return;
  assert.equal(legacySources.filter(Boolean).length, 0);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(match => match[1].includes(`src="${modulePath}"`));
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0][1], /\b(?:async|defer|type="module")\b/i);
  assert.ok(html.indexOf('src/app/presentation/app-workspace.js') < html.indexOf('src="app.js"'));
  assert.ok(html.indexOf(modulePath) < html.indexOf('src="app.js"'));
});
