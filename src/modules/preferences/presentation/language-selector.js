// Classic-script presentation; application state remains composed in app.js.
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
  // Update all static DOM elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.placeholder !== undefined) el.placeholder = val;
    } else {
      el.textContent = val;
    }
  });
  // Update elements with data-i18n-html (allow HTML content)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  // Update placeholder-only elements
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  // Re-render all dynamic content
  if (notify) {
    showAppNotice(t('nav.dashboard'), t('notice.langUpdated'));
    refreshAll();
  }
  // Backup summary usa texto dinâmico — atualiza sempre que idioma mudar
  if(document.getElementById('backupSummary')?.textContent)renderBackupSummary();
}
