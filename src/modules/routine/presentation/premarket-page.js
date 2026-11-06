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

function openPMMonth(ym){
  pmCurrentMonth=ym;
  showPage('premarket');
}

function addPMHabit(){
  const inp=document.getElementById('pmNewHabit');
  const val=(inp?.value||'').trim();
  if(!val)return;
  config.pmHabits.push(val);
  inp.value='';
  save();renderPremarket();
}

function removePMHabit(idx){
  config.pmHabits.splice(idx,1);
  save();renderPremarket();
}

function movePMHabit(idx,delta){
  const arr=config.pmHabits;
  const to=idx+delta;
  if(to<0||to>=arr.length)return;
  [arr[idx],arr[to]]=[arr[to],arr[idx]];
  save();renderPremarket();
}

function _renderPMHabitManager(){
  const el=document.getElementById('pmHabitList');if(!el)return;
  el.innerHTML=config.pmHabits.map((h,i)=>`
    <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
      <span style="flex:1;font-size:12px;color:var(--text2)">${escapeHtml(h)}</span>
      <button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:10px" onclick="movePMHabit(${i},-1)" ${i===0?'disabled':''}>↑</button>
      <button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:10px" onclick="movePMHabit(${i},1)" ${i===config.pmHabits.length-1?'disabled':''}>↓</button>
      <button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:10px;color:var(--red)" onclick="removePMHabit(${i})">✕</button>
    </div>`).join('');
}

function _renderPMCorrelCards(){
  const el=document.getElementById('pmCorrelCards');if(!el)return;
  const acctTrades=getAccountTrades(activeAccountId);
  const closed=acctTrades.filter(t=>t.status==='WIN'||t.status==='LOSS');
  const n=config.pmHabits.length;
  if(!n){el.innerHTML='';return;}
  const buckets={high:{pnl:0,cnt:0},mid:{pnl:0,cnt:0},low:{pnl:0,cnt:0}};
  Object.entries(preMarketData).forEach(([date,pm])=>{
    const habits=pm.habits;if(!Array.isArray(habits))return;
    const pct=habits.filter(Boolean).length/n;
    const dayTrades=closed.filter(t=>t.date===date);
    if(!dayTrades.length)return;
    const dayPnl=dayTrades.reduce((a,t)=>a+(t.pnl||0),0);
    const bucket=pct>=0.8?'high':pct>=0.5?'mid':'low';
    buckets[bucket].pnl+=dayPnl;buckets[bucket].cnt++;
  });
  const fmt=(b)=>b.cnt?((b.pnl>=0?'+':'')+fR(b.pnl/b.cnt)+' / dia ('+b.cnt+' dias)'):'sem dados';
  const habitTip=`<strong>Hábitos × P/L</strong><p>Correlação entre o percentual de hábitos cumpridos no dia e o resultado financeiro médio por sessão. Ajuda a entender se a consistência de rotina impacta a performance.</p>`;
  el.innerHTML=[
    {cls:'c-green',lbl:'≥ 80% hábitos',val:fmt(buckets.high),sub:'alta disciplina',tip:habitTip},
    {cls:'c-yellow',lbl:'50 – 79% hábitos',val:fmt(buckets.mid),sub:'disciplina parcial',tip:habitTip},
    {cls:'c-red',lbl:'< 50% hábitos',val:fmt(buckets.low),sub:'baixa disciplina',tip:habitTip},
  ].map(mkCard).join('');
}

function shiftPMMonth(delta){
  const [y,m]=pmCurrentMonth.split('-').map(Number);
  const d=new Date(y,m-1+delta,1);
  pmCurrentMonth=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  renderPremarket();
}

function togglePMHabit(date,idx){
  if(!preMarketData[date])preMarketData[date]={};
  const n=config.pmHabits.length;
  if(!Array.isArray(preMarketData[date].habits))preMarketData[date].habits=new Array(n).fill(false);
  preMarketData[date].habits[idx]=!preMarketData[date].habits[idx];
  preMarketData[date].savedAt=new Date().toISOString();
  save();
  const cell=document.querySelector(`[data-pmcell="${date}-${idx}"]`);
  if(cell)cell.classList.toggle('pm-dot-done',preMarketData[date].habits[idx]);
  _updatePMStats();
}

function _updatePMStats(){
  const [y,m]=pmCurrentMonth.split('-').map(Number);
  const daysInMonth=new Date(y,m,0).getDate();
  const n=config.pmHabits.length;
  const discLabels=[],discData=[];
  for(let d=1;d<=daysInMonth;d++){
    const date=pmCurrentMonth+'-'+String(d).padStart(2,'0');
    discLabels.push(String(d));
    const habits=preMarketData[date]?.habits;
    discData.push(habits&&n?Math.round(habits.filter(Boolean).length/n*100):0);
  }
  const pct=Math.round(discData.reduce((a,v)=>a+v,0)/daysInMonth);
  const lbl=document.getElementById('pmDisciplinePct');if(lbl)lbl.textContent=pct+'%';
  const meta=document.getElementById('pmMetaMes');if(meta)meta.textContent=pct+'%';
  if(document.getElementById('pmDisciplineChart')){
    mkChart('pmDisciplineChart',{
      type:'bar',
      data:{labels:discLabels,datasets:[{data:discData,backgroundColor:discData.map(v=>v>=80?'rgba(69,224,123,.7)':v>=50?'rgba(34,213,237,.6)':'rgba(255,93,104,.55)'),borderColor:'transparent',borderRadius:3}]},
      options:{...CHART_OPTS,scales:{x:{...CHART_OPTS.scales?.x,ticks:{font:{size:9}}},y:{...CHART_OPTS.scales?.y,min:0,max:100,ticks:{callback:v=>v+'%',font:{size:9}}}},plugins:{...CHART_OPTS.plugins,legend:{display:false}}},
    });
  }
  _renderPMCorrelCards();
}

function _pmMonthDiscipline(ym){
  const [y,m]=ym.split('-').map(Number);
  const days=new Date(y,m,0).getDate();
  const n=config.pmHabits.length;
  let total=0,done=0;
  for(let d=1;d<=days;d++){
    const date=ym+'-'+String(d).padStart(2,'0');
    const habits=preMarketData[date]?.habits;
    if(habits){total+=n;done+=habits.filter(Boolean).length;}
  }
  return total?Math.round(done/total*100):0;
}

function savePM(){
  // kept for compatibility — habit toggling is now inline via togglePMHabit
}
