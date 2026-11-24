/*
 * Cenários visuais para cartões de métricas (`.metric-card`), cartões de vazamento de
 * risco e tooltips flutuantes (`.m-tip-float`) compartilhados.
 *
 * Objetivo:
 *   Validar hover em cartões de métrica, tons de risco (`safe`, `warn`, `danger`) em
 *   `renderStopFeeAnalysis`, e posicionamento dinâmico do tooltip flutuante (acima,
 *   abaixo, clamping dentro da viewport e ocultação após `mouseout`).
 *
 * Papel na verificação visual:
 *   Consumido por `shell-style-check.cjs` nos estados `metric-*`, com limpeza
 *   assíncrona entre casos via `resetMetricTooltip`.
 *
 * Pontos-chave:
 *   - Exercita tons de risco passando trades sintéticos diretamente ao renderizador
 *     sem mutar `trades`.
 *   - Verifica que o conteúdo-fonte `.m-tip-popup` permanece oculto enquanto
 *     `.m-tip-float` é exibido no `body`.
 */

/*
 * Fecha qualquer tooltip flutuante aberto entre casos disparando `mouseout` no
 * gatilho.
 */
async function resetMetricTooltip() {
  if (!document.querySelector('.m-tip-float.visible')) return;
  document.querySelector('.m-tip-icon').dispatchEvent(new MouseEvent('mouseout', {bubbles: true}));
  await new Promise(resolve => setTimeout(resolve, 100));
  if (document.querySelector('.m-tip-float.visible')) throw new Error('Tooltip did not close between cases');
}

/*
 * Prepara o cenário de métrica/risco/tooltip correspondente a `name`, posicionando a
 * janela para forçar exibição acima ou abaixo do ícone gatilho e validando o contrato
 * visual.
 */
async function prepareMetricScenario(name) {
  if (name === 'metric-hover') return '#dashMetrics .metric-card';
  const risk = name.startsWith('metric-risk');
  if (risk) {
    // Exercita todos os tons pelo renderizador existente sem substituir `trades` ou
    // gravar no storage.
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

  // Rola a janela para posicionar o ícone perto do topo (`below`) ou no centro
  // (`above`) e dispara `mouseover`.
  const icon = document.querySelector(risk ? '#statsRiskLeakageRows .m-tip-icon' : '#dashMetrics .m-tip-icon');
  if (!icon) throw new Error('Metric tooltip trigger missing');
  const targetTop = name === 'metric-tooltip-below' ? 86 : 400;
  window.scrollTo(0, Math.max(0, window.scrollY + icon.getBoundingClientRect().top - targetTop));
  icon.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));

  // Valida contrato do tooltip flutuante: fixado no body, dentro da viewport e lado
  // esperado.
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

  // No caso `metric-tooltip-hidden`, fecha o tooltip e verifica retorno à opacidade
  // zero.
  if (name === 'metric-tooltip-hidden') {
    icon.dispatchEvent(new MouseEvent('mouseout', {bubbles: true}));
    await new Promise(resolve => setTimeout(resolve, 100));
    if (floating.classList.contains('visible') || getComputedStyle(floating).opacity !== '0') throw new Error('Tooltip did not hide');
  }
  return null;
}

module.exports = {resetMetricTooltip, prepareMetricScenario};
