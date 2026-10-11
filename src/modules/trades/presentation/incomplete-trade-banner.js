let _incompleteBannerDismissed=false;

function updateIncompleteBanner(){
  const count=getAccountTrades(activeAccountId).filter(t=>t.incomplete).length;
  const el=document.getElementById('incompleteAlert');
  const countEl=document.getElementById('incompleteCount');
  if(el)el.style.display=count&&!_incompleteBannerDismissed?'block':'none';
  if(countEl)countEl.textContent=count;
}

function dismissIncompleteBanner(){
  _incompleteBannerDismissed=true;
  updateIncompleteBanner();
}
