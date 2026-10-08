function syncAccountBalanceChrome(acct=getActiveAccount(), acctTrades=getAccountTrades(acct?.id)){
  if(!acct)return null;
  const risk=calcAccountRiskState(acct,acctTrades);
  const sideBalance=document.getElementById('sideBalance');
  if(sideBalance)sideBalance.textContent=fR(risk.currentBalance); // legado — mantido para compatibilidade
  const sideChange=document.getElementById('sideBalanceChange');
  if(sideChange){
    sideChange.textContent=formatAccountBalanceChange(risk);
    const isNegative=risk.totalPnl<0 || (risk.totalPnl===0 && (risk.cashflowNet||0)<0);
    sideChange.style.color=isNegative?'var(--red)':'var(--green)';
  }
  const sideCount=document.getElementById('sideTradeCount');
  if(sideCount)sideCount.textContent=acctTrades.length;
  return risk;
}
