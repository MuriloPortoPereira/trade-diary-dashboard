/*
 * Objetivo do arquivo:
 *   Validar a renderizacao da pagina de parceiros (renderPartnersPage): estados
 *   vazios, preenchimento com afiliados e QR Code BTC escapando HTML com seguranca,
 *   guarda quando falta algum elemento obrigatorio do DOM e contrato de script no
 *   index.html.
 *
 * Modulo/arquivo testado:
 *   Funcao renderPartnersPage em src/modules/partners/presentation/partners-page.js
 *   (confirmando que a declaracao legada foi removida de app.js).
 *
 * Estrategia de isolamento:
 *   Carrega partners-page.js em uma sandbox node:vm, substitui getPartnerHubConfig
 *   por um stub controlado apos o carregamento e instrumenta getElementById e
 *   escapeHtml (permitindo omitir nos especificos via parametro absent).
 *
 * Pontos-chave e regras criticas garantidas:
 *   - Hub vazio habilita o botao de adicionar afiliado, exibe placeholders de QR Code
 *     e lista vazia com seus botoes inline e oculta a grade legada (partnersGrid).
 *   - Hub preenchido escapa caracteres especiais (<, &, ") nos campos dos afiliados,
 *     mantem handlers inline onchange/onclick corretos e nao muta o objeto hub
 *     original.
 *   - Se qualquer alvo obrigatorio (ex.: partnerCoffeeUrl) estiver ausente, retorna
 *     antes de chamar getPartnerHubConfig ou alterar controles opcionais.
 *   - Script classico sincrono carregado uma unica vez antes de profile-page.js no
 *     index.html.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const partnerPath = 'src/modules/partners/presentation/partners-page.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacyDeclaration = appSource.match(/^function renderPartnersPage\([^]*?^\}/m)?.[0];
const extracted = fs.existsSync(path.join(root, partnerPath));
const source = extracted ? fs.readFileSync(path.join(root, partnerPath), 'utf8') : legacyDeclaration;
assert.ok(source, 'renderPartnersPage must remain available');

// Monta a sandbox vm com os seis nos DOM da pagina de parceiros (podendo omitir IDs
// via absent), registra todas as chamadas a
// getElementById/getPartnerHubConfig/escapeHtml e preserva o stub de
// getPartnerHubConfig sobre a definicao do modulo.
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
  const getHub=context.getPartnerHubConfig;
  vm.runInContext(source, context, {filename: extracted ? partnerPath : 'app.js (partners declaration)'});
  context.getPartnerHubConfig=getHub;
  return {calls, nodes, context};
}

// Verifica a renderizacao com configuracao vazia: consulta o hub uma unica vez,
// habilita o botao de adicionar, mostra estados vazios com botoes de acao e esconde
// partnersGrid.
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

// Testa hub populado com caracteres sensiveis (<, &, "): valida preenchimento dos
// inputs, imagem do QR Code com botao de limpar, escape seguro nos valores HTML,
// handlers inline corretos e preservacao imutavel dos dados originais no objeto hub.
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

// Garante retorno antecipado quando um elemento obrigatorio (partnerCoffeeUrl) esta
// ausente: consulta os 6 IDs mas nao chama getPartnerHubConfig e nao altera disabled
// nem display.
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

// Confirma que a declaracao legada foi removida de app.js e que partners-page.js
// carrega uma unica vez como script classico sincrono imediatamente antes de
// profile-page.js.
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
