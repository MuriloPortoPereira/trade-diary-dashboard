function syncAccountBalanceChrome(acct=getActiveAccount(), acctTrades=getAccountTrades(acct?.id)){
  if(!acct)return null;
  const risk=calcAccountRiskState(acct,acctTrades);
  const sideBalance=document.getElementById('sideBalance');
  if(sideBalance)sideBalance.textContent=fR(risk.currentBalance); // legado — mantido para compatibilidade
  const sideChange=document.getElementById('sideBalanceChange');
  if(sideChange){
    sideChange.textContent=formatAccountBalanceChange(risk);
    const isNegative=risk.totalPnl<0 || (risk.totalPnl===0 && (risk.cashflowNet||0)<0);
    sideChange.style.color=isNegative?'var(--red)':'var(--green)';
  }
  const sideCount=document.getElementById('sideTradeCount');
  if(sideCount)sideCount.textContent=acctTrades.length;
  return risk;
}

function renderRiskBoard(acct, acctTrades){
  const riskVal=document.getElementById('riskIdealTrade');
  const riskSub=document.getElementById('riskIdealTradeSub');
  const progressEl=document.getElementById('riskProgress');
  const signalsEl=document.getElementById('riskSignals');
  if(!riskVal||!riskSub||!progressEl||!signalsEl)return;

  const period=document.getElementById('dashPeriod')?.value||'all';
  const state=calcAccountRiskState(acct,acctTrades,period);

  // Painel esquerdo — risco ideal com mini-stats
  const dayPnlColor=state.dayPnl>=0?'var(--green)':'var(--red)';
  const totalPnlColor=state.totalPnl>=0?'var(--green)':'var(--red)';
  riskVal.textContent=state.riskLabel;
  riskSub.innerHTML=`
    <div class="risk-ideal-stats">
      <div class="risk-ideal-stat">
        <span>Saldo atual</span>
        <strong>${fR(state.currentBalance)}</strong>
      </div>
      <div class="risk-ideal-stat">
        <span>P/L hoje</span>
        <strong style="color:${dayPnlColor}">${state.dayPnl>=0?'+':''}${fR(state.dayPnl)}</strong>
      </div>
      <div class="risk-ideal-stat">
        <span>P/L total</span>
        <strong style="color:${totalPnlColor}">${state.totalPnl>=0?'+':''}${fR(state.totalPnl)}</strong>
      </div>
      <div class="risk-ideal-stat">
        <span>Ciclo</span>
        <strong>${state.cicloAtual+1} · ${f2(state.goalProgress*100)}%</strong>
      </div>
      <div class="risk-ideal-stat">
        <span>Risco / trade</span>
        <strong>${f2(acct.risk||0)}% · ${fR(state.riskPerTradeUsd)}</strong>
      </div>
    </div>`;

  // helpers de formatação
  const pctOf=(usd,base)=>base>0?` (${f2(usd/base*100)}%)`:' (—%)';

  const totalUsedPct=f2((state.totalUsageRaw||state.totalUsage)*100);
  const totalLimitPct=f2(acct.ddTotal||10);

  // Stop da sessão — hoje
  const barSessao={
    name:'Stop da sessão',tip:TIPS.stopSessao,
    badge:state.dayExcessUsd>0?'EXCEDEU':null,
    value:`${f2((state.dayUsageRaw||state.dayUsage)*100)}% de ${f2(acct.ddDaily||2)}%`,
    left:state.dayExcessUsd>0
      ? `Excedeu ${fR(state.dayExcessUsd)}${pctOf(state.dayExcessUsd,state.capitalBase)}`
      : `Perdido ${fR(state.dayLoss)}${pctOf(state.dayLoss,state.capitalBase)} · Restante ${fR(Math.max(state.dayLimit-state.dayLoss,0))}`,
    right:`Limite ${fR(state.dayLimit)} · P/L hoje ${state.dayPnl>=0?'+':''}${fR(state.dayPnl)}`,
    usage:state.dayUsage,
    tone:state.dayExcessUsd>0?'danger':usageTone(state.dayUsage),
  };

  // Stop da semana — semana corrente dom-sáb
  const barSemana={
    name:'Stop da semana',tip:TIPS.stopSemana,
    badge:state.weekExcessUsd>0?'EXCEDEU':null,
    value:`${f2((state.weekUsageRaw||state.weekUsage)*100)}% de ${f2(acct.ddWeekly||5)}%`,
    left:state.weekExcessUsd>0
      ? `Excedeu ${fR(state.weekExcessUsd)}${pctOf(state.weekExcessUsd,state.capitalBase)}`
      : `Perdido ${fR(state.weekLoss)}${pctOf(state.weekLoss,state.capitalBase)} · Restante ${fR(Math.max(state.weekLimit-state.weekLoss,0))}`,
    right:`Limite ${fR(state.weekLimit)} · P/L semana ${state.weekPnl>=0?'+':''}${fR(state.weekPnl)} · ${state.weekStartLabel}–${state.weekEndLabel}`,
    usage:state.weekUsage,
    tone:state.weekExcessUsd>0?'danger':usageTone(state.weekUsage),
  };

  // Drawdown total
  const barDD={
    name:'Drawdown total',tip:TIPS.ddTotal,
    badge:state.totalExcessUsd>0?'EXCEDEU':null,
    value:`${totalUsedPct}% de ${totalLimitPct}% · DD ${f2(state.currentDdPct*100)}%`,
    left:state.totalExcessUsd>0
      ? `Excedeu ${fR(state.totalExcessUsd)}${pctOf(state.totalExcessUsd,state.ddBase)}`
      : `DD atual ${fR(state.currentDdUsd)}${pctOf(state.currentDdUsd,state.ddBase)} · Saldo ${fR(state.currentBalance)}`
        +(state.cicloAtual>0?` · ciclo ${state.cicloAtual+1}`:''),
    right:`Limite ${fR(state.totalLimit)} · Base ${fR(state.cicloBase)}`,
    usage:state.totalUsage,
    tone:state.totalExcessUsd>0?'danger':usageTone(state.totalUsage),
  };

  // Meta da conta
  const metaFalta=Math.max(state.goalTarget-state.pnlNoCiclo,0);
  const barMeta={
    name:'Meta da conta',tip:TIPS.meta,
    badge:state.goalProgress>=1?'ATINGIDA':null,
    value:`Ciclo ${state.cicloAtual+1} · ${f2(state.goalProgress*100)}% concluído`,
    left:`P/L ciclo ${state.pnlNoCiclo>=0?'+':''}${fR(state.pnlNoCiclo)}${pctOf(Math.abs(state.pnlNoCiclo),state.cicloBase)} · total ${state.totalPnl>=0?'+':''}${fR(state.totalPnl)}`,
    right:metaFalta>0?`Falta ${fR(metaFalta)} · alvo ${fR(state.cicloAlvo)} · +${f2(acct.goalPct||10)}%`:`Meta atingida · próximo alvo ${fR(state.cicloAlvo)}`,
    usage:state.goalProgress,
    tone:state.goalProgress>=1?'safe':'neutral',
  };

  const progressItems=[barSessao, barSemana, barDD, barMeta];

  progressEl.innerHTML=progressItems.map(item=>`
    <div class="risk-progress-item">
      <div class="risk-progress-head">
        <span class="risk-progress-name">${item.name}${item.tip?' '+mkTip(item.tip):''}${item.badge?` <span class="risk-badge risk-badge-${item.tone}">${item.badge}</span>`:''}</span>
        <span class="risk-progress-value risk-progress-value--${item.tone}">${item.value}</span>
      </div>
      <div class="risk-progress-track">
        <div class="risk-progress-fill ${item.tone==='warn'?'warn':item.tone==='danger'?'danger':item.tone==='safe'?'safe':''}" style="width:${Math.max(item.usage*100,4)}%"></div>
      </div>
      <div class="risk-progress-meta">
        <span>${item.left}</span>
        <span>${item.right}</span>
      </div>
    </div>`).join('');

  // Chips de sinais — concisos e com números
  const signals=[
    state.totalExcessUsd>0
      ? {tone:'danger', text:`DD excedeu ${fR(state.totalExcessUsd)} (${f2(state.totalExcessPct)}%)`}
      : state.totalUsage>=0.85
        ? {tone:'warn', text:`DD em ${f2(state.totalUsage*100)}% do limite — atenção`}
        : {tone:'safe', text:`DD ${f2(state.currentDdPct*100)}% · limite ${f2(acct.ddTotal||10)}%`},
    state.dayExcessUsd>0
      ? {tone:'danger', text:`Sessão excedeu limite em ${fR(state.dayExcessUsd)}`}
      : state.dayUsage>=0.8
        ? {tone:'warn', text:`Sessão ${f2(state.dayUsage*100)}% do stop · cuidado`}
        : {tone:'safe', text:`Sessão P/L ${state.dayPnl>=0?'+':''}${fR(state.dayPnl)} · ${f2(state.dayUsage*100)}% do stop`},
    state.weekExcessUsd>0
      ? {tone:'danger', text:`Semana excedeu limite em ${fR(state.weekExcessUsd)}`}
      : state.weekPnl<0
        ? {tone:'warn', text:`Semana ${fR(state.weekPnl)} · ${f2(state.weekUsage*100)}% do stop`}
        : {tone:'safe', text:`Semana +${fR(state.weekPnl)} · stop livre`},
    state.goalProgress>=1
      ? {tone:'safe', text:`Meta do ciclo ${state.cicloAtual+1} atingida`}
      : {tone:'neutral', text:`Meta ${f2(state.goalProgress*100)}% · falta ${fR(metaFalta)}`},
  ];
  signalsEl.innerHTML=signals.map(s=>`<div class="risk-alert-chip ${s.tone}">${s.text}</div>`).join('');
}

