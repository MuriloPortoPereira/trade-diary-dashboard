function renderAccountCashflowList(){
  const el=document.getElementById('accountCashflowList');if(!el)return;
  const summary=calcAccountCashflow({cashflows:accountFormCashflows});
  if(!accountFormCashflows.length){
    el.innerHTML=`<div class="account-cashflow-empty">Nenhum aporte ou retirada registrada. Saldo atual usa só saldo inicial + P/L.</div>`;
    return;
  }
  el.innerHTML=`
    <div class="account-cashflow-summary">
      <span>Aportes: <b>${fR(summary.deposits)}</b></span>
      <span>Retiradas: <b>${fR(summary.withdrawals)}</b></span>
      <span>Líquido: <b class="${summary.net>=0?'text-green':'text-red'}">${summary.net>=0?'+':''}${fR(summary.net)}</b></span>
    </div>
    ${accountFormCashflows.map((flow,i)=>`
      <div class="account-cashflow-row">
        <span class="${flow.type==='withdrawal'?'text-red':'text-green'}">${flow.type==='withdrawal'?'Retirada':'Aporte'}</span>
        <span class="mono">${fDate(flow.date)}</span>
        <strong>${fR(flow.amount)}</strong>
        <span>${escapeHtml(flow.note||'—')}</span>
        <button class="btn btn-danger btn-sm btn-icon" onclick="removeAccountFormCashflow(${i})">×</button>
      </div>`).join('')}`;
}
