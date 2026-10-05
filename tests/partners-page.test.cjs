const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const partnerPath = 'src/modules/partners/presentation/partners-page.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacyDeclaration = appSource.match(/^function renderPartnersPage\([^]*?^\}/m)?.[0];
const extracted = fs.existsSync(path.join(root, partnerPath));
const source = extracted ? fs.readFileSync(path.join(root, partnerPath), 'utf8') : legacyDeclaration;
assert.ok(source, 'renderPartnersPage must remain available');

function createHarness(hub, absent = []) {
  const calls = [];
  const ids = ['partnersGrid', 'partnerAffiliatesEditor', 'partnerBtcAddress', 'partnerCoffeeUrl',
    'partnerBtcQrPreview', 'partnerAddAffiliateBtn'];
  const nodes = Object.fromEntries(ids.filter(id => !absent.includes(id)).map(id =>
    [id, {innerHTML: 'before', value: 'before', disabled: true, style: {display: 'grid'}}]));
  const context = vm.createContext({
    document: {getElementById(id) { calls.push(['getElementById', id]); return nodes[id] ?? null; }},
    getPartnerHubConfig() { calls.push(['getPartnerHubConfig']); return hub; },
    escapeHtml(value) { calls.push(['escapeHtml', value]); return String(value)
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'); },
  });
  vm.runInContext(source, context, {filename: extracted ? partnerPath : 'app.js (partners declaration)'});
  return {calls, nodes, context};
}

test('empty partner hub renders existing empty states and hides legacy grid', () => {
  const {calls, nodes, context} = createHarness({btcAddress: '', coffeeUrl: '', btcQrImage: '', affiliates: []});
  assert.equal(vm.runInContext('renderPartnersPage()', context), undefined);
  assert.equal(calls.filter(call => call[0] === 'getPartnerHubConfig').length, 1);
  assert.equal(nodes.partnerAddAffiliateBtn.disabled, false);
  assert.equal(nodes.partnerBtcAddress.value, '');
  assert.equal(nodes.partnerCoffeeUrl.value, '');
  assert.match(nodes.partnerBtcQrPreview.innerHTML, /QR Code BTC não configurado/);
  assert.match(nodes.partnerBtcQrPreview.innerHTML, /triggerFileInput\('partnerBtcQrInput'\)/);
  assert.match(nodes.partnerAffiliatesEditor.innerHTML, /Nenhum afiliado configurado/);
  assert.match(nodes.partnerAffiliatesEditor.innerHTML, /onclick="addPartnerAffiliate\(\)"/);
  assert.equal(nodes.partnersGrid.innerHTML, '');
  assert.equal(nodes.partnersGrid.style.display, 'none');
});

test('populated partner hub preserves fields, escaping and inline handlers', () => {
  const hub = {btcAddress: 'bc1test', coffeeUrl: 'https://coffee.test', btcQrImage: 'data:image/png;base64,abc',
    affiliates: [{id: 'affiliate-1', name: 'Mesa <&', url: 'https://example.test/?a=1&b=2',
      code: 'A"B', note: '10% <off>'}]};
  const {nodes, context} = createHarness(hub);
  vm.runInContext('renderPartnersPage()', context);
  assert.equal(nodes.partnerBtcAddress.value, 'bc1test');
  assert.equal(nodes.partnerCoffeeUrl.value, 'https://coffee.test');
  assert.match(nodes.partnerBtcQrPreview.innerHTML, /src="data:image\/png;base64,abc"/);
  assert.match(nodes.partnerBtcQrPreview.innerHTML, /onclick="clearPartnerBtcQr\(\)"/);
  assert.match(nodes.partnerAffiliatesEditor.innerHTML, /Mesa &lt;&amp;/);
  assert.match(nodes.partnerAffiliatesEditor.innerHTML, /a=1&amp;b=2/);
  assert.match(nodes.partnerAffiliatesEditor.innerHTML, /value="A&amp;quot;B"|value="A&quot;B"/);
  assert.match(nodes.partnerAffiliatesEditor.innerHTML, /onclick="removePartnerAffiliate\('affiliate-1'\)"/);
  assert.match(nodes.partnerAffiliatesEditor.innerHTML, /onchange="updatePartnerAffiliateField\('affiliate-1','name',this.value\)"/);
  assert.equal(hub.affiliates[0].name, 'Mesa <&');
});

test('missing required target returns before reading hub or mutating optional controls', () => {
  const {calls, nodes, context} = createHarness({affiliates: []}, ['partnerCoffeeUrl']);
  vm.runInContext('renderPartnersPage()', context);
  assert.deepEqual(calls.filter(call => call[0] === 'getElementById').map(call => call[1]),
    ['partnersGrid', 'partnerAffiliatesEditor', 'partnerBtcAddress', 'partnerCoffeeUrl',
      'partnerBtcQrPreview', 'partnerAddAffiliateBtn']);
  assert.equal(calls.some(call => call[0] === 'getPartnerHubConfig'), false);
  assert.equal(nodes.partnerAddAffiliateBtn.disabled, true);
  assert.equal(nodes.partnersGrid.style.display, 'grid');
});

test('extracted partners renderer stays a synchronous classic script before app.js', () => {
  if (!extracted) return;
  assert.ok(!legacyDeclaration, 'legacy declaration must be moved');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .map(match => ({attributes: match[1], src: match[1].match(/\bsrc="([^"]+)"/)?.[1]}))
    .filter(script => script.src && !script.src.startsWith('https://'));
  assert.equal(scripts.filter(script => script.src === partnerPath).length, 1);
  const partnerIndex = scripts.findIndex(script => script.src === partnerPath);
  assert.equal(scripts[partnerIndex + 1].src, 'src/modules/profile/presentation/profile-page.js');
  assert.doesNotMatch(scripts[partnerIndex].attributes, /\b(?:async|defer|type="module")\b/i);
});
