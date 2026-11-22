// Apresentação em script clássico; o estado da aplicação é composto em app.js.
function t(key, fallback) {
  return TRANSLATIONS[currentLanguage]?.[key] ?? TRANSLATIONS['pt-BR']?.[key] ?? fallback ?? key;
}

function initLanguageSelector() {
  applyLanguage(currentLanguage, false);
  document.addEventListener('click', e => {
    if (!e.target.closest('#langSelector')) closeLangMenu();
  });
}

function toggleLangMenu() {
  document.getElementById('langMenu')?.classList.toggle('open');
}

function closeLangMenu() {
  document.getElementById('langMenu')?.classList.remove('open');
}

function setLanguage(lang) {
  if (!LANGUAGES[lang]) return;
  currentLanguage = lang;
  localStorage.setItem('appLanguage', lang);
  applyLanguage(lang, true);
  closeLangMenu();
}

function applyLanguage(lang, notify) {
  const { flag } = LANGUAGES[lang] || LANGUAGES['pt-BR'];
  const flagEl = document.getElementById('langFlag');
  if (flagEl) flagEl.textContent = flag;
  document.querySelectorAll('.lang-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  document.documentElement.lang = lang;
  // Atualiza os elementos estáticos marcados com data-i18n.
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.placeholder !== undefined) el.placeholder = val;
    } else {
      el.textContent = val;
    }
  });
  // Atualiza os elementos que aceitam HTML traduzido via data-i18n-html.
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  // Atualiza os textos de exemplo dos campos.
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  // Renderiza novamente os conteúdos dinâmicos no idioma selecionado.
  if (notify) {
    showAppNotice(t('nav.dashboard'), t('notice.langUpdated'));
    refreshAll();
  }
  // Atualiza o resumo do backup sempre que o idioma mudar.
  if(document.getElementById('backupSummary')?.textContent)renderBackupSummary();
}
