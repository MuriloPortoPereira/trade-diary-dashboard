// Pure account cashflow totals. Classic-script namespace retained during migration.
globalThis.TradeDiaryAccountCashflow = (() => {
  function calculateCashflowTotals(flows=[]){
    return flows.reduce((sum,flow)=>{
      const amount=Math.abs(parseFloat(flow.amount)||0);
      if(flow.type==='withdrawal')sum.withdrawals+=amount;
      else sum.deposits+=amount;
      sum.net=sum.deposits-sum.withdrawals;
      return sum;
    },{deposits:0,withdrawals:0,net:0});
  }

  return {calculateCashflowTotals};
})();
