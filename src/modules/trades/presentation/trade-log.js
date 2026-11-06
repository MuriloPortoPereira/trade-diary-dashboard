function renderLogMetrics(arr,incompleteCount){
  const el=document.getElementById('logMetrics');
  if(!el)return;
  const m=calcMetrics(arr);
  const riskTrades=arr.filter(t=>t.riskUsd!=null);
  const avgRisk=riskTrades.length ? riskTrades.reduce((sum,t)=>sum+(t.riskUsd||0),0)/riskTrades.length : 0;
  const cards=[
    {cls:'c-blue',lbl:'Registros filtrados',val:String(arr.length),sub:`${m.closed.length} trades fechados`},
    {cls:'c-green',lbl:'P/L filtrado',val:`${m.totalPnl>=0?'+':''}${fR(m.totalPnl)}`,sub:'resultado do filtro atual'},
    {cls:'c-yellow',lbl:'Win rate',val:`${(m.wr*100).toFixed(1)}%`,sub:`${m.wins.length} wins · ${m.losses.length} losses`},
    {cls:incompleteCount?'c-red':'c-purple',lbl:'Controle',val:incompleteCount?`${incompleteCount} incompletos`:fR(avgRisk),sub:incompleteCount?'pedem revisão':'risco médio por operação'},
  ];
  el.innerHTML=cards.map(c=>`
    <div class="metric-card ${c.cls}">
      <div class="m-label">${c.lbl}</div>
      <div class="m-value">${c.val}</div>
      <div class="m-sub">${c.sub}</div>
    </div>`).join('');
}

function updateBulkBar(){
  const bar=document.getElementById('bulkBar');
  const cnt=document.getElementById('bulkCount');
  const hint=document.getElementById('bulkHint');
  const editBtn=document.getElementById('bulkEditBtn');
  const completeBtn=document.getElementById('bulkCompleteBtn');
  if(!bar)return;
  const selectedCount=selectedTrades.size;
  const incompleteCount=getSelectedIncompleteTrades().length;
  if(selectedCount>0){
    bar.classList.add('show');
    if(cnt)cnt.textContent=incompleteCount>0
      ? `${selectedCount} selecionado(s) · ${incompleteCount} incompleto(s)`
      : `${selectedCount} selecionado(s)`;
    if(hint)hint.style.display='none';
  } else{
    bar.classList.remove('show');
    if(hint)hint.style.display='inline-flex';
  }
  if(editBtn)editBtn.textContent=selectedCount===1?'✏ Editar':'✏ Editar seleção';
  if(completeBtn)completeBtn.textContent=incompleteCount>0
    ? `✓ Completar incompletos (${incompleteCount})`
    : '✓ Completar incompletos';
  const chkAll=document.getElementById('chkAll');
  if(chkAll){const all=document.querySelectorAll('#logTbody input[type=checkbox]');chkAll.checked=all.length>0&&[...all].every(c=>c.checked);}
}

function renderLog(){
  const acctSel=document.getElementById('filterAccount');
  const stratSel=document.getElementById('filterStrategy');
  let accountFilter=acctSel?.value||'active';
  const strat=stratSel?.value||'';
  if(acctSel){
    const v=acctSel.value||'active';
    acctSel.innerHTML='<option value="active">Conta atual</option><option value="all">Todas contas</option>'+accounts.map(a=>`<option value="${a.id}">${escapeHtml(a.name||a.id)}</option>`).join('');
    const allowedAccounts=['active','all',...accounts.map(a=>a.id)];
    acctSel.value=allowedAccounts.includes(v)?v:'active';
    accountFilter=acctSel.value||'active';
  }
  if(stratSel){const v=stratSel.value;stratSel.innerHTML='<option value="">Todas estratégias</option>'+config.strategies.map(s=>`<option>${s}</option>`).join('');stratSel.value=v;}
  renderLogReadOnlyNotice(accountFilter);
  const dateRange=getLogDateRangeFromControls();
  const filtered=getLogFilteredTrades({accountId:accountFilter,strategy:strat,...dateRange});
  const allAcctTrades=accountFilter==='all'?accounts.flatMap(a=>getAccountTrades(a.id)):getAccountTrades(accountFilter==='active'?activeAccountId:accountFilter);
  const incomplete=allAcctTrades.filter(t=>t.incomplete);
  const iaEl=document.getElementById('incompleteAlert');
  if(iaEl){if(incomplete.length){iaEl.style.display='block';document.getElementById('incompleteCount').textContent=incomplete.length;}else{iaEl.style.display='none';}}
  renderLogMetrics(filtered,incomplete.length);
  document.getElementById('logCount').textContent=filtered.length+' registros';
  document.getElementById('logTbody').innerHTML=filtered.length
    ? filtered.map((t,i)=>tradeRow(t,true,filtered.length-i)).join('')
    : `<tr><td colspan="22" style="text-align:center;color:var(--muted);padding:24px">${t('misc.noTrades')}</td></tr>`;
  updateBulkBar();
}

function fmtMissingField(f){
  return({entry:'entrada',stop:'stop',strategy:'estratégia',emotion:'emoção',followedPlan:'plano',exit:'saída'}[f]||f);
}

