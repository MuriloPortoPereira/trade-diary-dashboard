const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const files = ['src/modules/trades/application/demo-data.js',
  'src/modules/trades/application/trade-workflows.js', 'src/modules/trades/presentation/trade-log.js',
  'src/modules/trades/presentation/trade-form.js', 'src/modules/analytics/presentation/analytics-workspace.js',
  'src/app/application/load-app-state.js', 'src/modules/trades/domain/trade-rules.js',
  'src/modules/documents/presentation/documents-page.js', 'app.js'];
const sources = files.filter(file => fs.existsSync(path.join(root, file)))
  .map(file => fs.readFileSync(path.join(root, file), 'utf8'));
function declaration(name) {
  for (const source of sources) {
    const match = source.match(new RegExp(`^function ${name}\\([^\\n]*\\}[^\\S\\n]*$`, 'm'))
      || source.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'));
    if (match) return match[0];
  }
  assert.fail(`Missing declaration ${name}`);
}
const names = ['clampDisciplineScore', 'normalizeLooseText', 'createSeededRandom', 'pickSeeded',
  'pickFollowedPlanForImport', 'calculateImportedDiscipline', 'calculateImportedConfidence',
  'buildImportTimingFields', 'ensureAccountByName', 'ensureTickmillAccount', 'getOrderedTrades',
  'getAnchorTradeDate', 'filterByPeriod', 'getSortedTrades', 'normalizeLogDate', 'normalizeLogDateRange',
  'isTradeInLogDateRange', 'getLogDateRangeFromControls', 'getStatsPeriodTrades', 'deleteStrategy',
  'rememberDeletedDefaultStrategy', 'renameStrategy', 'editStrategy', 'strategyUsageCount',
  'normalizeStrategyName', 'tagConfigKey', 'ensureDefaultStrategies', 'getMarket', 'normalizeDocImages',
  'mtTradeStatus', 'recomputeAllIncomplete', 'previewTradeImages', 'removeTradeImage', 'renderDashStrategyBoard'];
function setup(extra = {}) {
  const calls = [];
  const controls = {};
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-11-06T12:00:00Z'])); }
  }
  const context = vm.createContext({Date: FixedDate, config: {strategies: ['Padrão', 'Outra']},
    DEFAULT_STRATEGIES: ['Padrão', 'Nova'], accounts: [], trades: [], activeAccountId: 'a',
    sortState: {col: 'date', dir: 'asc'}, tradeImages: [],
    cleanMTCell: value => String(value ?? '').trim(), normalizeAccount: value => value,
    document: {getElementById: id => controls[id]},
    getAccountTrades: id => context.trades.filter(row => row.accountId === id),
    save: () => calls.push('save'), renderSetup: () => calls.push('render'),
    showAppNotice: (...args) => calls.push(['notice', ...args]),
    showAppConfirm: (...args) => calls.push(['confirm', ...args]),
    showAppPrompt: (...args) => calls.push(['prompt', ...args]),
    renderImagePreviews: () => calls.push('images'),
    getStrategySnapshots: rows => rows, renderStrategyRows: (...args) => calls.push(args),
    ...extra});
  const map = sources.map(source => source.match(/^const MARKET_MAP = \{[^]*?^\};/m)?.[0]).find(Boolean);
  assert.ok(map);
  vm.runInContext([map, ...names.map(declaration)].join('\n'), context);
  return {context, calls, controls};
}
const plain = value => JSON.parse(JSON.stringify(value));

test('seeded import helpers preserve defaults, rounding, branches and account reuse', () => {
  const {context: c} = setup();
  assert.deepEqual([-3, 'invalid', 12, 13, 102].map(c.clampDisciplineScore), [0, 0, 10, 15, 100]);
  assert.equal(c.normalizeLooseText(' AÇÃO '), ' acao ');
  const a = c.createSeededRandom('a'), b = c.createSeededRandom('a');
  assert.equal(a(), 0.27366055827587843);
  b(); assert.equal(a(), b());
  assert.equal(c.pickSeeded(() => 0.7, ['a', 'b', 'c']), 'c');
  assert.equal(c.pickSeeded(null, null), '');
  assert.equal(c.pickFollowedPlanForImport('WIN', () => 0.22), 'parcial');
  assert.equal(c.pickFollowedPlanForImport('LOSS', () => 0.2), 'nao');
  assert.equal(c.calculateImportedDiscipline('sim', 'LOSS', 2, true, () => 0), 40);
  assert.equal(c.calculateImportedConfidence('WIN', 'sim', () => 0), 75);
  assert.equal(c.calculateImportedConfidence('LOSS', 'nao', () => 0), 40);
  const tickmill = c.ensureTickmillAccount();
  assert.equal(tickmill.id, 'tickmill'); assert.equal(tickmill.balance, 3000);
  assert.equal(c.ensureAccountByName('Tíckmill'), tickmill);
  assert.equal(c.accounts.length, 1);
});

test('market rules, media normalization and import timing retain legacy loose behavior', () => {
  const {context: c} = setup({clockToMinutes: value => value ? Number(value.split(':')[0])*60+Number(value.split(':')[1]) : null,
    formatClockMinutes: value => `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`});
  assert.deepEqual(['eurusd.a', 'WINZ26', 'BTCUSD', 'unknown', null].map(c.getMarket), ['Forex', 'B3', 'Crypto', '', '']);
  assert.deepEqual(plain(c.normalizeDocImages([null, {}, {dataUrl:'url'}, {name:'A', dataUrl:'b', extra:1}])), [{name:'imagem',dataUrl:'url'}, {name:'A',dataUrl:'b'}]);
  assert.deepEqual(plain(c.buildImportTimingFields({symbol:'WIN',status:'WIN'}, () => 0)), {placedTime:'09:06',openTime:'09:08',exitTime:'09:14'});
  assert.deepEqual(plain(c.buildImportTimingFields({market:'Forex',status:'OPEN'}, () => 0)), {placedTime:'08:33',openTime:'08:35',exitTime:''});
  assert.deepEqual([null, 0.004, -1, 1].map(c.mtTradeStatus), ['OPEN','BE','LOSS','WIN']);
});

