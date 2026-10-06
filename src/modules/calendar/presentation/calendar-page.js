function renderCalendar(){
  syncCalPicker();
  const MONTHS=[t('month.jan','Janeiro'),t('month.feb','Fevereiro'),t('month.mar','Março'),t('month.apr','Abril'),t('month.may','Maio'),t('month.jun','Junho'),t('month.jul','Julho'),t('month.aug','Agosto'),t('month.sep','Setembro'),t('month.oct','Outubro'),t('month.nov','Novembro'),t('month.dec','Dezembro')];
  const DAYS=[t('day.sun','Dom'),t('day.mon','Seg'),t('day.tue','Ter'),t('day.wed','Qua'),t('day.thu','Qui'),t('day.fri','Sex'),t('day.sat','Sáb')];
  const start=new Date(calYear,calMonth,1),end=new Date(calYear,calMonth+1,0);
  const acct=getActiveAccount();
  const acctTrades=getAccountTrades(acct.id);
  const periodTrades=acctTrades.filter(t=>{if(!t.date)return false;const d=new Date(t.date+'T12:00');return d>=start&&d<=end;});
  const pm=calcMetrics(periodTrades,acct.id);
  document.getElementById('calStats').innerHTML=[
    {cls:'c-green',lbl:'P/L do Período',val:(pm.totalPnl>=0?'+':'')+fR(pm.totalPnl),tip:TIPS.pnl},
    {cls:'c-blue', lbl:'Win Rate',val:(pm.wr*100).toFixed(1)+'%',tip:TIPS.wr},
    {cls:'c-yellow',lbl:'Trades',val:pm.closed.length},
    {cls:'c-purple',lbl:'Profit Factor',val:isFinite(pm.pf)?pm.pf.toFixed(2):'—',tip:TIPS.pf},
    {cls:'c-red',  lbl:'Max Drawdown',val:(pm.maxDD*100).toFixed(1)+'%',tip:TIPS.dd},
    {cls:'c-blue', lbl:'Expectância',val:(pm.exp>=0?'+':'')+pm.exp.toFixed(2)+'R',tip:TIPS.exp},
  ].map(mkCard).join('');

  const byDay={};
  acctTrades.forEach(t=>{
    if(!t.date)return;
    const d=new Date(t.date+'T12:00');
    if(d.getFullYear()===calYear&&d.getMonth()===calMonth){
      const k=d.getDate();if(!byDay[k])byDay[k]=[];byDay[k].push(t);
    }
  });

  const today=new Date();
  const firstDay=new Date(calYear,calMonth,1).getDay();
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();

  if(calViewMode==='month'){
    document.getElementById('calTitle').textContent=MONTHS[calMonth]+' '+calYear;
    let html=DAYS.map(d=>`<div class="cal-day-label">${d}</div>`).join('');
    for(let i=0;i<firstDay;i++)html+=`<div class="cal-day other-month"></div>`;
    for(let d=1;d<=daysInMonth;d++){
      const isToday=d===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear();
      const dt=byDay[d]||[];const pnl=dt.reduce((a,t)=>a+(t.pnl||0),0);
      const cls=['cal-day',isToday?'today':'',dt.length>0?'has-trade':'',dt.length>0?(pnl>=0?'win':'loss'):''].filter(Boolean).join(' ');
      const pnlStr=dt.length?`<div class="cal-pnl">${pnl>=0?'+':''}${fR(pnl)}</div>`:'';
      html+=`<div class="${cls}" onclick="showCalDay(${d})" title="${dt.length} trade(s)">${d}${pnlStr}</div>`;
    }
    for(let i=firstDay+daysInMonth;i<42;i++)html+=`<div class="cal-day other-month" aria-hidden="true"></div>`;
    document.getElementById('calGridWrap').innerHTML=`<div class="cal-grid">${html}</div>`;
  } else if(calViewMode==='week'){
    document.getElementById('calTitle').textContent='Mensal — '+MONTHS[calMonth]+' '+calYear;
    let weeks=[],week=[];
    for(let i=0;i<firstDay;i++)week.push(null);
    for(let d=1;d<=daysInMonth;d++){week.push(d);if(week.length===7){weeks.push(week);week=[];}}
    if(week.length){while(week.length<7)week.push(null);weeks.push(week);}
    let html=`<div class="cal-week-grid"><div class="cal-week-head">Semana</div>${DAYS.map(d=>`<div class="cal-week-head">${d}</div>`).join('')}<div class="cal-week-head">Total</div>`;
    weeks.forEach((wk,wi)=>{
      const wTotal=wk.filter(Boolean).reduce((a,d)=>a+((byDay[d]||[]).reduce((b,t)=>b+(t.pnl||0),0)),0);
      const wTrades=wk.filter(Boolean).reduce((a,d)=>a+(byDay[d]||[]).length,0);
      html+=`<div class="cal-week-label">Sem ${wi+1}</div>`;
      wk.forEach(d=>{
        if(!d){html+=`<div class="cal-week-slot"><div class="cal-day other-month" aria-hidden="true"></div></div>`;return;}
        const dt=byDay[d]||[];const pnl=dt.reduce((a,t)=>a+(t.pnl||0),0);
        const isToday=d===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear();
        const cls=['cal-day',isToday?'today':'',dt.length>0?(pnl>=0?'win':'loss'):''].filter(Boolean).join(' ');
        const ps=dt.length?`<div class="cal-pnl">${pnl>=0?'+':''}${fR(pnl)}</div>`:'';
        html+=`<div class="cal-week-slot"><div class="${cls}" onclick="showCalDay(${d})">${d}${ps}</div></div>`;
      });
      const tcls=wTotal>=0?'text-green':'text-red';
      html+=`<div class="cal-week-total ${tcls}">${wTrades?((wTotal>=0?'+':'')+fR(wTotal)):'—'}</div>`;
    });
    html+=`</div>`;
    document.getElementById('calGridWrap').innerHTML=html;
  } else {
    document.getElementById('calTitle').textContent='Quinzenal — '+MONTHS[calMonth]+' '+calYear;
    const makeBlock=(from,to,label)=>{
      let h=`<div class="cal-biweek-block"><div class="cal-biweek-title">${label}</div>`;
      h+=`<div class="cal-grid">`;
      h+=DAYS.map(d=>`<div class="cal-day-label">${d}</div>`).join('');
      const startDow=new Date(calYear,calMonth,from).getDay();
      for(let i=0;i<startDow;i++)h+=`<div class="cal-day other-month"></div>`;
      for(let d=from;d<=to;d++){
        const dt=byDay[d]||[];const pnl=dt.reduce((a,t)=>a+(t.pnl||0),0);
        const isToday=d===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear();
        const cls=['cal-day',isToday?'today':'',dt.length>0?(pnl>=0?'win':'loss'):''].filter(Boolean).join(' ');
        const ps=dt.length?`<div class="cal-pnl">${pnl>=0?'+':''}${fR(pnl)}</div>`:'';
        h+=`<div class="${cls}" onclick="showCalDay(${d})">${d}${ps}</div>`;
      }
      const usedSlots=startDow+(to-from+1);
      const trailingSlots=(7-(usedSlots%7))%7;
      for(let i=0;i<trailingSlots;i++)h+=`<div class="cal-day other-month" aria-hidden="true"></div>`;
      const qTrades=Object.entries(byDay).filter(([k])=>parseInt(k)>=from&&parseInt(k)<=to);
      const qPnl=qTrades.reduce((a,[,dt])=>a+dt.reduce((b,t)=>b+(t.pnl||0),0),0);
      const qCount=qTrades.reduce((a,[,dt])=>a+dt.length,0);
      h+=`</div><div class="cal-biweek-total ${qPnl>=0?'text-green':'text-red'}">${qCount} trades · ${qPnl>=0?'+':''}${fR(qPnl)}</div></div>`;
      return h;
    };
    const mid=15,fim=daysInMonth;
    document.getElementById('calGridWrap').innerHTML=`<div class="cal-biweek-grid">${makeBlock(1,mid,'1ª Quinzena (1–15)')}${makeBlock(mid+1,fim,'2ª Quinzena (16–'+fim+')')}</div>`;
  }
  return true;
}
