// Strategy analysis application helpers; classic-script globals remain compatible.
// Dependencies: activeAccountId, calcMetrics, fR, normalizeClockTime,
// clockToMinutes and formatClockMinutes supplied by the application composition.
// Account context and formatting dependencies intentionally remain at this layer.

function formatStrategyRatio(value){
  if(value===Infinity)return'∞';
  if(value===-Infinity)return'-∞';
  return Number.isFinite(value)?value.toFixed(2):'—';
}

function getStrategySnapshots(arr, acctId=activeAccountId){
  const closed=arr.filter(t=>t.status==='WIN'||t.status==='LOSS'||t.status==='BE');
  const map={};
  closed.forEach(t=>{
    const key=t.strategy||'Sem estratégia';
    if(!map[key])map[key]={pnl:0,w:0,n:0,rs:[],lastDate:'',best:null,trades:[]};
    map[key].pnl+=(t.pnl||0);
    map[key].n++;
    map[key].trades.push(t);
    if(t.status==='WIN')map[key].w++;
    if(t.r!=null)map[key].rs.push(t.r);
    if(t.date&&(!map[key].lastDate||t.date>map[key].lastDate))map[key].lastDate=t.date;
    if((map[key].best==null||(t.pnl||0)>map[key].best)&&t.pnl!=null)map[key].best=t.pnl;
  });
  return Object.entries(map).map(([name,data])=>{
    const metrics=calcMetrics(data.trades,acctId);
    return {
      name,
      pnl:data.pnl,
      wr:data.n?(data.w/data.n)*100:0,
      n:data.n,
      wins:data.w,
      avgR:data.rs.length?data.rs.reduce((sum,v)=>sum+v,0)/data.rs.length:0,
      pf:metrics.pf,
      exp:metrics.exp,
      sharpe:metrics.sharpe,
      sortino:metrics.sortino,
      calmar:metrics.calmar,
      recovery:metrics.recovery,
      maxDD:metrics.maxDD,
      maxDDusd:metrics.maxDDusd,
      startBal:metrics.startBal,
      lastDate:data.lastDate,
      best:data.best,
      trades:[...data.trades],
    };
  }).sort((a,b)=>b.pnl-a.pnl||b.wr-a.wr||b.n-a.n);
}

function getClosedStrategyTradesChronologically(source=[]){
  return (Array.isArray(source)?source:[])
    .filter(t=>t&&['WIN','LOSS','BE'].includes(t.status))
    .sort((a,b)=>{
      const aKey=`${a.date||''} ${normalizeClockTime(a.openTime)||normalizeClockTime(a.exitTime)||''} ${a.createdAt||''}`;
      const bKey=`${b.date||''} ${normalizeClockTime(b.openTime)||normalizeClockTime(b.exitTime)||''} ${b.createdAt||''}`;
      return aKey<bKey?-1:aKey>bKey?1:0;
    });
}

function buildStrategyEquitySeries(row){
  const closed=getClosedStrategyTradesChronologically(row?.trades);
  let running=Number.isFinite(row?.startBal)&&row.startBal>0?row.startBal:1000;
  const points=[parseFloat(running.toFixed(2))];
  closed.forEach(trade=>{
    running+=(trade.pnl||0);
    points.push(parseFloat(running.toFixed(2)));
  });
  return {closed,points};
}

function getStrategyCompareMetricDefs(){
  return [
    {key:'n',label:'Trades',better:'higher',get:row=>row?.n||0,format:value=>String(value||0)},
    {key:'wr',label:'Win Rate',better:'higher',get:row=>row?.wr||0,format:value=>`${(value||0).toFixed(1)}%`},
    {key:'pnl',label:'P/L',better:'higher',get:row=>row?.pnl||0,format:value=>`${value>=0?'+':''}${fR(value||0)}`},
    {key:'avgR',label:'Avg R',better:'higher',get:row=>row?.avgR||0,format:value=>`${value>=0?'+':''}${(value||0).toFixed(2)}R`},
    {key:'exp',label:'Expectância',better:'higher',get:row=>row?.exp||0,format:value=>`${value>=0?'+':''}${(value||0).toFixed(3)}R`},
    {key:'pf',label:'Profit Factor',better:'higher',get:row=>row?.pf??0,format:value=>formatStrategyRatio(value)},
    {key:'maxDD',label:'Max DD',better:'lower',get:row=>(row?.maxDD||0)*100,format:value=>`${(value||0).toFixed(1)}%`},
    {key:'recovery',label:'Fator Rec.',better:'higher',get:row=>row?.recovery??0,format:value=>formatStrategyRatio(value)},
  ];
}

