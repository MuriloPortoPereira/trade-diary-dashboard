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
