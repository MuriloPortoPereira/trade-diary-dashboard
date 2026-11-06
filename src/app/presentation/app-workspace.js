function openAppDialog(options={}){
  const modal=document.getElementById('appDialogModal');
  if(!modal)return false;
  const title=document.getElementById('appDialogTitle');
  const body=document.getElementById('appDialogBody');
  const inputWrap=document.getElementById('appDialogInputWrap');
  const input=document.getElementById('appDialogInput');
  const inputLabel=document.getElementById('appDialogInputLabel');
  const error=document.getElementById('appDialogError');
  const confirmBtn=document.getElementById('appDialogConfirmBtn');
  if(title)title.textContent=options.title||'Confirmar ação';
  if(body)body.textContent=options.message||'';
  if(error)error.textContent='';
  if(inputWrap)inputWrap.style.display=options.input?'block':'none';
  if(inputLabel)inputLabel.textContent=options.inputLabel||'Valor';
  if(input){input.value=options.inputValue||'';input.placeholder=options.inputPlaceholder||'';}
  if(confirmBtn){
    confirmBtn.textContent=options.confirmText||'Confirmar';
    confirmBtn.className=`btn ${options.danger?'btn-danger':'btn-primary'}`;
  }
  appDialogState={...options};
  modal.classList.add('open');
  if(options.input&&input)setTimeout(()=>input.focus(),0);
  return true;
}

function closeAppDialog(){
  document.getElementById('appDialogModal')?.classList.remove('open');
  appDialogState=null;
}

function confirmAppDialog(){
  const state=appDialogState;if(!state)return;
  const input=document.getElementById('appDialogInput');
  const value=state.input?(input?.value||''):'';
  if(state.requiredValue!=null&&value!==state.requiredValue){
    const error=document.getElementById('appDialogError');
    if(error)error.textContent=state.errorText||`Digite ${state.requiredValue} para confirmar.`;
    return;
  }
  const action=state.onConfirm;
  closeAppDialog();
  if(action)action(value);
}

function showAppConfirm(title,message,onConfirm,options={}){
  if(openAppDialog({title,message,onConfirm,confirmText:options.confirmText||'Confirmar',danger:!!options.danger}))return;
  if(confirm(message))onConfirm();
}

function showAppNotice(title,message,options={}){
  if(openAppDialog({title,message,onConfirm:null,confirmText:options.confirmText||'OK',danger:!!options.danger}))return;
  alert(message);
}

function showAppPrompt(title,message,inputValue,onConfirm,options={}){
  if(openAppDialog({title,message,onConfirm,input:true,inputValue,inputLabel:options.inputLabel||'Nome',inputPlaceholder:options.inputPlaceholder||'',confirmText:options.confirmText||'Salvar',danger:!!options.danger,requiredValue:options.requiredValue,errorText:options.errorText}))return;
  const value=prompt(message,inputValue);
  if(value!==null)onConfirm(value);
}

function renderTopbarValue(id){
  const item=topbarValueCache[id];
  const el=document.getElementById(id);
  if(!item||!el)return;
  const value=topbarDensity==='compact'?item.compact:item.full;
  el.textContent=value;
  el.title=item.full;
  setTopbarClass(el,item.baseClass,item.cls);
}

function renderTopbarAccount(){
  const a=getActiveAccount();
  if(!a)return;
  const dot=document.getElementById('acctDot');
  const name=document.getElementById('acctPillName');
  const type=document.getElementById('acctPillType');
  if(dot)dot.style.background=a.color;
  if(name)name.textContent=a.name;
  if(type)type.textContent=acctTypeLabel(a.type);
}

function updateTopbarStats(options={}){
  const shouldFit=options.fit!==false;
  const a=getActiveAccount();
  const acctTrades=getAccountTrades(a.id);
  const risk=calcAccountRiskState(a,acctTrades);
  const now=new Date();
  const ws=new Date(now);ws.setDate(now.getDate()-now.getDay());
  const weekPnl=acctTrades.filter(t=>{if(!t.date)return false;return new Date(t.date+'T12:00')>=ws;}).reduce((s,t)=>s+(t.pnl||0),0);
  const monthPnl=acctTrades.filter(t=>{if(!t.date)return false;const d=new Date(t.date+'T12:00');return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();}).reduce((s,t)=>s+(t.pnl||0),0);
  const setSub=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text;};
  const pct=(v)=>risk.capitalBase?(v/risk.capitalBase)*100:0;
  setTopbarValue('tbWeek',{full:formatSignedMoney(weekPnl)},weekPnl>=0?'g':'r');
  setSub('tbWeekSub',formatTopbarSignedPct(pct(weekPnl),1));
  setTopbarValue('tbMonth',{full:formatSignedMoney(monthPnl)},monthPnl>=0?'g':'r');
  setSub('tbMonthSub',formatTopbarSignedPct(pct(monthPnl),1));
  setTopbarValue('tbDD',{full:fR(risk.currentDdUsd)},risk.currentDdUsd>0?'r':'g');
  setSub('tbDDSub',`${(risk.currentDdPct*100).toFixed(1)}%`);
  const goalDonePct=risk.goalTarget>0?clamp(risk.totalPnl/risk.goalTarget*100,0,100):0;
  const goalCfg=topbarGoalPctLabel(a.goalPct||0);
  setTopbarValue('tbGoal',{full:`${goalDonePct.toFixed(0)}%`},goalDonePct>=100?'g':'y');
  setSub('tbGoalSub',`${fR(Math.max(risk.totalPnl,0))}/${fR(risk.goalTarget)}`);
  setTopbarValue('topBadge',{full:fR(risk.currentBalance)},risk.totalPnl>=0?'green':'red','tb-badge');
  if(shouldFit)fitTopbarDensity();
}

