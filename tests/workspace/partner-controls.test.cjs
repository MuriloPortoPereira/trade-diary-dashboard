/*
 * Objetivo do arquivo:
 *   Testar toda a camada de controle e mutacao do Partner Hub (parceiros/afiliados
 *   e links de apoio): normalizacao defensiva de configuracao, adicao/edicao/remocao
 *   de afiliados com confirmacao, copia para area de transferencia (sincrona e via
 *   Promise), limpeza e upload de imagem de QR Code BTC e pureza no carregamento.
 *
 * Modulo/arquivo testado:
 *   Dez funcoes de controle em src/modules/partners/presentation/partners-page.js
 *   (normalizePartnerAffiliate, ensurePartnerHubConfig, getPartnerHubConfig,
 *   copyPartnerText, addPartnerAffiliate, updatePartnerAffiliateField,
 *   removePartnerAffiliate, updatePartnerSupportField, clearPartnerBtcQr e
 *   handlePartnerBtcQrUpload).
 *
 * Estrategia de isolamento:
 *   Carrega partners-page.js em uma sandbox node:vm substituindo renderPartnersPage
 *   por um espia apos o carregamento para isolar os controles do renderizador; simula
 *   uid, document.getElementById, save, showAppNotice, showAppConfirm e FileReader.
 *
 * Pontos-chave e regras criticas garantidas:
 *   - ensurePartnerHubConfig() nao muta o objeto original, faz trim seletivo (preservando
 *     espacos em btcQrImage) e normaliza formatos invalidos (null, array, booleano, string).
 *   - Mutacoes de afiliado/suporte ignoram IDs desconhecidos e sempre chamam save -> render.
 *   - removePartnerAffiliate() aguarda confirmacao e opera sobre o hub capturado antes de salvar.
 *   - copyPartnerText() bloqueia texto vazio, tolera ausencia/erro sincrono ou rejeicao de
 *     navigator.clipboard e sempre notifica apos resolucao ou falha da Promise.
 *   - Upload de QR Code rejeita arquivos nao imagem sem limpar o input, limpa o input ao
 *     iniciar a leitura de imagem e salva somente no evento onload (com fallback para '').
 *   - Carregar o script apenas declara funcoes sem ler estado nem disparar efeitos colaterais.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname, '../..');
const modulePath='src/modules/partners/presentation/partners-page.js';
const names=['normalizePartnerAffiliate','ensurePartnerHubConfig','getPartnerHubConfig','copyPartnerText','addPartnerAffiliate','updatePartnerAffiliateField','removePartnerAffiliate','updatePartnerSupportField','clearPartnerBtcQr','handlePartnerBtcQrUpload'];
const panel=fs.readFileSync(path.join(root,modulePath),'utf8');
// Extrai declaracao de uma funcao especifica para validar sua presenca no modulo.
const declaration=(source,name)=>source.match(new RegExp(`^function ${name}\\([^]*?^\\}`,'m'))?.[0];
for(const name of names) assert.ok(declaration(panel,name), `${name} remains available in the partner controller`);
const source=panel;
// Converte objetos vindos do contexto vm em estruturas JS planas do host para comparacao.
const plain=value=>JSON.parse(JSON.stringify(value));
// Configura a sandbox vm com config inicial, FileReader capturavel, callback de confirmacao
// manual e espia de renderPartnersPage restaurado apos o carregamento do modulo.
function setup(config={}){
 const calls=[];let callback,reader;
 const input={value:'selected'};
 const c=vm.createContext({config,uid:()=> 'generated',
  document:{getElementById:id=>{calls.push(['target',id]);return input;}},
  save:()=>calls.push(['save']),renderPartnersPage:()=>calls.push(['render']),
  showAppNotice:(...args)=>calls.push(['notice',...args]),
  showAppConfirm:(title,message,fn,options)=>{callback=fn;calls.push(['confirm',title,message,options]);},
  FileReader:class {constructor(){reader=this;}readAsDataURL(file){calls.push(['read',file]);}},
 });
 const renderer=c.renderPartnersPage;
 vm.runInContext(source,c);
 c.renderPartnersPage=renderer;
 return {c,calls,input,confirm:()=>callback(),reader:()=>reader};
}
// Valida normalizacao: valores falsy (code:0 -> '', note:5 -> '5'), trim em campos textuais
// (mantendo btcQrImage intacto), copia imutavel de config, rejeicao de tipos invalidos em
// partnerHub e TypeError ao passar null diretamente para normalizePartnerAffiliate.
test('normalization preserves falsey defaults, trimming, IDs and config copy/identity behavior',()=>{
 const {c}=setup({extra:1,partnerHub:{affiliates:[{id:'x',name:' A ',url:' u ',code:0,note:5}],btcAddress:' btc ',btcQrImage:' image ',coffeeUrl:' coffee '}});
 const original=c.config;
 assert.deepEqual(plain(c.normalizePartnerAffiliate()),{id:'generated',name:'',url:'',code:'',note:''});
 const next=c.ensurePartnerHubConfig();
 assert.notEqual(next,original);assert.notEqual(next.partnerHub,original.partnerHub);
 assert.equal(original.partnerHub.btcAddress,' btc ');
 assert.deepEqual(plain(next),{extra:1,partnerHub:{affiliates:[{id:'x',name:'A',url:'u',code:'',note:'5'}],btcAddress:'btc',btcQrImage:' image ',coffeeUrl:'coffee'}});
 assert.equal(c.getPartnerHubConfig(),c.config.partnerHub);assert.notEqual(c.config,original);
 for(const partnerHub of [null,[],false,'text']) assert.deepEqual(plain(c.ensurePartnerHubConfig({partnerHub}).partnerHub),{affiliates:[],btcAddress:'',btcQrImage:'',coffeeUrl:''});
 assert.throws(()=>c.normalizePartnerAffiliate(null),{name:'TypeError'});
});
// Testa adicao de afiliado, no-op para IDs inexistentes em update/remove, escrita permissiva
// de chaves customizadas com trim e atualizacao de campo de suporte (coffeeUrl) seguida de save/render.
test('affiliate and support mutations preserve order, unknown guards and permissive keys',()=>{
 const {c,calls}=setup();c.addPartnerAffiliate();
 assert.deepEqual(calls,[['save'],['render']]);calls.length=0;
 c.updatePartnerAffiliateField('missing','name','x');c.removePartnerAffiliate('missing');assert.deepEqual(calls,[]);
 c.updatePartnerAffiliateField('generated','custom',' x ');
 assert.equal(c.config.partnerHub.affiliates[0].custom,'x');assert.deepEqual(calls,[['save'],['render']]);calls.length=0;
 c.updatePartnerSupportField('coffeeUrl',' https://coffee ');
 assert.equal(c.config.partnerHub.coffeeUrl,'https://coffee');assert.deepEqual(calls,[['save'],['render']]);
});
// Garante que removePartnerAffiliate nao remove antes da confirmacao, configura o dialogo
// com danger=true e, ao confirmar, restaura a referencia do hub capturado filtrando o item removido.
test('removal waits for confirmation and restores the captured hub before save/render',()=>{
 const {c,calls,confirm}=setup({partnerHub:{affiliates:[{id:'x',name:' A '},{id:'y'}]}});
 c.removePartnerAffiliate('x');assert.equal(c.config.partnerHub.affiliates.length,2);
 assert.deepEqual(plain(calls),[['confirm','Remover afiliado','Remover A da lista?',{danger:true,confirmText:'Remover'}]]);
 c.config.partnerHub={affiliates:[]};confirm();assert.equal(c.config.partnerHub.affiliates[0].id,'y');
 assert.deepEqual(calls.slice(1),[['save'],['render']]);
});
// Valida copyPartnerText sincrono: texto vazio exibe aviso proprio, ausencia de navigator.clipboard
// faz fallback para notificacao com o texto aparado e excecao sincrona de writeText tambem cai no aviso.
test('clipboard preserves empty guard, fallback and synchronous exceptions',()=>{
 const {c,calls}=setup();c.copyPartnerText(' ');c.copyPartnerText(' text ');
 c.navigator={clipboard:{writeText(){throw Error('denied');}}};c.copyPartnerText('value','Copiado');
 assert.deepEqual(calls,[['notice','Nada para copiar','Preencha este campo antes de copiar.'],['notice','Conteúdo copiado','text'],['notice','Copiado','value']]);
});
// Verifica que tanto Promise resolvida quanto rejeitada em navigator.clipboard.writeText
// disparam a notificacao apenas apos a liquidacao assincrona (settlement).
test('clipboard both fulfilled and rejected promises notify after settlement',async()=>{
 for(const reject of [false,true]){
  const {c,calls}=setup();c.navigator={clipboard:{writeText:text=>{calls.push(['write',text]);return reject?Promise.reject(Error('denied')):Promise.resolve();}}};
  c.copyPartnerText(' text ','Copiado');assert.deepEqual(calls,[['write','text']]);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(calls,[['write','text'],['notice','Copiado','text']]);
 }
});
// Testa limpeza de QR Code (com e sem input no DOM) e guarda de upload: chamadas sem arquivo
// sao ignoradas e arquivos que nao sao imagem geram aviso sem limpar event.target.value.
test('QR clearing resets optional input and upload rejects nonimages without clearing input',()=>{
 const {c,calls,input}=setup({partnerHub:{btcQrImage:'old'}});c.clearPartnerBtcQr();
 assert.equal(c.config.partnerHub.btcQrImage,'');assert.equal(input.value,'');
 assert.deepEqual(calls,[['target','partnerBtcQrInput'],['save'],['render']]);calls.length=0;
 c.handlePartnerBtcQrUpload();c.handlePartnerBtcQrUpload({target:{files:[]}});assert.deepEqual(calls,[]);
 const event={target:{files:[{type:'text/plain'}],value:'selected'}};c.handlePartnerBtcQrUpload(event);
 assert.equal(event.target.value,'selected');assert.deepEqual(calls,[['notice','QR Code BTC','Selecione uma imagem para o QR Code.']]);
 c.document.getElementById=()=>null;c.clearPartnerBtcQr();assert.deepEqual(calls.slice(1),[['save'],['render']]);
});
// Valida upload de QR Code para MIME 'image/png' e MIME vazio '': inicia FileReader no primeiro
// arquivo, limpa o input imediatamente, so salva/renderiza no onload e trata onload sem resultado como ''.
test('QR upload clears input after starting read and saves only on load, with missing-result fallback',()=>{
 for(const type of ['image/png','']){
  const {c,calls,reader}=setup();const file={type};const event={target:{files:[file,{type:'text/plain'}],value:'selected'}};
  c.handlePartnerBtcQrUpload(event);assert.deepEqual(calls,[['read',file]]);assert.equal(event.target.value,'');
  reader().onload({target:{result:'data:image/png;base64,abc'}});
  assert.equal(c.config.partnerHub.btcQrImage,'data:image/png;base64,abc');assert.deepEqual(calls.slice(1),[['save'],['render']]);
  reader().onload();assert.equal(c.config.partnerHub.btcQrImage,'');
 }
});

// Garante que apenas avaliar o arquivo partners-page.js nao executa chamadas a DOM,
// storage ou renderizacao no momento do carregamento.
test('loading the partner controller declares globals without reading state or executing effects',()=>{
 const {calls}=setup();assert.deepEqual(calls,[]);
});