function renderAccountCashflowList(){
  const el=document.getElementById('accountCashflowList');if(!el)return;
  const summary=calcAccountCashflow({cashflows:accountFormCashflows});
  if(!accountFormCashflows.length){
    el.innerHTML=`<div class="account-cashflow-empty">Nenhum aporte ou retirada registrada. Saldo atual usa só saldo inicial + P/L.</div>`;
    return;
  }
  el.innerHTML=`
    <div class="account-cashflow-summary">
      <span>Aportes: <b>${fR(summary.deposits)}</b></span>
      <span>Retiradas: <b>${fR(summary.withdrawals)}</b></span>
      <span>Líquido: <b class="${summary.net>=0?'text-green':'text-red'}">${summary.net>=0?'+':''}${fR(summary.net)}</b></span>
    </div>
    ${accountFormCashflows.map((flow,i)=>`
      <div class="account-cashflow-row">
        <span class="${flow.type==='withdrawal'?'text-red':'text-green'}">${flow.type==='withdrawal'?'Retirada':'Aporte'}</span>
        <span class="mono">${fDate(flow.date)}</span>
        <strong>${fR(flow.amount)}</strong>
        <span>${escapeHtml(flow.note||'—')}</span>
        <button class="btn btn-danger btn-sm btn-icon" onclick="removeAccountFormCashflow(${i})">×</button>
      </div>`).join('')}`;
}

