function syncSimulationMoneyFromPercent(){
  const selected=document.getElementById('simAccount')?.value;
  const fallback=getSimulationAccountSnapshot(selected||activeAccountId);
  const sizing=calculateSimulationSizing({
    balance:toSimulationNumber(document.getElementById('simBalance')?.value,fallback.balance),
    riskPct:toSimulationNumber(document.getElementById('simRiskPct')?.value,fallback.riskPct),
    goalPct:toSimulationNumber(document.getElementById('simGoalPct')?.value,fallback.goalPct),
    stopPct:toSimulationNumber(document.getElementById('simStopPct')?.value,fallback.stopPct),
  });
  setSimulationInputValue('simRisk',sizing.riskUsd,2);
  setSimulationInputValue('simGoalDay',sizing.goalUsd,2);
  setSimulationInputValue('simStopDay',sizing.stopUsd,2);
  return sizing;
}
