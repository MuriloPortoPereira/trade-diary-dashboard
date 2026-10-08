function renderLogMetrics(arr,incompleteCount){
  const el=document.getElementById('logMetrics');
  if(!el)return;
  const m=calcMetrics(arr);
  const riskTrades=arr.filter(t=>t.riskUsd!=null);
  const avgRisk=riskTrades.length ? riskTrades.reduce((sum,t)=>sum+(t.riskUsd||0),0)/riskTrades.length : 0;
  const cards=[
    {cls:'c-blue',lbl:'Registros filtrados',val:String(arr.length),sub:`${m.closed.length} trades fechados`},
    {cls:'c-green',lbl:'P/L filtrado',val:`${m.totalPnl>=0?'+':''}${fR(m.totalPnl)}`,sub:'resultado do filtro atual'},
    {cls:'c-yellow',lbl:'Win rate',val:`${(m.wr*100).toFixed(1)}%`,sub:`${m.wins.length} wins · ${m.losses.length} losses`},
    {cls:incompleteCount?'c-red':'c-purple',lbl:'Controle',val:incompleteCount?`${incompleteCount} incompletos`:fR(avgRisk),sub:incompleteCount?'pedem revisão':'risco médio por operação'},
  ];
  el.innerHTML=cards.map(c=>`
    <div class="metric-card ${c.cls}">
      <div class="m-label">${c.lbl}</div>
      <div class="m-value">${c.val}</div>
      <div class="m-sub">${c.sub}</div>
    </div>`).join('');
}
