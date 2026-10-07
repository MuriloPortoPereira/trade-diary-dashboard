const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {createHash} = require('node:crypto');

const appSource = fs.readFileSync(`${__dirname}/../app.js`, 'utf8');
const base = 'src/modules/preferences/presentation';
const catalogPaths = [
  `${base}/translation-catalog.js`,
  ...['pt-BR', 'en-US'].flatMap(lang => ['trading', 'workspace', 'dialogs-and-labels'].map(section => `${base}/locales/${lang}/${section}.js`)),
];
const languagePaths = [...catalogPaths, `${base}/language-selector.js`];
const sources = languagePaths.map(path => fs.readFileSync(`${__dirname}/../${path}`, 'utf8'));
const stateDeclaration = appSource.match(/^let currentLanguage = .*;$/m)?.[0];
assert.ok(stateDeclaration, 'Language state must remain initialized in app.js');
const languageSource = sources.join('\n') + '\n' + stateDeclaration;

test('catalog scripts are data-only and load in order before selector and app.js', () => {
  const forbidden = ['window', 'document', 'localStorage', 'fetch', 'Chart', 'currentLanguage'];
  const sandbox = {};
  for (const name of forbidden) Object.defineProperty(sandbox, name, {get() { throw new Error(`Catalog accessed ${name}`); }});
  const context = vm.createContext(sandbox);
  for (const source of sources.slice(0, -1)) vm.runInContext(source, context);
  assert.deepEqual(Object.getOwnPropertyNames(context).filter(name => !forbidden.includes(name)), []);
  const html = fs.readFileSync(`${__dirname}/../index.html`, 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const localScripts = scripts.filter(script => script.src && !script.src.startsWith('https://'));
  assert.deepEqual(localScripts.map(script => script.src), [
    'src/modules/simulation/domain/calculate-simulation-sizing.js',
    'src/modules/data-transfer/infrastructure/serialize-trades-csv.js', ...languagePaths,
    'src/shared/presentation/analysis-summary.js',
    'src/shared/presentation/status-list.js',
    'src/modules/psychology/presentation/psychology-statistics.js',
    'src/modules/calendar/presentation/calendar-controls.js',
    'src/modules/accounts/presentation/risk-board.js',
    'src/modules/analytics/presentation/dashboard-page.js',
    'src/modules/analytics/presentation/strategy-rows.js',
    'src/modules/calendar/presentation/dashboard-calendar.js',
    'src/modules/analytics/presentation/stop-fee-analysis.js',
    'src/modules/calendar/presentation/calendar-page.js',
    'src/modules/notifications/presentation/notifications-page.js',
    'src/modules/psychology/presentation/psychology-page.js',
    'src/modules/analytics/presentation/strategy-hub-page.js',
    'src/modules/routine/presentation/premarket-page.js',
    'src/modules/documents/presentation/document-media.js',
    'src/modules/documents/presentation/documents-page.js',
    'src/modules/accounts/presentation/account-cashflow-form.js',
    'src/modules/accounts/presentation/setup-risk-summary.js',
    'src/modules/accounts/presentation/setup-cashflow-list.js',
    'src/modules/accounts/presentation/risk-setup-page.js',
    'src/modules/accounts/presentation/account-list.js',
    'src/app/presentation/account-summary.js',
    'src/modules/accounts/presentation/accounts-page.js',
    'src/modules/partners/presentation/partners-page.js',
    'src/modules/profile/presentation/profile-page.js', 'app.js',
  ]);
  for (const script of localScripts) {
    assert.doesNotMatch(script.attributes, /\b(?:async|defer|nomodule)\b/i);
    const type = script.attributes.match(/\btype\s*=\s*['"]([^'"]*)['"]/i)?.[1];
    assert.ok(type === undefined || type === '' || type === 'text/javascript');
  }
});

function createHarness(savedLanguage = null) {
  const events = [], listeners = {};
  function element(properties = {}) {
    const classes = new Set();
    return {
      textContent: '', innerHTML: '', placeholder: '', dataset: {}, tagName: 'SPAN',
      classList: {
        contains: name => classes.has(name),
        remove: name => classes.delete(name),
        toggle(name, force) {
          const enabled = force === undefined ? !classes.has(name) : force;
          if (enabled) classes.add(name); else classes.delete(name);
        },
      },
      ...properties,
    };
  }
  const elements = {langFlag: element(), langMenu: element(), backupSummary: element()};
  const options = ['pt-BR', 'en-US'].map(lang => element({dataset: {lang}}));
  const label = element({dataset: {i18n: 'nav.calendar'}});
  const input = element({tagName: 'INPUT', dataset: {i18n: 'nav.calendar'}});
  const textarea = element({tagName: 'TEXTAREA', dataset: {i18n: 'nav.calendar'}});
  const html = element({dataset: {i18nHtml: 'nav.calendar'}});
  const placeholder = element({dataset: {i18nPh: 'nav.calendar'}});
  const groups = {'.lang-option': options, '[data-i18n]': [label, input, textarea], '[data-i18n-html]': [html], '[data-i18n-ph]': [placeholder]};
  const storage = new Map(savedLanguage === null ? [] : [['appLanguage', savedLanguage]]);
  const document = {
    documentElement: {lang: ''},
    getElementById: id => elements[id],
    querySelectorAll: selector => groups[selector] || [],
    addEventListener: (type, handler) => { listeners[type] = handler; },
  };
  const context = vm.createContext({
    document,
    localStorage: {
      getItem: key => { events.push(['read', key]); return storage.get(key) ?? null; },
      setItem: (key, value) => { events.push(['write', key, value]); storage.set(key, value); },
    },
    showAppNotice: (...args) => events.push(['notice', ...args]),
    refreshAll: () => events.push(['refresh']),
    renderBackupSummary: () => events.push(['backup']),
  });
  vm.runInContext(languageSource, context);
  return {context, events, listeners, elements, options, label, input, textarea, html, placeholder, storage, document};
}

test('catalogs preserve all 585 strings and key order per language', () => {
  const {context} = createHarness();
  const catalogs = vm.runInContext('TRANSLATIONS', context);
  assert.deepEqual(Object.keys(catalogs), ['pt-BR', 'en-US']);
  // Fingerprints captured from the original literals before extraction; includes text and key order.
  const hashes = {
    'pt-BR': '6804772ea1f3ed1a35e422af39544be901b506d4d8aef54ed323eb2b055f17b0',
    'en-US': '5437559df1cbfda47f14623008316eef5f3d50fdfc268885676797bca5898d8b',
  };
  for (const [lang, catalog] of Object.entries(catalogs)) {
    assert.equal(Object.keys(catalog).length, 585);
    assert.equal(createHash('sha256').update(JSON.stringify(catalog)).digest('hex'), hashes[lang]);
  }
});

test('initial language reads only appLanguage and retains default/unknown values', () => {
  for (const [saved, expected] of [[null, 'pt-BR'], ['', 'pt-BR'], ['en-US', 'en-US'], ['unknown', 'unknown']]) {
    const {context, events} = createHarness(saved);
    assert.equal(vm.runInContext('currentLanguage', context), expected);
    assert.deepEqual(events, [['read', 'appLanguage']]);
  }
});

test('translation fallback keeps language, Portuguese, explicit fallback and raw key precedence', () => {
  const {context} = createHarness('en-US');
  assert.equal(context.t('nav.calendar'), 'Journal');
  assert.equal(context.t('missing'), 'missing');
  assert.equal(context.t('missing', 'fallback'), 'fallback');
  assert.equal(context.t('missing', ''), '');
  assert.equal(context.t('missing', null), 'missing');
  vm.runInContext("TRANSLATIONS['pt-BR'].onlyPortuguese = 'reserva'; TRANSLATIONS['en-US'].blank = ''; TRANSLATIONS['en-US'].zero = 0", context);
  assert.equal(context.t('onlyPortuguese', 'fallback'), 'reserva');
  assert.equal(context.t('blank', 'fallback'), '');
  assert.equal(context.t('zero', 'fallback'), 0);
  vm.runInContext("currentLanguage = 'unknown'", context);
  assert.equal(context.t('nav.calendar'), 'Diário');
});

test('selector init updates labels/placeholders/HTML without notice, refresh or write', () => {
  const h = createHarness('en-US');
  h.context.initLanguageSelector();
  assert.equal(h.document.documentElement.lang, 'en-US');
  assert.equal(h.elements.langFlag.textContent, '🇺🇸');
  assert.equal(h.label.textContent, 'Journal');
  for (const el of [h.input, h.textarea, h.placeholder]) assert.equal(el.placeholder, 'Journal');
  assert.equal(h.html.innerHTML, 'Journal');
  assert.equal(h.options[0].classList.contains('active'), false);
  assert.equal(h.options[1].classList.contains('active'), true);
  assert.deepEqual(h.events, [['read', 'appLanguage']]);
  assert.equal(typeof h.listeners.click, 'function');
});

test('setLanguage keeps storage, notice, refresh, backup and menu behavior', () => {
  const h = createHarness();
  h.elements.backupSummary.textContent = 'summary';
  h.context.toggleLangMenu();
  assert.equal(h.context.setLanguage('en-US'), undefined);
  assert.equal(h.storage.get('appLanguage'), 'en-US');
  assert.equal(vm.runInContext('currentLanguage', h.context), 'en-US');
  assert.deepEqual(h.events, [
    ['read', 'appLanguage'], ['write', 'appLanguage', 'en-US'],
    ['notice', h.context.t('nav.dashboard'), h.context.t('notice.langUpdated')], ['refresh'], ['backup'],
  ]);
  assert.equal(h.elements.langMenu.classList.contains('open'), false);
  h.context.setLanguage('pt-BR');
  assert.equal(h.label.textContent, 'Diário');
});

test('invalid language does not write, render, close menu or change current language', () => {
  const h = createHarness();
  h.context.toggleLangMenu();
  for (const lang of ['unknown', '', null, undefined]) assert.equal(h.context.setLanguage(lang), undefined);
  assert.deepEqual(h.events, [['read', 'appLanguage']]);
  assert.equal(h.elements.langMenu.classList.contains('open'), true);
  assert.equal(vm.runInContext('currentLanguage', h.context), 'pt-BR');
});

test('menu toggles, ignores internal click, closes outside and tolerates missing nodes', () => {
  const h = createHarness();
  h.context.initLanguageSelector();
  h.context.toggleLangMenu();
  h.listeners.click({target: {closest: () => ({})}});
  assert.equal(h.elements.langMenu.classList.contains('open'), true);
  h.listeners.click({target: {closest: () => null}});
  assert.equal(h.elements.langMenu.classList.contains('open'), false);
  delete h.elements.langMenu;
  delete h.elements.langFlag;
  delete h.elements.backupSummary;
  h.context.toggleLangMenu();
  h.context.closeLangMenu();
  h.context.applyLanguage('pt-BR', false);
});

test('applyLanguage retains independent lang argument and global translation state', () => {
  const h = createHarness('en-US');
  h.context.applyLanguage('unknown', false);
  assert.equal(h.document.documentElement.lang, 'unknown');
  assert.equal(h.elements.langFlag.textContent, '🇧🇷');
  assert.equal(h.label.textContent, 'Journal');
  assert.equal(h.options.some(el => el.classList.contains('active')), false);
});
