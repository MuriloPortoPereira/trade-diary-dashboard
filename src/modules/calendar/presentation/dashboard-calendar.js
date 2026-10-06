function renderDashboardCalendar(arr){
  const monthEl=document.getElementById('dashCalendarMonth');
  const gridEl=document.getElementById('dashCalendarMini');
  const weekEl=document.getElementById('dashWeekBreakdown');
  if(!monthEl||!gridEl||!weekEl)return;

  const baseArr=Array.isArray(arr)?arr:[];
  const anchorStr=getAnchorTradeDate(baseArr);
  const anchorDate=new Date(anchorStr+'T12:00:00');
  const year=anchorDate.getFullYear();
  const month=anchorDate.getMonth();
  const firstDay=new Date(year,month,1);
  const daysInMonth=new Date(year,month+1,0).getDate();
  const dayNames=[t('day.sun','Dom'),t('day.mon','Seg'),t('day.tue','Ter'),t('day.wed','Qua'),t('day.thu','Qui'),t('day.fri','Sex'),t('day.sat','Sáb')];
  const monthTitle=anchorDate.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  monthEl.textContent=monthTitle.charAt(0).toUpperCase()+monthTitle.slice(1);

  const monthTrades=baseArr.filter(t=>{
    if(!t.date)return false;
    const d=new Date(t.date+'T12:00:00');
    return d.getFullYear()===year && d.getMonth()===month;
  });
  const dayMap={};
  monthTrades.forEach(t=>{
    const day=new Date(t.date+'T12:00:00').getDate();
    if(!dayMap[day])dayMap[day]={pnl:0,count:0};
    dayMap[day].pnl+=(t.pnl||0);
    dayMap[day].count++;
  });

  let html=dayNames.map(label=>`<div class="mini-cal-head">${label}</div>`).join('');
  for(let i=0;i<firstDay.getDay();i++)html+='<div class="dash-cal-cell is-muted"></div>';
  for(let day=1;day<=daysInMonth;day++){
    const data=dayMap[day];
    const cls=data?data.pnl>=0?'is-gain':'is-loss':'';
    const today=(new Date().getFullYear()===year && new Date().getMonth()===month && new Date().getDate()===day)?' today':'';
    html+=`<div class="dash-cal-cell ${cls}${today}" onclick="showPage('calendar')"><strong>${day}</strong><span class="dash-cal-value">${data?`${data.pnl>=0?'+':''}${fR(data.pnl)}`:'—'}</span></div>`;
  }
  for(let i=firstDay.getDay()+daysInMonth;i<42;i++)html+='<div class="dash-cal-cell is-muted" aria-hidden="true"></div>';
  gridEl.innerHTML=html;

  const weeks={};
  for(let day=1;day<=daysInMonth;day++){
    const slot=Math.floor((firstDay.getDay()+day-1)/7)+1;
    if(!weeks[slot])weeks[slot]={pnl:0,count:0};
    if(dayMap[day]){
      weeks[slot].pnl+=dayMap[day].pnl;
      weeks[slot].count+=dayMap[day].count;
    }
  }
  weekEl.innerHTML=Object.entries(weeks).map(([week,data])=>`
    <div class="week-row">
      <span>Semana ${week}</span>
      <span class="${data.pnl>=0?'text-green':'text-red'}">${data.count?`${data.pnl>=0?'+':''}${fR(data.pnl)}`:'—'}</span>
    </div>`).join('');
}
