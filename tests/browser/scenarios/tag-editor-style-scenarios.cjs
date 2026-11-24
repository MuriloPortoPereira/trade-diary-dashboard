// Uses rendered Setup/Profile tags plus one disposable tag-add fixture; no config mutation.
function resetTagEditorStyleState() {
  document.getElementById('styleTagAddFixture')?.remove();
}

function prepareTagEditorStyleScenario(name) {
  const before = JSON.stringify({config, accounts, trades, storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  const profile = name === 'tag-editor-profile';
  const secondary = name === 'tag-editor-secondary';
  const list = profile ? document.querySelector('#profileTags .tag-list') : document.getElementById(secondary ? 'emotionTags' : 'strategyTags');
  const tag = list?.querySelector(profile || secondary ? '.tag' : '.tag.strategy-tag');
  const edit = tag?.querySelector('.tag-edit-btn');
  const remove = tag?.querySelector('.tag-delete-btn');
  if (!list || !tag || (!profile && !remove) || (!profile && !secondary && !edit)) throw new Error('Rendered tag controls missing');

  const add = document.createElement('span');
  add.id = 'styleTagAddFixture';
  add.className = 'tag-add';
  add.textContent = '+ Tag';
  if (!profile) list.append(add);
  list.scrollIntoView({block: 'center'});

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

function prepareTagCloudStyleScenario(name) {
  const fingerprint = () => JSON.stringify({accounts, trades, config, preMarketData, studyHubState,
    storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  const before = fingerprint();
  const previousConfig = config;
  try {
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
