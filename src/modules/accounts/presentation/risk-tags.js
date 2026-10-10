function renderTags(type){
  const el=document.getElementById(type+'Tags');if(!el)return;
  if(type==='strategy')config=ensureDefaultStrategies(config);
  const key=tagConfigKey(type);
  if(!Array.isArray(config[key]))config[key]=[];
  const items=config[key];
  if(type==='strategy'){
    el.innerHTML=items.map((t,i)=>{
      const count=strategyUsageCount(t);
      const title=count?`Excluir da lista (${count} trade(s) usam esta estratégia)`:'Excluir da lista';
      return`<div class="tag strategy-tag"><span>${escapeHtml(t)}</span>${count?`<span class="tag-count">${count}</span>`:''}<button class="tag-edit-btn" onclick="editStrategy(${i})" title="Editar" aria-label="Editar ${escapeHtml(t)}">✎</button><button class="tag-delete-btn" onclick="deleteStrategy(${i})" title="${escapeHtml(title)}" aria-label="Excluir ${escapeHtml(t)}">×</button></div>`;
    }).join('');
  } else {
    el.innerHTML=items.map((t,i)=>`<div class="tag"><span>${escapeHtml(t)}</span><button class="tag-delete-btn" onclick="removeTag('${type}',${i})" title="Excluir" aria-label="Excluir ${escapeHtml(t)}">×</button></div>`).join('');
  }
}