function selectAccount(id){
  activeAccountId=id;
  statsAccountPinned=false;
  _incompleteBannerDismissed=false;
  save();
  updateTopbarStats();
  closeModal('accountModal');
  renderTopbarAccount();
  refreshAll();
}

function saveAccount(){
  const g=id=>document.getElementById(id)?.value||'';
  const name=g('af-name').trim();
  if(!name){showAppNotice('Campo obrigatório','Nome da conta é obrigatório.');return;}
  const acct={
    id:editingAccountId||('a'+Date.now()),
    name,type:normalizeAccountType(g('af-type')),color:g('af-color')||'#22d5ed',
    balance:parseFloat(g('af-balance'))||1000,
    risk:parseFloat(g('af-risk'))||1,
    mult:parseFloat(g('af-mult'))||1,
    ddDaily:parseFloat(g('af-dd-daily'))||2,
    ddWeekly:parseFloat(g('af-dd-weekly'))||5,
    ddMonthly:parseFloat(g('af-dd-monthly'))||8,
    ddTotal:parseFloat(g('af-dd-total'))||10,
    goalPct:parseFloat(g('af-goal'))||10,
    goalWeek:parseFloat(g('af-goal-week'))||0,
    goalMonth:parseFloat(g('af-goal-month'))||0,
    goalTotal:parseFloat(g('af-goal-total'))||0,
    cashflows:accountFormCashflows.map(flow=>({...flow})),
  };
  const normalized=normalizeAccount(acct);
  if(editingAccountId){const i=accounts.findIndex(a=>a.id===editingAccountId);if(i>=0)accounts[i]=normalized;} else{accounts.push(normalized);}
  save();renderAccountList();document.getElementById('accountForm').style.display='none';
  updateTopbarStats();renderTopbarAccount();
  renderAccountsPage();
  showAppNotice('Conta salva','✓ Conta salva!');
}

