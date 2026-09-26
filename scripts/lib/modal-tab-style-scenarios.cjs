function resetModalTabStyleState() {
  document.querySelectorAll('#page-import .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick')?.includes("'csv'"));
  });
  document.getElementById('importTab-csv').style.display = '';
  document.getElementById('importTab-export').style.display = 'none';
  studyHubTab = 'propfirm';
  document.querySelectorAll('#studyHubTabs .tab-btn').forEach((btn, index) => btn.classList.toggle('active', index === 0));
}

function prepareModalTabStyleScenario(name) {
  const fingerprint = () => JSON.stringify({accounts, trades,
    storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  const before = fingerprint();

  if (name === 'modal-trade-scroll') {
    document.querySelector('#topbar [data-i18n="topbar.newTrade"]').click();
    const modal = document.getElementById('tradeModal');
    const body = modal.querySelector('.modal-body');
    body.scrollTop = body.scrollHeight;
    if (!modal.classList.contains('open') || body.scrollTop <= 0 || body.scrollHeight <= body.clientHeight) {
      throw new Error('Scrollable trade modal missing');
    }
  }

  if (name === 'modal-csv-footer') {
    openModal('csvConfirmModal');
    const modal = document.getElementById('csvConfirmModal');
    const footer = modal.querySelector('.modal-footer');
    if (!modal.classList.contains('open') || footer.children.length !== 2 ||
      getComputedStyle(footer).justifyContent !== 'flex-end') throw new Error('CSV modal footer missing');
  }

  if (name === 'modal-dialog-input') {
    const previous = appDialogState;
    openAppDialog({title: 'Título de caracterização', message: 'Mensagem longa para caracterizar o diálogo comum.',
      input: true, inputLabel: 'Nome', inputValue: 'Cenário visual', confirmText: 'Continuar'});
    appDialogState = previous;
    const input = document.getElementById('appDialogInput');
    input.focus({preventScroll: true});
    if (!document.getElementById('appDialogModal').classList.contains('open') ||
      document.activeElement !== input || input.value !== 'Cenário visual') throw new Error('Input dialog missing');
  }

  if (name === 'tabs-import-export') {
    switchImportTab('export');
    const active = document.querySelector('#page-import .tab-btn.active');
    if (!active?.getAttribute('onclick')?.includes("'export'") ||
      getComputedStyle(document.getElementById('importTab-export')).display === 'none') throw new Error('Export tab did not open');
  }

  if (name === 'tabs-calendar-biweek') {
    setCalView('biweek');
    if (!document.getElementById('calBtnBiweek').classList.contains('active') || calViewMode !== 'biweek') {
      throw new Error('Biweekly calendar tab did not open');
    }
  }

  if (name === 'tabs-studyhub-plano') {
    const previous = studyHubTab;
    const button = document.querySelector('#studyHubTabs [onclick*="plano"]');
    button.click();
    studyHubTab = previous;
    if (!button.classList.contains('active') || !document.getElementById('studyHubLegacyApp').getClientRects().length) {
      throw new Error('StudyHub plan tab did not open');
    }
  }

  if (before !== fingerprint()) throw new Error('Modal/tab presentation changed account/trade data or storage');
}

module.exports = {resetModalTabStyleState, prepareModalTabStyleScenario};
