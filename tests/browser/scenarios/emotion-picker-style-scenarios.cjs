/*
 * Cenários visuais para os estilos legados do seletor de emoções (`.emotion-grid` e
 * `.emotion-chip`).
 *
 * Objetivo:
 *   Montar um fixture descartável de apresentação (sem alterar dados ou handlers da
 *   aplicação) para validar os estados ocioso, selecionado e sob hover dos chips de
 *   emoção.
 *
 * Papel na verificação visual:
 *   Consumido por `shell-style-check.cjs` nos estados `emotion-picker-idle`,
 *   `emotion-picker-hover` e `emotion-picker-selected`.
 *
 * Pontos-chave:
 *   - Injeta `#styleEmotionPickerFixture` no Dashboard e remove-o entre casos.
 *   - Confere grade, bordas, fundos e tipografia computados dos estados base e
 *     `.selected`.
 */

/*
 * Remove o fixture descartável do seletor de emoções entre execuções de cenário.
 */
function resetEmotionPickerStyleState() {
  document.getElementById('styleEmotionPickerFixture')?.remove();
}

/*
 * Cria o grid sintético de chips de emoção, aplica `.selected` quando solicitado,
 * valida estilos computados e retorna o seletor de `:hover` no cenário
 * `emotion-picker-hover`.
 */
function prepareEmotionPickerStyleScenario(name) {
  const before = JSON.stringify({accounts, trades, storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});

  // Monta um bloco descartável com dois chips de emoção diretamente no Dashboard.
  const fixture = document.createElement('div');
  fixture.id = 'styleEmotionPickerFixture';
  fixture.className = 'emotion-grid';
  fixture.innerHTML = '<div class="emotion-chip"><div class="emotion-emoji">😌</div><div class="emotion-name">Calmo</div></div>' +
    '<div class="emotion-chip"><div class="emotion-emoji">😰</div><div class="emotion-name">Ansioso</div></div>';
  document.getElementById('page-dashboard')?.append(fixture);
  if (!fixture.isConnected) throw new Error('Emotion picker fixture was not mounted');
  const chip = fixture.querySelector('.emotion-chip');
  if (name === 'emotion-picker-selected') chip.classList.add('selected');
  fixture.scrollIntoView({block: 'center'});

  // Valida propriedades de grade, espaçamento, tipografia e cores nos estados base e
  // selecionado.
  const gridStyle = getComputedStyle(fixture);
  const chipStyle = getComputedStyle(chip);
  const emojiStyle = getComputedStyle(chip.querySelector('.emotion-emoji'));
  const nameStyle = getComputedStyle(chip.querySelector('.emotion-name'));
  if (gridStyle.display !== 'grid' || gridStyle.gridTemplateColumns === 'none' || gridStyle.gap !== '10px' ||
    chipStyle.padding !== '14px 10px' || chipStyle.borderRadius !== '18px' || chipStyle.textAlign !== 'center' ||
    emojiStyle.fontSize !== '20px' || nameStyle.marginTop !== '4px' || nameStyle.fontSize !== '10px' ||
    nameStyle.color !== 'rgb(139, 163, 173)') throw new Error('Emotion picker styles changed');
  if (name !== 'emotion-picker-selected' &&
    (chipStyle.backgroundColor !== 'rgba(255, 255, 255, 0.02)' || chipStyle.borderColor !== 'rgba(255, 255, 255, 0.05)')) {
    throw new Error('Base emotion styles changed');
  }
  if (name === 'emotion-picker-selected' &&
    (chipStyle.backgroundColor !== 'rgba(34, 213, 237, 0.1)' || chipStyle.borderColor !== 'rgba(34, 213, 237, 0.18)')) {
    throw new Error('Selected emotion styles changed');
  }
  if (before !== JSON.stringify({accounts, trades, storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])})) {
    throw new Error('Emotion picker scenario changed account/trade data or storage');
  }
  return name === 'emotion-picker-hover' ? '#styleEmotionPickerFixture .emotion-chip' : null;
}

module.exports = {resetEmotionPickerStyleState, prepareEmotionPickerStyleScenario};
