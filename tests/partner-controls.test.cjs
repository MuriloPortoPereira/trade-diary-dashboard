const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const modulePath='src/modules/partners/presentation/partners-page.js';
const names=['normalizePartnerAffiliate','ensurePartnerHubConfig','getPartnerHubConfig','copyPartnerText','addPartnerAffiliate','updatePartnerAffiliateField','removePartnerAffiliate','updatePartnerSupportField','clearPartnerBtcQr','handlePartnerBtcQrUpload'];
const panel=fs.readFileSync(path.join(root,modulePath),'utf8');
const declaration=(source,name)=>source.match(new RegExp(`^function ${name}\\([^]*?^\\}`,'m'))?.[0];
for(const name of names) assert.ok(declaration(panel,name), `${name} remains available in the partner controller`);
const source=panel;
const plain=value=>JSON.parse(JSON.stringify(value));
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
test('affiliate and support mutations preserve order, unknown guards and permissive keys',()=>{
 const {c,calls}=setup();c.addPartnerAffiliate();
 assert.deepEqual(calls,[['save'],['render']]);calls.length=0;
 c.updatePartnerAffiliateField('missing','name','x');c.removePartnerAffiliate('missing');assert.deepEqual(calls,[]);
 c.updatePartnerAffiliateField('generated','custom',' x ');
 assert.equal(c.config.partnerHub.affiliates[0].custom,'x');assert.deepEqual(calls,[['save'],['render']]);calls.length=0;
 c.updatePartnerSupportField('coffeeUrl',' https://coffee ');
 assert.equal(c.config.partnerHub.coffeeUrl,'https://coffee');assert.deepEqual(calls,[['save'],['render']]);
});
test('removal waits for confirmation and restores the captured hub before save/render',()=>{
 const {c,calls,confirm}=setup({partnerHub:{affiliates:[{id:'x',name:' A '},{id:'y'}]}});
 c.removePartnerAffiliate('x');assert.equal(c.config.partnerHub.affiliates.length,2);
 assert.deepEqual(plain(calls),[['confirm','Remover afiliado','Remover A da lista?',{danger:true,confirmText:'Remover'}]]);
 c.config.partnerHub={affiliates:[]};confirm();assert.equal(c.config.partnerHub.affiliates[0].id,'y');
 assert.deepEqual(calls.slice(1),[['save'],['render']]);
});
test('clipboard preserves empty guard, fallback and synchronous exceptions',()=>{
 const {c,calls}=setup();c.copyPartnerText(' ');c.copyPartnerText(' text ');
 c.navigator={clipboard:{writeText(){throw Error('denied');}}};c.copyPartnerText('value','Copiado');
 assert.deepEqual(calls,[['notice','Nada para copiar','Preencha este campo antes de copiar.'],['notice','Conteúdo copiado','text'],['notice','Copiado','value']]);
});
test('clipboard both fulfilled and rejected promises notify after settlement',async()=>{
 for(const reject of [false,true]){
  const {c,calls}=setup();c.navigator={clipboard:{writeText:text=>{calls.push(['write',text]);return reject?Promise.reject(Error('denied')):Promise.resolve();}}};
  c.copyPartnerText(' text ','Copiado');assert.deepEqual(calls,[['write','text']]);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(calls,[['write','text'],['notice','Copiado','text']]);
 }
});
test('QR clearing resets optional input and upload rejects nonimages without clearing input',()=>{
 const {c,calls,input}=setup({partnerHub:{btcQrImage:'old'}});c.clearPartnerBtcQr();
 assert.equal(c.config.partnerHub.btcQrImage,'');assert.equal(input.value,'');
 assert.deepEqual(calls,[['target','partnerBtcQrInput'],['save'],['render']]);calls.length=0;
 c.handlePartnerBtcQrUpload();c.handlePartnerBtcQrUpload({target:{files:[]}});assert.deepEqual(calls,[]);
 const event={target:{files:[{type:'text/plain'}],value:'selected'}};c.handlePartnerBtcQrUpload(event);
 assert.equal(event.target.value,'selected');assert.deepEqual(calls,[['notice','QR Code BTC','Selecione uma imagem para o QR Code.']]);
 c.document.getElementById=()=>null;c.clearPartnerBtcQr();assert.deepEqual(calls.slice(1),[['save'],['render']]);
});
test('QR upload clears input after starting read and saves only on load, with missing-result fallback',()=>{
 for(const type of ['image/png','']){
  const {c,calls,reader}=setup();const file={type};const event={target:{files:[file,{type:'text/plain'}],value:'selected'}};
  c.handlePartnerBtcQrUpload(event);assert.deepEqual(calls,[['read',file]]);assert.equal(event.target.value,'');
  reader().onload({target:{result:'data:image/png;base64,abc'}});
  assert.equal(c.config.partnerHub.btcQrImage,'data:image/png;base64,abc');assert.deepEqual(calls.slice(1),[['save'],['render']]);
  reader().onload();assert.equal(c.config.partnerHub.btcQrImage,'');
 }
});

test('loading the partner controller declares globals without reading state or executing effects',()=>{
 const {calls}=setup();assert.deepEqual(calls,[]);
});
