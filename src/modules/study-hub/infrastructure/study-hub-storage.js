globalThis.TradeDiaryStudyHubStorage = {
  readPropFirmRate() { return parseFloat(localStorage.getItem('pfCot') || '5.80'); },
  writePropFirmRate(value) { localStorage.setItem('pfCot', value); },
  readPropFirmState() { return localStorage.getItem('pfState'); },
  writePropFirmState(state) { localStorage.setItem('pfState', JSON.stringify(state)); },
  readPlanRate() { return parseFloat(localStorage.getItem('cot') || '5.80'); },
  writePlanRate(value) { localStorage.setItem('cot', value); },
  readCycles() { return localStorage.getItem('hubCiclos'); },
  writeCycles(rows) { localStorage.setItem('hubCiclos', JSON.stringify(rows)); },
  readDiary() { return JSON.parse(localStorage.getItem('diary2026') || '[]'); },
  writeDiary(rows) { localStorage.setItem('diary2026', JSON.stringify(rows)); },
};
