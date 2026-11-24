/*
 * Cenários visuais para a barra de abas nativa e o contêiner raiz do StudyHub
 * (`#studyHubTabs` e `#studyHubNativeRoot`).
 *
 * Objetivo:
 *   Validar seleção das quatro abas (`propfirm`, `plano`, `tradesim`, `mental`),
 *   largura mínima responsiva por breakpoint (720px e 1080px), hover ativo/inativo,
 *   foco via teclado, rolagem horizontal das abas e fixação `position: sticky` durante
 *   a rolagem vertical da página.
 *
 * Papel na verificação visual:
 *   Consumido por `shell-style-check.cjs` nos estados `study-native-*`.
 *
 * Pontos-chave:
 *   - `resetStudyHubNativeStyleState` restaura `scrollLeft` de `#studyHubTabs` entre casos.
 *   - Valida fingerprint de estado da aplicação e `localStorage` ao final.
 */

/*
 * Restaura a posição de rolagem horizontal da barra de abas do StudyHub entre casos.
 */
function resetStudyHubNativeStyleState() {
  document.getElementById('studyHubTabs').scrollLeft = 0;
}

/*
 * Ativa a aba correspondente ao cenário `name`, valida o layout computado de `#studyHubTabs`
 * e `#studyHubNativeRoot`, exercita foco/hover/rolagem horizontal/sticky e retorna eventual
 * seletor de `:hover`.
 */
async function prepareStudyHubNativeStyleScenario(name) {
  const fingerprint = () => JSON.stringify({accounts, trades, config, preMarketData, studyHubState,
    storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  const before = fingerprint();

  // Seleciona a aba do módulo alvo e aguarda dois quadros para estabilização do DOM.
  const state = name.slice('study-native-'.length);
  const modules = ['propfirm', 'plano', 'tradesim', 'mental'];
  const selected = modules.includes(state) ? state : 'propfirm';
  const tabs = document.getElementById('studyHubTabs');
  const button = tabs.querySelector(`[onclick*="'${selected}'"]`);
  button.click();
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (!document.getElementById('page-studyHub').classList.contains('active') ||
    tabs.querySelectorAll('.tab-btn.active').length !== 1 || !button.classList.contains('active') ||
    !document.getElementById('mod-' + selected).classList.contains('active')) {
    throw new Error('Native StudyHub selection changed');
  }

  // Confere grade sticky de 4 colunas e largura mínima responsiva dos botões de aba.
  const style = getComputedStyle(tabs);
  const minWidth = matchMedia('(max-width:720px)').matches ? '178px' :
    matchMedia('(max-width:1080px)').matches ? '184px' : '190px';
  const rootStyle = getComputedStyle(document.getElementById('studyHubNativeRoot'));
  if (style.display !== 'grid' || style.position !== 'sticky' || style.gap !== '6px' ||
    style.gridTemplateColumns.split(' ').length !== 4 || getComputedStyle(button).minWidth !== minWidth ||
    rootStyle.marginTop !== '16px' || rootStyle.minWidth !== '0px') {
    throw new Error('Native StudyHub layout changed');
  }

  // Estados de interação: hover em aba ativa/inativa, foco, rolagem horizontal e aderência sticky.
  let hover;
  if (state === 'hover-inactive' || state === 'hover-active' || state === 'focus') {
    const target = state === 'hover-active' ? button : tabs.querySelector('[onclick*="plano"]');
    target.scrollIntoView({block: 'nearest', inline: 'center'});
    if (state === 'focus') target.focus({preventScroll: true});
    else hover = state === 'hover-active' ? '#studyHubTabs .tab-btn.active' : '#studyHubTabs [onclick*="plano"]';
  }
  if (state === 'horizontal-scroll') {
    tabs.scrollLeft = tabs.scrollWidth;
    if ((tabs.scrollWidth > tabs.clientWidth) !== (tabs.scrollLeft > 0)) {
      throw new Error('Native StudyHub horizontal scroll changed');
    }
  }
  if (state === 'sticky') {
    const main = document.querySelector('main');
    const scroller = getComputedStyle(main).overflowY === 'visible' ? document.scrollingElement : main;
    const topBefore = tabs.getBoundingClientRect().top;
    const scrollBefore = scroller.scrollTop;
    scroller.scrollTo({top: topBefore + 250, behavior: 'instant'});
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const delta = scroller.scrollTop - scrollBefore;
    const topAfter = tabs.getBoundingClientRect().top;
    if (delta <= 0 || topAfter > topBefore + 1 || topAfter <= topBefore - delta + 1) {
      throw new Error('Native StudyHub sticky position changed');
    }
  }
  if (before !== fingerprint()) throw new Error('Native StudyHub presentation changed data or storage');
  return hover;
}

module.exports = {resetStudyHubNativeStyleState, prepareStudyHubNativeStyleScenario};
