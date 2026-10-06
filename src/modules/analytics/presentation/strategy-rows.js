function renderStrategyRows(targetId, rows, limit=5){
  const el=document.getElementById(targetId);
  if(!el)return;
  if(!rows.length){
    el.innerHTML='<div class="strategy-row"><div class="strategy-row-title">Sem trades suficientes</div><div class="strategy-row-meta"><span>Registre operações fechadas para ranquear setups.</span></div></div>';
    return;
  }
  const sliced=rows.slice(0,limit);
  const maxPnl=Math.max(...sliced.map(r=>Math.abs(r.pnl)),1);
  el.innerHTML=sliced.map(row=>`
    <div class="strategy-row">
      <div class="strategy-row-head">
        <div class="strategy-row-title">${escapeHtml(row.name)}</div>
        <div class="strategy-row-pnl ${row.pnl>=0?'text-green':'text-red'}">${row.pnl>=0?'+':''}${fR(row.pnl)}</div>
      </div>
      <div class="strategy-progress"><span style="width:${Math.max((Math.abs(row.pnl)/maxPnl)*100,8)}%;background:${row.pnl>=0?'linear-gradient(90deg, var(--accent), var(--green))':'linear-gradient(90deg, var(--red), #ff9aa1)'}"></span></div>
      <div class="strategy-row-meta">
        <span>${row.n} trades</span>
        <span>${row.wr.toFixed(0)}% WR</span>
        <span>FR ${formatStrategyRatio(row.recovery)}</span>
      </div>
    </div>`).join('');
}
