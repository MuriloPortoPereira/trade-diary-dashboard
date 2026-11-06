// Pure simulation projections. Load after simulation sizing.
globalThis.TradeDiarySimulationProjection = (() => {
  const {toSimulationNumber,roundSimulationMoney}=TradeDiarySimulationSizing;
  function clampWinRatePct(value){
    return Math.min(99,Math.max(1,toSimulationNumber(value,55)));
  }

  function calculateSimulationPlan({trades=20,winRatePct=55,rrr=1,riskUsd=0,goalUsd=0,stopUsd=0}={}){
    const cleanTrades=Math.max(1,parseInt(trades)||20);
    const wr=clampWinRatePct(winRatePct)/100;
    const cleanRrr=Math.max(0,toSimulationNumber(rrr,1));
    const risk=Math.max(0,toSimulationNumber(riskUsd,0));
    const goal=Math.max(0,toSimulationNumber(goalUsd,0));
    const stop=Math.max(0,toSimulationNumber(stopUsd,0));
    const winUsd=risk*cleanRrr;
    const expectancy=wr*winUsd-(1-wr)*risk;
    const winsToGoal=winUsd>0&&goal>0?Math.ceil(goal/winUsd):0;
    const lossesToStop=risk>0&&stop>0?Math.floor(stop/risk):0;
    const expectedTradesToGoal=expectancy>0&&goal>0?Math.ceil(goal/expectancy):0;
    return {cleanTrades,risk,goal,stop,expectancy,winsToGoal,lossesToStop,expectedTradesToGoal};
  }

  function buildMonteCarloBalanceProjection({balance,trades,winRate,rrr,riskUsd,goalUsd,stopUsd,scenarioCount=100},random=Math.random){
    const startBalance=roundSimulationMoney(balance);
    const N=Math.max(parseInt(trades,10)||0,1);
    const wr=Math.min(0.99,Math.max(0.01,toSimulationNumber(winRate,0.55)));
    const risk=toSimulationNumber(riskUsd,0);
    const labels=[...Array(N+1)].map((_,i)=>i);
    const scenarios=[];
    for(let s=0;s<scenarioCount;s++){
      let balanceNow=startBalance;
      const line=[startBalance];
      for(let i=0;i<N;i++){
        balanceNow+=random()<wr?rrr*risk:-risk;
        line.push(roundSimulationMoney(balanceNow));
      }
      scenarios.push(line);
    }
    const results=scenarios.map(line=>line[N]).sort((a,b)=>a-b);
    const medianLine=labels.map((_,i)=>{
      const values=scenarios.map(line=>line[i]).sort((a,b)=>a-b);
      return values[Math.floor(values.length/2)];
    });
    const goalBalance=roundSimulationMoney(startBalance+goalUsd);
    const stopBalance=roundSimulationMoney(startBalance-stopUsd);
    return{
      labels,
      scenarios,
      medianLine,
      goalBalance,
      stopBalance,
      probPositive:results.filter(value=>value>startBalance).length,
      probGoal:results.filter(value=>value>=goalBalance).length,
      probStop:results.filter(value=>value<=stopBalance).length,
    };
  }

  return {clampWinRatePct,calculateSimulationPlan,buildMonteCarloBalanceProjection};
})();
