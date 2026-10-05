function renderPremarket(){
  const now=new Date();
  if(!pmCurrentMonth)pmCurrentMonth=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  const [y,m]=pmCurrentMonth.split('-').map(Number);
  const monthNames=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const lbl=document.getElementById('pmMonthLabel');
  if(lbl)lbl.textContent=monthNames[m-1]+' '+y;

  const daysInMonth=new Date(y,m,0).getDate();
  const acctTrades=getAccountTrades(activeAccountId);

  // ── Results panel ─────────────────────────────
  const monthTrades=acctTrades.filter(t=>{
    if(!t.date||!(t.status==='WIN'||t.status==='LOSS'))return false;
    return t.date.startsWith(pmCurrentMonth);
  });
  const pnlTotal=monthTrades.reduce((a,t)=>a+(t.pnl||0),0);
  const byDay={};
  monthTrades.forEach(t=>{if(!byDay[t.date])byDay[t.date]=0;byDay[t.date]+=(t.pnl||0);});
  const dayVals=Object.values(byDay);
  const bestTrade=monthTrades.length?Math.max(...monthTrades.map(t=>t.pnl||0)):null;
  const worstDay=dayVals.length?Math.min(...dayVals):null;
  const bestDay=dayVals.length?Math.max(...dayVals):null;
  const maxTradesDay=dayVals.length?Math.max(...Object.values(byDay).map((_,i)=>monthTrades.filter(t=>t.date===Object.keys(byDay)[i]).length)):0;
  const statsEl=document.getElementById('pmResultStats');
  if(statsEl){
    const row=(lbl,val,cls='')=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-size:11px;color:var(--muted)">${lbl}</span><span class="mono ${cls}" style="font-size:12px;font-weight:600">${val}</span></div>`;
    const fmt=v=>v===null?'—':(v>=0?'+':'')+fR(v);
    const fmtN=v=>v===null?'—':v;
    statsEl.innerHTML=
      row('Trades no mês',fmtN(monthTrades.length))+
      row('P/L total',fmt(monthTrades.length?pnlTotal:null),pnlTotal>=0?'text-green':'text-red')+
      row('Por trade',fmt(monthTrades.length?pnlTotal/monthTrades.length:null))+
      row('Melhor trade',fmt(bestTrade),'text-green')+
      row('Pior dia (soma)',fmt(worstDay),'text-red')+
      row('Melhor dia (soma)',fmt(bestDay),'text-green')+
      row('Máx. trades em um dia',fmtN(maxTradesDay||null));
  }

  // ── Habit grid ────────────────────────────────
  const gridEl=document.getElementById('pmHabitGrid');if(!gridEl)return;
  const cols=daysInMonth;
  let html=`<div class="pm-grid" style="grid-template-columns:190px repeat(${cols},26px)">`;
  // day headers
  html+=`<div class="pm-grid-corner"></div>`;
  for(let d=1;d<=cols;d++)html+=`<div class="pm-grid-day">${d}</div>`;
  // habit rows
  config.pmHabits.forEach((habit,idx)=>{
    html+=`<div class="pm-grid-label" title="${habit}">${habit}</div>`;
    for(let d=1;d<=cols;d++){
      const date=pmCurrentMonth+'-'+String(d).padStart(2,'0');
      const done=!!(preMarketData[date]?.habits?.[idx]);
      html+=`<div class="pm-dot${done?' pm-dot-done':''}" data-pmcell="${date}-${idx}" onclick="togglePMHabit('${date}',${idx})" title="${habit} — ${date}"></div>`;
    }
  });
  html+='</div>';
  gridEl.innerHTML=html;
  _updatePMStats();
  _renderPMHabitManager();
}
