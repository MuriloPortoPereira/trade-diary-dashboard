// Pure trade timing rules. Classic-script namespace retained during migration.
globalThis.TradeDiaryTradeTiming = (() => {
  function createTradeTiming({normalizeDate,cleanCell}={}){
    const normalizeDateValue=typeof normalizeDate==='function'?normalizeDate:()=>'';
    const cleanCellValue=typeof cleanCell==='function'?cleanCell:value=>String(value??'').replace(/\s+/g,' ').trim();
    const padClock=value=>String(value).padStart(2,'0');

    function normalizeClockTime(value){
      if(value===null||value===undefined)return'';
      if(value instanceof Date&&!isNaN(value.getTime())){
        return `${padClock(value.getHours())}:${padClock(value.getMinutes())}`;
      }
      const raw=cleanCellValue(value);
      if(!raw)return'';
      let m=raw.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/);
      if(m)return`${padClock(m[1])}:${m[2]}`;
      m=raw.match(/\b(\d{1,2})\.(\d{2})(?:\.(\d{2}))?\b/);
      if(m)return`${padClock(m[1])}:${m[2]}`;
      m=raw.match(/^(\d{3,4})$/);
      if(m){
        const digits=m[1].padStart(4,'0');
        const hh=parseInt(digits.slice(0,2),10);
        const mm=parseInt(digits.slice(2),10);
        if(hh>=0&&hh<24&&mm>=0&&mm<60)return`${padClock(hh)}:${padClock(mm)}`;
      }
      const parsed=new Date(raw);
      if(!isNaN(parsed.getTime()))return`${padClock(parsed.getHours())}:${padClock(parsed.getMinutes())}`;
      return'';
    }

    function clockToMinutes(value){
      const clock=normalizeClockTime(value);
      if(!clock)return null;
      const [hh,mm]=clock.split(':').map(Number);
      return hh*60+mm;
    }

    function formatClockMinutes(value){
      const minutes=Math.round(Number(value));
      if(!Number.isFinite(minutes))return'—';
      const safe=((minutes%(24*60))+(24*60))%(24*60);
      const hh=Math.floor(safe/60);
      const mm=safe%60;
      return `${padClock(hh)}:${padClock(mm)}`;
    }

    function formatDurationMinutes(value){
      const minutes=Math.round(Number(value));
      if(!Number.isFinite(minutes)||minutes<0)return'—';
      if(minutes<60)return `${minutes} min`;
      const hours=Math.floor(minutes/60);
      const rest=minutes%60;
      return rest?`${hours}h ${rest}min`:`${hours}h`;
    }

    function buildTradeDateTime(dateValue,timeValue){
      const clock=normalizeClockTime(timeValue);
      const date=normalizeDateValue(dateValue||timeValue);
      if(!date||!clock)return null;
      const parsed=new Date(`${date}T${clock}:00`);
      return isNaN(parsed.getTime())?null:parsed;
    }

    function getTradeDurationMinutes(trade={}){
      const start=buildTradeDateTime(trade.date||trade.openTime,trade.openTime);
      const end=buildTradeDateTime(trade.exitDate||trade.date||trade.exitTime,trade.exitTime);
      if(!start||!end)return null;
      let diff=Math.round((end.getTime()-start.getTime())/60000);
      if(diff<0&&diff>-1440)diff+=1440;
      return diff>=0?diff:null;
    }

    function averageMinutes(values=[]){
      const list=(Array.isArray(values)?values:[])
        .map(v=>Number(v))
        .filter(v=>Number.isFinite(v));
      if(!list.length)return null;
      return Math.round(list.reduce((sum,v)=>sum+v,0)/list.length);
    }

    function summarizeTradeTimingGroup(source=[]){
      const rows=(Array.isArray(source)?source:[]);
      return{
        count:rows.length,
        avgPlacedMinutes:averageMinutes(rows.map(t=>clockToMinutes(t.placedTime))),
        avgOpenMinutes:averageMinutes(rows.map(t=>clockToMinutes(t.openTime))),
        avgExitMinutes:averageMinutes(rows.map(t=>clockToMinutes(t.exitTime))),
        avgDurationMinutes:averageMinutes(rows.map(getTradeDurationMinutes)),
      };
    }

    function getTradeTimingStats(source=[]){
      const closed=(Array.isArray(source)?source:[]).filter(t=>['WIN','LOSS','BE'].includes(t?.status));
      const grouped={};
      closed.forEach(trade=>{
        const key=trade.strategy||'Sem estratégia';
        if(!grouped[key])grouped[key]=[];
        grouped[key].push(trade);
      });
      const byStrategy=Object.entries(grouped)
        .map(([name,rows])=>({name,...summarizeTradeTimingGroup(rows)}))
        .sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
      return{
        overall:summarizeTradeTimingGroup(closed),
        wins:summarizeTradeTimingGroup(closed.filter(t=>t.status==='WIN')),
        losses:summarizeTradeTimingGroup(closed.filter(t=>t.status==='LOSS')),
        byStrategy,
      };
    }

    return {normalizeClockTime,clockToMinutes,formatClockMinutes,formatDurationMinutes,buildTradeDateTime,getTradeDurationMinutes,averageMinutes,summarizeTradeTimingGroup,getTradeTimingStats};
  }

  return {createTradeTiming};
})();
