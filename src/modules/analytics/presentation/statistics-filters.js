function toggleCustomPeriod(){
  const period=document.getElementById('statPeriod')?.value||'custom';
  const bar=document.getElementById('customPeriodBar');
  if(bar)bar.style.display=period==='custom'?'flex':'none';
  renderStats();
}

function onStatsAccountChange(){
  statsAccountPinned=true;
  renderStats();
}