function averageNumber(values=[]){
  const list=(Array.isArray(values)?values:[])
    .map(v=>Number(v))
    .filter(v=>Number.isFinite(v));
  if(!list.length)return null;
  return list.reduce((sum,v)=>sum+v,0)/list.length;
}

function medianNumber(values=[]){
  const list=(Array.isArray(values)?values:[])
    .map(v=>Number(v))
    .filter(v=>Number.isFinite(v))
    .sort((a,b)=>a-b);
  if(!list.length)return null;
  const mid=Math.floor(list.length/2);
  return list.length%2?list[mid]:(list[mid-1]+list[mid])/2;
}

function getStrategyOutcomeStats(row){
  const closed=getClosedStrategyTradesChronologically(row?.trades);
  const wins=closed.filter(t=>t.status==='WIN');
  const losses=closed.filter(t=>t.status==='LOSS');
  const bes=closed.filter(t=>t.status==='BE');
  const pnlValues=closed.map(t=>Number(t.pnl)).filter(v=>Number.isFinite(v));
  return {
    total:closed.length,
    wins:wins.length,
    losses:losses.length,
    bes:bes.length,
    winRatePct:closed.length?(wins.length/closed.length)*100:0,
    lossRatePct:closed.length?(losses.length/closed.length)*100:0,
    beRatePct:closed.length?(bes.length/closed.length)*100:0,
    avgWinPnl:averageNumber(wins.map(t=>t.pnl)),
    avgLossPnl:averageNumber(losses.map(t=>t.pnl)),
    medianPnl:medianNumber(pnlValues),
    bestPnl:pnlValues.length?Math.max(...pnlValues):null,
    worstPnl:pnlValues.length?Math.min(...pnlValues):null,
  };
}

function getTimingWindowLabel(startMinutes,bucketSize=30){
  if(!Number.isFinite(startMinutes))return'—';
  const start=((Math.round(startMinutes)%(24*60))+(24*60))%(24*60);
  return `${formatClockMinutes(start)}-${formatClockMinutes(start+bucketSize-1)}`;
}

function getDominantTimingWindow(source=[],bucketSize=30){
  const buckets={};
  (Array.isArray(source)?source:[]).forEach(trade=>{
    const minutes=clockToMinutes(trade?.openTime);
    if(minutes==null)return;
    const bucketStart=Math.floor(minutes/bucketSize)*bucketSize;
    if(!buckets[bucketStart])buckets[bucketStart]={count:0,pnl:0};
    buckets[bucketStart].count++;
    buckets[bucketStart].pnl+=(trade?.pnl||0);
  });
  const winner=Object.entries(buckets).sort((a,b)=>b[1].count-a[1].count||b[1].pnl-a[1].pnl||Number(a[0])-Number(b[0]))[0];
  if(!winner)return{label:'—',count:0,pnl:0};
  return{
    label:getTimingWindowLabel(Number(winner[0]),bucketSize),
    count:winner[1].count,
    pnl:winner[1].pnl,
  };
}

function coerceStrategyCompareValue(value, reference=1){
  if(value===Infinity)return Math.max(reference,1)*1.25;
  if(value===-Infinity)return -Math.max(reference,1)*1.25;
  return Number.isFinite(value)?value:0;
}

function getStrategyCompareScores(def,rowA,rowB){
  const rawA=def.get(rowA);
  const rawB=def.get(rowB);
  const ref=Math.max(
    Number.isFinite(rawA)?Math.abs(rawA):0,
    Number.isFinite(rawB)?Math.abs(rawB):0,
    1
  );
  const a=coerceStrategyCompareValue(rawA,ref);
  const b=coerceStrategyCompareValue(rawB,ref);
  if(Math.abs(a-b)<1e-9)return[100,100];
  if(def.better==='lower'){
    const max=Math.max(a,b);
    const min=Math.min(a,b);
    const range=max-min||1;
    return [
      +(((max-a)/range)*100).toFixed(1),
      +(((max-b)/range)*100).toFixed(1),
    ];
  }
  const max=Math.max(a,b);
  const min=Math.min(a,b,0);
  const range=max-min||1;
  return [
    +(((a-min)/range)*100).toFixed(1),
    +(((b-min)/range)*100).toFixed(1),
  ];
}

function getStrategyMetricWinner(def,rowA,rowB){
  const ref=Math.max(
    Math.abs(def.get(rowA)||0),
    Math.abs(def.get(rowB)||0),
    1
  );
  const a=coerceStrategyCompareValue(def.get(rowA),ref);
  const b=coerceStrategyCompareValue(def.get(rowB),ref);
  if(Math.abs(a-b)<1e-9)return'Empate';
  if(def.better==='lower')return a<b?rowA.name:rowB.name;
  return a>b?rowA.name:rowB.name;
}
