function updateTopbarStats(options={}){
  const shouldFit=options.fit!==false;
  const a=getActiveAccount();
  const acctTrades=getAccountTrades(a.id);
  const risk=calcAccountRiskState(a,acctTrades);
  const now=new Date();
  const ws=new Date(now);ws.setDate(now.getDate()-now.getDay());
  const weekPnl=acctTrades.filter(t=>{if(!t.date)return false;return new Date(t.date+'T12:00')>=ws;}).reduce((s,t)=>s+(t.pnl||0),0);
  const monthPnl=acctTrades.filter(t=>{if(!t.date)return false;const d=new Date(t.date+'T12:00');return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();}).reduce((s,t)=>s+(t.pnl||0),0);
  const setSub=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text;};
  const pct=(v)=>risk.capitalBase?(v/risk.capitalBase)*100:0;
  setTopbarValue('tbWeek',{full:formatSignedMoney(weekPnl)},weekPnl>=0?'g':'r');
  setSub('tbWeekSub',formatTopbarSignedPct(pct(weekPnl),1));
  setTopbarValue('tbMonth',{full:formatSignedMoney(monthPnl)},monthPnl>=0?'g':'r');
  setSub('tbMonthSub',formatTopbarSignedPct(pct(monthPnl),1));
  setTopbarValue('tbDD',{full:fR(risk.currentDdUsd)},risk.currentDdUsd>0?'r':'g');
  setSub('tbDDSub',`${(risk.currentDdPct*100).toFixed(1)}%`);
  const goalDonePct=risk.goalTarget>0?clamp(risk.totalPnl/risk.goalTarget*100,0,100):0;
  const goalCfg=topbarGoalPctLabel(a.goalPct||0);
  setTopbarValue('tbGoal',{full:`${goalDonePct.toFixed(0)}%`},goalDonePct>=100?'g':'y');
  setSub('tbGoalSub',`${fR(Math.max(risk.totalPnl,0))}/${fR(risk.goalTarget)}`);
  setTopbarValue('topBadge',{full:fR(risk.currentBalance)},risk.totalPnl>=0?'green':'red','tb-badge');
  if(shouldFit)fitTopbarDensity();
}