test('trade ordering, period queries and date controls preserve boundaries without mutating input', () => {
  const {context:c, controls} = setup();
  const rows = [{date:'2026-11-06', createdAt:'b'}, {date:'2026-11-05'}, {date:'2026-11-06',createdAt:'a'}, {}];
  assert.deepEqual(plain(c.getOrderedTrades(rows)), [rows[1],rows[2],rows[0]]);
  assert.equal(c.getAnchorTradeDate(rows), '2026-11-06');
  assert.equal(c.getAnchorTradeDate([]), '2026-11-06');
  assert.equal(c.filterByPeriod(rows,'all'), rows);
  assert.equal(c.filterByPeriod(rows,'today').length, 2);
  assert.equal(c.filterByPeriod(rows,'month').length, 3);
  assert.equal(c.filterByPeriod(rows,'year').length, 3);
  assert.equal(c.filterByPeriod(rows,'week').length, 3);
  assert.equal(rows[0].createdAt,'b');
  c.sortState = {col:'createdAt',dir:'desc'};
  assert.equal(c.getSortedTrades(rows)[0], rows[0]);
  assert.equal(c.normalizeLogDate(' 2026-99-99 '), '2026-99-99');
  assert.equal(c.normalizeLogDate('6/11/2026'), '');
  assert.equal(c.isTradeInLogDateRange({}, '', ''), true);
  assert.equal(c.isTradeInLogDateRange({}, '2026-11-01'), false);
  assert.equal(c.isTradeInLogDateRange(rows[1], '2026-11-06', '2026-11-05'), true);
  controls.filterDateStart = {value:'2026-11-06'}; controls.filterDateEnd = {value:'2026-11-05'};
  assert.deepEqual(plain(c.getLogDateRangeFromControls()), {startDate:'2026-11-05',endDate:'2026-11-06'});
  c.accounts = [{id:'a'},{id:'b'}]; c.trades = [{accountId:'a',date:'2026-11-06'},{accountId:'b',date:'2026-11-01'}, {accountId:'a'}];
  controls.statPeriod = {value:'custom'}; controls.statAccount = {value:'all'};
  controls.statDateFrom = {value:'2026-11-06'};
  assert.equal(c.getStatsPeriodTrades().length, 1);
});

test('strategy migration, edits and deletion retain persistence and history semantics', () => {
  const {context:c, calls} = setup();
  assert.equal(c.normalizeStrategyName(' Ação + 2 '), 'acao2');
  assert.equal(c.tagConfigKey('strategy'),'strategies'); assert.equal(c.tagConfigKey('error'),'errors');
  const cfg = c.ensureDefaultStrategies({strategies:['Padrão'], strategys:['Outra','PADRAO'],deletedDefaultStrategies:['Nova']});
  assert.deepEqual(plain(cfg), {strategies:['Padrão','Outra'],deletedDefaultStrategies:['Nova'],strategyDefaultsSeeded:true});
  c.trades = [{accountId:'a',strategy:'Padrão'},{accountId:'b',strategy:'Padrão'},{accountId:'a',strategy:'PADRAO'}];
  assert.equal(c.strategyUsageCount('Padrão'),1);
  assert.equal(c.renameStrategy(0,'Outra'),false); assert.equal(c.renameStrategy(0,'PADRAO'),false);
  assert.equal(c.renameStrategy(0,'Mudou'),true);
  assert.deepEqual(c.trades.map(row=>row.strategy),['Mudou','Mudou','PADRAO']);
  assert.deepEqual(plain(c.config.deletedDefaultStrategies), ['Padrão']);
  c.editStrategy(0); assert.equal(calls.at(-1)[0], 'prompt');
  c.deleteStrategy(0); const confirm = calls.at(-1);
  assert.equal(confirm[0], 'confirm'); assert.equal(c.config.strategies[0], 'Mudou');
  confirm[3](); assert.equal(c.config.strategies[0], 'Outra');
  assert.deepEqual(calls.slice(-2), ['save','render']);
});

test('incomplete recalculation and media actions preserve identity, filters and rendering', () => {
  const {context:c, calls, controls} = setup({calcImportMissingFields: row => row.id === 'ok' ? [] : ['date'],
    FileReader: class {readAsDataURL(file) {this.onload({target:{result:file.url}});}}});
  const ok = {id:'ok'}, bad = {id:'bad'}; c.trades=[ok,bad]; c.recomputeAllIncomplete();
  assert.equal(c.trades[0],ok); assert.notEqual(c.trades[1],bad);
  assert.deepEqual(plain(c.trades[1].missing_fields), ['date']);
  c.previewTradeImages({target:{files:[{type:'image/png',name:'A',url:'data:A'}]}});
  assert.equal(c.tradeImages.length,0);
  controls['t-images-preview']={};
  c.previewTradeImages({target:{files:[{type:'text/plain'},{type:'image/png',name:'A',url:'data:A'}]}});
  assert.deepEqual(plain(c.tradeImages),[{name:'A',dataUrl:'data:A'}]);
  c.removeTradeImage(0); assert.equal(c.tradeImages.length,0); assert.deepEqual(calls,['images','images']);
  const rows=[]; c.renderDashStrategyBoard(rows); assert.deepEqual(calls.at(-1), ['dashStrategyBoard',rows,5]);
});
