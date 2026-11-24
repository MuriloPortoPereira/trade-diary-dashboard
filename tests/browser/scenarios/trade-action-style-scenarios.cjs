/*
 * Cenários visuais para a barra de ações em lote (`#bulkBar`, `#bulkHint`) da tabela
 * de trades e para o cabeçalho de fluxo sequencial do modal de trade
 * (`#tradeModalFlow`).
 *
 * Objetivo:
 *   Validar os estados de ações em lote ocultas (dica visível), selecionadas (barra
 *   ativa) e fluxo guiado no modal de cadastro/edição, sem mutar dados persistidos.
 *
 * Papel na verificação visual:
 *   Consumido por `shell-style-check.cjs` nos estados `trade-actions-hidden`,
 *   `trade-actions-selected` e `trade-actions-modal-flow`.
 *
 * Pontos-chave:
 *   - `resetTradeActionStyleState` limpa o estilo inline de exibição de
 *     `#tradeModalFlow`.
 *   - Confirma que dados de conta, trades e `localStorage` permanecem intactos.
 */

/*
 * Restaura o estilo inline de `#tradeModalFlow` entre execuções de cenário.
 */
function resetTradeActionStyleState() {
  const flow = document.getElementById('tradeModalFlow');
  if (flow) flow.style.display = '';
}

/*
 * Configura o estado visual das ações em lote ou do fluxo do modal de trade indicado
 * por `name` e valida as propriedades computadas de exibição, espaçamento e bordas.
 */
function prepareTradeActionStyleScenario(name) {
  const before = JSON.stringify({accounts, trades, storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  const bar = document.getElementById('bulkBar');
  const hint = document.getElementById('bulkHint');
  if (!bar || !hint) throw new Error('Trade bulk controls missing');

  if (name === 'trade-actions-selected') {
    // Seleciona o primeiro trade da tabela para exibir a barra de ações em lote.
    const checkbox = document.querySelector('#logTbody input[type="checkbox"]');
    checkbox?.click();
    if (!checkbox?.checked || !bar.classList.contains('show')) throw new Error('Trade selection did not open bulk actions');
  } else if (name === 'trade-actions-modal-flow') {
    // Abre `#tradeModal` e expõe a faixa de navegação de fluxo (`#tradeModalFlow`).
    document.querySelector('#topbar [data-i18n="topbar.newTrade"]').click();
    const flow = document.getElementById('tradeModalFlow');
    flow.style.display = 'flex';
    const actions = flow.querySelector('.trade-modal-flow-actions');
    if (!document.getElementById('tradeModal').classList.contains('open') || getComputedStyle(flow).gap !== '10px' ||
      getComputedStyle(actions).display !== 'flex' || getComputedStyle(actions).gap !== '6px') throw new Error('Trade modal flow styles changed');
    flow.scrollIntoView({block: 'center'});
  }

  // Valida alternância de visibilidade e estilos entre `#bulkBar` e `#bulkHint`.
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
