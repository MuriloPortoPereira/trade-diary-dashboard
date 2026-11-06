const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const sizingPath = 'src/modules/simulation/domain/calculate-simulation-sizing.js';
const projectionPath = 'src/modules/simulation/domain/calculate-simulation-projection.js';
const panelPath = 'src/modules/simulation/presentation/simulation-panel.js';
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const declaration = name => app.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0];
function setup(random = () => 0) {
  const math = Object.create(Math);
  math.random = random;
  const context = vm.createContext({Math: math, clamp: (v,min,max) => Math.min(max,Math.max(min,v)), fR: String});
  vm.runInContext(fs.readFileSync(path.join(root,sizingPath),'utf8'),context);
  if(fs.existsSync(path.join(root,projectionPath))) vm.runInContext(fs.readFileSync(path.join(root,projectionPath),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(root,panelPath),'utf8'),context);
  for(const name of ['toSimulationNumber','roundSimulationMoney','calculateSimulationSizing','buildMonteCarloBalanceProjection']) {
    if(declaration(name)) vm.runInContext(declaration(name),context);
  }
  return context;
}
const plain = value => JSON.parse(JSON.stringify(value));
test('plan preserves defaults, clamping, numeric parsing, rounded expectancy and presentation', () => {
  const c=setup();
  assert.equal(c.clampSimulationWinRatePct('100x'),99);
  assert.equal(c.clampSimulationWinRatePct('bad'),55);
  const p=c.buildSimulationPlan({trades:'2x',winRatePct:'60%',rrr:'2R',riskUsd:'10x',goalUsd:'50x',stopUsd:'30x',goalPct:'5',stopPct:3});
  assert.deepEqual(plain(p),{tone:'warn',title:'Plano exige cautela',winsToGoal:3,lossesToStop:3,expectedTradesToGoal:7,expectancyUsd:8,summary:'3 wins até meta (5% / 50). Stop comporta 3 perdas cheias (3% / 30). 7 trades esperados até a meta.'});
  assert.equal(c.buildSimulationPlan().title,'Preencha risco, meta e stop');
  assert.equal(c.buildSimulationPlan({riskUsd:10,goalUsd:10,stopUsd:30,winRatePct:1}).title,'Matemática desfavorável');
  assert.equal(c.buildSimulationPlan({riskUsd:10,goalUsd:10,stopUsd:30,winRatePct:90}).tone,'safe');
});
test('global Monte Carlo wrapper preserves counts, upper median, fractional scenarios and string goal addition', () => {
  let i=0; const c=setup(()=>[0,1,1][i++%3]);
  const p=c.buildMonteCarloBalanceProjection({balance:'100',trades:'1x',winRate:.5,rrr:2,riskUsd:'10',goalUsd:'20',stopUsd:10,scenarioCount:'2.2'});
  assert.deepEqual(plain(p),{labels:[0,1],scenarios:[[100,120],[100,90],[100,90]],medianLine:[100,90],goalBalance:10020,stopBalance:90,probPositive:1,probGoal:0,probStop:2});
  for(const scenarioCount of [0,-1,'bad']) {
    const empty=c.buildMonteCarloBalanceProjection({balance:100,trades:0,goalUsd:20,stopUsd:10,scenarioCount});
    assert.deepEqual(plain(empty.scenarios),[]);
    assert.equal(empty.medianLine.length,2);
    assert.equal(empty.medianLine[0],undefined);
  }
});
test('default scenario count remains 100 and result probabilities remain absolute counts', () => {
  const c=setup();
  const p=c.buildMonteCarloBalanceProjection({balance:100,trades:2,winRate:0,rrr:1,riskUsd:10,goalUsd:20,stopUsd:10});
  assert.equal(p.scenarios.length,100);
  assert.equal(p.probPositive,100);
  assert.equal(p.probGoal,100);
});
test('pure domain accepts injected RNG without DOM, storage or application globals', () => {
  const c=vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(root,sizingPath),'utf8'),c);
  vm.runInContext(fs.readFileSync(path.join(root,projectionPath),'utf8'),c);
  let calls=0;
  const input={balance:100,trades:2,winRate:.5,rrr:1,riskUsd:10,goalUsd:20,stopUsd:10,scenarioCount:2};
  const before=JSON.stringify(input);
  const p=c.TradeDiarySimulationProjection.buildMonteCarloBalanceProjection(input,()=>{calls++;return calls<3?0:1;});
  assert.equal(calls,4);
  assert.equal(JSON.stringify(input),before);
  assert.deepEqual(plain(p.medianLine),[100,110,120]);
  assert.equal(p.probPositive,1);
  assert.equal(p.probGoal,1);
  assert.equal(p.probStop,1);
  assert.equal(c.TradeDiarySimulationProjection.calculateSimulationPlan({riskUsd:10,goalUsd:50,stopUsd:30}).expectedTradesToGoal,50);
});
test('projection loads after sizing and before panel and app as a classic script', () => {
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const scripts=[...html.matchAll(/<script\b([^>]*)\bsrc="([^"]+)"[^>]*>/g)];
  const paths=scripts.map(match=>match[2]);
  assert.equal(paths.filter(value=>value===projectionPath).length,1);
  assert.ok(paths.indexOf(sizingPath)<paths.indexOf(projectionPath));
  assert.ok(paths.indexOf(projectionPath)<paths.indexOf(panelPath));
  assert.ok(paths.indexOf(panelPath)<paths.indexOf('app.js'));
  assert.doesNotMatch(scripts.find(match=>match[2]===projectionPath)[0],/\b(?:async|defer|type="module")\b/);
});
test('panel retains defaults, account context and field adapters', () => {
  const c=setup();
  Object.assign(c,{
    config:{balance:2000}, SIMULATION_ENTRY_DEFAULTS:{riskPct:1,goalPct:5,stopPct:3,rrr:1},
    activeAccountId:'acct', accounts:[{id:'acct',name:'Principal'}],
    getAccountTrades:()=>[],calcAccountRiskState:()=>({currentBalance:1500}),calcMetrics:()=>({closed:[{}],wr:1}),
  });
  assert.equal(c.getSimulationEntryDefaults().balance,2000);
  assert.equal(c.getSimulationEntryDefaults(0).balance,0);
  assert.equal(c.getSimulationAccountSnapshot('manual').riskUsd,20);
  assert.equal(c.getSimulationAccountSnapshot().winRatePct,99);
  assert.equal(c.getSimulationAccountSnapshot().balance,1500);
  const el={value:'110'};
  c.document={getElementById:()=>el};
  c.clampSimulationWinRateInput();assert.equal(el.value,'99');
  el.value='invalid';c.clampSimulationWinRateInput();assert.equal(el.value,'55');
  el.value='';c.clampSimulationWinRateInput();assert.equal(el.value,'');
  c.setSimulationInputValue('field','2.234');assert.equal(el.value,'2.23');
  c.setSimulationInputValue('field','bad');assert.equal(el.value,'2.23');
});
