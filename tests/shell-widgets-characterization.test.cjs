const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const shared=fs.readFileSync(path.join(root,'src/shared/presentation/analysis-widgets.js'),'utf8');
const shell=fs.readFileSync(path.join(root,'src/app/presentation/app-workspace.js'),'utf8');
const sources=[app,shared,shell];
function declaration(name){
  for(const source of sources){
    const fn=source.match(new RegExp(`^function ${name}\\([^]*?^\\}`,'m'));
    if(fn)return fn[0];
    const variable=source.match(new RegExp(`^(?:const|let) ${name}\\s*=[^]*?;(?=\\r?$)`,'m'));
    if(variable)return variable[0];
  }
  throw new Error('Missing '+name);
}
function context(names,globals={}){
  const ctx=vm.createContext(globals);
  vm.runInContext(names.map(declaration).join('\n'),ctx);
  return ctx;
}
const formatters=['f2','fR','fP','fDate','escapeHtml'];
test('formatters preserve number coercion, empty dates and HTML escaping',()=>{
  const ctx=context(formatters);
  assert.equal(vm.runInContext('fR(-12.5)',ctx),'$-12,50');
  assert.equal(vm.runInContext('f2("12.5")',ctx),'12.5');
  assert.equal(vm.runInContext('fP(0.125)',ctx),'12.50%');
  assert.equal(vm.runInContext('fDate("")',ctx),'—');
  assert.equal(vm.runInContext('fDate("2026-04-19")',ctx),'19/04/26');
  assert.equal(vm.runInContext('escapeHtml(null)',ctx),'');
  ctx.input=`<&>"'`;
  assert.equal(vm.runInContext('escapeHtml(input)',ctx),'&lt;&amp;&gt;&quot;&#39;');
});
test('signed equity preserves supplied array and override precedence',()=>{
  const data=[1,-2],ctx=context(['buildSignedEquityDataset'],{data});
  const result=vm.runInContext('buildSignedEquityDataset(data,{borderWidth:9,fill:false})',ctx);
  assert.equal(result.data,data);assert.equal(result.borderWidth,9);assert.equal(result.fill,false);
  assert.equal(result.borderColor,'#22d5ed');
});
test('chart recreation destroys only existing chart and ignores missing canvas',()=>{
  const calls=[],charts={a:{destroy(){calls.push('destroy');}}};
  const ctx=context(['mkChart'],{charts,document:{getElementById:id=>id==='a'?{id}:null},Chart:function(cv,cfg){calls.push([cv.id,cfg]);}});
  vm.runInContext('mkChart("missing",{})',ctx);assert.deepEqual(calls,[]);
  vm.runInContext('mkChart("a",{type:"line"})',ctx);assert.equal(calls[0],'destroy');assert.equal(calls[1][1].type,'line');
});
test('risk tone boundaries and remaining/exceeded presentation are unchanged',()=>{
  const ctx=context([...formatters,'usageTone','formatRiskLimitMeta']);
  for(const [input,expected] of [[0,'safe'],[.599,'safe'],[.6,'warn'],[.85,'danger']]){ctx.input=input;assert.equal(vm.runInContext('usageTone(input)',ctx),expected);}
  assert.equal(vm.runInContext('formatRiskLimitMeta(12,10,2,20)',ctx),'<span class="danger">Excedeu $2,00 (20,00%)</span>');
  assert.equal(vm.runInContext('formatRiskLimitMeta(12,10,0,0)',ctx),'Restante $0,00');
});
test('topbar compact thresholds, signed values and cache fallbacks remain exact',()=>{
  const names=[...formatters,'topbarDensity','topbarValueCache','formatTopbarMoneyCompact','formatTopbarSignedCompactMoney','formatTopbarSignedPct','topbarGoalPctLabel','setTopbarValue','setTopbarClass','renderTopbarValue','applyTopbarDensity','fitTopbarDensity'];
  const target={},ctx=context(names,{document:{getElementById:()=>target}});
  for(const [input,expected] of [[999,'$999,00'],[1000,'$1K'],[-1500,'-$1,5K'],[1000000,'$1M']]){ctx.input=input;assert.equal(vm.runInContext('formatTopbarMoneyCompact(input)',ctx),expected);}
  assert.equal(vm.runInContext('formatTopbarSignedCompactMoney(-1500)',ctx),'-$1,5K');
  assert.equal(vm.runInContext('formatTopbarSignedPct(0)',ctx),'+0.0%');
  vm.runInContext('setTopbarValue("x",{full:"complete",compact:""},"safe");topbarDensity="compact";fitTopbarDensity()',ctx);
  assert.deepEqual(target,{textContent:'complete',title:'complete',className:'tb-stat-val safe'});
});
function bind(ctx){
  const tooltip=app.match(/\(function\(\)\{\n  if\(typeof document===['"]undefined['"][^]*?^\}\)\(\);/m)?.[0];
  if(tooltip)vm.runInContext(tooltip,ctx);
  else vm.runInContext(declaration('initializeMetricTooltips')+'\ninitializeMetricTooltips()',ctx);
}
test('tooltip initializer remains guarded when no body exists',()=>{bind(vm.createContext({document:{body:null}}));});
test('tooltip registers mouse listeners and keeps fixed-position behavior',()=>{
  const listeners={},floating={style:{},offsetWidth:230,offsetHeight:100,classList:{add(){},remove(){}}};
  const ctx=vm.createContext({window:{innerWidth:300},clearTimeout(){},setTimeout(){return 1;},document:{body:{appendChild(node){assert.equal(node,floating);}},createElement(){return floating;},addEventListener(name,fn){listeners[name]=fn;}}});
  bind(ctx);assert.deepEqual(Object.keys(listeners),['mouseover','mouseout']);
  const icon={querySelector(){return {innerHTML:'tooltip'};},getBoundingClientRect(){return {top:1,bottom:20,left:290,width:10};}};
  listeners.mouseover({target:{closest(){return icon;}}});
  assert.equal(floating.innerHTML,'tooltip');assert.equal(floating.style.top,'28px');assert.equal(floating.style.left,'66px');
});
test('workspace drop and shortcut bindings preserve registration and routing',()=>{
  const listeners={},calls=[],files=[{name:'backup.json'}];
  const ctx=vm.createContext({selectedTrades:new Set(['x']),document:{addEventListener(name,fn){listeners[name]=fn;},getElementById(){return null;},querySelectorAll(){return[];}},importJSON(arg){calls.push(['json',arg.target.files]);},handleMT5Upload(arg){calls.push(['mt5',arg.target.files]);},handleCSVUpload(arg){calls.push(['csv',arg.target.files]);},clearSelection(){calls.push('clear');},toggleSidebar(v){calls.push(v);},openModal(id){calls.push(id);},bulkDelete(){calls.push('delete');}});
  const legacy=app.match(/^document\.addEventListener\('dragover'[^]*?(?=\n\n\n)/m)?.[0];
  if(legacy)vm.runInContext(legacy,ctx);
  else vm.runInContext(declaration('bindWorkspaceEvents')+'\nbindWorkspaceEvents()',ctx);
  assert.deepEqual(Object.keys(listeners),['dragover','drop','keydown']);
  let prevented=0;const event={preventDefault(){prevented++;},dataTransfer:{files}};
  listeners.drop(event);assert.equal(calls[0][0],'json');assert.equal(calls[0][1][0],files[0]);
  files[0]={name:'report.xlsx'};listeners.drop(event);assert.equal(calls[1][0],'mt5');
  files[0]={name:'report.csv'};listeners.drop(event);assert.equal(calls[2][0],'csv');
  listeners.keydown({key:'Escape'});assert.deepEqual(calls.slice(3),['clear',false]);
  listeners.keydown({key:'n',ctrlKey:true,preventDefault(){prevented++;}});assert.equal(calls.at(-1),'tradeModal');
  listeners.keydown({key:'Delete'});assert.equal(calls.at(-1),'delete');assert.equal(prevented,4);
});
