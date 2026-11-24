/*
 * Cenários visuais da página de Parceiros e Apoio (`#page-partners`).
 *
 * Objetivo:
 *   Cobrir todas as combinações de apresentação do hub de parceiros: estado vazio,
 *   populado (afiliados + QR code BTC), somente afiliados e somente QR code, verificando
 *   responsividade em 720px/1420px e ocultação da grade legada `#partnersGrid`.
 *
 * Papel na verificação visual:
 *   Consumido por `shell-style-check.cjs` nos estados `partner-presentation-*`.
 *
 * Pontos-chave:
 *   - Substitui `config.partnerHub` apenas em memória com imagem SVG inline determinística
 *     e restaura `config` no `finally`.
 *   - Aguarda `imageEl.decode()` quando há QR code para evitar screenshots incompletos.
 */

/*
 * Configura `config.partnerHub` em memória conforme `name`, renderiza a página de Parceiros,
 * valida cards de afiliados, estados vazios, pré-visualização de QR code e integridade dos dados.
 */
async function preparePartnerStyleScenario(name) {
  const fingerprint = () => JSON.stringify({accounts, trades, config, preMarketData, studyHubState,
    storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  const before = fingerprint();
  const previousConfig = config;
  const affiliates = name === 'partner-presentation-populated' || name === 'partner-presentation-affiliate-only';
  const qr = name === 'partner-presentation-populated' || name === 'partner-presentation-qr-only';
  // QR code sintético em SVG inline para renderização determinística sem rede.
  const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="148" height="148"><rect width="148" height="148" fill="#1a3c4b"/><path d="M20 20h108v108H20z" fill="#d6f3e7"/></svg>');
  try {
    // Injeta configuração temporária do hub de parceiros e re-renderiza a página.
    config = {...config, partnerHub: {
      affiliates: affiliates ? [
        {id: 'visual-partner-a', name: 'Mesa parceira com nome longo para observar a quebra de linha',
          url: 'https://example.test/affiliate/a', code: 'TRADE20', note: 'Benefício de caracterização'},
        ...(name === 'partner-presentation-populated' ? [{id: 'visual-partner-b', name: 'Mesa B',
          url: 'https://example.test/affiliate/b', code: '', note: ''}] : []),
      ] : [],
      btcAddress: 'bc1qexemplovisual123456789', btcQrImage: qr ? image : '',
      coffeeUrl: 'https://example.test/support',
    }};
    renderPartnersPage();

    // Valida estrutura geral da página e confirma que a grade legada `#partnersGrid` segue oculta.
    const root = document.getElementById('page-partners');
    const editor = document.getElementById('partnerAffiliatesEditor');
    const preview = document.getElementById('partnerBtcQrPreview');
    const style = element => getComputedStyle(element);
    const width = innerWidth;
    if (!root.classList.contains('active') || style(editor).display !== 'flex' ||
      style(editor).flexDirection !== 'column' || style(editor).gap !== '12px' ||
      style(root.querySelector('.partner-support-form')).display !== 'grid' ||
      style(root.querySelector('.partner-support-form')).gap !== '10px' ||
      style(document.getElementById('partnersGrid')).display !== 'none') {
      throw new Error('Partner page layout changed');
    }

    // Valida cartões de edição de afiliados ou estado vazio correspondente.
    const cards = [...editor.querySelectorAll('.partner-affiliate-editor-card')];
    if (cards.length !== (affiliates ? name === 'partner-presentation-populated' ? 2 : 1 : 0)) {
      throw new Error('Partner affiliate card count changed');
    }
    if (affiliates) {
      if (editor.querySelector('.partner-empty-state')) throw new Error('Unexpected affiliate empty state');
      for (const card of cards) {
        const head = card.querySelector('.partner-affiliate-editor-head');
        const grid = card.querySelector('.partner-affiliate-form-grid');
        if (style(card).padding !== '14px' || style(card).borderRadius !== '8px' ||
          style(head).display !== 'flex' || style(head).justifyContent !== 'space-between' ||
          style(grid).display !== 'grid' || style(grid).gap !== '10px' ||
          style(grid).gridTemplateColumns.split(' ').length !== (width <= 720 ? 1 : 2)) {
          throw new Error('Partner affiliate editor changed');
        }
      }
    } else if (style(editor.querySelector('.partner-empty-state')).display !== 'flex') {
      throw new Error('Partner affiliate empty state changed');
    }

    // Valida pré-visualização do QR code (aguardando decodificação) ou estado vazio do QR.
    if (qr) {
      const shell = preview.querySelector('.partner-qr-shell');
      const imageEl = preview.querySelector('.partner-qr-image');
      await imageEl.decode();
      if (style(shell).display !== 'grid' || style(shell).gap !== '10px' ||
        style(imageEl).width !== '148px' || style(imageEl).objectFit !== 'cover' ||
        style(preview.querySelector('.partner-support-actions')).flexWrap !== 'wrap') {
        throw new Error('Partner QR preview changed');
      }
    } else if (style(preview.querySelector('.partner-empty-state')).display !== 'flex') {
      throw new Error('Partner QR empty state changed');
    }
    root.querySelector('.partner-config-grid').scrollIntoView({block: 'center'});
  } finally { config = previousConfig; }
  if (before !== fingerprint()) throw new Error('Partner fixture changed data or storage');
}

module.exports = {preparePartnerStyleScenario};
