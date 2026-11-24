const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = ['app.js', 'src/modules/routine/presentation/premarket-page.js'].map(file => fs.readFileSync(path.join(root, file), 'utf8'));
const names = ['openPMMonth','addPMHabit','removePMHabit','movePMHabit','_renderPMHabitManager',
  '_renderPMCorrelCards','shiftPMMonth','togglePMHabit','_updatePMStats','_pmMonthDiscipline','savePM'];
const source = names.map(name => {
  const matches = files.map(text => text.match(new RegExp(`^function ${name}\\([^]*?^\\}`, 'm'))?.[0]).filter(Boolean);
  assert.equal(matches.length, 1, name);
  return matches[0];
}).join('\n');
const plain = value => JSON.parse(JSON.stringify(value));
function setup() {
  const calls = [], cards = [], nodes = Object.fromEntries(['pmNewHabit','pmHabitList','pmCorrelCards','pmDisciplinePct','pmMetaMes','pmDisciplineChart'].map(id => [id, {value:'', innerHTML:'', textContent:''}]));
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : ['2026-02-10T12:00:00.000Z'])); } }
  const c = vm.createContext({Date:FixedDate, config:{pmHabits:['Plano','Revisão']}, preMarketData:{}, pmCurrentMonth:'2026-02', activeAccountId:'a', CHART_OPTS:{},
    document:{getElementById:id=>nodes[id] || null, querySelector:selector=>({classList:{toggle:(...args)=>calls.push(['cell',selector,...args])}})},
    save:()=>calls.push('save'), renderPremarket:()=>calls.push('render'), showPage:page=>calls.push([page,c.pmCurrentMonth]),
    getAccountTrades:()=>[], mkChart:(id,config)=>calls.push(['chart',id,config]),
    escapeHtml:text=>text.replaceAll('<','&lt;'), fR:value=>`R:${value}`, mkCard:card=>{cards.push(card);return card.val;},
  });
  vm.runInContext(source,c);
  return {c,calls,cards,nodes};
}
test('month navigation crosses years, updates state first and retains savePM no-op',()=>{
  const {c,calls}=setup(); c.openPMMonth('2025-12'); c.shiftPMMonth(1);
  assert.equal(c.pmCurrentMonth,'2026-01'); c.shiftPMMonth(-1);
  assert.equal(c.pmCurrentMonth,'2025-12'); assert.equal(c.savePM(),undefined);
  assert.deepEqual(calls,[['premarket','2025-12'],'render','render']);
});
test('habit edits trim, retain array identity and preserve move/splice and effect order',()=>{
  const {c,calls,nodes}=setup(), habits=c.config.pmHabits;
  nodes.pmNewHabit.value=' '; c.addPMHabit(); assert.deepEqual(calls,[]);
  nodes.pmNewHabit.value='  Plano  '; c.addPMHabit();
  c.movePMHabit(0,-1); c.movePMHabit(2,1); assert.equal(calls.length,2);
  c.movePMHabit(1,-1); c.removePMHabit(-1);
  assert.strictEqual(c.config.pmHabits,habits); assert.deepEqual(plain(habits),['Revisão','Plano']);
  assert.equal(nodes.pmNewHabit.value,''); assert.deepEqual(calls,['save','render','save','render','save','render']);
  delete nodes.pmNewHabit; c.addPMHabit(); assert.equal(calls.length,6);
});
test('toggle preserves notes, creates habits and timestamps, saves before cell/stats',()=>{
  const {c,calls}=setup(); c.preMarketData['2026-02-10']={notes:'keep',habits:'old'};
  c._updatePMStats=()=>calls.push('stats'); c.togglePMHabit('2026-02-10',1);
  assert.deepEqual(plain(c.preMarketData['2026-02-10']),{notes:'keep',habits:[false,true],savedAt:'2026-02-10T12:00:00.000Z'});
  assert.deepEqual(calls,['save',['cell','[data-pmcell="2026-02-10-1"]','pm-dot-done',true],'stats']);
  const habits=c.preMarketData['2026-02-10'].habits; c.togglePMHabit('2026-02-10',1);
  assert.strictEqual(c.preMarketData['2026-02-10'].habits,habits); assert.equal(habits[1],false);
  c.document.querySelector=()=>null; c.togglePMHabit('2026-02-11',0);
  assert.deepEqual(plain(c.preMarketData['2026-02-11'].habits),[true,false]);
});
test('discipline keeps calendar-wide and recorded-day denominators distinct',()=>{
  const {c,calls,nodes}=setup(); c.preMarketData={'2026-02-01':{habits:[true,true]},'2026-02-02':{habits:[true,false]},'2026-01-31':{habits:[true,true]}};
  assert.equal(c._pmMonthDiscipline('2026-02'),75); assert.equal(c._pmMonthDiscipline('2024-02'),0);
  c._updatePMStats(); assert.equal(nodes.pmDisciplinePct.textContent,'5%'); assert.equal(nodes.pmMetaMes.textContent,'5%');
  const chart=calls.find(call=>call[0]==='chart')[2]; assert.equal(chart.data.labels.length,28);
  assert.deepEqual(plain(chart.data.datasets[0].data.slice(0,3)),[100,50,0]);
  c.config.pmHabits=[]; c._updatePMStats(); assert.equal(nodes.pmDisciplinePct.textContent,'0%');
});
test('correlation spans months, excludes BE/open and counts sessions rather than trades',()=>{
  const {c,cards}=setup(); c.preMarketData={'2026-01-01':{habits:[true,true]},'2026-02-01':{habits:[true,false]},'2026-02-02':{habits:[false,false]}};
  c.getAccountTrades=()=>[{date:'2026-01-01',status:'WIN',pnl:100},{date:'2026-01-01',status:'LOSS',pnl:-20},{date:'2026-02-01',status:'LOSS',pnl:-10},{date:'2026-02-01',status:'BE',pnl:900},{date:'2026-02-02',status:'OPEN',pnl:900}];
  c._renderPMCorrelCards(); assert.deepEqual(cards.map(card=>card.val),['+R:80 / dia (1 dias)','R:-10 / dia (1 dias)','sem dados']);
});
test('manager escapes labels and preserves boundary guards and inline handlers',()=>{
  const {c,nodes}=setup(); c.config.pmHabits=['<Plano','Revisão']; c._renderPMHabitManager();
  assert.match(nodes.pmHabitList.innerHTML,/&lt;Plano/); assert.match(nodes.pmHabitList.innerHTML,/onclick="movePMHabit\(0,-1\)" disabled/);
  assert.match(nodes.pmHabitList.innerHTML,/onclick="movePMHabit\(1,1\)" disabled/); assert.match(nodes.pmHabitList.innerHTML,/onclick="removePMHabit\(1\)"/);
  delete nodes.pmHabitList; assert.equal(c._renderPMHabitManager(),undefined);
});
