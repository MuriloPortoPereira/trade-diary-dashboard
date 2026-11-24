/*
 * Cenários visuais para as grades principais de duas colunas das páginas de
 * workspace: Strategy Hub (`.strategy-hub-layout`), Perfil (`.profile-grid`) e
 * Parceiros (`.partner-config-grid`).
 *
 * Objetivo:
 *   Validar transição responsiva de 2 colunas para 1 coluna no breakpoint `1420px`,
 *   espaçamento (`gap: 14px`), margem inferior condicional para último filho da
 *   página e ocultação da grade legada `#partnersGrid`.
 *
 * Papel na verificação visual:
 *   Consumido por `shell-style-check.cjs` nos estados `workspace-grid-strategy`,
 *   `workspace-grid-profile` e `workspace-grid-partners`.
 *
 * Pontos-chave:
 *   - Operação estritamente de inspeção visual, validando fingerprint de estado e
 *     `localStorage`.
 */

/*
 * Localiza as grades da página de workspace indicada por `name`, confere colunas,
 * espaçamentos e margens computadas, e centraliza a última grade na viewport.
 */
function prepareWorkspaceGridStyleScenario(name) {
  const fingerprint = () => JSON.stringify({accounts, trades, config, preMarketData, studyHubState,
    storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  const before = fingerprint();

  // Mapeia o sufixo do cenário para a página ativa e os seletores de grade esperados.
  const target = name.slice('workspace-grid-'.length);
  const page = {strategy: 'strategyHub', profile: 'profile', partners: 'partners'}[target];
  const selectors = {strategy: ['.strategy-hub-layout'], profile: ['.profile-grid:not(.profile-grid-secondary)', '.profile-grid-secondary'],
    partners: ['.partner-config-grid']}[target];
  const root = document.getElementById('page-' + page);
  if (!root?.classList.contains('active')) throw new Error('Workspace grid page did not open');

  // Valida contagem de colunas (1 abaixo/igual a 1420px, 2 acima), gap e margem
  // inferior.
  const columns = matchMedia('(max-width: 1420px)').matches ? 1 : 2;
  let last;
  for (const selector of selectors) {
    const grid = root.querySelector(selector);
    if (!grid || grid.children.length !== 2) throw new Error('Workspace grid content changed');
    const style = getComputedStyle(grid);
    const marginBottom = grid.matches('.page > *:last-child') ? '0px' : '14px';
    if (style.display !== 'grid' || style.gridTemplateColumns.split(' ').length !== columns ||
      style.gap !== '14px' || style.marginBottom !== marginBottom) throw new Error('Workspace grid layout changed');
    last = grid;
  }
  if (target === 'partners' && getComputedStyle(document.getElementById('partnersGrid')).display !== 'none') {
    throw new Error('Legacy partner grid became visible');
  }
  last.scrollIntoView({block: 'center'});
  if (before !== fingerprint()) throw new Error('Workspace grid presentation changed data or storage');
}

module.exports = {prepareWorkspaceGridStyleScenario};
