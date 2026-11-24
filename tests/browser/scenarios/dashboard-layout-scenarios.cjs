/*
 * Cenários de layout executados no navegador para a grade do Dashboard.
 *
 * Objetivo:
 *   Validar o estado de hover sobre cartões de gráfico (`.chart-card`) e o comportamento
 *   de rolagem horizontal/vertical do contêiner de trades recentes (`.dashboard-table-scroll`).
 *
 * Papel na verificação visual:
 *   Consumido por `shell-style-check.cjs` nos casos `layout-chart-hover` e
 *   `layout-table-scroll`, reutilizando o fixture isolado do Dashboard.
 *
 * Pontos-chave:
 *   - Confere `overflow-x: auto` e `overflow-y: auto` além do deslocamento efetivo de rolagem.
 */

/*
 * Prepara o cenário de layout do Dashboard (`layout-chart-hover` ou rolagem da tabela
 * recente) e retorna o seletor de hover quando aplicável.
 */
function prepareDashboardLayoutScenario(name) {
  if (name === 'layout-chart-hover') {
    // Centraliza o cartão de gráfico e delega o `:hover` forçado ao runner CDP.
    const card = document.querySelector('.dashboard-chart-stack .chart-grid-3 .chart-card');
    card.scrollIntoView({block: 'center'});
    return '.dashboard-chart-stack .chart-grid-3 .chart-card';
  }
  // Exercita rolagem máxima horizontal e vertical no contêiner da tabela de trades recentes.
  const panel = document.querySelector('.dashboard-lower-grid');
  const scroller = panel.querySelector('.dashboard-table-scroll');
  panel.scrollIntoView({block: 'start'});
  scroller.scrollLeft = scroller.scrollWidth;
  scroller.scrollTop = scroller.scrollHeight;
  if (scroller.scrollWidth > scroller.clientWidth && scroller.scrollLeft <= 0) {
    throw new Error('Recent trades table did not scroll horizontally');
  }
  if (scroller.scrollHeight > scroller.clientHeight && scroller.scrollTop <= 0) {
    throw new Error('Recent trades table did not scroll vertically');
  }
  if (getComputedStyle(scroller).overflowX !== 'auto' || getComputedStyle(scroller).overflowY !== 'auto') {
    throw new Error('Recent trades scroll container changed');
  }
  return null;
}

module.exports = {prepareDashboardLayoutScenario};
