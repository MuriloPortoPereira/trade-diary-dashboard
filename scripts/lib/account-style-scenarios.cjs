// Presentation fixtures only: existing renderers, isolated profile, no persistence.
function prepareAccountStyleScenario(name) {
  const storageBefore = JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
  const dataBefore = JSON.stringify({accounts, trades});
  if (name.startsWith('account-risk-')) {
    const goal = name === 'account-risk-goal';
    renderRiskBoard(getActiveAccount(), [{date: '2026-09-11', status: goal ? 'WIN' : 'LOSS', pnl: goal ? 210 : -35}]);
    for (const tone of goal ? ['safe'] : ['safe', 'warn', 'danger']) {
      if (!document.querySelector(`#riskProgress .risk-progress-fill.${tone}`) ||
        !document.querySelector(`#riskProgress .risk-progress-value--${tone}`)) throw new Error(`Risk progress tone missing: ${tone}`);
    }
    for (const tone of goal ? ['safe'] : ['safe', 'warn', 'danger', 'neutral']) {
      if (!document.querySelector(`#riskSignals .risk-alert-chip.${tone}`)) throw new Error(`Risk signal tone missing: ${tone}`);
    }
    if (!document.querySelector(`#riskProgress .risk-badge-${goal ? 'safe' : 'danger'}`)) throw new Error('Risk badge missing');
    document.querySelector('.risk-command-grid').scrollIntoView({block: 'center'});
  } else {
    const empty = name === 'account-cashflow-empty';
    const flows = empty ? [] : [
      {id: 'visual-deposit', type: 'deposit', date: '2026-09-10', amount: 125, note: 'Aporte de teste'},
      {id: 'visual-withdrawal', type: 'withdrawal', date: '2026-09-11', amount: 25, note: ''},
    ];
    const modal = name !== 'account-cashflow-setup';
    if (modal) {
      document.getElementById('acctPill').click();
      const previous = accountFormCashflows;
      const previousId = editingAccountId;
      try {
        editAccount(getActiveAccount().id);
        accountFormCashflows = flows; renderAccountCashflowList();
      } finally { accountFormCashflows = previous; editingAccountId = previousId; }
    } else {
      // getActiveAccount normalizes into a new accounts array, including inside the renderer.
      const previousAccounts = accounts;
      try { getActiveAccount().cashflows = flows; renderSetupCashflowList(); }
      finally { accounts = previousAccounts; }
    }
    const list = document.getElementById(modal ? 'accountCashflowList' : 'setupCashflowList');
    if (!list.getClientRects().length || list.querySelectorAll('.account-cashflow-row').length !== (empty ? 0 : 2) ||
      !list.querySelector(empty ? '.account-cashflow-empty' : '.account-cashflow-summary')) {
      throw new Error('Cashflow rows or summary missing');
    }
    list.scrollIntoView({block: 'center'});
  }
  const storageAfter = JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
  if (storageBefore !== storageAfter) throw new Error('Presentation scenario changed storage');
  if (dataBefore !== JSON.stringify({accounts, trades})) throw new Error('Presentation scenario changed account or trade data');
}

module.exports = {prepareAccountStyleScenario};