function openModal(id,tradeId=null){
  if(id==='tradeModal'&&showLogAccountEditLockNotice(tradeId?'editar':'adicionar'))return false;
  editingId=tradeId;
  document.getElementById(id).classList.add('open');
  if(id==='tradeModal'){
    populateSelects();
    if(tradeId){
      const t=trades.find(x=>x.id===tradeId);
      resetForm();
      if(t)fillForm(t);
    } else {
      resetForm();
      document.getElementById('t-date').value=new Date().toISOString().split('T')[0];
      updateTradeDurationField();
    }
    updateTradeModalFlowUI();
  }
  if(id==='accountModal'){
    renderAccountList();
    document.getElementById('accountForm').style.display='none';
  }
}

function closeModal(id){
  document.getElementById(id).classList.remove('open');
  if(id==='tradeModal')clearBulkIncompleteFlow();
}

function refreshAll(){
  const active=document.querySelector('.page.active');
  const id=active?.id?.replace('page-','')||'dashboard';
  ({dashboard:renderDashboard,log:renderLog,calendar:renderCalendar,stats:renderStats,psych:renderPsych,setup:renderSetup,premarket:renderPremarket,strategyHub:renderStrategyHub,studyHub:renderStudyHub,documents:renderDocumentsPage,notifications:renderNotificationsPage,accounts:renderAccountsPage,partners:renderPartnersPage,profile:renderProfilePage}[id]||(() => {}))();
  const a=getActiveAccount();
  syncAccountBalanceChrome(a,getAccountTrades(a.id));
  updateTopbarStats();
  updateIncompleteBanner();
}

function toggleSidebar(force){
  const sidebar=document.getElementById('sidebar');
  const overlay=document.getElementById('sidebar-overlay');
  if(!sidebar||!overlay)return;
  const nextState=typeof force==='boolean' ? force : !sidebar.classList.contains('open');
  sidebar.classList.toggle('open',nextState);
  overlay.classList.toggle('show',nextState);
}

function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+id)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>{if(n.getAttribute('onclick')?.includes("'"+id+"'"))n.classList.add('active');});
  if(id==='dashboard'){const sel=document.getElementById('dashPeriod');if(sel)sel.value='all';}
  if(id==='stats'&&document.getElementById('statTab-simulation')?.style.display==='block')resetSimulationEntryDefaults();
  ({dashboard:renderDashboard,log:renderLog,calendar:renderCalendar,stats:renderStats,psych:renderPsych,setup:renderSetup,premarket:renderPremarket,strategyHub:renderStrategyHub,studyHub:renderStudyHub,documents:renderDocumentsPage,notifications:renderNotificationsPage,accounts:renderAccountsPage,partners:renderPartnersPage,profile:renderProfilePage}[id]||(() => {}))();
  toggleSidebar(false);
}


let topbarDensity='full';

const topbarValueCache={};

function formatTopbarMoneyCompact(value){
  const n=Number(value)||0;
  const abs=Math.abs(n);
  const sign=n<0?'-':'';
  const compact=v=>v.toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:1});
  if(abs>=1000000)return `${sign}$${compact(abs/1000000)}M`;
  if(abs>=1000)return `${sign}$${compact(abs/1000)}K`;
  return `${sign}${fR(abs)}`;
}

function formatTopbarSignedCompactMoney(value){
  const n=Number(value)||0;
  return `${n>=0?'+':'-'}${formatTopbarMoneyCompact(Math.abs(n))}`;
}

function formatTopbarSignedPct(value, digits=1){
  const n=Number(value)||0;
  return `${n>=0?'+':''}${n.toFixed(digits)}%`;
}

function topbarGoalPctLabel(value){
  const n=Number(value||0);
  return Number.isInteger(n)?n.toFixed(0):n.toFixed(1);
}

function setTopbarClass(el, base, cls){
  if(!el)return;
  el.className=[base,cls||''].filter(Boolean).join(' ');
}

function setTopbarValue(id, values, cls='', baseClass='tb-stat-val'){
  topbarValueCache[id]={full:values.full,compact:values.compact||values.full,cls,baseClass};
  renderTopbarValue(id);
}

function applyTopbarDensity(){
  Object.keys(topbarValueCache).forEach(renderTopbarValue);
}

function fitTopbarDensity(){
  applyTopbarDensity();
}

function bindWorkspaceEvents(){
  document.addEventListener('dragover',e=>e.preventDefault());
  document.addEventListener('drop',e=>{
    e.preventDefault();
    const files=Array.from(e.dataTransfer.files);
    if(!files.length)return;
    const f=files[0];
    if(f.name.endsWith('.json')){importJSON({target:{files}});return;}
    if(f.name.endsWith('.xlsx')||f.name.endsWith('.html')||f.name.endsWith('.htm')){handleMT5Upload({target:{files:[f]}});return;}
    handleCSVUpload({target:{files}});
  });

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      if(document.getElementById('appDialogModal')?.classList.contains('open'))closeAppDialog();
      document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));
      clearSelection();
      toggleSidebar(false);
    }
    if((e.ctrlKey||e.metaKey)&&e.key==='n'){e.preventDefault();openModal('tradeModal');}
    if(e.key==='Delete'&&selectedTrades.size>0){bulkDelete();}
  });
}
