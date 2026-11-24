/*
 * Cenários visuais para as tabelas de trades (tabela recente no Dashboard e log
 * completo `#logTable` na página de Histórico).
 *
 * Objetivo:
 *   Cobrir cabeçalho fixo (`sticky`) sob rolagem vertical no Dashboard, ordenação
 *   ascendente/descendente com indicadores (`↑`/`↓`), seleção individual e em massa,
 *   trades incompletos com aviso `#incompleteAlert` e todos os badges (`win`, `loss`,
 *   `open`, `incomplete`, `long`, `short`), tabela vazia, rolagem horizontal e hover.
 *
 * Papel na verificação visual:
 *   Consumido por `shell-style-check.cjs` nos estados `table-*`.
 *
 * Pontos-chave:
 *   - `resetTradeTableStyleState` restaura ordenação padrão, limpa seleção e zera
 *     rolagem.
 *   - Substitui `trades` apenas em memória quando necessário e restaura no `finally`.
 */

/*
 * Reseta apenas os controles transitórios da tabela de trades entre capturas
 * isoladas.
 */
function resetTradeTableStyleState() {
  sortState = {col: 'date', dir: 'desc'};
  document.querySelectorAll('.sort-ind').forEach(el => { el.textContent = ''; });
  document.getElementById('si-date').textContent = '↓';
  clearSelection();
  document.getElementById('logTable').parentElement.scrollLeft = 0;
}

/*
 * Prepara o estado de tabela correspondente a `name`, valida comportamento de
 * rolagem, ordenação, seleção, badges e aviso de incompletos, e retorna eventual
 * seletor de `:hover`.
 */
function prepareTradeTableStyleScenario(name) {
  const previousTrades = trades, previousAccounts = accounts;
  const before = JSON.stringify({accounts, trades, storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  let hover = null;
  try {
    if (name === 'table-dashboard-sticky') {
      // Gera 20 linhas temporárias para confirmar que o cabeçalho `th` permanece
      // sticky ao rolar.
      trades = Array.from({length: 20}, (_, i) => ({...previousTrades[i % 2], id: `visual-table-${i}`}));
      renderDashboard();
      const scroller = document.querySelector('.dashboard-table-scroll');
      scroller.scrollIntoView({block: 'center'});
      scroller.scrollTop = 100;
      const header = scroller.querySelector('th');
      if (document.querySelectorAll('#recentTrades tr').length !== 20 || scroller.scrollTop <= 0 ||
        getComputedStyle(header).position !== 'sticky' || Math.abs(header.getBoundingClientRect().top - scroller.getBoundingClientRect().top) > 1) {
        throw new Error('Recent trade header did not remain sticky during vertical scroll');
      }
    } else {
      // Prepara variações de dados em memória (trades incompletos/abertos ou lista
      // vazia) e renderiza `#logTable`.
      if (name.startsWith('table-incomplete')) {
        trades = [
          {...previousTrades[0], direction: 'Long', incomplete: true, missing_fields: ['strategy']},
          {...previousTrades[1], direction: 'Short', incomplete: false, missing_fields: []},
          {...previousTrades[0], id: 'visual-open', date: '2026-09-11', direction: 'Long', status: 'OPEN', pnl: 0, r: null, exit: null, incomplete: false, missing_fields: []},
        ];
      }
      if (name === 'table-empty') trades = [];
      renderLog();
      const table = document.getElementById('logTable'), scroller = table.parentElement;
      const ids = () => [...table.querySelectorAll('tbody input[type="checkbox"]')].map(el => el.dataset.id);
      table.scrollIntoView({block: 'center'});

      // Ordenação por P/L (ascendente e descendente) com checagem de ordem das linhas
      // e seta.
      if (name.startsWith('table-sort-') && name !== 'table-sort-hover') {
        const th = table.querySelector('[onclick="sortLog(\'pnl\')"]');
        th.click();
        if (name === 'table-sort-desc') th.click();
        const ascending = name === 'table-sort-asc';
        if (JSON.stringify(ids()) !== JSON.stringify(ascending ? ['visual-loss', 'visual-win'] : ['visual-win', 'visual-loss']) ||
          sortState.dir !== (ascending ? 'asc' : 'desc') || document.getElementById('si-pnl').textContent !== (ascending ? '↑' : '↓')) {
          throw new Error('Trade sort order or indicator changed');
        }
        th.scrollIntoView({block: 'center'});
      }

      // Seleção individual, selecionar todos e limpeza total da seleção.
      if (name === 'table-row-selected-hover') {
        table.querySelector('tbody input[type="checkbox"]').click();
        if (selectedTrades.size !== 1 || table.querySelectorAll('tr.selected').length !== 1) throw new Error('Trade row selection changed');
      }
      if (['table-select-all', 'table-clear-selection'].includes(name)) {
        document.getElementById('chkAll').click();
        if (selectedTrades.size !== 2 || table.querySelectorAll('tr.selected').length !== 2) throw new Error('Select all changed');
        if (name === 'table-clear-selection') {
          document.getElementById('chkAll').click();
          if (selectedTrades.size || table.querySelector('tr.selected') || document.getElementById('bulkBar').classList.contains('show')) throw new Error('Clearing selection changed');
        }
      }

      // Validação de trades incompletos, banner de alerta, badges e foco no botão de
      // correção.
      if (name.startsWith('table-incomplete')) {
        const alert = document.getElementById('incompleteAlert');
        if (getComputedStyle(alert).display !== 'block' || document.getElementById('incompleteCount').textContent !== '1' ||
          !table.querySelector('tr.trade-row-incomplete')) throw new Error('Incomplete row or notice missing');
        for (const badge of ['win', 'loss', 'open', 'incomplete', 'long', 'short']) {
          if (!table.querySelector(`.badge.${badge}`)) throw new Error(`Trade badge missing: ${badge}`);
        }
        if (name === 'table-incomplete-focus') {
          scroller.scrollLeft = scroller.scrollWidth;
          alert.scrollIntoView({block: 'center'});
          const link = alert.querySelector('.btn-link-warn'); link.focus({preventScroll: true});
          if (document.activeElement !== link) throw new Error('Incomplete action did not focus');
        }
      }

      // Tabela vazia, rolagem horizontal completa e seleção de alvos de hover.
      if (name === 'table-empty' && (ids().length || !table.querySelector('tbody td[colspan="22"]'))) throw new Error('Empty trade table changed');
      if (name === 'table-log-scroll') {
        scroller.scrollLeft = scroller.scrollWidth;
        if (scroller.scrollWidth > scroller.clientWidth && scroller.scrollLeft <= 0) throw new Error('Trade table did not scroll horizontally');
      }
      if (['table-row-hover', 'table-row-selected-hover'].includes(name)) hover = '#logTbody tr:first-child';
      if (name === 'table-sort-hover') hover = '#logThead [onclick="sortLog(\'date\')"]';
    }
  } finally { trades = previousTrades; accounts = previousAccounts; }
  if (before !== JSON.stringify({accounts, trades, storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])})) {
    throw new Error('Trade table scenario changed data or storage');
  }
  return hover;
}

module.exports = {resetTradeTableStyleState, prepareTradeTableStyleScenario};
