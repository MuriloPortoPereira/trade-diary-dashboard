function renderAnalysisSummary(containerId,items=[]){
  const el=document.getElementById(containerId);
  if(!el)return;
  const rows=(Array.isArray(items)?items:[]).filter(Boolean);
  if(!rows.length){
    el.innerHTML='';
    return;
  }
  el.innerHTML=rows.map(item=>`<div class="analysis-summary-chip ${escapeHtml(item.tone||'')}"><div class="analysis-summary-label">${escapeHtml(item.label||'')}</div><div class="analysis-summary-value">${escapeHtml(item.value||'—')}</div><div class="analysis-summary-sub">${escapeHtml(item.sub||'')}</div></div>`).join('');
}
