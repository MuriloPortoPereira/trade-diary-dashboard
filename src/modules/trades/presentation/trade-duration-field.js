function updateTradeDurationField(){
  const el=document.getElementById('t-duration');
  if(!el)return;
  const trade={
    date:document.getElementById('t-date')?.value||'',
    exitDate:document.getElementById('t-exitdate')?.value||document.getElementById('t-date')?.value||'',
    openTime:document.getElementById('t-opentime')?.value||'',
    exitTime:document.getElementById('t-exittime')?.value||'',
  };
  const minutes=getTradeDurationMinutes(trade);
  el.value=minutes!=null?formatDurationMinutes(minutes):'';
}
