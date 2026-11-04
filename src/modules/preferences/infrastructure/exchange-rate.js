// ══════════════════════════════════════════════
// COTAÇÃO USD/BRL
// ══════════════════════════════════════════════
let cotacaoAtual = parseFloat(localStorage.getItem('appCotacao') || '5.80');
let cotacaoInterval = null;

function setCotacao(value) {
  const v = parseFloat(value);
  if (!v || v < 1) return;
  cotacaoAtual = parseFloat(v.toFixed(2));
  localStorage.setItem('appCotacao', cotacaoAtual);

  // Sincroniza input do topbar
  const input = document.getElementById('cotInput');
  if (input) input.value = cotacaoAtual.toFixed(2);

  const hubCot = document.getElementById('hubCot');
  if (hubCot) hubCot.value = cotacaoAtual.toFixed(2);
  const hubBadge = document.getElementById('hubCotBadge');
  if (hubBadge) hubBadge.textContent = `R$ ${cotacaoAtual.toFixed(2)}`;
  if (typeof window.sh_hubSetCot === 'function') window.sh_hubSetCot(cotacaoAtual);
  else if (typeof window.hubSetCot === 'function') window.hubSetCot(cotacaoAtual);
}

async function fetchCotacao() {
  const btn = document.getElementById('cotRefreshBtn');
  if (btn) btn.classList.add('spinning');
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    const d = await r.json();
    const rate = parseFloat(d.USDBRL.bid);
    if (rate && rate > 1) setCotacao(rate);
  } catch (e) {
    // mantém valor anterior silenciosamente
  } finally {
    if (btn) btn.classList.remove('spinning');
  }
}

function initCotacao() {
  // Restaura valor salvo
  const input = document.getElementById('cotInput');
  if (input) input.value = cotacaoAtual.toFixed(2);

  // Busca imediatamente
  fetchCotacao();

  // Atualiza a cada 5 minutos
  cotacaoInterval = setInterval(fetchCotacao, 5 * 60 * 1000);
}
