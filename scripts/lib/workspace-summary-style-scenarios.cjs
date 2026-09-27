function resetWorkspaceSummaryStyleState() {
  for (const saved of window.workspaceSummaryStyleRestore || []) {
    document.getElementById(saved.id).innerHTML = saved.html;
  }
  delete window.workspaceSummaryStyleRestore;
}

function prepareWorkspaceSummaryStyleScenario(name) {
  const fingerprint = () => JSON.stringify({accounts, trades, config, preMarketData, studyHubState,
    storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  const before = fingerprint();
  const remember = target => {
    window.workspaceSummaryStyleRestore = [{id: target.id, html: target.innerHTML}];
  };
  const tones = ['safe', 'warn', 'danger', 'info'];
  const rgb = {safe: '69, 224, 123', warn: '255, 206, 103', danger: '255, 93, 104', info: '34, 213, 237'};
  let target;
  if (name === 'workspace-summary-profile') {
    target = document.querySelector('#profileHero .hero-metric-grid');
    const grid = getComputedStyle(target);
    const columns = matchMedia('(max-width:720px)').matches ? 1 : 2;
    const compact = getComputedStyle(document.querySelector('#profileRiskPanel .status-list.compact'));
    if (target.children.length !== 4 || grid.display !== 'grid' || grid.gap !== '12px' ||
      grid.marginTop !== '18px' || grid.gridTemplateColumns.split(' ').length !== columns ||
      compact.display !== 'flex' || compact.flexDirection !== 'column' || compact.gap !== '10px' || compact.marginTop !== '12px') {
      throw new Error('Profile summary layout changed');
    }
    for (const card of target.children) {
      const style = getComputedStyle(card), label = getComputedStyle(card.querySelector('span'));
      const value = getComputedStyle(card.querySelector('strong'));
      if (style.padding !== '16px 18px' || style.borderRadius !== '18px' || label.fontSize !== '10px' ||
        label.textTransform !== 'uppercase' || value.fontSize !== '16px' || value.marginTop !== '10px' ||
        !value.fontFamily.includes('DM Mono')) throw new Error('Profile summary card changed');
    }
  } else if (name.startsWith('workspace-summary-status-')) {
    target = document.getElementById('notificationFeed');
    remember(target);
    const empty = name.endsWith('-empty');
    renderStatusList(target.id, empty ? [] : tones.map(tone => ({tone, title: 'Resumo ' + tone,
      summary: 'Mensagem longa de caracterização para observar quebra de linha e o espaço entre descrição, valor e ação.',
      value: '100,00', actionPage: 'dashboard', actionLabel: 'Abrir'})));
    const list = getComputedStyle(target);
    if (list.display !== 'flex' || list.flexDirection !== 'column' || list.gap !== '10px' || list.marginTop !== '14px' ||
      target.children.length !== (empty ? 1 : 4)) throw new Error('Notification summary list changed');
    for (const [index, item] of [...target.children].entries()) {
      const tone = empty ? 'info' : tones[index], style = getComputedStyle(item);
      const alpha = {safe: '0.16', warn: '0.18', danger: '0.18', info: '0.16'}[tone];
      if (!item.classList.contains(tone) || style.display !== 'flex' || style.gap !== '14px' ||
        style.padding !== '14px 16px' || style.borderRadius !== '18px' ||
        style.flexWrap !== (matchMedia('(max-width:720px)').matches ? 'wrap' : 'nowrap') ||
        style.backgroundColor !== `rgba(${rgb[tone]}, 0.08)` || style.borderTopColor !== `rgba(${rgb[tone]}, ${alpha})` ||
        getComputedStyle(item.querySelector('.status-item-title')).fontSize !== '13px' ||
        getComputedStyle(item.querySelector('.status-item-summary')).fontSize !== '11px') {
        throw new Error('Notification status tone or layout changed');
      }
      if (!empty && (getComputedStyle(item.querySelector('.status-item-value')).fontSize !== '11px' ||
        !item.querySelector('button'))) throw new Error('Notification value or action missing');
      if (empty && (item.querySelector('.status-item-value') || item.querySelector('button'))) {
        throw new Error('Empty notification summary changed');
      }
    }
  } else if (name.startsWith('workspace-summary-chips')) {
    target = document.getElementById('statDiscSummary');
    remember(target);
    const empty = name.endsWith('-empty');
    renderAnalysisSummary(target.id, empty ? [] : ['', ...tones].map(tone => ({tone, label: 'Resumo ' + (tone || 'neutro'),
      value: '25%', sub: 'Descrição longa para caracterizar o resumo analítico em larguras diferentes.'})));
    const grid = getComputedStyle(target);
    if (grid.display !== 'grid' || grid.gap !== '8px' || grid.marginTop !== '12px' ||
      target.children.length !== (empty ? 0 : 5)) throw new Error('Analysis summary grid changed');
    for (const [index, chip] of [...target.children].entries()) {
      const tone = index ? tones[index - 1] : '', style = getComputedStyle(chip);
      const alpha = tone === 'danger' ? '0.2' : tone === 'info' ? '0.16' : '0.18';
      if (style.padding !== '10px 12px' || style.borderRadius !== '8px' ||
        style.backgroundColor !== (tone ? `rgba(${rgb[tone]}, 0.08)` : 'rgba(255, 255, 255, 0.024)') ||
        style.borderTopColor !== (tone ? `rgba(${rgb[tone]}, ${alpha})` : 'rgba(255, 255, 255, 0.06)') ||
        getComputedStyle(chip.querySelector('.analysis-summary-label')).fontSize !== '9px' ||
        getComputedStyle(chip.querySelector('.analysis-summary-value')).fontSize !== '20px' ||
        getComputedStyle(chip.querySelector('.analysis-summary-sub')).marginTop !== '6px') {
        throw new Error('Analysis summary chip changed');
      }
    }
  } else if (name === 'workspace-summary-strategy') {
    target = document.getElementById('strategyHubBoard');
    remember(target);
    renderStrategyRows(target.id, [{name: 'Breakout', pnl: 20, n: 1, wr: 100, recovery: 2},
      {name: 'Pullback', pnl: -10, n: 1, wr: 0, recovery: 0}]);
    if (target.children.length !== 2 || [...target.children].some(row =>
      getComputedStyle(row).paddingTop !== '16px' || getComputedStyle(row).paddingBottom !== '16px')) {
      throw new Error('Large strategy summary spacing changed');
    }
  }
  if (!target?.getClientRects().length) throw new Error('Workspace summary consumer missing');
  target.scrollIntoView({block: 'center'});
  if (before !== fingerprint()) throw new Error('Workspace summary presentation changed data or storage');
}

module.exports = {resetWorkspaceSummaryStyleState, prepareWorkspaceSummaryStyleScenario};
