globalThis.TradeDiaryStudyHubCalculations = (() => {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function countStudyChecklistItems(text){
    return String(text||'').split(/\n|,/).map(item=>item.trim()).filter(Boolean).length;
  }

  function seededRand(seed){
    let value=seed>>>0;
    return()=>{value+=0x6D2B79F5;let t=Math.imul(value^value>>>15,1|value);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};
  }

  function getStudyPropSnapshot(prop){
    const accountSize=Math.max(prop.accountSize||0,0);
    const riskUsd=accountSize*((prop.riskPct||0)/100);
    const dailyLimitUsd=accountSize*((prop.dailyDdPct||0)/100);
    const maxLimitUsd=accountSize*((prop.maxDdPct||0)/100);
    const targetUsd=accountSize*((prop.targetPct||0)/100);
    const payoutGrossUsd=targetUsd*((prop.payoutPct||0)/100);
    const deductionPct=clamp(((prop.taxPct||0)+(prop.feePct||0))/100,0,0.95);
    const payoutNetUsd=payoutGrossUsd*(1-deductionPct);
    const payoutNetBrl=payoutNetUsd*(prop.fxRate||1);
    const tradeTargetUsd=riskUsd*(prop.rrr||0);
    const tradesToTarget=tradeTargetUsd>0?Math.ceil(targetUsd/tradeTargetUsd):0;
    const dailyStopTrades=riskUsd>0?Math.floor(dailyLimitUsd/riskUsd):0;
    const maxStopTrades=riskUsd>0?Math.floor(maxLimitUsd/riskUsd):0;
    const breakevenWr=prop.rrr>0?(1/(1+prop.rrr))*100:100;
    return {accountSize,riskUsd,dailyLimitUsd,maxLimitUsd,targetUsd,payoutGrossUsd,payoutNetUsd,payoutNetBrl,tradeTargetUsd,tradesToTarget,dailyStopTrades,maxStopTrades,breakevenWr};
  }

  function getStudyMentalSnapshot(mental){
    const normalized=((mental.focus||0)+(mental.energy||0)+(mental.discipline||0)+(6-(mental.stress||0)))/20;
    const score=Math.round(clamp(normalized,0,1)*100);
    const tone=score>=75?'safe':score>=55?'warn':'danger';
    return {score,tone};
  }

  function buildStudySimulation(params){
    const runs=Math.max(20,Math.min(1000,params.runs||200));
    const tradesCount=Math.max(5,Math.min(300,params.trades||30));
    const riskPct=(params.riskPct||0)/100;
    const wr=(params.winRate||0)/100;
    const rrr=params.rrr||1;
    const seed=params.seed||1;
    const labels=Array.from({length:tradesCount+1},(_,i)=>i);
    const stepBuckets=labels.map(()=>[]);
    let positives=0;

    for(let run=0;run<runs;run++){
      const rand=seededRand(seed+run*7919);
      let balance=params.capital||0;
      stepBuckets[0].push(balance);
      for(let step=1;step<=tradesCount;step++){
        const change=balance*riskPct*(rand()<wr?rrr:-1);
        balance=Math.max(0,balance+change);
        stepBuckets[step].push(balance);
      }
      if(balance>=(params.capital||0))positives++;
    }

    const percentile=(arr,p)=>{
      const sorted=[...arr].sort((a,b)=>a-b);
      const idx=(sorted.length-1)*p;
      const low=Math.floor(idx),high=Math.ceil(idx);
      if(low===high)return sorted[low];
      return sorted[low]+(sorted[high]-sorted[low])*(idx-low);
    };

    const p10=stepBuckets.map(bucket=>percentile(bucket,0.10));
    const p50=stepBuckets.map(bucket=>percentile(bucket,0.50));
    const p90=stepBuckets.map(bucket=>percentile(bucket,0.90));
    return {labels,p10,p50,p90,positiveRate:positives/runs};
  }

  return {countStudyChecklistItems, seededRand, getStudyPropSnapshot, getStudyMentalSnapshot, buildStudySimulation};
})();
