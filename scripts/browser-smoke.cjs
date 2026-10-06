// Isolated browser smoke for the static app. Requires Chrome/Chromium, no npm packages.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { createServer } = require('node:http');
const { readFile, mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const chrome = process.env.CHROME_BIN || 'google-chrome';

function browserProbe() {
  const errors = [];
  window.addEventListener('error', event => {
    errors.push(event.message || `Resource failed: ${event.target?.src || event.target?.href}`);
  }, true);
  window.addEventListener('unhandledrejection', event => errors.push(String(event.reason)));
  window.addEventListener('load', () => setTimeout(() => {
    const passed = [];
    const check = (name, condition) => {
      if (!condition) throw new Error(name);
      passed.push(name);
    };
    try {
      check('Chart.js loaded', typeof Chart === 'function' && Chart.version === '4.4.1');
      check('dashboard active', document.querySelector('#page-dashboard.active'));
      const storageBefore = Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)]));
      const nav = document.querySelector('.nav-item[onclick*="\'stats\'"]');
      check('stats navigation exists', nav);
      nav.click();
      check('stats navigation works', document.querySelector('#page-stats.active'));
      document.querySelector('[onclick="switchStatTab(\'simulation\',this)"]').click();
      check('simulation tab visible', document.getElementById('statTab-simulation').style.display === 'block');
      document.getElementById('simAccount').value = 'manual';
      const fields = {simBalance: '1000', simRiskPct: '1', simGoalPct: '5', simStopPct: '3'};
      for (const [id, value] of Object.entries(fields)) document.getElementById(id).value = value;
      document.getElementById('simRiskPct').dispatchEvent(new Event('input', {bubbles: true}));
      check('risk USD', document.getElementById('simRisk').value === '10.00');
      check('goal USD', document.getElementById('simGoalDay').value === '50.00');
      check('stop USD', document.getElementById('simStopDay').value === '30.00');
      check('legacy API', calculateSimulationSizing({balance: 1000, riskPct: 1}).riskUsd === 10);
      const csvHeader = 'date,symbol,direction,placedTime,openTime,exitDate,exitTime,entry,exit,stop,tp,qty,riskUsd,riskPct,r,pnl,status,market,strategy,emotion,errors,remarks';
      const csvRow = ['"2026-09-10"', ...Array(19).fill('""'), '"pressa; ""erro"""', '"a,b\nlinha 2"'].join(',');
      check('CSV global serialization', buildTradesCSV([{date: '2026-09-10', errors: ['pressa', '"erro"'], remarks: 'a,b\nlinha 2'}]) === csvHeader + '\n' + csvRow);
      check('CSV default trades', buildTradesCSV() === buildTradesCSV(trades));
      check('CSV helper compatibility', csvCell(['a', 'b']) === '"a; b"' && TRADE_CSV_HEADERS.join(',') === csvHeader);
      check('no storage mutation', JSON.stringify(storageBefore) === JSON.stringify(
        Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)]))));
      showPage('dashboard');
      check('dashboard return', document.querySelector('#page-dashboard.active'));
      document.querySelector('.lang-option[data-lang="en-US"]').click();
      check('English language handler', document.documentElement.lang === 'en-US' && localStorage.getItem('appLanguage') === 'en-US' && document.getElementById('langFlag').textContent === '🇺🇸');
      check('English catalog rendered', document.querySelector('[data-i18n="nav.calendar"]').textContent === 'Journal' && t('nav.calendar') === 'Journal');
      document.querySelector('.lang-option[data-lang="pt-BR"]').click();
      check('Portuguese language handler', document.documentElement.lang === 'pt-BR' && localStorage.getItem('appLanguage') === 'pt-BR' && document.querySelector('[data-i18n="nav.calendar"]').textContent === 'Diário');
      const withoutLanguage = values => Object.fromEntries(Object.entries(values).filter(([key]) => key !== 'appLanguage'));
      check('language changes preserve application data', JSON.stringify(withoutLanguage(storageBefore)) === JSON.stringify(withoutLanguage(
        Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])))));
      document.getElementById('langBtn').click();
      check('language menu opens', document.getElementById('langMenu').classList.contains('open'));
      document.querySelector('main').click();
      check('outside click closes language menu', !document.getElementById('langMenu').classList.contains('open'));
      document.getElementById('hamburger').click();
      check('sidebar opens with overlay', document.getElementById('sidebar').classList.contains('open') &&
        document.getElementById('sidebar-overlay').classList.contains('show'));
      document.getElementById('sidebar-overlay').click();
      check('overlay closes sidebar', !document.getElementById('sidebar').classList.contains('open') &&
        !document.getElementById('sidebar-overlay').classList.contains('show'));
      document.getElementById('hamburger').click();
      nav.click();
      check('navigation closes sidebar', document.querySelector('#page-stats.active') && nav.classList.contains('active') &&
        !document.getElementById('sidebar').classList.contains('open') && !document.getElementById('sidebar-overlay').classList.contains('show'));
      const profileNav = document.querySelector('.nav-item[onclick="showPage(\'profile\')"]');
      profileNav.click();
      check('profile navigation and global renderer', document.querySelector('#page-profile.active') && typeof renderProfilePage === 'function');
      check('profile hero and risk rendered', document.getElementById('profileHero').textContent.includes('P/L total') &&
        document.getElementById('profileRiskPanel').textContent.includes('Mandatos de risco'));
      check('profile tags and focus rendered', document.querySelectorAll('#profileTags .tag-cloud-block').length === 3 &&
        document.getElementById('profileFocus').textContent.trim().length > 0);
      refreshAll();
      check('profile refresh renders again', document.querySelector('#page-profile.active') &&
        document.getElementById('profileHero').textContent.includes('P/L total'));
      const partnersNav = document.querySelector('.nav-item[onclick="showPage(\'partners\')"]');
      partnersNav.click();
      check('partners navigation and global renderer', document.querySelector('#page-partners.active') && typeof renderPartnersPage === 'function');
      check('partners affiliates and QR rendered', document.getElementById('partnerAffiliatesEditor').textContent.trim().length > 0 &&
        document.getElementById('partnerBtcQrPreview').textContent.trim().length > 0);
      check('partners legacy grid hidden', getComputedStyle(document.getElementById('partnersGrid')).display === 'none');
      refreshAll();
      check('partners refresh renders again', document.querySelector('#page-partners.active') &&
        document.getElementById('partnerAffiliatesEditor').textContent.trim().length > 0);
      const accountsNav = document.querySelector('.nav-item[onclick="showPage(\'accounts\')"]');
      accountsNav.click();
      check('accounts navigation and global renderer', document.querySelector('#page-accounts.active') && typeof renderAccountsPage === 'function');
      check('accounts metrics rendered', document.querySelectorAll('#accountsMetrics .metric-card').length === 4);
      check('accounts overview rendered', document.querySelectorAll('#accountsOverview .account-overview-card').length > 0);
      refreshAll();
      check('accounts refresh renders again', document.querySelector('#page-accounts.active') &&
        document.querySelectorAll('#accountsOverview .account-overview-card').length > 0);
      showPage('psych');
      check('psychology navigation and global renderer', document.querySelector('#page-psych.active') && typeof renderPsych === 'function');
      check('psychology summaries rendered', document.getElementById('bestEmotion').textContent.trim().length > 0 &&
        document.getElementById('followedPlanRate').textContent.trim().length > 0);
      check('psychology charts and table rendered', document.getElementById('emotionChart') &&
        document.getElementById('discChart') && document.getElementById('psychTbody').innerHTML.length > 0);
      refreshAll();
      check('psychology refresh renders again', document.querySelector('#page-psych.active') &&
        document.getElementById('psychTbody').innerHTML.length > 0);
      const strategyNav = document.querySelector('.nav-item[onclick="showPage(\'strategyHub\')"]');
      strategyNav.click();
      check('strategy hub navigation and global renderer', document.querySelector('#page-strategyHub.active') && typeof renderStrategyHub === 'function');
      check('strategy hub metrics rendered', document.querySelectorAll('#strategyHubMetrics .metric-card').length === 4);
      check('strategy hub board and focus rendered', document.getElementById('strategyHubBoard').innerHTML.length > 0 &&
        document.getElementById('strategyHubFocus').innerHTML.length > 0);
      refreshAll();
      check('strategy hub refresh renders again', document.querySelector('#page-strategyHub.active') &&
        document.querySelectorAll('#strategyHubMetrics .metric-card').length === 4);
      const premarketNav = document.querySelector('.nav-item[onclick="showPage(\'premarket\')"]');
      premarketNav.click();
      check('premarket navigation and global renderer', document.querySelector('#page-premarket.active') && typeof renderPremarket === 'function');
      check('premarket month results rendered', document.getElementById('pmMonthLabel').textContent.trim().length > 0 &&
        document.getElementById('pmResultStats').textContent.includes('Trades no mês'));
      check('premarket habit grid rendered', document.querySelectorAll('#pmHabitGrid .pm-grid-day').length >= 28);
      refreshAll();
      check('premarket refresh renders again', document.querySelector('#page-premarket.active') &&
        document.querySelectorAll('#pmHabitGrid .pm-grid-day').length >= 28);
      const documentsNav = document.querySelector('.nav-item[onclick="showPage(\'documents\')"]');
      documentsNav.click();
      check('documents navigation and global renderer', document.querySelector('#page-documents.active') && typeof renderDocumentsPage === 'function');
      check('documents folders rendered', document.querySelectorAll('#docFolders .doc-folder').length > 0);
      check('documents list and editor rendered', document.getElementById('docEntries').innerHTML.length > 0 &&
        document.getElementById('docEditorHeading').textContent.trim().length > 0);
      refreshAll();
      check('documents refresh renders again', document.querySelector('#page-documents.active') &&
        document.querySelectorAll('#docFolders .doc-folder').length > 0);
      showPage('studyHub');
      for (const tab of ['propfirm', 'plano', 'tradesim', 'mental']) {
        document.querySelector(`#studyHubTabs [onclick*="'${tab}'"]`).click();
        check(`StudyHub ${tab} tab`, document.querySelector('#page-studyHub.active') &&
          document.getElementById('studyHubLegacyApp').dataset.loaded === '1' &&
          document.getElementById(`mod-${tab}`).classList.contains('active'));
      }
    } catch (error) {
      errors.push(error.stack || String(error));
    }
    const result = document.createElement('pre');
    result.id = 'architecture-smoke-result';
    result.textContent = JSON.stringify({passed, errors});
    document.body.append(result);
  }, 250));
}

