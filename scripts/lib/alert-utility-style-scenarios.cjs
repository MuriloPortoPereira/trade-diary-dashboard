// Characterizes shared alerts/utilities with real consumers and disposable nodes only.
function resetAlertUtilityStyleState() {
  document.getElementById('styleAlertUtilityFixture')?.remove();
}

function prepareAlertUtilityStyleScenario(name) {
  const before = JSON.stringify({accounts, trades, storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  let target;
  if (name === 'common-alert-info') {
    target = document.querySelector('#page-import .alert.alert-info');
    const separator = document.querySelector('#page-import .sep');
    if (!target || !separator || getComputedStyle(separator).height !== '1px' || getComputedStyle(separator).margin !== '18px 0px') {
      throw new Error('Information alert or separator missing');
    }
  } else if (name === 'common-alert-warn') {
    target = document.createElement('div');
    target.id = 'styleAlertUtilityFixture';
    target.className = 'alert alert-warn';
    target.textContent = 'Aviso';
    document.getElementById('page-dashboard')?.append(target);
  } else {
    const header = document.querySelector('#page-calendar .page-header.flex.gap-12');
    const actions = header?.querySelector('.flex.gap-8.ml-auto');
    target = document.createElement('div');
    target.id = 'styleAlertUtilityFixture';
    target.className = 'w-full text-muted';
    header?.append(target);
    if (!header || !actions || getComputedStyle(header).display !== 'flex' || getComputedStyle(header).gap !== '12px' ||
      getComputedStyle(actions).gap !== '8px' ||
      getComputedStyle(target).width !== `${header.clientWidth}px`) throw new Error('Layout utility styles changed');
  }
  if (!target?.isConnected) throw new Error('Alert/utility target was not mounted');
  target.scrollIntoView({block: 'center'});
  const style = getComputedStyle(target);
  if (name.startsWith('common-alert-') && (style.display !== 'flex' || style.gap !== '8px' ||
    style.padding !== '14px 16px' || style.borderRadius !== '18px' || style.fontSize !== '12px')) {
    throw new Error('Shared alert styles changed');
  }
  if (name === 'common-alert-info' && (style.color !== 'rgb(34, 213, 237)' || style.backgroundColor !== 'rgba(34, 213, 237, 0.08)')) {
    throw new Error('Information alert styles changed');
  }
  if (name === 'common-alert-warn' && (style.color !== 'rgb(255, 206, 103)' || style.backgroundColor !== 'rgba(255, 206, 103, 0.08)')) {
    throw new Error('Warning alert styles changed');
  }
  if (before !== JSON.stringify({accounts, trades, storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])})) {
    throw new Error('Alert/utility scenario changed application data or storage');
  }
  return null;
}

module.exports = {resetAlertUtilityStyleState, prepareAlertUtilityStyleScenario};
