function prepareNavigationFooterStyleScenario(name) {
  const fingerprint = () => JSON.stringify({accounts, trades, config, preMarketData, studyHubState,
    storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  const before = fingerprint();
  const sidebar = document.getElementById('sidebar');
  const footer = sidebar.querySelector('.sidebar-footer');
  const meta = footer.querySelector('.sidebar-meta-nav');
  const items = [...meta.querySelectorAll('.nav-item-meta')];
  if (items.length !== 4) throw new Error('Footer navigation items changed');
  if (name === 'navigation-footer-profile') {
    items.find(item => item.getAttribute('onclick').includes("'profile'")).click();
    if (!document.querySelector('#page-profile.active') || !meta.querySelector('.nav-item-meta.active')) {
      throw new Error('Footer profile navigation changed');
    }
  }
  document.getElementById('hamburger').click();
  if (!sidebar.classList.contains('open') || !document.getElementById('sidebar-overlay').classList.contains('show')) {
    throw new Error('Footer sidebar did not open');
  }
  items.at(-1).scrollIntoView({block: 'end'});
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
