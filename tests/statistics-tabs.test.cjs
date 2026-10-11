const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/analytics/presentation/statistics-tabs.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function switchStatTab\([^]*?^\}/m)?.[0];
const source = legacy ?? fs.readFileSync(path.join(root, modulePath), 'utf8');
const tabIds = ['overview', 'strategy', 'time', 'psych', 'simulation'];

function createClassTarget(label, calls) {
  return {
    classList: {
      add(name) { calls.push([label, 'add', name]); },
      remove(name) { calls.push([label, 'remove', name]); },
    },
  };
}

function render(id, {missing = [], selected = true} = {}) {
  const calls = [];
  const panels = Object.fromEntries(tabIds.map(tab => [tab, {style: {display: 'before'}}]));
  for (const tab of missing) panels[tab] = null;
  const buttons = [createClassTarget('button-1', calls), createClassTarget('button-2', calls)];
  const selectedElement = selected ? createClassTarget('selected', calls) : null;
  const context = vm.createContext({
    selectedTab: id,
    selectedElement,
    document: {
      getElementById(targetId) {
        calls.push(['target', targetId]);
        return panels[targetId.replace('statTab-', '')] ?? null;
      },
      querySelectorAll(selector) {
        calls.push(['buttons', selector]);
        return buttons;
      },
    },
    renderStatsPsych() { calls.push(['render', 'psych']); },
    resetSimulationEntryDefaults() { calls.push(['reset', 'simulation']); },
    renderSimulation() { calls.push(['render', 'simulation']); },
    renderStats() { calls.push(['render', 'stats']); },
  });
  vm.runInContext(source, context, {filename: legacy ? 'app.js#switchStatTab' : modulePath});
  vm.runInContext('switchStatTab(selectedTab, selectedElement)', context);
  return {panels, calls};
}

test('overview shows only its panel, resets buttons and activates the selected control', () => {
  const {panels, calls} = render('overview');
  assert.equal(panels.overview.style.display, 'block');
  for (const tab of tabIds.slice(1)) assert.equal(panels[tab].style.display, 'none');
  assert.deepEqual(calls.slice(-4), [
    ['button-1', 'remove', 'active'],
    ['button-2', 'remove', 'active'],
    ['selected', 'add', 'active'],
    ['render', 'stats'],
  ]);
});

test('psychology tab delegates only to the psychology renderer', () => {
  const {panels, calls} = render('psych', {selected: false});
  assert.equal(panels.psych.style.display, 'block');
  assert.deepEqual(calls.filter(call => call[0] === 'render' || call[0] === 'reset'), [
    ['render', 'psych'],
  ]);
});

test('simulation tab resets entry defaults before rendering the simulation', () => {
  const {panels, calls} = render('simulation');
  assert.equal(panels.simulation.style.display, 'block');
  assert.deepEqual(calls.filter(call => call[0] === 'render' || call[0] === 'reset'), [
    ['reset', 'simulation'],
    ['render', 'simulation'],
  ]);
});

test('unknown tab tolerates missing panels and retains the general statistics fallback', () => {
  const {calls} = render('unknown', {missing: tabIds, selected: false});
  assert.deepEqual(calls.slice(0, 6), [
    ...tabIds.map(tab => ['target', `statTab-${tab}`]),
    ['buttons', '#statTabNav .tab-btn'],
  ]);
  assert.deepEqual(calls.at(-1), ['render', 'stats']);
});
