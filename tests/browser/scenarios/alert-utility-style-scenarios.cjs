/*
 * Cenários visuais de alertas compartilhados (`.alert-info`, `.alert-warn`) e
 * classes utilitárias de layout (`.flex`, `.gap-*`, `.ml-auto`, `.w-full`, `.sep`).
 *
 * Objetivo:
 *   Caracterizar visualmente os alertas comuns e utilitários CSS utilizando consumidores
 *   reais da aplicação quando disponíveis e nós descartáveis no DOM quando necessário.
 *
 * Papel na verificação visual:
 *   Consumido por `shell-style-check.cjs` nos estados `common-alert-info`,
 *   `common-alert-warn` e `common-utilities`, garantindo consistência de cores,
 *   bordas, espaçamentos e largura total.
 *
 * Pontos-chave:
 *   - Remove o nó sintético `#styleAlertUtilityFixture` entre casos via `resetAlertUtilityStyleState`.
 *   - Assegura que nenhum dado de conta, trade ou `localStorage` seja modificado.
 */

/*
 * Remove qualquer elemento descartável de alerta/utilitário injetado pelo cenário anterior.
 */
function resetAlertUtilityStyleState() {
  document.getElementById('styleAlertUtilityFixture')?.remove();
}

/*
 * Monta ou localiza o alvo de alerta/utilitário para `name`, valida propriedades
 * computadas (padding, border-radius, cores e gaps) e centraliza o elemento na tela.
 */
function prepareAlertUtilityStyleScenario(name) {
  const before = JSON.stringify({accounts, trades, storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  let target;
  if (name === 'common-alert-info') {
    // Reutiliza o alerta informativo e o separador `.sep` reais da página de Importação.
    target = document.querySelector('#page-import .alert.alert-info');
    const separator = document.querySelector('#page-import .sep');
    if (!target || !separator || getComputedStyle(separator).height !== '1px' || getComputedStyle(separator).margin !== '18px 0px') {
      throw new Error('Information alert or separator missing');
    }
  } else if (name === 'common-alert-warn') {
    // Injeta um nó descartável `.alert.alert-warn` no Dashboard para inspecionar o estilo de aviso.
    target = document.createElement('div');
    target.id = 'styleAlertUtilityFixture';
    target.className = 'alert alert-warn';
    target.textContent = 'Aviso';
    document.getElementById('page-dashboard')?.append(target);
  } else {
    // Valida utilitários flex/gap/largura total usando o cabeçalho real do Calendário.
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

  // Verifica contrato de estilos compartilhados de alertas e cores específicas por variante.
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
