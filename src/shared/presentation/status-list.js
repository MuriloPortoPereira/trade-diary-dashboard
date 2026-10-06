function renderStatusList(targetId, items, emptyMessage='Nada para mostrar no momento.'){
  const el=document.getElementById(targetId);
  if(!el)return;
  if(!items.length){
    el.innerHTML=`<div class="status-item info"><div class="status-item-copy"><div class="status-item-title">Sem alertas críticos</div><div class="status-item-summary">${emptyMessage}</div></div></div>`;
    return;
  }
  el.innerHTML=items.map(item=>`
    <div class="status-item ${item.tone||'info'}">
      <div class="status-item-copy">
        <div class="status-item-title">${escapeHtml(item.title||'Atualização')}</div>
        <div class="status-item-summary">${escapeHtml(item.summary||'')}</div>
      </div>
      ${item.value?`<div class="status-item-value">${escapeHtml(item.value)}</div>`:''}
      ${item.actionFn?`<button class="btn btn-ghost btn-sm" onclick="${item.actionFn}">${escapeHtml(item.actionLabel||'Abrir')}</button>`:item.actionPage?`<button class="btn btn-ghost btn-sm" onclick="showPage('${item.actionPage}')">${escapeHtml(item.actionLabel||'Abrir')}</button>`:''}
    </div>`).join('');
}