function deleteAccount(id){
  if(accounts.length<=1){showAppNotice('Ação bloqueada','Mantenha pelo menos uma conta.');return;}
  showAppConfirm('Excluir conta','Excluir esta conta?\n\nOs trades associados a ela serão mantidos.',()=>{
    accounts=accounts.filter(a=>a.id!==id);
    if(activeAccountId===id)activeAccountId=accounts[0].id;
    save();renderAccountList();renderTopbarAccount();renderAccountsPage();
  },{danger:true,confirmText:'Excluir'});
}

function newAccount(){
  editingAccountId=null;
  accountFormCashflows=[];
  document.getElementById('acctFormTitle').textContent='Nova Conta';
  ['af-name','af-balance','af-risk','af-mult','af-dd-daily','af-dd-weekly','af-dd-monthly','af-dd-total','af-goal','af-goal-week','af-goal-month','af-goal-total','af-flow-amount','af-flow-note'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('af-type').value='cfd_pct';
  document.getElementById('af-color').value='#22d5ed';
  const flowDate=document.getElementById('af-flow-date');if(flowDate)flowDate.value=new Date().toISOString().split('T')[0];
  document.getElementById('accountForm').style.display='block';
  renderAccountCashflowList();
}

function editAccount(id){
  const a=accounts.find(x=>x.id===id);if(!a)return;
  editingAccountId=id;
  accountFormCashflows=getAccountCashflows(a).map(flow=>({...flow}));
  document.getElementById('acctFormTitle').textContent='Editar Conta';
  const set=(el,v)=>{const e=document.getElementById(el);if(e&&v!=null)e.value=v;};
  set('af-name',a.name);set('af-type',a.type);set('af-color',a.color);
  set('af-balance',a.balance);set('af-risk',a.risk);set('af-mult',a.mult);
  set('af-dd-daily',a.ddDaily);set('af-dd-weekly',a.ddWeekly);set('af-dd-monthly',a.ddMonthly);set('af-dd-total',a.ddTotal);
  set('af-goal',a.goalPct);set('af-goal-week',a.goalWeek);set('af-goal-month',a.goalMonth);set('af-goal-total',a.goalTotal);
  const flowDate=document.getElementById('af-flow-date');if(flowDate&&!flowDate.value)flowDate.value=new Date().toISOString().split('T')[0];
  document.getElementById('accountForm').style.display='block';
  renderAccountCashflowList();
}

function addAccountCashflowFromForm(){
  const entry=sanitizeAccountCashflow({
    type:document.getElementById('af-flow-type')?.value||'deposit',
    date:document.getElementById('af-flow-date')?.value||new Date().toISOString().split('T')[0],
    amount:document.getElementById('af-flow-amount')?.value||0,
    note:document.getElementById('af-flow-note')?.value||'',
  });
  if(!entry){showAppNotice('Movimento inválido','Informe um valor maior que zero.');return;}
  accountFormCashflows.push(entry);
  const amount=document.getElementById('af-flow-amount');if(amount)amount.value='';
  const note=document.getElementById('af-flow-note');if(note)note.value='';
  renderAccountCashflowList();
}

function removeAccountFormCashflow(index){
  accountFormCashflows.splice(index,1);
  renderAccountCashflowList();
}

function onAcctTypeChange(){
  const t=document.getElementById('af-type')?.value;
  const u=document.getElementById('af-risk-unit');
  const m=document.getElementById('af-mult');
  if(u)u.textContent=t==='futures_usd'?'$':'%';
  if(m)m.parentElement.style.display=t==='futures_usd'?'block':'none';
}

function renderAccountList(){
  const el=document.getElementById('accountList');if(!el)return;
  if(!accounts.length){el.innerHTML='<p style="color:var(--muted);font-size:12px">Nenhuma conta cadastrada.</p>';return;}
  el.innerHTML=accounts.map(a=>{const acctTrades=getAccountTrades(a.id);const risk=calcAccountRiskState(a,acctTrades);return`<div style="background:var(--bg2);border:1px solid var(--border2);border-left:3px solid ${a.color};border-radius:8px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px"><div style="flex:1"><div style="font-weight:600;font-size:13px">${a.name}</div><div style="font-size:10px;color:var(--muted);margin-top:2px">${acctTypeLabel(a.type)} · ${acctTrades.length} trades · Saldo: ${fR(risk.currentBalance)}</div><div style="font-size:10px;color:var(--muted)">Inicial: ${fR(risk.initialBalance)} · Aportes líquidos: ${fR(risk.cashflowNet)} · Meta: ${a.goalPct}%</div></div><div style="display:flex;gap:6px;flex-shrink:0"><button class="btn btn-ghost btn-sm" onclick="selectAccount('${a.id}')">✓ Usar</button><button class="btn btn-ghost btn-sm btn-icon" onclick="editAccount('${a.id}')">✏</button>${accounts.length>1?`<button class="btn btn-danger btn-sm btn-icon" onclick="deleteAccount('${a.id}')">✕</button>`:''}</div></div>`;}).join('');
}

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

function renderAccountsPage(){
  const metricsEl=document.getElementById('accountsMetrics');
  const overviewEl=document.getElementById('accountsOverview');
  if(metricsEl){
    const totalCapital=accounts.reduce((sum,acct)=>{
      const risk=calcAccountRiskState(acct,getAccountTrades(acct.id));
      return sum+risk.currentBalance;
    },0);
    const capitalTip=`<strong>Capital Consolidado</strong><p>Soma dos saldos atuais de todas as contas cadastradas (capital base + P/L acumulado). Reflete o patrimônio total sob gestão no diário.</p>`;
    metricsEl.innerHTML=[
      {cls:'c-blue',lbl:'Contas ativas',val:accounts.length,sub:'ambientes monitorados'},
      {cls:'c-green',lbl:'Capital consolidado',val:fR(totalCapital),sub:'saldo base + P/L',tip:capitalTip},
      {cls:'c-yellow',lbl:'Conta em foco',val:getActiveAccount()?.name||'—',sub:acctTypeLabel(getActiveAccount()?.type)},
      {cls:'c-purple',lbl:'Trades totais',val:accounts.reduce((s,a)=>s+getAccountTrades(a.id).length,0),sub:'somado por conta'},
    ].map(card=>`<div class="metric-card ${card.cls}"><div class="m-label-row"><span class="m-label">${card.lbl}</span>${card.tip?mkTip(card.tip):''}</div><div class="m-value">${escapeHtml(String(card.val))}</div><div class="m-sub">${escapeHtml(card.sub)}</div></div>`).join('');
  }
  if(!overviewEl)return;
  overviewEl.innerHTML=accounts.map(acct=>{
    const acctTrades=getAccountTrades(acct.id);
    const m=calcMetrics(acctTrades,acct.id);
    const risk=calcAccountRiskState(acct,acctTrades);
    return `<div class="account-overview-card">
      <div class="account-overview-head">
        <div>
          <div class="account-overview-title"><span class="account-color-dot" style="background:${acct.color}"></span>${escapeHtml(acct.name)}</div>
          <div class="account-overview-sub">${escapeHtml(acctTypeLabel(acct.type))} · ${acctTrades.length} trades</div>
        </div>
        <div class="account-overview-actions">
          ${acct.id===activeAccountId?'<span class="badge long">Ativa</span>':`<button class="btn btn-ghost btn-sm" onclick="selectAccount('${acct.id}')">Usar</button>`}
          <button class="btn btn-ghost btn-sm" onclick="editAccount('${acct.id}')">Editar</button>
        </div>
      </div>
      <div class="account-overview-stats">
        <div><span>Saldo atual</span><strong>${fR(risk.currentBalance)}</strong></div>
        <div><span>Aportes</span><strong class="${risk.cashflowNet>=0?'text-green':'text-red'}">${risk.cashflowNet>=0?'+':''}${fR(risk.cashflowNet)}</strong></div>
        <div><span>P/L</span><strong class="${m.totalPnl>=0?'text-green':'text-red'}">${m.totalPnl>=0?'+':''}${fR(m.totalPnl)}</strong></div>
        <div><span>DD atual</span><strong>${(risk.currentDdPct*100).toFixed(2)}%</strong></div>
      </div>
      <div class="account-risk-bars">
        <div class="account-risk-row"><span>Stop diário</span><div class="mini-progress"><span style="width:${risk.dayUsage*100}%"></span></div><strong>${Math.round(risk.dayUsage*100)}%</strong></div>
        <div class="account-risk-row"><span>Stop semanal</span><div class="mini-progress"><span style="width:${risk.weekUsage*100}%"></span></div><strong>${Math.round(risk.weekUsage*100)}%</strong></div>
        <div class="account-risk-row"><span>Meta</span><div class="mini-progress"><span style="width:${risk.goalProgress*100}%"></span></div><strong>${Math.round(risk.goalProgress*100)}%</strong></div>
      </div>
    </div>`;
  }).join('');
}


function getTradeFormAccount(){
  const acctId=document.getElementById('t-account')?.value||activeAccountId;
  return accounts.find(a=>a.id===acctId)||getActiveAccount();
}

function formatSignedMoney(value){
  const n=Number(value)||0;
  return `${n>=0?'+':'-'}${fR(Math.abs(n))}`;
}

function formatAccountBalanceChange(risk){
  if(!risk)return'—';
  const parts=[`P/L ${formatSignedMoney(risk.totalPnl)}`];
  if(Math.abs(risk.cashflowNet||0)>0.0001)parts.push(`Mov. ${formatSignedMoney(risk.cashflowNet)}`);
  return parts.join(' · ');
}

function setMode(m){
  config.mode=m;save();
  document.getElementById('modePercent')?.classList.toggle('active',m==='percent');
  document.getElementById('modeAbsolute')?.classList.toggle('active',m==='absolute');
  const pEl=document.getElementById('modePercentFields');
  const aEl=document.getElementById('modeAbsFields');
  if(pEl)pEl.style.display=m==='percent'?'':'none';
  if(aEl)aEl.style.display=m==='absolute'?'':'none';
  const cur=document.querySelector('.page.active')?.id?.replace('page-','');
  if(cur==='log')renderLog();
  if(cur==='dashboard')renderDashboard();
}

function acctTypeLabel(t){
  return{cfd_pct:'CFD %',futures_usd:'CFD %',prop_pct:'Prop Firm %',crypto:'Crypto'}[t]||t;
}
