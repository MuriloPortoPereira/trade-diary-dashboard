function prepareAccountOverviewStyleScenario(name) {
  const fingerprint = () => JSON.stringify({accounts, trades, activeAccountId,
    storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  const before = fingerprint();
  const previousAccounts = accounts;
  try {
    if (name === 'account-overview-empty') accounts = [];
    else if (name === 'account-overview-multiple') {
      accounts = [...accounts, {...accounts[0], id: 'visual-secondary', name: 'Conta secundária', color: '#69e07b'}];
    } else if (name === 'account-overview-long-title') {
      accounts = accounts.map((account, index) => index ? account : {...account,
        name: 'Conta de caracterização com nome longo para verificar a quebra de linha no cabeçalho'});
    }
    renderAccountsPage();
    const grid = document.getElementById('accountsOverview');
    const style = (element, pseudo) => getComputedStyle(element, pseudo);
    const width = innerWidth;
    if (style(grid).display !== 'grid' || style(grid).gap !== '14px' ||
      style(grid).gridTemplateColumns.split(' ').length !== (width <= 1420 ? 1 : 2)) {
      throw new Error('Account overview grid changed');
    }
    const cards = [...grid.querySelectorAll('.account-overview-card')];
    const count = name === 'account-overview-empty' ? 0 : name === 'account-overview-multiple' ? 2 : 1;
    if (cards.length !== count) throw new Error('Account overview card count changed');
    for (const card of cards) {
      const head = card.querySelector('.account-overview-head');
      const actions = card.querySelector('.account-overview-actions');
      const stats = card.querySelector('.account-overview-stats');
      const title = card.querySelector('.account-overview-title');
      const dot = card.querySelector('.account-color-dot');
      const rows = [...card.querySelectorAll('.account-risk-row')];
      if (style(card).padding !== '22px' || style(card).borderRadius !== '8px' ||
        style(card, '::before').opacity !== '0' || style(head).display !== 'flex' ||
        style(head).flexWrap !== (width <= 720 ? 'wrap' : 'nowrap') ||
        style(actions).display !== 'flex' || style(actions).flexWrap !== 'wrap' ||
        style(title).fontSize !== '22px' || !style(title).fontFamily.includes('Syne') ||
        parseFloat(style(dot).width) <= 0 || parseFloat(style(dot).width) > 11 || style(stats).display !== 'grid' ||
        style(stats).gridTemplateColumns.split(' ').length !== (width <= 720 ? 1 : 4) ||
        rows.length !== 3 || rows.some(row => style(row).gridTemplateColumns.split(' ').length !== (width <= 720 ? 1 : 3))) {
        throw new Error('Account overview presentation changed');
      }
      for (const progress of card.querySelectorAll('.mini-progress')) {
        if (style(progress).height !== '8px' || style(progress).overflow !== 'hidden' ||
          style(progress.firstElementChild).display !== 'block') throw new Error('Account progress presentation changed');
      }
    }
    if (name === 'account-overview-multiple' &&
      (!cards[0].querySelector('.badge.long') || !cards[1].querySelector('button[onclick*="selectAccount"]'))) {
      throw new Error('Active/inactive account actions changed');
    }
    if (name === 'account-overview-long-title' && !cards[0].querySelector('.account-overview-title').textContent.includes('nome longo')) {
      throw new Error('Long account title missing');
    }
    grid.scrollIntoView({block: 'center'});
  } finally { accounts = previousAccounts; }
  if (before !== fingerprint()) throw new Error('Account overview fixture changed data or storage');
}

module.exports = {prepareAccountOverviewStyleScenario};
