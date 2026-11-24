/*
 * Cenários visuais para o editor de tags (página Setup) e nuvem de tags (página Perfil).
 *
 * Objetivo:
 *   Validar tags editáveis com botões de editar/remover e contadores (`.tag-edit-btn`,
 *   `.tag-delete-btn`, `.tag-count`), o botão descartável `.tag-add`, tags somente-leitura
 *   no Perfil e os três blocos de nuvem de tags (padrão, vazio e rótulos extensos).
 *
 * Papel na verificação visual:
 *   Consumido por `shell-style-check.cjs` nos estados `tag-editor-*` e `tag-cloud-*`.
 *
 * Pontos-chave:
 *   - Usa tags já renderizadas em Setup/Perfil mais um único nó descartável `#styleTagAddFixture`.
 *   - Não muta `config` de forma permanente (restaura no `finally` nos cenários de nuvem).
 */

/*
 * Remove o nó descartável `+ Tag` inserido para inspecionar o estilo `.tag-add`.
 */
function resetTagEditorStyleState() {
  document.getElementById('styleTagAddFixture')?.remove();
}

/*
 * Inspeciona e valida estilos computados das tags em Setup (estratégias/emoções) e Perfil,
 * retornando o seletor CSS de `:hover` nos casos de botão de excluir ou editar.
 */
function prepareTagEditorStyleScenario(name) {
  const before = JSON.stringify({config, accounts, trades, storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  const profile = name === 'tag-editor-profile';
  const secondary = name === 'tag-editor-secondary';
  const list = profile ? document.querySelector('#profileTags .tag-list') : document.getElementById(secondary ? 'emotionTags' : 'strategyTags');
  const tag = list?.querySelector(profile || secondary ? '.tag' : '.tag.strategy-tag');
  const edit = tag?.querySelector('.tag-edit-btn');
  const remove = tag?.querySelector('.tag-delete-btn');
  if (!list || !tag || (!profile && !remove) || (!profile && !secondary && !edit)) throw new Error('Rendered tag controls missing');

  // Insere chip descartável `.tag-add` nas listas editáveis para cobrir seu estilo sem alterar `config`.
  const add = document.createElement('span');
  add.id = 'styleTagAddFixture';
  add.className = 'tag-add';
  add.textContent = '+ Tag';
  if (!profile) list.append(add);
  list.scrollIntoView({block: 'center'});

  // Valida dimensões, padding, borda em pílula e controles internos das tags.
  const listStyle = getComputedStyle(list), tagStyle = getComputedStyle(tag);
  if (listStyle.display !== 'flex' || listStyle.flexWrap !== 'wrap' || listStyle.gap !== '8px' ||
    listStyle.marginTop !== '8px' || tagStyle.display !== 'flex' || tagStyle.minHeight !== '34px' ||
    tagStyle.padding !== (profile || secondary ? '0px 12px' : '0px 6px 0px 12px') ||
    tagStyle.borderRadius !== '999px' || tagStyle.fontSize !== '11px') throw new Error('Tag editor styles changed');

  if (!profile) {
    const removeStyle = getComputedStyle(remove), addStyle = getComputedStyle(add);
    if (removeStyle.width !== '26px' || removeStyle.height !== '26px' || removeStyle.fontSize !== '18px' ||
      addStyle.minHeight !== '34px' || addStyle.padding !== '0px 12px' || addStyle.borderRadius !== '999px') {
      throw new Error('Tag action styles changed');
    }
  }
  if (edit) {
    const editStyle = getComputedStyle(edit);
    if (editStyle.width !== '26px' || editStyle.height !== '26px' || editStyle.fontSize !== '14px') throw new Error('Tag edit styles changed');
  }
  const count = tag.querySelector('.tag-count');
  if (count) {
    const countStyle = getComputedStyle(count);
    if (countStyle.minWidth !== '22px' || countStyle.height !== '20px' || countStyle.fontSize !== '10px' ||
      countStyle.fontWeight !== '700') throw new Error('Tag count styles changed');
  }
  if (profile && tag.querySelector('button')) throw new Error('Profile tags gained editing controls');
  if (before !== JSON.stringify({config, accounts, trades, storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])})) {
    throw new Error('Tag editor scenario changed application data or storage');
  }
  if (name === 'tag-editor-delete-hover') return '#strategyTags .tag-delete-btn';
  if (name === 'tag-editor-edit-hover') return '#strategyTags .tag-edit-btn';
  return null;
}

/*
 * Prepara os cenários da nuvem de tags no Perfil (`tag-cloud-default`, `tag-cloud-empty`
 * e `tag-cloud-long`), re-renderizando com `config` temporário e restaurando no `finally`.
 */
function prepareTagCloudStyleScenario(name) {
  const fingerprint = () => JSON.stringify({accounts, trades, config, preMarketData, studyHubState,
    storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  const before = fingerprint();
  const previousConfig = config;
  try {
    // Ajusta temporariamente listas de estratégias, emoções e mercados para o cenário.
    if (name === 'tag-cloud-empty') config = {...config, strategies: [], emotions: [], markets: []};
    if (name === 'tag-cloud-long') config = {...config,
      strategies: ['Estratégia de caracterização com texto extenso para observar a quebra de linha no perfil'],
      emotions: ['Emoção de caracterização com texto extenso'],
      markets: ['Mercado de caracterização com texto extenso']};
    renderProfilePage();
    const root = document.getElementById('profileTags');
    const blocks = [...root.querySelectorAll('.tag-cloud-block')];
    if (blocks.length !== 3 || blocks.some((block, index) =>
      block.querySelectorAll('.tag').length !== (name === 'tag-cloud-empty' ? 0 : name === 'tag-cloud-long' ? 1 : config[['strategies', 'emotions', 'markets'][index]].length))) {
      throw new Error('Profile tag cloud groups changed');
    }
    // Verifica espaçamento entre blocos e tipografia dos títulos de seção da nuvem.
    for (const [index, block] of blocks.entries()) {
      const heading = block.querySelector('.tag-cloud-title');
      const style = getComputedStyle(heading);
      if (getComputedStyle(block).marginTop !== (index ? '18px' : '0px') ||
        style.marginBottom !== '10px' || style.fontSize !== '10px' ||
        style.fontWeight !== '800' || style.textTransform !== 'uppercase' ||
        style.letterSpacing !== '1.6px') throw new Error('Profile tag cloud style changed');
    }
    root.scrollIntoView({block: 'center'});
  } finally { config = previousConfig; }
  if (before !== fingerprint()) throw new Error('Tag cloud fixture changed data or storage');
}

module.exports = {resetTagEditorStyleState, prepareTagEditorStyleScenario, prepareTagCloudStyleScenario};
