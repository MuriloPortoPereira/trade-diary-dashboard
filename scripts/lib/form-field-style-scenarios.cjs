// Presentation-only values in the real trade modal; no input/change or save events.
function prepareFormFieldStyleScenario(name) {
  const fingerprint = () => JSON.stringify({accounts, trades,
    storage: Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])});
  const before = fingerprint();
  document.querySelector('#topbar [data-i18n="topbar.newTrade"]').click();
  const modal = document.getElementById('tradeModal');
  if (!modal.classList.contains('open')) throw new Error('Trade modal did not open');
  const targets = {
    'form-text-focus': ['t-symbol', 'EURUSD'],
    'form-unit-focus': ['t-riskpct', '1.25'],
    'form-readonly-focus': ['t-riskusd'],
    'form-select-focus': ['t-direction', 'Short'],
    'form-textarea-empty': ['t-remarks', ''],
    'form-textarea-filled': ['t-remarks', 'Contexto da operação\nObservações e lições: ação, risco e execução.'],
  };
  const [id, value] = targets[name];
  const field = document.getElementById(id);
  if (value !== undefined) field.value = value;
  field.scrollIntoView({block: 'center'});
  field.focus({preventScroll: true});
  if (!field.getClientRects().length || document.activeElement !== field) throw new Error('Form field did not focus');
  if (value !== undefined && field.value !== value) throw new Error('Form value missing');
  if (name === 'form-unit-focus' && field.parentElement.querySelector('.u')?.textContent !== '%') throw new Error('Unit missing');
  if (name === 'form-readonly-focus' && !field.readOnly) throw new Error('Read-only field missing');
  if (name.startsWith('form-textarea-') && getComputedStyle(field).resize !== 'vertical') throw new Error('Textarea resize changed');
  for (const columns of [2, 3, 4]) {
    if (!modal.querySelector(`.form-grid.fg-${columns}`)) throw new Error('Form grid missing');
  }
  // applyLanguage replaces translated label contents, including their original spans.
  if (modal.querySelector('.required')) throw new Error('Translated label behavior changed');
  if (before !== fingerprint()) throw new Error('Form presentation changed account/trade data or storage');
}

module.exports = {prepareFormFieldStyleScenario};
