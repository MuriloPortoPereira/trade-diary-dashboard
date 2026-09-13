// Existing renderers and change handlers, with temporary data in an isolated profile.
function prepareStrategyStyleScenario(name) {
  const previousTrades = trades, previousAccounts = accounts;
  const dataBefore = JSON.stringify({accounts, trades});
  const storageBefore = JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
  const selectA = document.getElementById('stStratA'), selectB = document.getElementById('stStratB');
  try {
    if (previousTrades.length !== 2) throw new Error('Strategy scenarios require the two-trade fixture');
    trades = previousTrades.map((trade, index) => ({...trade, strategy: index ? 'Pullback' : 'Breakout'}));
    selectA.value = ''; selectB.value = '';
    if (name.startsWith('strategy-rank-')) {
      renderDashStrategyBoard(name === 'strategy-rank-empty' ? [] : trades);
      const board = document.getElementById('dashStrategyBoard');
      if (name === 'strategy-rank-empty') {
        if (!board.textContent.includes('Sem trades suficientes')) throw new Error('Empty strategy ranking missing');
      } else if (!board.querySelector('.strategy-row-pnl.text-green') || !board.querySelector('.strategy-row-pnl.text-red')) {
        throw new Error('Positive or negative strategy ranking missing');
      }
      board.scrollIntoView({block: 'center'});
    } else {
      renderStats();
      const choose = (select, value) => {
        select.value = value;
        select.dispatchEvent(new Event('change', {bubbles: true}));
        if (select.value !== value) throw new Error('Strategy selection was not preserved');
      };
      choose(selectA, 'Breakout');
      if (name !== 'strategy-compare-single') choose(selectB, name === 'strategy-compare-same' ? 'Breakout' : 'Pullback');
      if (name === 'strategy-compare-empty') { choose(selectA, ''); choose(selectB, ''); }
      if (name === 'strategy-compare-swapped') { choose(selectA, 'Pullback'); choose(selectB, 'Breakout'); }
      const empty = ['strategy-compare-empty', 'strategy-compare-single', 'strategy-compare-same'].includes(name);
      const full = document.getElementById('stCmpFull'), emptyPanel = document.getElementById('stCmpEmpty');
      if (getComputedStyle(full).display !== (empty ? 'none' : 'grid') ||
        getComputedStyle(emptyPanel).display !== (empty ? 'grid' : 'none')) throw new Error('Strategy panel visibility changed');
      if (!empty) {
        const cards = document.querySelectorAll('#stCmpCards .strategy-compare-card');
        const firstName = name === 'strategy-compare-swapped' ? 'Pullback' : 'Breakout';
        if (cards.length !== 2 || !cards[0].querySelector('.chart-title').textContent.includes(firstName) ||
          !document.querySelector('#stCmpSummaryBody .strategy-compare-winner')) throw new Error('Comparison cards or winner missing');
        for (const id of ['stCmpEquityChart', 'stCmpMetricBarsChart', 'stCmpOutcomeChart', 'stCmpTimingChart']) {
          if (!Object.values(Chart.instances).some(chart => chart.canvas.id === id) ||
            !document.getElementById(id).getClientRects().length) throw new Error(`Comparison chart missing: ${id}`);
        }
      }
      const target = name === 'strategy-compare-focus' ? selectA : empty ? emptyPanel :
        name === 'strategy-compare-charts' ? full.querySelector('.strategy-compare-grid') :
        name === 'strategy-compare-swapped' ? document.getElementById('stCmpSummaryBody') : document.getElementById('stCmpCards');
      target.scrollIntoView({block: 'center'});
      if (name === 'strategy-compare-focus') {
        selectA.focus({preventScroll: true});
        if (document.activeElement !== selectA) throw new Error('Strategy selector did not focus');
      }
    }
  } finally { trades = previousTrades; accounts = previousAccounts; }
  if (dataBefore !== JSON.stringify({accounts, trades}) ||
    storageBefore !== JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]))) {
    throw new Error('Strategy presentation scenario changed data or storage');
  }
}

module.exports = {prepareStrategyStyleScenario};
