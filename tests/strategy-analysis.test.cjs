const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/analytics/application/strategy-analysis.js';
const names = ['formatStrategyRatio','getStrategySnapshots','getClosedStrategyTradesChronologically','buildStrategyEquitySeries','getStrategyCompareMetricDefs','averageNumber','medianNumber','getStrategyOutcomeStats','getTimingWindowLabel','getDominantTimingWindow','coerceStrategyCompareValue','getStrategyCompareScores','getStrategyMetricWinner'];
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
function declaration(name) {
  const match = app.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'));
  assert.ok(match, `legacy declaration ${name}`);
  return match[0];
}
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');
function harness() {
  const ctx = vm.createContext({activeAccountId: 'active', accounts: [{id: 'active', balance: 1000}, {id: 'other', balance: 2000}], config: {balance: 900},
    getActiveAccount: () => ({balance: 800}), getAccountCapitalBase: acct => acct.balance + 250, fR: value => `$${value.toFixed(2)}`});
  for (const file of ['src/modules/trades/domain/trade-rules.js','src/modules/analytics/domain/calculate-trade-metrics.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
  vm.runInContext(`const timing=TradeDiaryTradeTiming.createTradeTiming(); const {normalizeClockTime,clockToMinutes,formatClockMinutes}=timing;\n${declaration('calcMetrics')}\n${source}`, ctx);
  return ctx;
}
const plain = value => JSON.parse(JSON.stringify(value));

test('empty statistics, finite filtering, ratio formatting and metric definitions preserve defaults', () => {
  const c = harness();
  assert.deepEqual(plain(c.getStrategySnapshots([])), []);
  assert.deepEqual(plain(c.getStrategyOutcomeStats()), {total:0,wins:0,losses:0,bes:0,winRatePct:0,lossRatePct:0,beRatePct:0,avgWinPnl:null,avgLossPnl:null,medianPnl:null,bestPnl:null,worstPnl:null});
  assert.equal(c.averageNumber([1,'3',Infinity,'bad']), 2);
  assert.equal(c.medianNumber([4,'2',1,3,NaN]), 2.5);
  assert.equal(c.averageNumber(null), null);
  assert.equal(c.medianNumber([]), null);
  assert.deepEqual([Infinity,-Infinity,NaN,1.234].map(c.formatStrategyRatio), ['∞','-∞','—','1.23']);
  const defs=c.getStrategyCompareMetricDefs();
  assert.deepEqual(Array.from(defs,d=>d.key), ['n','wr','pnl','avgR','exp','pf','maxDD','recovery']);
  assert.deepEqual(Array.from(defs,d=>d.get({})), [0,0,0,0,0,0,0,0]);
  assert.equal(defs.find(d=>d.key==='pnl').format(-12), '$-12.00');
  assert.equal(defs.find(d=>d.key==='maxDD').get({maxDD:0.12}), 12);
});

test('snapshots include BE in denominators, rank strategies and use the selected capital base', () => {
  const c=harness();
  const trades=[{status:'WIN',strategy:'A',pnl:100,r:2,date:'2026-01-01'},{status:'LOSS',strategy:'A',pnl:-50,r:-1,date:'2026-01-02'},{status:'BE',strategy:'A',pnl:0,r:0},{status:'OPEN',strategy:'A',pnl:999},{status:'WIN',pnl:60}];
  const before=JSON.stringify(trades);
  const rows=c.getStrategySnapshots(trades);
  assert.deepEqual(Array.from(rows,r=>r.name), ['Sem estratégia','A']);
  const a=rows[1];
  assert.equal(a.n,3); assert.equal(a.wins,1); assert.equal(a.wr,(1/3)*100); assert.equal(a.avgR,1/3);
  assert.equal(a.pnl,50); assert.equal(a.best,100); assert.equal(a.lastDate,'2026-01-02'); assert.equal(a.startBal,1250); assert.equal(a.pf,2);
  assert.equal(c.getStrategySnapshots(trades,'other')[1].startBal,2250);
  assert.notEqual(a.trades,trades); assert.equal(a.trades[0],trades[0]); assert.equal(JSON.stringify(trades),before);
});

test('chronological closed trades preserve inputs and equity uses valid capital or fallback with rounding', () => {
  const c=harness();
  const trades=[{id:'later',status:'WIN',date:'2026-01-02',pnl:0.106},{id:'exit',status:'LOSS',date:'2026-01-01',exitTime:'10:00',pnl:-1},{id:'first',status:'BE',date:'2026-01-01',openTime:'9:00',pnl:0},null,{status:'OPEN'}];
  const before=JSON.stringify(trades);
  assert.deepEqual(Array.from(c.getClosedStrategyTradesChronologically(trades),t=>t.id), ['first','exit','later']);
  assert.deepEqual(plain(c.buildStrategyEquitySeries({trades,startBal:100})).points,[100,100,99,99.11]);
  for (const startBal of [0,-1,Infinity,undefined]) assert.deepEqual(plain(c.buildStrategyEquitySeries({startBal})).points,[1000]);
  assert.deepEqual(plain(c.getClosedStrategyTradesChronologically(null)),[]);
  assert.equal(JSON.stringify(trades),before);
  const tied=[{status:'BE',date:'2026-01-01',createdAt:'b'},{status:'BE',date:'2026-01-01',createdAt:'a'}];
  assert.equal(c.getClosedStrategyTradesChronologically(tied)[0],tied[1]);
});

test('outcome statistics distinguish wins, losses and BE and retain numeric coercion', () => {
  const c=harness();
  const row={trades:[{status:'WIN',pnl:20},{status:'WIN',pnl:40},{status:'LOSS',pnl:-10},{status:'BE',pnl:0},{status:'OPEN',pnl:900}]};
  const s=c.getStrategyOutcomeStats(row);
  assert.deepEqual(plain(s),{total:4,wins:2,losses:1,bes:1,winRatePct:50,lossRatePct:25,beRatePct:25,avgWinPnl:30,avgLossPnl:-10,medianPnl:10,bestPnl:40,worstPnl:-10});
});

test('timing windows rank frequency then P/L then earlier time and wrap labels', () => {
  const c=harness();
  const t=(openTime,pnl)=>({openTime,pnl});
  assert.deepEqual(plain(c.getDominantTimingWindow([t('bad',99),null])),{label:'—',count:0,pnl:0});
  assert.deepEqual(plain(c.getDominantTimingWindow([t('09:00',-10),t('09:15',-10),t('10:00',100)])),{label:'09:00-09:29',count:2,pnl:-20});
  assert.equal(c.getDominantTimingWindow([t('09:00',10),t('10:00',20)]).label,'10:00-10:29');
  assert.equal(c.getDominantTimingWindow([t('10:00',20),t('09:00',20)]).label,'09:00-09:29');
  assert.equal(c.getTimingWindowLabel(-1),'23:59-00:28');
  assert.equal(c.getTimingWindowLabel(Infinity),'—');
  assert.equal(c.getTimingWindowLabel(60,60),'01:00-01:59');
});

test('comparison scores preserve negative scales, lower-is-better, ties and Infinity winner asymmetry', () => {
  const c=harness(), higher={get:r=>r.value,better:'higher'}, lower={...higher,better:'lower'};
  const a={name:'A',value:-10},b={name:'B',value:-5};
  assert.deepEqual(Array.from(c.getStrategyCompareScores(higher,a,b)),[0,100]);
  assert.deepEqual(Array.from(c.getStrategyCompareScores(lower,a,b)),[100,0]);
  assert.equal(c.getStrategyMetricWinner(lower,a,b),'A'); assert.equal(c.getStrategyMetricWinner(higher,a,b),'B');
  a.value=b.value=3;
  assert.deepEqual(Array.from(c.getStrategyCompareScores(higher,a,b)),[100,100]); assert.equal(c.getStrategyMetricWinner(higher,a,b),'Empate');
  a.value=b.value=Infinity;
  assert.deepEqual(Array.from(c.getStrategyCompareScores(higher,a,b)),[100,100]); assert.equal(c.getStrategyMetricWinner(higher,a,b),'B');
  a.value=Infinity;b.value=2;
  assert.deepEqual(Array.from(c.getStrategyCompareScores(higher,a,b)),[100,80]);
  a.value=-Infinity;
  assert.deepEqual(Array.from(c.getStrategyCompareScores(higher,a,b)),[0,100]);
  assert.equal(c.coerceStrategyCompareValue(NaN),0); assert.equal(c.coerceStrategyCompareValue(-Infinity,4),-5);
});

test('classic application script declares all thirteen APIs without executing IO', () => {
  const c=vm.createContext({});
  vm.runInContext(source,c);
  for (const name of names) {
    assert.equal(typeof c[name],'function',name);
    assert.equal((source.match(new RegExp(`^function ${name}\\(`,'gm'))||[]).length,1,name);
  }
});
