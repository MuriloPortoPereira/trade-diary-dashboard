// Pure account balance and drawdown calculation over already ordered trades.
globalThis.TradeDiaryBalanceDrawdown = (() => {
  function calculateBalanceDrawdown(capitalBase, orderedTrades){
    let peak=capitalBase;
    let current=capitalBase;
    let currentDdPct=0;
    let currentDdUsd=0;
    orderedTrades.forEach(t=>{
      current+=(t.pnl||0);
      if(current>peak)peak=current;
      currentDdPct=peak>0?Math.max(0,(peak-current)/peak):0;
      currentDdUsd=Math.max(0,peak-current);
    });
    return {current,peak,currentDdPct,currentDdUsd};
  }

  return {calculateBalanceDrawdown};
})();
