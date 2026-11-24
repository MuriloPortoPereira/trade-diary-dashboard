/*
 * Cenários visuais para a grade de hábitos de Pré-Mercado (`#pmHabitGrid`) e para os
 * chips de erro de trade (`#errorChips`) no modal de operação.
 *
 * Objetivo:
 *   Validar estados da grade de pré-mercado (base, ponto sob hover e ponto concluído
 *   `.pm-dot-done`) e dos chips de erro de execução (ocioso, hover e selecionado
 *   `.on`).
 *
 * Papel na verificação visual:
 *   Consumido por `shell-style-check.cjs` nos estados `premarket-*` e
 *   `trade-error-chip-*`.
 *
 * Pontos-chave:
 *   - `resetPremarketErrorChipStyleState` limpa `selectedErrors` e re-renderiza os
 *     chips.
 *   - Garante ausência de mutação em contas, trades, `preMarketData` e
 *     `localStorage`.
 */

/*
 * Limpa a seleção de chips de erro em memória e re-renderiza o grupo entre casos.
 */
function resetPremarketErrorChipStyleState() {
  selectedErrors = [];
  renderErrorChips();
}

/*
 * Prepara o estado da grade de pré-mercado ou dos chips de erro de trade conforme
 * `name` e retorna o seletor CSS de `:hover` quando o cenário inspeciona interação de
 * ponteiro.
 */
function preparePremarketErrorChipStyleScenario(name) {
  const before = JSON.stringify({accounts, trades, preMarketData, storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  let hover = null;
  if (name.startsWith('premarket-')) {
    // Cenários da grade de hábitos de Pré-Mercado: base, hover em `.pm-dot` e ponto
    // concluído.
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
    // Cenários dos chips de erro no modal de trade: ocioso, hover e seleção via
    // clique.
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
