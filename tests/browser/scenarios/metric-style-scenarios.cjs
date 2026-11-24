// Browser-side scenarios for the shared metric/risk CSS; isolated fixture data only.
async function resetMetricTooltip() {
  if (!document.querySelector('.m-tip-float.visible')) return;
  document.querySelector('.m-tip-icon').dispatchEvent(new MouseEvent('mouseout', {bubbles: true}));
  await new Promise(resolve => setTimeout(resolve, 100));
  if (document.querySelector('.m-tip-float.visible')) throw new Error('Tooltip did not close between cases');
}

async function prepareMetricScenario(name) {
  if (name === 'metric-hover') return '#dashMetrics .metric-card';
  const risk = name.startsWith('metric-risk');
  if (risk) {
    // Exercise all tones through the existing renderer without replacing trades or writing storage.
    renderStopFeeAnalysis('statsRiskLeakageRows', getActiveAccount(), [
      {date: '2026-09-10', status: 'LOSS', pnl: -30, fees: 1},
      {date: '2026-09-11', status: 'WIN', pnl: 100, fees: 0},
    ]);
    for (const type of ['risk-insight-item', 'risk-insight-badge']) {
      for (const tone of ['safe', 'warn', 'danger']) {
        if (!document.querySelector(`#statsRiskLeakageRows .${type}.${tone}`)) throw new Error(`Risk tone missing: ${type}.${tone}`);
      }
    }
  }
  if (name === 'metric-risk-tones') return null;
  const icon = document.querySelector(risk ? '#statsRiskLeakageRows .m-tip-icon' : '#dashMetrics .m-tip-icon');
  if (!icon) throw new Error('Metric tooltip trigger missing');
  const targetTop = name === 'metric-tooltip-below' ? 86 : 400;
  window.scrollTo(0, Math.max(0, window.scrollY + icon.getBoundingClientRect().top - targetTop));
  icon.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
  const floating = document.querySelector('.m-tip-float');
  const rect = floating.getBoundingClientRect();
  if (!floating.classList.contains('visible') || floating.parentElement !== document.body ||
    getComputedStyle(floating).position !== 'fixed' || getComputedStyle(icon.querySelector('.m-tip-popup')).display !== 'none') {
    throw new Error('Floating tooltip contract changed');
  }
  if (floating.innerHTML !== icon.querySelector('.m-tip-popup').innerHTML || rect.left < 4 || rect.right > innerWidth - 4) {
    throw new Error('Tooltip content or viewport clamping changed');
  }
  if (name === 'metric-tooltip-below' && rect.top < icon.getBoundingClientRect().bottom) throw new Error('Tooltip did not use below-trigger placement');
  if (name === 'metric-tooltip-above' && rect.bottom > icon.getBoundingClientRect().top) throw new Error('Tooltip did not use above-trigger placement');
  if (risk && !floating.querySelector('.tip-row')) throw new Error('Risk tooltip rows missing');
  if (name === 'metric-tooltip-hidden') {
    icon.dispatchEvent(new MouseEvent('mouseout', {bubbles: true}));
    await new Promise(resolve => setTimeout(resolve, 100));
    if (floating.classList.contains('visible') || getComputedStyle(floating).opacity !== '0') throw new Error('Tooltip did not hide');
  }
  return null;
}

module.exports = {resetMetricTooltip, prepareMetricScenario};
