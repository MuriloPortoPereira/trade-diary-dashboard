// Browser-side layout scenarios using the existing isolated dashboard fixture.
function prepareDashboardLayoutScenario(name) {
  if (name === 'layout-chart-hover') {
    const card = document.querySelector('.dashboard-chart-stack .chart-grid-3 .chart-card');
    card.scrollIntoView({block: 'center'});
    return '.dashboard-chart-stack .chart-grid-3 .chart-card';
  }
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
