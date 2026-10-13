function openAppDialog(options={}){
  const modal=document.getElementById('appDialogModal');
  if(!modal)return false;
  const title=document.getElementById('appDialogTitle');
  const body=document.getElementById('appDialogBody');
  const inputWrap=document.getElementById('appDialogInputWrap');
  const input=document.getElementById('appDialogInput');
  const inputLabel=document.getElementById('appDialogInputLabel');
  const error=document.getElementById('appDialogError');
  const confirmBtn=document.getElementById('appDialogConfirmBtn');
  if(title)title.textContent=options.title||'Confirmar ação';
  if(body)body.textContent=options.message||'';
  if(error)error.textContent='';
  if(inputWrap)inputWrap.style.display=options.input?'block':'none';
  if(inputLabel)inputLabel.textContent=options.inputLabel||'Valor';
  if(input){input.value=options.inputValue||'';input.placeholder=options.inputPlaceholder||'';}
  if(confirmBtn){
    confirmBtn.textContent=options.confirmText||'Confirmar';
    confirmBtn.className=`btn ${options.danger?'btn-danger':'btn-primary'}`;
  }
  appDialogState={...options};
  modal.classList.add('open');
  if(options.input&&input)setTimeout(()=>input.focus(),0);
  return true;
}

function closeAppDialog(){
  document.getElementById('appDialogModal')?.classList.remove('open');
  appDialogState=null;
}

function confirmAppDialog(){
  const state=appDialogState;if(!state)return;
  const input=document.getElementById('appDialogInput');
  const value=state.input?(input?.value||''):'';
  if(state.requiredValue!=null&&value!==state.requiredValue){
    const error=document.getElementById('appDialogError');
    if(error)error.textContent=state.errorText||`Digite ${state.requiredValue} para confirmar.`;
    return;
  }
  const action=state.onConfirm;
  closeAppDialog();
  if(action)action(value);
}

function showAppConfirm(title,message,onConfirm,options={}){
  if(openAppDialog({title,message,onConfirm,confirmText:options.confirmText||'Confirmar',danger:!!options.danger}))return;
  if(confirm(message))onConfirm();
}

function showAppNotice(title,message,options={}){
  if(openAppDialog({title,message,onConfirm:null,confirmText:options.confirmText||'OK',danger:!!options.danger}))return;
  alert(message);
}

function showAppPrompt(title,message,inputValue,onConfirm,options={}){
  if(openAppDialog({title,message,onConfirm,input:true,inputValue,inputLabel:options.inputLabel||'Nome',inputPlaceholder:options.inputPlaceholder||'',confirmText:options.confirmText||'Salvar',danger:!!options.danger,requiredValue:options.requiredValue,errorText:options.errorText}))return;
  const value=prompt(message,inputValue);
  if(value!==null)onConfirm(value);
}