async function main() {
  const profile = await mkdtemp(path.join(tmpdir(), 'trade-diary-smoke-'));
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const probe = `<script>(${browserProbe.toString()})()</script>`;
  // Install error capture before app scripts. All other app resources are unchanged.
  const smokeHtml = html.replace('<head>', '<head>' + probe);
  const missing = [];
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/__smoke.html') {
      response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
      response.end(smokeHtml);
      return;
    }
    if (pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    const relative = pathname.slice(1);
    // Serve application assets only; never expose tool configuration or repository metadata.
    const allowed = ['app.js', 'styles.css'].includes(relative) || /^src\/[\w/.-]+\.(js|css)$/.test(relative);
    const filename = path.resolve(root, relative);
    if (!allowed || !filename.startsWith(root + path.sep)) {
      response.writeHead(404); response.end(); missing.push(pathname); return;
    }
    try {
      const content = await readFile(filename);
      response.writeHead(200, {'Content-Type': relative.endsWith('.css') ? 'text/css' : 'text/javascript'});
      response.end(content);
    } catch {
      missing.push(pathname); response.writeHead(404); response.end();
    }
  });
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}/__smoke.html`;
    browser = spawn(chrome, ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--no-first-run', `--user-data-dir=${profile}`, '--dump-dom', '--timeout=20000',
      '--virtual-time-budget=5000', url], {stdio: ['ignore', 'pipe', 'pipe']});
    let output = '', stderr = '';
    browser.stdout.on('data', data => { output += data; });
    browser.stderr.on('data', data => { stderr = (stderr + data).slice(-3000); });
    const timer = setTimeout(() => browser.kill('SIGKILL'), 35000);
    const code = await new Promise((resolve, reject) => {
      browser.on('error', reject); browser.on('close', resolve);
    }).finally(() => clearTimeout(timer));
    assert.equal(code, 0, `Chrome failed (${code}): ${stderr}`);
    const match = output.match(/<pre id="architecture-smoke-result">([\s\S]*?)<\/pre>/);
    assert.ok(match, `Browser did not finish smoke checks: ${stderr}`);
    const result = JSON.parse(match[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
    assert.deepEqual(missing, [], 'Missing application assets');
    assert.deepEqual(result.errors, [], 'Browser errors');
    assert.equal(result.passed.length, 55, 'Smoke checks incomplete');
    console.log(`PASS: ${result.passed.length} browser checks; no script errors or missing local assets.`);
  } finally {
    if (browser && browser.exitCode === null) browser.kill('SIGKILL');
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
