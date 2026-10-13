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
