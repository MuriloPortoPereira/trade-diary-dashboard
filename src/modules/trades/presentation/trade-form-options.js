function populateSelects(){
  const emoOpts='<option value="">—</option>'+config.emotions.map(s=>`<option>${s}</option>`).join('');
  ['t-emotion','t-emo-before','t-emo-after'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=emoOpts;});
  const strat=document.getElementById('t-strategy');
  if(strat)strat.innerHTML='<option value="">— Estratégia —</option>'+config.strategies.map(s=>`<option>${s}</option>`).join('');
  const mkt=document.getElementById('t-market');
  if(mkt)mkt.innerHTML='<option value="">— Mercado —</option>'+config.markets.map(s=>`<option>${s}</option>`).join('');
  const acctSel=document.getElementById('t-account');
  if(acctSel){acctSel.innerHTML=accounts.map(a=>`<option value="${a.id}">${a.name}</option>`).join('');acctSel.value=activeAccountId;}
  const dl=document.getElementById('symbolsList');
  if(dl)dl.innerHTML=(config.symbols||[]).map(s=>`<option value="${s}">`).join('');
  onAccountChange();
  selectedErrors=[];renderErrorChips();
}

function toggleTradeError(label){
  const key=String(label||'').trim();
  if(!key)return;
  selectedErrors=selectedErrors.includes(key)
    ? selectedErrors.filter(e=>e!==key)
    : [...selectedErrors,key];
  renderErrorChips();
  autoDisc(true);
}
