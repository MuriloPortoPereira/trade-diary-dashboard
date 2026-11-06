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
