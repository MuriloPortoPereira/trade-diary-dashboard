function renderExportAccountFilter(){
  const el=document.getElementById('exportAccount');
  if(!el)return;
  const current=el.value;
  el.innerHTML='<option value="">Todas</option>'+accounts.map(a=>`<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  el.value=[...el.options].some(o=>o.value===current)?current:'';
}
