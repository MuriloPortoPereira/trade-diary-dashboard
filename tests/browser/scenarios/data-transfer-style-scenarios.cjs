/*
 * Cenários visuais da página de Importação e Exportação/Backup (`#page-import`).
 *
 * Objetivo:
 *   Validar alternância entre as abas `csv` (importação) e `export`
 *   (exportação/backup) e verificar a responsividade das grades
 *   (`.import-entry-grid`, `.import-export-grid`, `.backup-action-grid`,
 *   `.export-filter-grid`) nos breakpoints de 720px e 1420px.
 *
 * Papel na verificação visual:
 *   Consumido por `shell-style-check.cjs` nos estados `data-transfer-import` e
 *   `data-transfer-export`.
 *
 * Pontos-chave:
 *   - Confere dimensões de dropzone, pré-visualização, filtros e botões de ação.
 *   - Verifica fingerprint de estado e `localStorage` para garantir operação
 *     somente-leitura.
 */

/*
 * Ativa a aba correspondente ao cenário (`csv` ou `export`), valida o layout
 * computado conforme a largura atual da viewport e garante ausência de mutações nos
 * dados.
 */
function prepareDataTransferStyleScenario(name) {
  const fingerprint = () => JSON.stringify({accounts, trades, config, preMarketData, studyHubState,
    storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  const before = fingerprint();

  // Alterna para a aba solicitada e garante exclusividade de exibição entre os
  // painéis.
  const tab = name === 'data-transfer-export' ? 'export' : 'csv';
  document.querySelector(`#page-import .tab-btn[onclick="switchImportTab('${tab}')"]`).click();
  const visible = document.getElementById('importTab-' + tab);
  const hidden = document.getElementById('importTab-' + (tab === 'csv' ? 'export' : 'csv'));
  if (getComputedStyle(visible).display === 'none' || getComputedStyle(hidden).display !== 'none') {
    throw new Error('Data-transfer tab visibility changed');
  }

  // Mede número de colunas e breakpoints ativos (estreito <= 720px, empilhado <=
  // 1420px).
  const columns = selector => getComputedStyle(visible.querySelector(selector)).gridTemplateColumns.split(' ').length;
  const narrow = matchMedia('(max-width: 720px)').matches;
  const stacked = matchMedia('(max-width: 1420px)').matches;
  if (tab === 'csv') {
    // Valida grade de entrada, padding/altura mínima da dropzone e shell de
    // pré-visualização.
    const dropzone = getComputedStyle(visible.querySelector('.import-dropzone'));
    const body = getComputedStyle(visible.querySelector('.import-dropzone-body'));
    if (columns('.import-entry-grid') !== (stacked ? 1 : 2) ||
      dropzone.padding !== (narrow ? '14px' : '18px') || body.minHeight !== (narrow ? '188px' : '224px') ||
      getComputedStyle(visible.querySelector('.import-dropzone-icon')).width !== '52px' ||
      getComputedStyle(visible.querySelector('.import-preview-shell')).minHeight !== '0px' ||
      !visible.querySelector('.test-data-card-actions .btn')) throw new Error('Import layout changed');
  } else {
    // Valida grades de exportação/backup, resumo de backup e filtro de contas.
    const summary = document.getElementById('backupSummary');
    const selector = document.getElementById('exportAccount');
    if (columns('.import-export-grid') !== (stacked ? 1 : 2) ||
      columns('.backup-action-grid') !== (narrow ? 1 : 2) ||
      columns('.export-filter-grid') !== (narrow ? 1 : 3) ||
      !summary.textContent.trim() || selector.options.length !== accounts.length + 1 ||
      visible.querySelectorAll('.export-action-row .btn').length !== 2) throw new Error('Export/backup layout changed');
    visible.querySelector('.export-filter-grid').scrollIntoView({block: 'center'});
  }
  if (before !== fingerprint()) throw new Error('Data-transfer presentation changed data or storage');
}

module.exports = {prepareDataTransferStyleScenario};
