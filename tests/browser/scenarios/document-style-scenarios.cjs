/*
 * Cenários visuais da página de Documentos (`#page-documents`).
 *
 * Objetivo:
 *   Cobrir a casca de 3/2/1 colunas (`.doc-shell`), pastas (`generalNotes`,
 *   `dailyNotes`, `tradeNotes`), estado vazio, notas de trade (WIN, LOSS, R ausente),
 *   galeria de mídia SVG, truncamento de títulos/prévia, foco no editor, estados de
 *   hover e overflow com rolagem.
 *
 * Papel na verificação visual:
 *   Consumido por `shell-style-check.cjs` em múltiplos breakpoints (1080px, 1240px e
 *   1420px) para validar o layout responsivo e os controles do editor de documentos.
 *
 * Pontos-chave:
 *   - Gera documentos e imagens SVG inline determinísticas em memória e restaura
 *     `config`, `trades` e `preMarketData` no `finally`.
 *   - Guarda e restaura `activeDocFolder` e `activeDocId` entre casos via
 *     `resetDocumentStyleState`.
 */

/*
 * Restaura a pasta e o documento ativos salvos antes da execução do cenário anterior.
 */
function resetDocumentStyleState() {
  if (window.documentStyleRestore) {
    activeDocFolder = window.documentStyleRestore.folder;
    activeDocId = window.documentStyleRestore.id;
    delete window.documentStyleRestore;
  }
}

/*
 * Popula dados sintéticos de documentos/mídia em memória, seleciona a pasta/entrada
 * do cenário `name`, aguarda decodificação das imagens, valida o CSS computado e
 * retorna eventual seletor de `:hover`.
 */
