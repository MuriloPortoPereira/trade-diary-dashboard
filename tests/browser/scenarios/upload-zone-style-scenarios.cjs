/*
 * Cenários visuais para os estilos legados da zona de upload (`.upload-zone`).
 *
 * Objetivo:
 *   Montar um fixture descartável de apresentação (sem dados da aplicação ou E/S de
 *   arquivos) para validar os estados ocioso, sob hover e de arraste ativo (`.drag`).
 *
 * Papel na verificação visual:
 *   Consumido por `shell-style-check.cjs` nos estados `upload-zone-idle`,
 *   `upload-zone-hover` e `upload-zone-drag`.
 *
 * Pontos-chave:
 *   - Remove o nó `#styleUploadZoneFixture` entre casos via
 *     `resetUploadZoneStyleState`.
 *   - Verifica espaçamentos, ocultação do `<input type="file">`, dimensões do ícone e
 *     cores do `.drag`.
 */

/*
 * Remove o fixture descartável da zona de upload entre execuções de cenário.
 */
function resetUploadZoneStyleState() {
  document.getElementById('styleUploadZoneFixture')?.remove();
}

/*
 * Injeta o bloco `.upload-zone` no Dashboard, aplica `.drag` quando solicitado,
 * valida estilos computados e retorna o seletor de `:hover` no cenário
 * `upload-zone-hover`.
 */
function prepareUploadZoneStyleScenario(name) {
  // Cria estrutura sintética mínima de zona de upload sem associar listeners de
  // arquivo.
  const fixture = document.createElement('div');
  fixture.id = 'styleUploadZoneFixture';
  fixture.className = 'upload-zone';
  fixture.innerHTML = '<input type="file"><div class="upload-icon">+</div><div class="upload-title">Upload</div><div class="upload-sub">CSV</div>';
  document.getElementById('page-dashboard')?.append(fixture);
  if (!fixture.isConnected) throw new Error('Upload zone fixture was not mounted');
  if (name === 'upload-zone-drag') fixture.classList.add('drag');
  fixture.scrollIntoView({block: 'center'});

  // Valida padding, bordas, ocultação do input nativo, ícone, tipografia e destaque
  // de `.drag`.
  const zoneStyle = getComputedStyle(fixture);
  const inputStyle = getComputedStyle(fixture.querySelector('input'));
  const iconStyle = getComputedStyle(fixture.querySelector('.upload-icon'));
  const titleStyle = getComputedStyle(fixture.querySelector('.upload-title'));
  const subStyle = getComputedStyle(fixture.querySelector('.upload-sub'));
  if (zoneStyle.padding !== '32px' || zoneStyle.borderRadius !== '8px' || zoneStyle.textAlign !== 'center' ||
    inputStyle.display !== 'none' || iconStyle.width !== '48px' || iconStyle.height !== '48px' ||
    iconStyle.marginBottom !== '12px' || iconStyle.borderRadius !== '16px' || titleStyle.fontSize !== '14px' ||
    titleStyle.fontWeight !== '700' || subStyle.marginTop !== '4px' || subStyle.fontSize !== '11px') {
    throw new Error('Upload zone styles changed');
  }
  if (name === 'upload-zone-drag' &&
    (zoneStyle.backgroundColor !== 'rgba(34, 213, 237, 0.06)' || zoneStyle.borderColor !== 'rgba(34, 213, 237, 0.28)')) {
    throw new Error('Upload zone drag styles changed');
  }
  return name === 'upload-zone-hover' ? '#styleUploadZoneFixture' : null;
}

module.exports = {resetUploadZoneStyleState, prepareUploadZoneStyleScenario};
