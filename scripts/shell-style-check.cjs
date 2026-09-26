// Usage: capture <new-directory> | compare <baseline-directory> <new-directory>
// Reuses the isolated CDP browser and deterministic fixture from the StudyHub checks.
const assert = require('node:assert/strict');
const {mkdir, readFile, writeFile} = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const openBrowser = require('./lib/study-hub-browser.cjs');
const {deterministicFixture, settle} = require('./study-hub-style-check.cjs');
const {resetMetricTooltip, prepareMetricScenario} = require('./lib/metric-style-scenarios.cjs');
const {prepareDashboardLayoutScenario} = require('./lib/dashboard-layout-scenarios.cjs');
const {prepareAccountStyleScenario} = require('./lib/account-style-scenarios.cjs');
const {prepareStrategyStyleScenario} = require('./lib/strategy-style-scenarios.cjs');
const {resetCalendarStyleState, prepareCalendarStyleScenario} = require('./lib/calendar-style-scenarios.cjs');
const {resetTradeTableStyleState, prepareTradeTableStyleScenario} = require('./lib/trade-table-style-scenarios.cjs');

const {prepareFormFieldStyleScenario} = require('./lib/form-field-style-scenarios.cjs');
const {resetModalTabStyleState, prepareModalTabStyleScenario} = require('./lib/modal-tab-style-scenarios.cjs');
const {resetUploadZoneStyleState, prepareUploadZoneStyleScenario} = require('./lib/upload-zone-style-scenarios.cjs');
const {resetEmotionPickerStyleState, prepareEmotionPickerStyleScenario} = require('./lib/emotion-picker-style-scenarios.cjs');
const {resetTagEditorStyleState, prepareTagEditorStyleScenario} = require('./lib/tag-editor-style-scenarios.cjs');

const formStates = ['form-text-focus', 'form-unit-focus', 'form-readonly-focus', 'form-select-focus', 'form-textarea-empty', 'form-textarea-filled'];
const modalTabStates = ['modal-trade-scroll', 'modal-csv-footer', 'modal-dialog-input',
  'tabs-import-export', 'tabs-calendar-biweek', 'tabs-studyhub-plano'];
const uploadZoneStates = ['upload-zone-idle', 'upload-zone-hover', 'upload-zone-drag'];
const emotionPickerStates = ['emotion-picker-idle', 'emotion-picker-hover', 'emotion-picker-selected'];
const tagEditorStates = ['tag-editor-base', 'tag-editor-delete-hover', 'tag-editor-edit-hover',
  'tag-editor-secondary', 'tag-editor-profile'];
const widths = [390, ...[440, 720, 1080, 1240, 1420].flatMap(w => [w - 1, w, w + 1]), 1440];
const metricBoundaryWidths = [1419, 1420, 1421];
const pageWidths = [390, 1080, 1440];
const metricStates = ['metric-hover', 'metric-tooltip-above', 'metric-tooltip-below', 'metric-tooltip-hidden', 'metric-risk-tooltip'];
const strategyStates = ['strategy-rank-mixed', 'strategy-rank-empty', 'strategy-compare-empty', 'strategy-compare-single',
  'strategy-compare-same', 'strategy-compare-swapped', 'strategy-compare-focus', 'strategy-compare-charts'];
const statTabs = ['overview', 'strategy', 'time', 'psych', 'simulation'];
const tableStates = ['table-sort-asc', 'table-sort-desc', 'table-row-hover', 'table-row-selected-hover',
  'table-select-all', 'table-clear-selection', 'table-sort-hover', 'table-incomplete', 'table-incomplete-focus', 'table-empty', 'table-dashboard-sticky'];
const calendarStates = ['calendar-month-compat', 'calendar-mini-hover', 'calendar-mini-open', 'calendar-day-hover',
  'calendar-day-win', 'calendar-day-loss', 'calendar-day-empty', 'calendar-nav-year', 'calendar-leap-month',
  'calendar-toolbar-month-focus'];
const actionStates = ['primary-hover', 'ghost-hover', 'icon-hover', 'date-start-focus', 'date-end-focus',
  'date-filtered', 'date-clear-hover', 'date-cleared'].map(name => `actions-${name}`);
