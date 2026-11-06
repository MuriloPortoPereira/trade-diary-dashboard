function renderSetupRiskSummary(){
  const acct=getActiveAccount();
  if(!acct)return;
  const risk=calcAccountRiskState(acct,getAccountTrades(acct.id));
  const setText=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
  setText('setupInitialBalance',fR(risk.initialBalance));
  setText('setupCashflowNet',(risk.cashflowNet>=0?'+':'')+fR(risk.cashflowNet));
  setText('setupCurrentBalance',fR(risk.currentBalance));
  setText('setupRiskPerTrade',`${f2(acct.risk||0)}% · ${fR(risk.riskPerTradeUsd)}`);
  setText('setupDailyDdLimit',`${f2(acct.ddDaily||0)}% · ${fR(risk.dayLimit)}`);
  setText('setupWeeklyDdLimit',`${f2(acct.ddWeekly||0)}% · ${fR(risk.weekLimit)}`);
  setText('setupMonthlyDdLimit',`${f2(acct.ddMonthly||0)}% · ${fR(risk.monthLimit)}`);
  setText('setupMaxDdLimit',`${f2(acct.ddTotal||0)}% · ${fR(risk.totalLimit)}`);
}

function renderSetupCashflowList(){
  const el=document.getElementById('setupCashflowList');if(!el)return;
  const acct=getActiveAccount();if(!acct){el.innerHTML='';return;}
  const flows=getAccountCashflows(acct);
  const summary=calcAccountCashflow(acct);
  if(!flows.length){
    el.innerHTML=`<div class="account-cashflow-empty">Nenhum aporte ou retirada na conta ativa.</div>`;
    return;
  }
  el.innerHTML=`
    <div class="account-cashflow-summary">
      <span>Aportes: <b>${fR(summary.deposits)}</b></span>
      <span>Retiradas: <b>${fR(summary.withdrawals)}</b></span>
      <span>Líquido: <b class="${summary.net>=0?'text-green':'text-red'}">${summary.net>=0?'+':''}${fR(summary.net)}</b></span>
    </div>
    ${flows.map(flow=>`
      <div class="account-cashflow-row">
        <span class="${flow.type==='withdrawal'?'text-red':'text-green'}">${flow.type==='withdrawal'?'Retirada':'Aporte'}</span>
        <span class="mono">${fDate(flow.date)}</span>
        <strong>${fR(flow.amount)}</strong>
        <span>${escapeHtml(flow.note||'—')}</span>
        <button class="btn btn-danger btn-sm btn-icon" onclick="deleteSetupCashflow('${flow.id}')">×</button>
      </div>`).join('')}`;
}

function addTag(type){
  const inp=document.getElementById('new'+type.charAt(0).toUpperCase()+type.slice(1));
  const val=inp?.value?.trim();if(!val)return;
  if(type==='strategy')config=ensureDefaultStrategies(config);
  const key=tagConfigKey(type);
  if(!Array.isArray(config[key]))config[key]=[];
  const exists=config[key].some(item=>type==='strategy'
    ? normalizeStrategyName(item)===normalizeStrategyName(val)
    : item===val);
  if(exists){showAppNotice('Item duplicado','Já existe: '+val);return;}
  config[key].push(val);
  inp.value='';save();renderTags(type);
}

function removeTag(type,idx){
  const key=tagConfigKey(type);
  const name=config[key][idx];
  showAppConfirm('Remover item',`Remover "${name}"?`,()=>{
    config[key].splice(idx,1);save();renderTags(type);
  },{danger:true,confirmText:'Remover'});
}

function renderTags(type){
  const el=document.getElementById(type+'Tags');if(!el)return;
  if(type==='strategy')config=ensureDefaultStrategies(config);
  const key=tagConfigKey(type);
  if(!Array.isArray(config[key]))config[key]=[];
  const items=config[key];
  if(type==='strategy'){
    el.innerHTML=items.map((t,i)=>{
      const count=strategyUsageCount(t);
      const title=count?`Excluir da lista (${count} trade(s) usam esta estratégia)`:'Excluir da lista';
      return`<div class="tag strategy-tag"><span>${escapeHtml(t)}</span>${count?`<span class="tag-count">${count}</span>`:''}<button class="tag-edit-btn" onclick="editStrategy(${i})" title="Editar" aria-label="Editar ${escapeHtml(t)}">✎</button><button class="tag-delete-btn" onclick="deleteStrategy(${i})" title="${escapeHtml(title)}" aria-label="Excluir ${escapeHtml(t)}">×</button></div>`;
    }).join('');
  } else {
    el.innerHTML=items.map((t,i)=>`<div class="tag"><span>${escapeHtml(t)}</span><button class="tag-delete-btn" onclick="removeTag('${type}',${i})" title="Excluir" aria-label="Excluir ${escapeHtml(t)}">×</button></div>`).join('');
  }
}

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
