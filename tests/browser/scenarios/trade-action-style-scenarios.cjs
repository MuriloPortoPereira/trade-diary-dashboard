// Presentation states for bulk actions and modal flow; no persisted data mutation.
function resetTradeActionStyleState() {
  const flow = document.getElementById('tradeModalFlow');
  if (flow) flow.style.display = '';
}

function prepareTradeActionStyleScenario(name) {
  const before = JSON.stringify({accounts, trades, storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  const bar = document.getElementById('bulkBar');
  const hint = document.getElementById('bulkHint');
  if (!bar || !hint) throw new Error('Trade bulk controls missing');
  if (name === 'trade-actions-selected') {
    const checkbox = document.querySelector('#logTbody input[type="checkbox"]');
    checkbox?.click();
    if (!checkbox?.checked || !bar.classList.contains('show')) throw new Error('Trade selection did not open bulk actions');
  } else if (name === 'trade-actions-modal-flow') {
    document.querySelector('#topbar [data-i18n="topbar.newTrade"]').click();
    const flow = document.getElementById('tradeModalFlow');
    flow.style.display = 'flex';
    const actions = flow.querySelector('.trade-modal-flow-actions');
    if (!document.getElementById('tradeModal').classList.contains('open') || getComputedStyle(flow).gap !== '10px' ||
      getComputedStyle(actions).display !== 'flex' || getComputedStyle(actions).gap !== '6px') throw new Error('Trade modal flow styles changed');
    flow.scrollIntoView({block: 'center'});
  }
  const barStyle = getComputedStyle(bar), hintStyle = getComputedStyle(hint);
  if (name === 'trade-actions-selected' && (barStyle.display !== 'flex' || barStyle.gap !== '8px' || hintStyle.display !== 'none')) {
    throw new Error('Visible bulk action styles changed');
  }
  if (name === 'trade-actions-hidden' && (barStyle.display !== 'none' || hintStyle.display !== 'flex' ||
    hintStyle.minHeight !== '32px' || hintStyle.borderRadius !== '999px')) throw new Error('Hidden bulk action styles changed');
  if (before !== JSON.stringify({accounts, trades, storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])})) {
    throw new Error('Trade action scenario changed application data or storage');
  }
  return null;
}

module.exports = {resetTradeActionStyleState, prepareTradeActionStyleScenario};
