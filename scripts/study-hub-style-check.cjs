// Usage: node scripts/study-hub-style-check.cjs capture /tmp/before
//        node scripts/study-hub-style-check.cjs compare /tmp/before /tmp/after
// Captures use a fresh profile, fixed clock/RNG and mocked exchange rate, never personal data.
const assert = require('node:assert/strict');
const {mkdir, readFile, writeFile} = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');
const openBrowser = require('./lib/study-hub-browser.cjs');

const root = path.resolve(__dirname, '..');
const widths = [390, ...[720, 768, 900, 1200, 1600].flatMap(width => [width - 1, width, width + 1])];
const tabs = ['propfirm', 'plano', 'tradesim', 'mental'];
const hash = value => createHash('sha256').update(value).digest('hex');

function deterministicFixture() {
  const OriginalDate = Date;
  const fixedTime = new OriginalDate('2026-09-11T15:00:00Z').getTime();
  globalThis.Date = class extends OriginalDate {
    constructor(...args) { super(...(args.length ? args : [fixedTime])); }
    static now() { return fixedTime; }
  };
  Math.random = () => 0.42;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, options) => String(input).includes('economia.awesomeapi.com.br')
    ? Promise.resolve(new Response(JSON.stringify({USDBRL: {bid: '5.80'}}), {headers: {'Content-Type': 'application/json'}}))
    : originalFetch(input, options);
  // Explicit account/trade fixture avoids sample-data IDs generated from a constant RNG.
  localStorage.setItem('tl_accounts', JSON.stringify([{id: 'visual', name: 'Visual fixture', type: 'cfd_pct', balance: 1000, risk: 1}]));
  localStorage.setItem('tl_activeAccount', 'visual');
  localStorage.setItem('tl_trades', JSON.stringify([
    {id: 'visual-win', accountId: 'visual', date: '2026-09-10', symbol: 'EURUSD', direction: 'BUY', status: 'WIN', pnl: 20, r: 2, entry: 1.1, exit: 1.12, stop: 1.09, qty: 1},
    {id: 'visual-loss', accountId: 'visual', date: '2026-09-09', symbol: 'EURUSD', direction: 'BUY', status: 'LOSS', pnl: -10, r: -1, entry: 1.1, exit: 1.09, stop: 1.09, qty: 1},
  ]));
  localStorage.setItem('appLanguage', 'pt-BR');
  localStorage.setItem('appCotacao', '5.80');
}

async function settle() {
  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 180));
  for (const chart of Object.values(Chart.instances)) { chart.stop(); chart.update('none'); }
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function inspectTab(tab) {
  const host = document.getElementById('studyHubLegacyApp');
  const active = document.getElementById(`mod-${tab}`);
  if (!document.querySelector('#page-studyHub.active') || !active?.classList.contains('active')) throw new Error(`Tab inactive: ${tab}`);
  if (host.dataset.loaded !== '1' || host.querySelectorAll('.hub-module').length !== 4) throw new Error('StudyHub mounting changed');
  const properties = [
    'display', 'position', 'box-sizing', 'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
    'padding', 'margin', 'gap', 'grid-template-columns', 'grid-template-rows', 'flex-direction', 'flex-wrap',
    'align-items', 'justify-content', 'overflow', 'overflow-x', 'overflow-y', 'color', 'background-color',
    'background-image', 'border', 'border-radius', 'box-shadow', 'font-family', 'font-size', 'font-weight',
    'line-height', 'letter-spacing', 'text-align', 'opacity', 'visibility', 'z-index', 'top', 'left', 'transform',
  ];
  const nodes = [host, active, ...active.querySelectorAll('*')].filter(el => el.getClientRects().length);
  const snapshot = nodes.map(el => {
    const style = getComputedStyle(el), rect = el.getBoundingClientRect();
    return {
      tag: el.tagName, id: el.id, class: el.getAttribute('class'),
      rect: [rect.x, rect.y, rect.width, rect.height].map(value => Math.round(value * 1000) / 1000),
      styles: Object.fromEntries(properties.map(key => [key, style.getPropertyValue(key)])),
      text: el.children.length ? null : el.textContent,
      value: 'value' in el ? el.value : null,
    };
  });
  if (snapshot.length < 20) throw new Error(`Tab has insufficient rendered content: ${tab}`);
  return {
    snapshot,
    storage: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
    sheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map(el => ({path: new URL(el.href).pathname, loaded: !!el.sheet})),
  };
}