const states = ['sidebar-open', 'nav-hover', 'language-hover', 'language-menu', 'language-option-focus',
  'cotacao-focus', 'cotacao-hover', 'account-hover', 'account-modal', 'trade-modal'];
const hash = value => createHash('sha256').update(value).digest('hex');

function inspectShell() {
  const properties = ['display', 'position', 'box-sizing', 'width', 'height', 'min-width', 'max-width',
    'padding', 'margin', 'gap', 'grid-template-columns', 'flex-direction', 'align-items', 'justify-content',
    'overflow', 'color', 'background', 'border', 'border-radius', 'box-shadow', 'outline', 'font-family',
    'font-size', 'font-weight', 'line-height', 'letter-spacing', 'opacity', 'visibility', 'z-index', 'transform',
    'left', 'top', 'right', 'bottom', 'pointer-events', 'mask-image', 'mask-position', 'mask-size', 'mask-repeat',
    'min-height', 'flex', 'flex-wrap', 'filter', 'color-scheme', 'align-self',
    'overflow-x', 'overflow-y', 'scrollbar-width', 'scrollbar-color', 'text-shadow', 'text-transform', 'vertical-align',
    'text-align', 'text-overflow', 'white-space', 'scrollbar-gutter', 'border-collapse', 'border-spacing',
    'border-top', 'border-bottom', 'backdrop-filter', 'overscroll-behavior', 'cursor', 'user-select',
    'text-decoration', 'text-underline-offset', 'resize', 'appearance'];
  const surfaceSelector = '.balance-card,.chart-card,.calendar-card,.table-card,.setup-card,.metric-card,.account-overview-card,.partner-card';
  const pseudoStyle = (el, pseudo) => Object.fromEntries(['content', ...properties].map(key =>
    [key, getComputedStyle(el, pseudo).getPropertyValue(key)]));
  const snapshot = [...document.querySelectorAll('body,body *')].filter(el => el.getClientRects().length).map(el => {
    const style = getComputedStyle(el), rect = el.getBoundingClientRect();
    return {tag: el.tagName, id: el.id, class: el.getAttribute('class'),
      rect: [rect.x, rect.y, rect.width, rect.height].map(n => Math.round(n * 1000) / 1000),
      styles: Object.fromEntries(properties.map(key => [key, style.getPropertyValue(key)])),
      before: el.matches(`.nav-item,.logo-mark,.acct-pill,.page-header>div:first-child,${surfaceSelector}`) ? pseudoStyle(el, '::before') : null,
      after: el.matches('.page-header>div:first-child,.metric-card') ? pseudoStyle(el, '::after') : null,
      text: el.children.length ? null : el.textContent, value: 'value' in el ? el.value : null};
  });
  return {snapshot, activePage: document.querySelector('.page.active')?.id, focus: document.activeElement?.id,
    calendar: document.querySelector('#page-calendar.active') ? [calYear, calMonth, calViewMode] : null,
    tradeSelection: document.querySelector('#page-log.active') ? {sort: {...sortState}, ids: [...selectedTrades].sort()} : null,
    tableScroll: [...document.querySelectorAll('.dashboard-table-scroll,.table-card,#calGridWrap,#page-log .table-card > [style="overflow-x:auto"]')].filter(el => el.getClientRects().length)
      .map(el => [el.className, el.scrollLeft, el.scrollTop, el.scrollWidth, el.scrollHeight, el.clientWidth, el.clientHeight]),
    pageDisplays: [...document.querySelectorAll('.page')].map(el => [el.id, getComputedStyle(el).display]),
    tooltipSourcesHidden: [...document.querySelectorAll('.m-tip-popup')].every(el => getComputedStyle(el).display === 'none'),
    selectOptions: [...document.querySelectorAll('.stats-filter-select option')].map(el => ({value: el.value,
      color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor})),
    storage: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
    fonts: [...document.fonts].filter(font => font.status === 'loaded').map(font => `${font.family}:${font.weight}`).sort(),
    openModals: [...document.querySelectorAll('.modal-overlay.open')].map(modal => ({id: modal.id,
      body: modal.querySelector('.modal-body') ? [modal.querySelector('.modal-body').scrollTop,
        modal.querySelector('.modal-body').scrollHeight, modal.querySelector('.modal-body').clientHeight] : null,
      footer: modal.querySelector('.modal-footer') ? getComputedStyle(modal.querySelector('.modal-footer')).justifyContent : null})),
    activeTabs: [...document.querySelectorAll('.tab-btn.active')].filter(el => el.getClientRects().length)
      .map(el => [el.id, el.textContent.trim()]),
    sheetsLoaded: [...document.querySelectorAll('link[rel="stylesheet"]')].every(link => !!link.sheet)};
}

