function setupRiskNumber(value,fallback){
  const n=parseFloat(value);
  return Number.isFinite(n)&&n>=0?n:fallback;
}

function readSetupRiskFormValues(){
  const g=id=>document.getElementById(id)?.value||'';
  return {
    balance:g('cfg-balance'),
    goalPct:g('cfg-goal'),
    risk:g('cfg-risk'),
    ddDaily:g('cfg-dd-daily'),
    ddWeekly:g('cfg-dd-weekly'),
    ddMonthly:g('cfg-dd-monthly'),
    ddTotal:g('cfg-dd'),
  };
}

function applySetupRiskToActiveAccount(values={}){
  const acct=getActiveAccount();
  const balance=setupRiskNumber(values.balance,acct?.balance??config.balance??1000);
  const risk=setupRiskNumber(values.risk,acct?.risk??config.risk??1);
  const ddDaily=setupRiskNumber(values.ddDaily,acct?.ddDaily??config.ddDaily??2);
  const ddWeekly=setupRiskNumber(values.ddWeekly,acct?.ddWeekly??config.ddWeekly??5);
  const ddMonthly=setupRiskNumber(values.ddMonthly,acct?.ddMonthly??config.ddMonthly??8);
  const ddTotal=setupRiskNumber(values.ddTotal,acct?.ddTotal??config.dd??10);
  const goalPct=setupRiskNumber(values.goalPct??values.goal,acct?.goalPct??config.goal??10);
  config.balance=balance;
  config.risk=risk;
  config.ddDaily=ddDaily;
  config.ddWeekly=ddWeekly;
  config.ddMonthly=ddMonthly;
  config.dd=ddTotal;
  config.goal=goalPct;
  if(acct){
    acct.balance=balance;
    acct.risk=risk;
    acct.ddDaily=ddDaily;
    acct.ddWeekly=ddWeekly;
    acct.ddMonthly=ddMonthly;
    acct.ddTotal=ddTotal;
    acct.goalPct=goalPct;
    return acct;
  }
  return {balance,risk,ddDaily,ddWeekly,ddMonthly,ddTotal,goalPct};
}

function previewSetupRiskFromForm(){
  const acct=applySetupRiskToActiveAccount(readSetupRiskFormValues());
  if(acct){
    renderSetupRiskSummary();
    syncAccountBalanceChrome(acct,getAccountTrades(acct.id));
    updateTopbarStats({fit:false});
  }
}

function addSetupCashflowToActiveAccount(flow){
  const acct=getActiveAccount();
  if(!acct)return null;
  const entry=addAccountCashflow(acct.id,flow);
  if(entry){renderSetupRiskSummary();renderSetupCashflowList();syncAccountBalanceChrome(acct,getAccountTrades(acct.id));updateTopbarStats();}
  return entry;
}

function addSetupCashflowFromForm(){
  const flow={
    type:document.getElementById('setup-flow-type')?.value||'deposit',
    date:document.getElementById('setup-flow-date')?.value||new Date().toISOString().split('T')[0],
    amount:document.getElementById('setup-flow-amount')?.value||0,
    note:document.getElementById('setup-flow-note')?.value||'',
  };
  const preview=sanitizeAccountCashflow(flow);
  if(!preview){showAppNotice('Movimento inválido','Informe um valor maior que zero.');return;}
  const label=preview.type==='withdrawal'?'Retirada':'Aporte';
  showAppConfirm(`Adicionar ${label}`,`Confirmar ${label.toLowerCase()} de ${fR(preview.amount)} na conta ativa?\n\nData: ${fDate(preview.date)}${preview.note?`\nObservação: ${preview.note}`:''}`,()=>{
    const entry=addSetupCashflowToActiveAccount(preview);
    if(!entry){showAppNotice('Movimento inválido','Informe um valor maior que zero.');return;}
    const amount=document.getElementById('setup-flow-amount');if(amount)amount.value='';
    const note=document.getElementById('setup-flow-note');if(note)note.value='';
    refreshAll();
  },{confirmText:'Confirmar'});
}

function deleteSetupCashflow(flowId){
  const acct=getActiveAccount();
  if(!acct)return;
  const flow=getAccountCashflows(acct).find(item=>item.id===flowId);
  if(!flow)return;
  const label=flow.type==='withdrawal'?'retirada':'aporte';
  showAppConfirm('Excluir movimento',`Excluir ${label} de ${fR(flow.amount)}?\n\nEsta ação atualiza o saldo da conta.`,()=>{
    if(deleteAccountCashflow(acct.id,flowId))refreshAll();
  },{danger:true,confirmText:'Excluir'});
}

function saveConfig(){
  const g=id=>document.getElementById(id)?.value||'';
  applySetupRiskToActiveAccount(readSetupRiskFormValues());
  config.tf=g('cfg-tf')||'5M';
  config.mult=parseFloat(g('cfg-mult'))||config.mult||0.2;
  config.symDefault=g('cfg-sym-default')||'';
  save();refreshAll();showAppNotice('Configurações salvas','✓ Configurações salvas!');
}

function renderSetup(){
  const s=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null)el.value=v;};
  const acct=getActiveAccount();
  s('cfg-balance',acct?.balance??config.balance);
  s('cfg-goal',acct?.goalPct??config.goal??10);
  s('cfg-risk',acct?.risk??config.risk);
  s('cfg-dd-daily',acct?.ddDaily??config.ddDaily??2);
  s('cfg-dd-weekly',acct?.ddWeekly??config.ddWeekly??5);
  s('cfg-dd-monthly',acct?.ddMonthly??config.ddMonthly??8);
  s('cfg-dd',acct?.ddTotal??(config.dd||10));
  s('cfg-tf',config.tf);s('cfg-mult',config.mult||'');
  s('cfg-sym-default',config.symDefault||'');
  const flowDate=document.getElementById('setup-flow-date');if(flowDate&&!flowDate.value)flowDate.value=new Date().toISOString().split('T')[0];
  renderSetupRiskSummary();
  renderSetupCashflowList();
  renderTags('strategy');renderTags('emotion');renderTags('market');
}
