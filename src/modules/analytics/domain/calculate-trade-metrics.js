// Pure trade metrics. Classic-script namespace retained during migration.
globalThis.TradeDiaryTradeMetrics = (() => {
  function calculateTradeMetrics(data=[],startBal=1000){
    const closed=data.filter(t=>t.status==='WIN'||t.status==='LOSS'||t.status==='BE');
    const wins=closed.filter(t=>t.status==='WIN');
    const losses=closed.filter(t=>t.status==='LOSS');
    const bes=closed.filter(t=>t.status==='BE');
    const totalPnl=closed.reduce((a,t)=>a+(t.pnl||0),0);
    const wr=closed.length?wins.length/closed.length:0;
    const avgWin=wins.length?wins.reduce((a,t)=>a+(t.r||0),0)/wins.length:0;
    const avgLoss=losses.length?Math.abs(losses.reduce((a,t)=>a+(t.r||0),0)/losses.length):0;
    const exp=closed.length?(wr*avgWin-(1-wr)*avgLoss):0;
    const grossW=wins.reduce((a,t)=>a+(t.pnl||0),0);
    const grossL=Math.abs(losses.reduce((a,t)=>a+(t.pnl||0),0));
    const pf=grossL>0?grossW/grossL:wins.length?Infinity:0;

    let peak=startBal,trough=startBal,maxDD=0,maxDDusd=0,running=startBal;
    [...closed].reverse().forEach(t=>{
      running+=(t.pnl||0);
      if(running>peak){peak=running;trough=running;}
      else if(running<trough){trough=running;}
      const dd=peak>0?(peak-trough)/peak:0;
      const ddusd=peak-trough;
      if(dd>maxDD){maxDD=dd;maxDDusd=ddusd;}
    });

    const dailyPnl={};
    closed.forEach(t=>{const k=t.date||'';dailyPnl[k]=(dailyPnl[k]||0)+(t.pnl||0);});
    const daily=Object.values(dailyPnl);
    const meanD=daily.length?daily.reduce((a,v)=>a+v,0)/daily.length:0;
    const stdD=daily.length>1?Math.sqrt(daily.reduce((a,v)=>a+(v-meanD)**2,0)/(daily.length-1)):0;
    const sharpe=stdD>0?(meanD/stdD)*Math.sqrt(252):0;
    const negDaily=daily.filter(v=>v<0);
    const stdDown=negDaily.length>1?Math.sqrt(negDaily.reduce((a,v)=>a+v**2,0)/negDaily.length):0;
    const sortino=stdDown>0?(meanD/stdDown)*Math.sqrt(252):0;
    const annualReturn=daily.length>0?(meanD*252):0;
    const calmar=maxDD>0?(annualReturn/startBal)/maxDD:0;
    const recovery=maxDDusd>0?totalPnl/maxDDusd:(totalPnl>0?Infinity:0);

    let curStreak=0,maxWS=0,maxLS=0,lastDir='',tempLs=0,maxLoseStreakPnl=0;
    [...closed].reverse().forEach(t=>{
      if(t.status===lastDir){curStreak++;}else{curStreak=1;lastDir=t.status;}
      if(t.status==='WIN')maxWS=Math.max(maxWS,curStreak);
      else{maxLS=Math.max(maxLS,curStreak);}
      if(t.status==='LOSS'){tempLs+=(t.pnl||0);} else{if(tempLs<maxLoseStreakPnl)maxLoseStreakPnl=tempLs;tempLs=0;}
    });

    return {closed,wins,losses,bes,totalPnl,wr,avgWin,avgLoss,exp,pf,maxDD,maxDDusd,
      sharpe,sortino,calmar,recovery,maxWS,maxLS,maxLoseStreakPnl,grossW,grossL,startBal};
  }

  return {calculateTradeMetrics};
})();