async function capture(directory) {
  await mkdir(directory, {recursive: false});
  const browser = await openBrowser(path.resolve(__dirname, '..'));
  const report = {version: 15, widths, pageWidths, statTabs, states, actionStates, metricStates, metricBoundaryWidths, strategyStates, calendarStates, tableStates, formStates, modalTabStates, uploadZoneStates, emotionPickerStates, tagEditorStates, cases: []};
  try {
    await browser.command('Emulation.setTimezoneOverride', {timezoneId: 'America/Sao_Paulo'});
    await browser.command('Page.addScriptToEvaluateOnNewDocument', {source: `(${deterministicFixture})()`});
    await browser.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false});
    await browser.command('Page.navigate', {url: browser.url});
    await browser.evaluate(`new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Page load timeout')), 20000);
      const done = () => { clearTimeout(timer); resolve(true); };
      if (document.readyState === 'complete') done(); else addEventListener('load', done, {once: true});
    })`);
    assert.equal(await browser.evaluate('Chart.version'), '4.4.1');
    report.pageAnimation = await browser.evaluate(`(() => {
      const style = getComputedStyle(document.querySelector('.page.active'));
      return [style.animationName, style.animationDuration];
    })()`);
    assert.deepEqual(report.pageAnimation, ['fade-up', '0.28s']);
    // Eagerly load every declared face: splitting links can change which unused weights
    // the browser downloads during transient layout, without changing the final CSS.
    await browser.evaluate(`document.fonts.ready.then(() => Promise.all([...document.fonts].map(font => font.load())))`);
    report.animation = await browser.evaluate(`(() => {
      document.getElementById('cotRefreshBtn').classList.add('spinning');
      const style = getComputedStyle(document.getElementById('cotIcon')), result = [style.animationName, style.animationDuration, style.animationIterationCount];
      document.getElementById('cotRefreshBtn').classList.remove('spinning'); return result;
    })()`);
    assert.deepEqual(report.animation, ['cot-spin', '0.8s', 'infinite']);
    report.riskTransition = await browser.evaluate(`(() => {
      const style = getComputedStyle(document.querySelector('.risk-progress-fill'));
      return [style.transitionProperty, style.transitionDuration, style.transitionTimingFunction];
    })()`);
    assert.deepEqual(report.riskTransition, ['width', '0.28s', 'ease']);
    report.calendarTransition = await browser.evaluate(`(() => {
      const style = getComputedStyle(document.querySelector('.dash-cal-cell'));
      return [style.transitionProperty, style.transitionDuration, style.transitionTimingFunction];
    })()`);
    assert.deepEqual(report.calendarTransition, ['transform, border-color, background', '0.18s, 0.18s, 0.18s', 'ease, ease, ease']);
    report.fieldTransition = await browser.evaluate(`(() => {
      const style = getComputedStyle(document.getElementById('t-symbol'));
      return [style.transitionProperty, style.transitionDuration, style.transitionTimingFunction];
    })()`);
    assert.deepEqual(report.fieldTransition, ['border-color, background, box-shadow', '0.2s, 0.2s, 0.2s', 'ease, ease, ease']);
    await browser.evaluate(`Chart.defaults.animation = false;
      const style = document.createElement('style');
      style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}';
      document.head.append(style);`);
    await browser.command('DOM.enable');
    await browser.command('CSS.enable');
    const {root} = await browser.command('DOM.getDocument');
    const pages = await browser.evaluate(`[...document.querySelectorAll('.page')].map(el => el.id.slice(5))`);
    assert.equal(pages.length, 15);
    report.pages = pages;
    for (const width of widths) {
      await browser.command('Emulation.setDeviceMetricsOverride', {width, height: 1000, deviceScaleFactor: 1, mobile: false});
      const cases = [...(pageWidths.includes(width) ? pages : ['dashboard']),
        ...(metricBoundaryWidths.includes(width) ? [] : [...states, ...actionStates]),
        ...(pageWidths.includes(width) ? [...statTabs.map(tab => `stats-${tab}`), ...metricStates, 'layout-chart-hover'] : []),
        'metric-risk-tones', 'layout-table-scroll', 'account-risk-tones',
        ...(pageWidths.includes(width) ? ['account-risk-goal', 'account-cashflow-modal', 'account-cashflow-setup', 'account-cashflow-empty', ...strategyStates] : []),
        'strategy-compare-full', 'calendar-week-scroll', 'calendar-biweek', 'table-log-scroll',
        ...(pageWidths.includes(width) ? [...calendarStates, ...tableStates, ...formStates, ...modalTabStates, ...uploadZoneStates, ...emotionPickerStates, ...tagEditorStates] : [])];
      for (const name of cases) {
        const page = name === 'tabs-import-export' ? 'import' : name === 'tabs-calendar-biweek' ? 'calendar' :
          name === 'tabs-studyhub-plano' ? 'studyHub' : name.startsWith('table-') && name !== 'table-dashboard-sticky' ? 'log' :
          name.startsWith('calendar-') && !name.startsWith('calendar-mini-') ? 'calendar' : name === 'tag-editor-profile' ? 'profile' :
          (name === 'account-cashflow-setup' || name.startsWith('tag-editor-')) ? 'setup' :
          name.startsWith('strategy-compare') ? 'stats' : name.startsWith('metric-risk') ? 'stats' : name.startsWith('actions-') ? 'log' :
          name.startsWith('stats-') ? 'stats' : pages.includes(name) ? name : 'dashboard';
        await browser.evaluate(`(async () => { await (${resetMetricTooltip})();
          (${resetCalendarStyleState})();
          (${resetTradeTableStyleState})();
          (${resetModalTabStyleState})();
          (${resetUploadZoneStyleState})();
          (${resetEmotionPickerStyleState})();
          (${resetTagEditorStyleState})();
          document.querySelectorAll('.modal-overlay.open').forEach(el => closeModal(el.id));
          document.querySelectorAll('.modal-body').forEach(el => { el.scrollTop = 0; el.scrollLeft = 0; });
          closeLangMenu(); document.activeElement?.blur(); showPage(${JSON.stringify(page)});
          document.getElementById('stStratA').value = ''; document.getElementById('stStratB').value = '';
          document.querySelectorAll('.dashboard-table-scroll,.table-card').forEach(el => { el.scrollLeft = 0; el.scrollTop = 0; });
          document.querySelector('main').scrollTop = 0; document.getElementById('sidebar').scrollTop = 0; window.scrollTo(0,0); })()`);
        if (page === 'stats') {
          const tab = name.startsWith('strategy-compare') ? 'strategy' : name.startsWith('stats-') ? name.slice(6) : 'overview';
          const selector = `#statTabNav [onclick*="'${tab}'"]`;
          await browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).click();
            if (getComputedStyle(document.getElementById(${JSON.stringify('statTab-' + tab)})).display !== 'block') throw new Error('Stats tab did not open');`);
        }
        let hover;
        if (name.startsWith('metric-')) hover = await browser.evaluate(`(${prepareMetricScenario})(${JSON.stringify(name)})`);
        if (name.startsWith('layout-')) hover = await browser.evaluate(`(${prepareDashboardLayoutScenario})(${JSON.stringify(name)})`);
        if (name.startsWith('strategy-')) await browser.evaluate(`(${prepareStrategyStyleScenario})(${JSON.stringify(name)})`);
        if (name.startsWith('calendar-')) hover = await browser.evaluate(`(${prepareCalendarStyleScenario})(${JSON.stringify(name)})`);
        if (name.startsWith('account-risk-') || name.startsWith('account-cashflow-')) {
          await browser.evaluate(`(${prepareAccountStyleScenario})(${JSON.stringify(name)})`);
        }
        if (page === 'log') await browser.evaluate(`document.querySelector('#page-log .log-date-clear').click();`);
        if (name.startsWith('table-')) hover = await browser.evaluate(`(${prepareTradeTableStyleScenario})(${JSON.stringify(name)})`);
        if (name.startsWith('actions-')) {
          if (name === 'actions-primary-hover') hover = '#page-log .page-actions .btn-primary';
          if (name === 'actions-ghost-hover') hover = '#filterAccount';
          if (name === 'actions-icon-hover') {
            await browser.evaluate(`document.querySelector('#page-log .page-actions .btn-primary').click();
              if (!document.getElementById('tradeModal').classList.contains('open')) throw new Error('Trade modal did not open');`);
            hover = '#tradeModal .btn-icon';
          }
          if (['actions-date-start-focus', 'actions-date-end-focus'].includes(name)) {
            const id = name === 'actions-date-start-focus' ? 'filterDateStart' : 'filterDateEnd';
            await browser.evaluate(`document.getElementById(${JSON.stringify(id)}).focus();
              if (document.activeElement !== document.getElementById(${JSON.stringify(id)})) throw new Error('Date input did not focus');`);
          }
          if (['actions-date-filtered', 'actions-date-clear-hover', 'actions-date-cleared'].includes(name)) {
            await browser.evaluate(`(() => { for (const id of ['filterDateStart', 'filterDateEnd']) {
              const input = document.getElementById(id); input.value = '2026-09-10'; input.dispatchEvent(new Event('change', {bubbles: true}));
            }
            const ids = [...document.querySelectorAll('#logTbody input[type="checkbox"]')].map(el => el.dataset.id);
            if (JSON.stringify(ids) !== '["visual-win"]') throw new Error('Date filter did not select the expected trade'); })()`);
            if (name === 'actions-date-clear-hover') hover = '#page-log .log-date-clear';
            if (name === 'actions-date-cleared') await browser.evaluate(`(() => { document.querySelector('#page-log .log-date-clear').click();
              const ids = [...document.querySelectorAll('#logTbody input[type="checkbox"]')].map(el => el.dataset.id).sort();
              if (document.getElementById('filterDateStart').value || document.getElementById('filterDateEnd').value ||
                JSON.stringify(ids) !== '["visual-loss","visual-win"]') throw new Error('Clearing dates did not restore the trades'); })()`);
          }
        }
        if (['sidebar-open', 'nav-hover'].includes(name)) {
          await browser.evaluate(`document.getElementById('hamburger').click();
            if (!document.getElementById('sidebar').classList.contains('open') || !document.getElementById('sidebar-overlay').classList.contains('show')) throw new Error('Sidebar did not open');`);
          if (name === 'nav-hover') hover = '#sidebar .nav-item:not(.active)';
        }
        if (name.startsWith('language-')) {
          if (name === 'language-hover') hover = '#langBtn';
          else await browser.evaluate(`document.getElementById('langBtn').click();
            if (!document.getElementById('langMenu').classList.contains('open')) throw new Error('Language menu did not open');`);
          if (name === 'language-option-focus') {
            hover = '.lang-option[data-lang="en-US"]';
            await browser.evaluate(`document.querySelector('.lang-option[data-lang="en-US"]').focus();
              if (document.activeElement !== document.querySelector('.lang-option[data-lang="en-US"]')) throw new Error('Language option did not focus');`);
          }
        }
        if (name === 'cotacao-focus') await browser.evaluate(`document.getElementById('cotInput').focus();
          if (document.activeElement !== document.getElementById('cotInput')) throw new Error('Exchange input did not focus');`);
        if (name === 'cotacao-hover') hover = '#cotRefreshBtn';
        if (name === 'account-hover') hover = '#acctPill';
        if (name === 'account-modal') await browser.evaluate(`document.getElementById('acctPill').click(); if (!document.getElementById('accountModal').classList.contains('open')) throw new Error('Account modal did not open');`);
        if (name === 'trade-modal') await browser.evaluate(`document.querySelector('#topbar [data-i18n="topbar.newTrade"]').click();
          if (!document.getElementById('tradeModal').classList.contains('open')) throw new Error('Trade modal did not open');`);
        if (name.startsWith('form-')) await browser.evaluate(`(${prepareFormFieldStyleScenario})(${JSON.stringify(name)})`);
        if (name.startsWith('modal-') || name.startsWith('tabs-')) {
          await browser.evaluate(`(${prepareModalTabStyleScenario})(${JSON.stringify(name)})`);
        }
        if (name.startsWith('upload-zone-')) hover = await browser.evaluate(`(${prepareUploadZoneStyleScenario})(${JSON.stringify(name)})`);
        if (name.startsWith('emotion-picker-')) hover = await browser.evaluate(`(${prepareEmotionPickerStyleScenario})(${JSON.stringify(name)})`);
        if (name.startsWith('tag-editor-')) hover = await browser.evaluate(`(${prepareTagEditorStyleScenario})(${JSON.stringify(name)})`);
        let nodeId;
        if (hover) {
          ({nodeId} = await browser.command('DOM.querySelector', {nodeId: root.nodeId, selector: hover}));
          assert.ok(nodeId, `Hover target missing: ${hover}`);
          await browser.command('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: ['hover']});
        }
        // StudyHub can introduce additional font faces when its template is mounted.
        await browser.evaluate(`(async () => {
          await document.fonts.ready;
          await Promise.all([...document.fonts].map(font => font.load()));
          await (${settle})();
        })()`);
        const state = await browser.evaluate(`(${inspectShell})()`);
        assert.equal(state.activePage, `page-${name === 'calendar-mini-open' ? 'calendar' : page}`);
        assert.equal(state.pageDisplays.filter(([, display]) => display !== 'none').length, 1, 'Only the active page is displayed');
        assert.ok(state.tooltipSourcesHidden, 'Tooltip source content remains hidden');
        assert.ok(state.sheetsLoaded && state.snapshot.length > 30);
        for (const family of ['Inter', 'Syne', 'DM Mono']) assert.ok(state.fonts.some(font => font.replaceAll('"', '').startsWith(family + ':')), `Font not loaded: ${family}`);
        const file = `${width}-${name}`;
        await writeFile(path.join(directory, file + '.json'), JSON.stringify(state));
        const {data} = await browser.command('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
        const png = Buffer.from(data, 'base64');
        await writeFile(path.join(directory, file + '.png'), png);
        report.cases.push({name: file, nodes: state.snapshot.length, stateHash: hash(JSON.stringify(state)), imageHash: hash(png)});
        if (nodeId) await browser.command('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: []});
      }
      console.log(`Captured ${width}px: ${cases.length} shell/page states.`);
    }
    assert.deepEqual(browser.missing, [], 'Missing local assets');
    assert.deepEqual(browser.errors, [], 'Console/runtime errors');
    await writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2));
    return report;
  } finally { await browser.close(); }
}

async function main() {
  const [mode, beforeDirectory, afterDirectory] = process.argv.slice(2);
  assert.ok(['capture', 'compare', 'compare-saved'].includes(mode) && beforeDirectory && (mode === 'capture' || afterDirectory),
    'Usage: capture <new-directory> | compare <baseline-directory> <new-directory> | compare-saved <before-directory> <after-directory>');
  if (mode === 'capture') {
    const report = await capture(path.resolve(beforeDirectory));
    console.log(`PASS: baseline ${report.cases.length} cases; zero console/runtime errors.`);
    return;
  }
  const before = JSON.parse(await readFile(path.join(beforeDirectory, 'report.json'), 'utf8'));
  const after = mode === 'compare' ? await capture(path.resolve(afterDirectory))
    : JSON.parse(await readFile(path.join(afterDirectory, 'report.json'), 'utf8'));
  const withoutImageHashes = report => ({...report, cases: report.cases.map(({imageHash, ...state}) => state)});
  assert.deepEqual(withoutImageHashes(after), withoutImageHashes(before), 'Style/geometry/font/storage differences; inspect JSON artifacts');
  const noise = [];
  for (const [index, entry] of after.cases.entries()) {
    if (entry.imageHash === before.cases[index].imageHash) continue;
    const result = JSON.parse(execFileSync('python3', [path.join(__dirname, 'compare-browser-images.py'),
      path.join(beforeDirectory, entry.name + '.png'), path.join(afterDirectory, entry.name + '.png')], {encoding: 'utf8'}));
    assert.ok(result.accepted, `Pixel difference: ${entry.name}`);
    noise.push({name: entry.name, ...result});
  }
  await writeFile(path.join(afterDirectory, 'pixel-comparison.json'), JSON.stringify(noise, null, 2));
  console.log(`PASS: ${after.cases.length} states identical; ${noise.length} images with bounded rasterization differences (${noise.reduce((sum, entry) => sum + entry.pixels, 0)} pixels).`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
