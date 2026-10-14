function onAccountChange(){
  const selId=document.getElementById('t-account')?.value;
  const a=accounts.find(x=>x.id===selId)||getActiveAccount();
  const rp=document.getElementById('t-riskpct');if(rp)rp.value=a.risk;
  const mp=document.getElementById('t-mult');if(mp)mp.value=a.mult||1;
  const pEl=document.getElementById('modePercentFields');
  const aEl=document.getElementById('modeAbsFields');
  if(pEl)pEl.style.display=isFuturesAccount(a)?'none':'';
  if(aEl)aEl.style.display=isFuturesAccount(a)?'':'none';
  const infoEl=document.getElementById('t-acct-info');
  if(infoEl){const acctTrades=getAccountTrades(a.id);const risk=calcAccountRiskState(a,acctTrades);infoEl.innerHTML=`<span style="color:var(--muted)">Saldo: <b style="color:var(--text)">${fR(risk.currentBalance)}</b></span><br><span style="color:var(--muted)">Aportes líquidos: ${fR(risk.cashflowNet)} · Meta: ${a.goalPct}%</span>`;}
  calcRR();
}

function updateMarketFromSymbol(){
  const sym=document.getElementById('t-symbol')?.value;
  const mkt=getMarket(sym);
  const sel=document.getElementById('t-market');if(sel&&mkt)sel.value=mkt;
}
