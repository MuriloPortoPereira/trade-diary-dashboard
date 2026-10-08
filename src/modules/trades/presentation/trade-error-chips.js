function renderErrorChips(){
  const el=document.getElementById('errorChips');
  if(!el)return;
  const labels=[...DEFAULT_TRADE_ERRORS,...selectedErrors]
    .map(e=>String(e||'').trim())
    .filter(Boolean)
    .filter((e,i,arr)=>arr.indexOf(e)===i);
  el.innerHTML=labels.map(label=>{
    const on=selectedErrors.includes(label);
    return `<button type="button" class="err-chip ${on?'on':''}" onclick="toggleTradeError(decodeURIComponent('${encodeURIComponent(label)}'))">${escapeHtml(label)}</button>`;
  }).join('');
}
