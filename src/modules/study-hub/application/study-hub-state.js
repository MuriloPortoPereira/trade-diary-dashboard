function defaultStudyHubState(){
  return {
    propfirm:{
      accountSize:100000,
      payoutPct:80,
      maxDdPct:10,
      dailyDdPct:SIMULATION_ENTRY_DEFAULTS.stopPct,
      riskPct:SIMULATION_ENTRY_DEFAULTS.riskPct,
      targetPct:SIMULATION_ENTRY_DEFAULTS.goalPct,
      rrr:SIMULATION_ENTRY_DEFAULTS.rrr,
      fxRate:5.8,
      taxPct:6,
      feePct:2,
    },
    plan:{
      title:'Plano Principal',
      market:'Índices / Forex',
      window:'09:00 - 12:00',
      setup:'Operar apenas contexto limpo, gatilho claro e risco definido antes da execução.',
      invalidation:'Cancelar quando a estrutura perder contexto, volatilidade fugir do padrão ou surgir notícia fora do plano.',
      noTrade:'Não operar cansado, emocionalmente reativo ou tentando recuperar perda.',
      dailyGoal:SIMULATION_ENTRY_DEFAULTS.goalPct,
      dailyStop:SIMULATION_ENTRY_DEFAULTS.stopPct,
      maxTrades:4,
      checklist:'Revisar contexto macro\nMarcar níveis principais\nConfirmar risco do dia\nRevisar gatilho do setup',
      execution:'Executar só onde o plano já foi validado. Nada de antecipar candle ou mover stop sem motivo.',
      review:'Registrar contexto, erro, acerto e estado emocional ao fim da sessão.',
    },
    simulator:{
      capital:100000,
      riskPct:SIMULATION_ENTRY_DEFAULTS.riskPct,
      winRate:55,
      rrr:SIMULATION_ENTRY_DEFAULTS.rrr,
      trades:30,
      runs:200,
      seed:1,
    },
    mental:{
      focus:4,
      energy:4,
      stress:2,
      discipline:4,
      anchor:'Esperar o gatilho completo, aceitar o risco e executar sem pressa.',
      triggers:'Overtrade, revenge trade, pressa para recuperar loss, operar fora da janela.',
      cutoff:'Se houver dois erros de processo ou perda de clareza, encerrar a sessão e revisar.',
    },
  };
}

function mergeStudyHubState(nextState){
  const base=defaultStudyHubState();
  const parsed=(nextState&&typeof nextState==='object')?nextState:{};
  return {
    ...base,
    ...parsed,
    propfirm:{...base.propfirm,...(parsed.propfirm||{})},
    plan:{...base.plan,...(parsed.plan||{})},
    simulator:{...base.simulator,...(parsed.simulator||{})},
    mental:{...base.mental,...(parsed.mental||{})},
  };
}
