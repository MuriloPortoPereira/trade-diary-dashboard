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
