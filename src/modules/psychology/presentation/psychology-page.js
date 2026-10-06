function renderPsych(){
  const arr=getAccountTrades(activeAccountId).filter(t=>t.status==='WIN'||t.status==='LOSS'||t.status==='BE');
  const emotionTrades=getClosedTradesWithSubjectiveEmotion(arr);
  const planTaggedTrades=getClosedTradesWithPlanTag(arr);
  const emoMap={};
  emotionTrades.forEach(t=>{const e=t.emotion;if(!emoMap[e])emoMap[e]={w:0,l:0,rs:[],discs:[]};t.status==='WIN'?emoMap[e].w++:emoMap[e].l++;if(t.r!=null)emoMap[e].rs.push(t.r);if(t.discipline!=null)emoMap[e].discs.push(t.discipline);});
  const ek=Object.keys(emoMap);
  const ewr=ek.map(k=>emoMap[k].w+emoMap[k].l>0?+(emoMap[k].w/(emoMap[k].w+emoMap[k].l)*100).toFixed(1):0);
  const bestI=ewr.length?ewr.indexOf(Math.max(...ewr)):-1;
  const worstCandidates=ewr.map((value,index)=>({value,index})).filter(row=>row.value>0);
  const worstI=worstCandidates.length?worstCandidates.reduce((worst,row)=>row.value<worst.value?row:worst).index:-1;
  const beEl=document.getElementById('bestEmotion');if(beEl)beEl.textContent=ek[bestI]||'—';
  const beWR=document.getElementById('bestEmotionWR');if(beWR)beWR.textContent=ewr[bestI]!=null?ewr[bestI]+'% win rate':'';
  const weEl=document.getElementById('worstEmotion');if(weEl)weEl.textContent=ek[worstI]||'—';
  const weWR=document.getElementById('worstEmotionWR');if(weWR)weWR.textContent=ewr[worstI]!=null?ewr[worstI]+'% win rate':'';
  const fpRate=planTaggedTrades.length?planTaggedTrades.filter(t=>t.followedPlan==='sim').length/planTaggedTrades.length:0;
  const fpEl=document.getElementById('followedPlanRate');if(fpEl)fpEl.textContent=(fpRate*100).toFixed(0)+'%';
  const adiscs=arr.filter(t=>t.discipline!=null);
  const avgDisc=adiscs.length?adiscs.reduce((a,t)=>a+(t.discipline||0),0)/adiscs.length:0;
  const adEl=document.getElementById('avgDisc');if(adEl)adEl.textContent=avgDisc.toFixed(0)+'%';
  mkChart('emotionChart',{type:'bar',data:{labels:ek,datasets:[{label:'Win Rate %',data:ewr,backgroundColor:ewr.map(v=>v>=50?'rgba(69,224,123,.62)':'rgba(255,93,104,.62)'),borderColor:'transparent',borderRadius:3}]},options:{...CHART_OPTS,scales:{...CHART_OPTS.scales,y:{...CHART_OPTS.scales.y,max:100}},plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  const discData=arr.filter(t=>t.discipline!=null).map((t,i)=>({x:i,y:t.discipline||0,c:t.status==='WIN'?'rgba(69,224,123,.62)':'rgba(255,93,104,.62)'}));
  mkChart('discChart',{type:'bar',data:{labels:discData.map(d=>d.x+1),datasets:[{data:discData.map(d=>d.y),backgroundColor:discData.map(d=>d.c),borderColor:'transparent',borderRadius:2}]},options:{...CHART_OPTS,scales:{...CHART_OPTS.scales,y:{...CHART_OPTS.scales.y,min:0,max:100}},plugins:{...CHART_OPTS.plugins,legend:{display:false}}}});
  document.getElementById('psychTbody').innerHTML=ek.map(e=>{const d=emoMap[e];const tot=d.w+d.l;const avgR=d.rs.length?d.rs.reduce((a,v)=>a+v,0)/d.rs.length:0;const planBase=emotionTrades.filter(t=>t.emotion===e&&['sim','parcial','nao'].includes(t.followedPlan)).length;const fp=emotionTrades.filter(t=>t.emotion===e&&t.followedPlan==='sim').length;const avgD=d.discs.length?d.discs.reduce((a,v)=>a+v,0)/d.discs.length:null;return`<tr><td><b>${e}</b></td><td>${tot}</td><td class="${d.w/tot>=.5?'text-green':'text-red'}">${(d.w/tot*100).toFixed(0)}%</td><td>${avgR.toFixed(2)}R</td><td>${planBase?(fp/planBase*100).toFixed(0)+'%':'—'}</td><td>${avgD!=null?avgD.toFixed(0)+'%':'—'}</td></tr>`;}).join('');
}