async function prepareDocumentStyleScenario(name) {
  const fingerprint = () => JSON.stringify({accounts, trades, config, preMarketData, studyHubState,
    storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  const before = fingerprint();
  const saved = {config, trades, preMarketData};
  window.documentStyleRestore = {folder: activeDocFolder, id: activeDocId};

  // Fixture sintético longo (70 linhas) e 9 miniaturas SVG para exercitar truncamento
  // e overflow.
  const body = Array.from({length: 70}, (_, i) => `Linha ${i + 1}: observações de caracterização do documento e planejamento.`).join('\n');
  const images = Array.from({length: 9}, (_, i) => ({name: `Mídia ${i + 1}`, dataUrl:
    'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="96"><rect width="160" height="96" fill="${i % 2 ? '#245c70' : '#345746'}"/><circle cx="80" cy="48" r="24" fill="#b9dcc8"/></svg>`)}));
  let hover;
  try {
    // Injeta notas gerais, observações de trades e notas diárias apenas em memória.
    config = {...config, generalDocs: Array.from({length: 10}, (_, i) => ({id: `style-doc-${i}`,
      title: i === 0 ? 'Documento de caracterização com título longo para observar o truncamento e a composição do editor' : `Documento ${i + 1}`,
      content: i === 9 ? '' : body, images: i === 0 ? images : [], updatedAt: `2026-09-${String(20 - i).padStart(2, '0')}T12:00:00Z`}))};
    trades = trades.map((trade, i) => ({...trade, remarks: body, images: i ? [] : images}));
    preMarketData = {'2026-09-11': {notes: body, mood: 4, energy: 3, stress: 2, images},
      '2026-09-10': {notes: 'Nota anterior', images: []}};
    if (name === 'documents-trade-missing-r') trades[0].r = null;

    // Seleciona a pasta e o documento correspondentes ao cenário requisitado.
    selectDocumentFolder('generalNotes');
    if (name === 'documents-empty') {
      config.generalDocs = [];
      selectDocumentFolder('generalNotes');
    } else if (name === 'documents-daily') {
      document.querySelector('#docFolders [onclick*="dailyNotes"]').click();
    } else if (name.startsWith('documents-trade-')) {
      document.querySelector('#docFolders [onclick*="tradeNotes"]').click();
      document.querySelector(`#docEntries [onclick*="${name.endsWith('loss') ? 'visual-loss' : 'visual-win'}"]`).click();
    }
    await Promise.all([...document.querySelectorAll('#docMedia img')].map(img => img.decode()));

    // Valida colunas da casca, cards laterais/editor e controles da barra de
    // formatação.
    const css = selector => getComputedStyle(document.querySelector(selector));
    const shell = css('.doc-shell'), width = innerWidth;
    const columns = width <= 1080 ? 1 : width <= 1240 ? 2 : 3;
    if (shell.display !== 'grid' || shell.gap !== '16px' || shell.gridTemplateColumns.split(' ').length !== columns) {
      throw new Error('Document shell columns changed');
    }
    for (const selector of ['.doc-nav-card', '.doc-list-card', '.doc-editor-card']) {
      const card = css(selector);
      if (card.display !== 'flex' || card.flexDirection !== 'column' || card.overflow !== (width <= 1080 ? 'visible' : 'hidden')) {
        throw new Error('Document card sizing changed');
      }
    }
    const editor = document.getElementById('docEditorBody'), title = document.getElementById('docEditorTitle');
    const empty = name === 'documents-empty', trade = name.startsWith('documents-trade-');
    if (editor.disabled !== empty || title.disabled !== (empty || trade || name === 'documents-daily') ||
      css('.doc-image-input').display !== 'none' || css('.doc-toolbar').flexWrap !== 'wrap' ||
      css('.doc-toolbar-btn').width !== '36px' || css('.doc-toolbar-btn').height !== '34px' ||
      css('.doc-editor-body').resize !== 'none' || (width <= 1080 && css('.doc-editor-body').minHeight !== '360px')) {
      throw new Error('Document editor controls changed');
    }
    if (css('.doc-toolbar-italic').fontStyle !== 'italic' ||
      !css('.doc-toolbar-underline').textDecorationLine.includes('underline')) {
      throw new Error('Document toolbar typography changed');
    }

    // Valida estado vazio ou truncamento de entradas, opacidade de nota vazia e
    // galeria de mídia.
    if (empty) {
      if (!document.querySelector('#docEntries .doc-empty') || !document.querySelector('#docMedia .doc-media-empty') ||
        css('.doc-empty').borderRadius !== '18px') throw new Error('Empty document presentation changed');
    } else {
      if (!document.querySelector('#docEntries .active') || !editor.value) throw new Error('Document selection missing');
      if (css('.doc-entry-title').textOverflow !== 'ellipsis' || css('.doc-entry-preview').whiteSpace !== 'nowrap') {
        throw new Error('Document entry truncation changed');
      }
      if (!trade && name !== 'documents-daily' && css('.doc-entry-empty').opacity !== '0.55') {
        throw new Error('Empty general note opacity changed');
      }
      for (const img of document.querySelectorAll('#docMedia img')) {
        if (getComputedStyle(img).objectFit !== 'cover' || !img.parentElement.querySelector('.doc-media-remove')) {
          throw new Error('Document media presentation changed');
        }
      }
    }

    // Confere exibição condicional do cabeçalho de contexto de trade
    // (`#docTradeContext`).
    if ((css('#docTradeContext').display === 'flex') !== trade ||
      (trade && (css('#docTradeContext').flexWrap !== 'wrap' || !document.querySelector('.doc-entry-badge')))) {
      throw new Error('Document trade context changed');
    }

    // Aplica interações específicas: foco no editor, alvos de hover ou rolagem de
    // overflow.
    if (name === 'documents-focus') { editor.focus(); editor.scrollIntoView({block: 'center'}); }
    if (name === 'documents-toolbar-hover') hover = '.doc-toolbar-btn';
    if (name === 'documents-folder-hover') hover = '#docFolders [onclick*="dailyNotes"]';
    if (name === 'documents-entry-hover') hover = '#docEntries .doc-entry:not(.active)';
    if (name === 'documents-overflow') {
      const list = document.getElementById('docEntries'), media = document.getElementById('docMedia');
      for (const el of [editor, media, ...(width > 1080 ? [list] : [])]) {
        el.scrollTop = el.scrollHeight;
        if (!el.scrollTop) throw new Error(`Document overflow missing: ${el.id}`);
      }
      media.scrollIntoView({block: 'center'});
    }
    if (hover) document.querySelector(hover).scrollIntoView({block: 'center'});
  } finally {
    config = saved.config; trades = saved.trades; preMarketData = saved.preMarketData;
  }
  if (before !== fingerprint()) throw new Error('Document presentation changed data or storage');
  return hover;
}

module.exports = {resetDocumentStyleState, prepareDocumentStyleScenario};
