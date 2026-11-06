// Journal editing controls, account locks and read-only guidance.
function isLogPageActive(){
  return document.querySelector('.page.active')?.id==='page-log';
}

function accountDisplayName(accountId){
  if(accountId==='all')return 'todas as contas';
  if(accountId==='active')return accountDisplayName(activeAccountId);
  const acct=accounts.find(a=>a.id===accountId);
  return acct?.name||accountId||'conta selecionada';
}

function getLogAccountEditLock(options={}){
  const requireActivePage=options.requireActivePage!==false;
  if(requireActivePage&&!isLogPageActive())return {locked:false};
  const accountFilter=options.accountFilter??document.getElementById('filterAccount')?.value??'active';
  if(!accountFilter||accountFilter==='active'||accountFilter===activeAccountId)return {locked:false};
  return {
    locked:true,
    accountId:accountFilter,
    accountName:accountDisplayName(accountFilter),
    activeAccountName:accountDisplayName(activeAccountId),
    allAccounts:accountFilter==='all',
  };
}

function buildLogAccountEditLockMessage(lock,action='editar'){
  if(lock.allAccounts){
    return `Você está vendo todas as contas em modo consulta. Para ${action} operações, primeiro escolha uma conta específica como conta ativa. Assim o diário mantém cada histórico protegido e evita alterações na conta errada.`;
  }
  return `Você está visualizando ${lock.accountName}, mas a conta ativa agora é ${lock.activeAccountName}. Para ${action} operações, primeiro troque a conta ativa para ${lock.accountName}. Assim o diário mantém o histórico protegido e evita mudanças na conta errada.`;
}

function showLogAccountEditLockNotice(action='editar'){
  const lock=getLogAccountEditLock();
  if(!lock.locked)return false;
  showAppNotice(
    'Histórico em modo visualização',
    buildLogAccountEditLockMessage(lock,action),
    {confirmText:'Entendi'}
  );
  return true;
}

function renderLogReadOnlyNotice(accountFilter){
  const el=document.getElementById('logReadOnlyNotice');
  if(!el)return;
  const lock=getLogAccountEditLock({accountFilter,requireActivePage:false});
  if(!lock.locked){
    el.style.display='none';
    el.innerHTML='';
    return;
  }
  const target=lock.allAccounts?'todas as contas':lock.accountName;
  const actionText=lock.allAccounts
    ? 'Escolha uma conta específica como conta ativa para adicionar, editar, duplicar ou excluir operações.'
    : `Troque a conta ativa para ${escapeHtml(lock.accountName)} antes de adicionar, editar, duplicar ou excluir operações.`;
  el.style.display='block';
  el.innerHTML=`<div class="alert alert-info"><b>Modo visualização.</b> Você está consultando ${escapeHtml(target)}. ${actionText}</div>`;
}

function sortLog(col){
  if(sortState.col===col){sortState.dir=sortState.dir==='asc'?'desc':'asc';}
  else{sortState.col=col;sortState.dir=col==='date'?'desc':'asc';}
  document.querySelectorAll('.sort-ind').forEach(el=>el.textContent='');
  const ind=document.getElementById('si-'+col);
  if(ind)ind.textContent=sortState.dir==='asc'?'↑':'↓';
  renderLog();
}

function clearLogDateRange(){
  const start=document.getElementById('filterDateStart');
  const end=document.getElementById('filterDateEnd');
  if(start)start.value='';
  if(end)end.value='';
  renderLog();
}

function toggleSelectAll(el){
  const tbody=document.getElementById('logTbody');
  tbody.querySelectorAll('input[type=checkbox]').forEach(cb=>{
    cb.checked=el.checked;
    const row=cb.closest('tr');
    if(row)row.classList.toggle('selected',el.checked);
    if(el.checked)selectedTrades.add(cb.dataset.id);
    else selectedTrades.delete(cb.dataset.id);
  });
  updateBulkBar();
}

function toggleRowSelect(cb,id){
  if(cb.checked)selectedTrades.add(id);
  else selectedTrades.delete(id);
  const row=cb.closest('tr');
  if(row)row.classList.toggle('selected',cb.checked);
  updateBulkBar();
}

function clearSelection(){
  selectedTrades.clear();
  document.querySelectorAll('#logTbody input[type=checkbox]').forEach(cb=>{cb.checked=false;cb.closest('tr')?.classList.remove('selected');});
  const ca=document.getElementById('chkAll');if(ca)ca.checked=false;
  updateBulkBar();
}
