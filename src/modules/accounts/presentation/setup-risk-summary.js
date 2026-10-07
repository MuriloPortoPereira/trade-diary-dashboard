function renderSetupRiskSummary(){
  const acct=getActiveAccount();
  if(!acct)return;
  const risk=calcAccountRiskState(acct,getAccountTrades(acct.id));
  const setText=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
  setText('setupInitialBalance',fR(risk.initialBalance));
  setText('setupCashflowNet',(risk.cashflowNet>=0?'+':'')+fR(risk.cashflowNet));
  setText('setupCurrentBalance',fR(risk.currentBalance));
  setText('setupRiskPerTrade',`${f2(acct.risk||0)}% · ${fR(risk.riskPerTradeUsd)}`);
  setText('setupDailyDdLimit',`${f2(acct.ddDaily||0)}% · ${fR(risk.dayLimit)}`);
  setText('setupWeeklyDdLimit',`${f2(acct.ddWeekly||0)}% · ${fR(risk.weekLimit)}`);
  setText('setupMonthlyDdLimit',`${f2(acct.ddMonthly||0)}% · ${fR(risk.monthLimit)}`);
  setText('setupMaxDdLimit',`${f2(acct.ddTotal||0)}% · ${fR(risk.totalLimit)}`);
}
