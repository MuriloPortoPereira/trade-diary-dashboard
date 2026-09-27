function resetPremarketErrorChipStyleState() {
  selectedErrors = [];
  renderErrorChips();
}

function preparePremarketErrorChipStyleScenario(name) {
  const before = JSON.stringify({accounts, trades, preMarketData, storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  let hover = null;
  if (name.startsWith('premarket-')) {
    const grid = document.querySelector('#pmHabitGrid .pm-grid');
    const dot = grid?.querySelector('.pm-dot');
    if (!grid || !dot || !grid.querySelector('.pm-grid-day') || !grid.querySelector('.pm-grid-label')) throw new Error('Premarket grid changed');
    if (name === 'premarket-dot-hover') hover = '#pmHabitGrid .pm-dot';
    if (name === 'premarket-dot-done') {
      dot.classList.add('pm-dot-done');
      if (!dot.classList.contains('pm-dot-done')) throw new Error('Premarket done state missing');
    }
    grid.scrollIntoView({block: 'center'});
  } else {
    document.querySelector('#topbar [data-i18n="topbar.newTrade"]').click();
    const grid = document.getElementById('errorChips');
    const chip = grid.querySelector('.err-chip');
    if (!document.getElementById('tradeModal').classList.contains('open') || !chip) throw new Error('Trade error chips changed');
    if (name === 'trade-error-chip-hover') hover = '#errorChips .err-chip';
    if (name === 'trade-error-chip-selected') {
      chip.click();
      if (!grid.querySelector('.err-chip.on')) throw new Error('Trade error selected state missing');
    }
    grid.scrollIntoView({block: 'center'});
  }
  if (before !== JSON.stringify({accounts, trades, preMarketData, storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])})) {
    throw new Error('Premarket/error-chip scenario changed persisted data');
  }
  return hover;
}

module.exports = {resetPremarketErrorChipStyleState, preparePremarketErrorChipStyleScenario};