async function capture(directory) {
  await mkdir(directory, {recursive: false});
  const browser = await openBrowser(root);
  const report = {version: 1, widths, tabs, cases: []};
  try {
    await browser.command('Emulation.setTimezoneOverride', {timezoneId: 'America/Sao_Paulo'});
    await browser.command('Page.addScriptToEvaluateOnNewDocument', {source: `(${deterministicFixture})()`});
    await browser.command('Emulation.setDeviceMetricsOverride', {width: 1601, height: 1000, deviceScaleFactor: 1, mobile: false});
    await browser.command('Page.navigate', {url: browser.url});
    await browser.evaluate(`new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Page load timeout')), 20000);
      const done = () => { clearTimeout(timer); resolve(true); };
      if (document.readyState === 'complete') done(); else window.addEventListener('load', done, {once: true});
    })`);
    assert.equal(await browser.evaluate('Chart.version'), '4.4.1');
    await browser.evaluate(`Chart.defaults.animation = false;
      const style = document.createElement('style');
      style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
      document.head.append(style);
      showPage('studyHub');`);
    for (const width of widths) {
      await browser.command('Emulation.setDeviceMetricsOverride', {width, height: 1000, deviceScaleFactor: 1, mobile: false});
      for (const tab of tabs) {
        const selector = `#studyHubTabs [onclick*="'${tab}'"]`;
        await browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).click(); document.querySelector('main').scrollTop = 0; window.scrollTo(0,0);`);
        await browser.evaluate(`(${settle})()`);
        const state = await browser.evaluate(`(${inspectTab})(${JSON.stringify(tab)})`);
        assert.ok(state.sheets.every(sheet => sheet.loaded), 'Stylesheet failed to load');
        const name = `${width}-${tab}`;
        await writeFile(path.join(directory, `${name}.json`), JSON.stringify(state));
        const {data} = await browser.command('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
        const png = Buffer.from(data, 'base64');
        await writeFile(path.join(directory, `${name}.png`), png);
        report.cases.push({name, nodes: state.snapshot.length, stateHash: hash(JSON.stringify({snapshot: state.snapshot, storage: state.storage})), imageHash: hash(png)});
      }
      console.log(`Captured ${width}px: four StudyHub tabs.`);
    }
    assert.deepEqual(browser.missing, [], 'Missing local resources');
    report.errors = browser.errors;
    await writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`Captured ${report.cases.length} cases; ${report.errors.length} console/runtime errors.`);
    return report;
  } finally { await browser.close(); }
}

async function main() {
  const [mode, beforeDirectory, afterDirectory] = process.argv.slice(2);
  assert.ok(['capture', 'compare'].includes(mode) && beforeDirectory && (mode !== 'compare' || afterDirectory), 'Usage: capture <new-directory> | compare <baseline-directory> <new-directory>');
  if (mode === 'capture') { await capture(path.resolve(beforeDirectory)); return; }
  const before = JSON.parse(await readFile(path.join(beforeDirectory, 'report.json'), 'utf8'));
  const after = await capture(path.resolve(afterDirectory));
  assert.deepEqual(after.errors, before.errors, 'Console/runtime errors changed');
  assert.deepEqual(after.widths, before.widths);
  assert.deepEqual(after.tabs, before.tabs);
  const differences = after.cases.filter((entry, index) => JSON.stringify(entry) !== JSON.stringify(before.cases[index]));
  assert.deepEqual(differences, [], 'Visual/computed-style/storage differences; inspect saved JSON and PNG artifacts');
  console.log(`PASS: ${after.cases.length} cases match baseline (screenshots, computed styles, geometry and storage).`);
}
module.exports = {deterministicFixture, settle};
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
