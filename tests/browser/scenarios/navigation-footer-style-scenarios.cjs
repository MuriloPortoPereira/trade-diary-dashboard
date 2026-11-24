/*
 * Cenários visuais para o rodapé de navegação secundária da barra lateral
 * (`.sidebar-footer`).
 *
 * Objetivo:
 *   Validar os quatro itens de navegação secundária (`.sidebar-meta-nav
 *   .nav-item-meta`), incluindo ativação da página de Perfil pelo rodapé, abertura da
 *   sidebar, rolagem até o final do menu e estado de hover.
 *
 * Papel na verificação visual:
 *   Consumido por `shell-style-check.cjs` nos estados `navigation-footer-hover` e
 *   `navigation-footer-profile`.
 *
 * Pontos-chave:
 *   - Confere espaçamentos, altura mínima (50px) e tipografia dos links do rodapé.
 *   - Valida integridade de dados e `localStorage` ao final.
 */

/*
 * Abre a barra lateral, navega para Perfil quando solicitado, rola até o último item
 * do rodapé, valida estilos computados e retorna o seletor de `:hover` se aplicável.
 */
function prepareNavigationFooterStyleScenario(name) {
  const fingerprint = () => JSON.stringify({accounts, trades, config, preMarketData, studyHubState,
    storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  const before = fingerprint();

  // Localiza a estrutura do rodapé da sidebar e confirma os 4 itens de
  // meta-navegação.
  const sidebar = document.getElementById('sidebar');
  const footer = sidebar.querySelector('.sidebar-footer');
  const meta = footer.querySelector('.sidebar-meta-nav');
  const items = [...meta.querySelectorAll('.nav-item-meta')];
  if (items.length !== 4) throw new Error('Footer navigation items changed');

  // No cenário `navigation-footer-profile`, ativa o item de Perfil pelo próprio
  // rodapé.
  if (name === 'navigation-footer-profile') {
    items.find(item => item.getAttribute('onclick').includes("'profile'")).click();
    if (!document.querySelector('#page-profile.active') || !meta.querySelector('.nav-item-meta.active')) {
      throw new Error('Footer profile navigation changed');
    }
  }

  // Abre a sidebar via botão hambúrguer e garante visibilidade do último item do
  // rodapé.
  document.getElementById('hamburger').click();
  if (!sidebar.classList.contains('open') || !document.getElementById('sidebar-overlay').classList.contains('show')) {
    throw new Error('Footer sidebar did not open');
  }
  items.at(-1).scrollIntoView({block: 'end'});

  // Valida layout flex, gaps, altura mínima, tipografia e rolagem vertical da
  // sidebar.
  const footerStyle = getComputedStyle(footer), metaStyle = getComputedStyle(meta);
  const itemStyle = getComputedStyle(items[0]);
  if (footerStyle.display !== 'flex' || footerStyle.flexDirection !== 'column' || footerStyle.gap !== '12px' ||
    metaStyle.gap !== '4px' || itemStyle.minHeight !== '50px' || itemStyle.fontSize !== '12px' ||
    itemStyle.paddingLeft !== '14px' || itemStyle.marginBottom !== '0px') throw new Error('Footer navigation styles changed');
  if (sidebar.scrollHeight > sidebar.clientHeight && sidebar.scrollTop <= 0) throw new Error('Footer navigation did not scroll');
  if (before !== fingerprint()) throw new Error('Footer navigation changed data or storage');
  return name === 'navigation-footer-hover' ? '#sidebar .sidebar-meta-nav .nav-item-meta:first-child' : null;
}

module.exports = {prepareNavigationFooterStyleScenario};