function tradeRow(t, showAll=true, idx=null){
  const pnl=t.pnl||0;
  const pc=pnl>0?'text-green':pnl<0?'text-red':'';
  const rVal=(t.r!=null&&Number.isFinite(t.r))?((t.r>=0?'+':'')+t.r.toFixed(2)+'R'):'—';
  const statusBadge=`<span class="badge ${(t.status||'open').toLowerCase()}">${t.status||'OPEN'}</span>`;
  const missingList=(t.missing_fields||[]).map(fmtMissingField).join(', ');
  const incBadge=t.incomplete?`<span class="badge incomplete" title="Faltando: ${missingList||'campos não preenchidos'}">!</span> `:'';
  const riskStr=t.riskUsd!=null?fR(t.riskUsd):(t.riskPct!=null?t.riskPct.toFixed(2)+'%':'—');
  const pnlStr=pnl?((pnl>=0?'+':'')+fR(pnl)):'—';
  const pnlPctStr=t.pnlPct!=null?((t.pnlPct>=0?'+':'')+(t.pnlPct*100).toFixed(2)+'%'):'—';
  const sel=selectedTrades.has(t.id);
  const incClass=t.incomplete?' trade-row-incomplete':'';

  if(!showAll){
    return `<tr class="${incClass.trim()}">
      <td class="mono">${fDate(t.date)}</td>
      <td class="td-symbol">${incBadge}${t.symbol||'—'}</td>
      <td><span class="badge ${(t.direction||'').toLowerCase()}">${t.direction||'—'}</span></td>
      <td class="td-sm">${t.mode==='absolute'?'$':'%'}</td>
      <td class="mono">${t.entry||'—'}</td><td class="mono">${t.exit||'—'}</td>
      <td class="mono ${pnl>0?'text-green':pnl<0?'text-red':''}">${rVal}</td>
      <td class="mono ${pc}">${pnlStr}</td>
      <td class="td-sm">${t.emotion||'—'}</td>
      <td>${statusBadge}</td>
    </tr>`;
  }

  return `<tr class="${sel?'selected':''}${incClass}">
    <td class="td-chk"><input type="checkbox" ${sel?'checked':''} data-id="${t.id}" onchange="toggleRowSelect(this,'${t.id}')" style="accent-color:var(--accent)"></td>
    <td class="mono td-sm">${idx||'—'}</td>
    <td class="mono">${fDate(t.date)}</td>
    <td class="td-symbol">${incBadge}${t.symbol||'—'}</td>
    <td class="td-sm">${t.market||getMarket(t.symbol)||'—'}</td>
    <td><span class="badge ${(t.direction||'').toLowerCase()}">${t.direction||'—'}</span></td>
    <td class="mono">${t.entry||'—'}</td>
    <td class="mono text-red">${t.stop||'—'}</td>
    <td class="mono text-muted">${t.tp||'—'}</td>
    <td class="mono">${t.exit||'—'}</td>
    <td class="mono td-sm">${t.qty!=null?t.qty:'—'}</td>
    <td class="mono text-yellow">${riskStr}</td>
    <td class="mono ${pnl>0?'text-green':pnl<0?'text-red':''}">${rVal}</td>
    <td class="mono ${pc}">${pnlStr}</td>
    <td class="mono td-sm ${pc}">${pnlPctStr}</td>
    <td class="td-sm">${t.strategy||'—'}</td>
    <td class="td-sm">${t.emotion||'—'}</td>
    <td class="td-sm">${t.followedPlan||'—'}</td>
    <td class="mono td-sm">${t.discipline!=null?t.discipline:'—'}</td>
    <td>${statusBadge}</td>
    <td class="td-actions">
      <button class="btn btn-ghost btn-sm btn-icon" onclick="openModal('tradeModal','${t.id}')" title="Editar">✏</button>
      <button class="btn btn-ghost btn-sm btn-icon" onclick="duplicateTrade('${t.id}')" title="Duplicar">⧉</button>
      <button class="btn btn-danger btn-sm btn-icon" onclick="deleteTrade('${t.id}')" title="Excluir">✕</button>
    </td>
  </tr>`;
}

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

function getSortedTrades(arr){
  const {col,dir}=sortState;
  return [...arr].sort((a,b)=>{
    let va=a[col],vb=b[col];
    if(col==='idx'){va=arr.indexOf(a);vb=arr.indexOf(b);}
    if(va==null)return 1;if(vb==null)return -1;
    if(typeof va==='string')va=va.toLowerCase();
    if(typeof vb==='string')vb=vb.toLowerCase();
    const cmp=va<vb?-1:va>vb?1:0;
    return dir==='asc'?cmp:-cmp;
  });
}

function normalizeLogDate(value){
  const raw=String(value||'').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw)?raw:'';
}

function normalizeLogDateRange(startDate='',endDate=''){
  let start=normalizeLogDate(startDate);
  let end=normalizeLogDate(endDate);
  if(start&&end&&start>end)[start,end]=[end,start];
  return {startDate:start,endDate:end};
}

function isTradeInLogDateRange(trade,startDate='',endDate=''){
  const range=normalizeLogDateRange(startDate,endDate);
  if(!range.startDate&&!range.endDate)return true;
  const date=normalizeLogDate(trade?.date);
  if(!date)return false;
  if(range.startDate&&date<range.startDate)return false;
  if(range.endDate&&date>range.endDate)return false;
  return true;
}

function getLogDateRangeFromControls(){
  return normalizeLogDateRange(
    document.getElementById('filterDateStart')?.value||'',
    document.getElementById('filterDateEnd')?.value||''
  );
}
