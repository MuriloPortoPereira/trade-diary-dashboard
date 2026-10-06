function calNav(dir){
  calMonth+=dir;
  if(calMonth>11){calMonth=0;calYear++;}
  if(calMonth<0){calMonth=11;calYear--;}
  syncCalPicker();renderCalendar();
}
function calGoToMonth(val){
  if(!val)return;
  const [y,m]=val.split('-');
  calYear=parseInt(y);calMonth=parseInt(m)-1;
  renderCalendar();
}
function syncCalPicker(){
  const el=document.getElementById('calMonthPicker');
  if(el)el.value=`${calYear}-${String(calMonth+1).padStart(2,'0')}`;
}
function setCalView(mode){
  calViewMode=mode;
  ['month','week','biweek'].forEach(m=>{
    const btn=document.getElementById('calBtn'+m.charAt(0).toUpperCase()+m.slice(1));
    if(btn)btn.classList.toggle('active',m===mode);
  });
  renderCalendar();
}
function showCalDay(day){
  const date=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const dt=getAccountTrades(activeAccountId).filter(t=>t.date===date);
  const det=document.getElementById('calDayDetail');
  if(!dt.length){det.style.display='none';return;}
  det.style.display='block';
  document.getElementById('calDayTitle').textContent=`Trades de ${fDate(date)} (${dt.length})`;
  document.getElementById('calDayTbody').innerHTML=dt.map(t=>`<tr>
    <td><b>${t.symbol}</b></td>
    <td><span class="badge ${(t.direction||'').toLowerCase()}">${t.direction}</span></td>
    <td class="mono">${t.entry||'—'}</td><td class="mono">${t.exit||'—'}</td>
    <td class="mono ${(t.r||0)>=0?'text-green':'text-red'}">${(t.r!=null&&Number.isFinite(t.r))?(t.r>=0?'+':'')+t.r.toFixed(2)+'R':'—'}</td>
    <td class="mono ${(t.pnl||0)>=0?'text-green':'text-red'}">${t.pnl!=null?(t.pnl>=0?'+':'')+fR(t.pnl):'—'}</td>
    <td>${t.emotion||'—'}</td>
    <td><span class="badge ${(t.status||'open').toLowerCase()}">${t.status||'OPEN'}</span></td>
  </tr>`).join('');
}
