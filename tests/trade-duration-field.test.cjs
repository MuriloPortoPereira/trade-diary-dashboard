const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = 'src/modules/trades/presentation/trade-duration-field.js';
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const legacy = appSource.match(/^function updateTradeDurationField\([^]*?^\}/m)?.[0];
assert.equal(legacy, undefined, 'legacy declaration must be moved');
const source = fs.readFileSync(path.join(root, modulePath), 'utf8');

function render({values = {}, duration = null, formatted = 'formatted'} = {}) {
  const calls = [];
  const elements = Object.fromEntries(Object.entries(values).map(([id, value]) => [id, {value}]));
  const context = vm.createContext({
    document: {getElementById(id) { calls.push(['target', id]); return elements[id] ?? null; }},
    getTradeDurationMinutes(trade) {
      calls.push(['duration', JSON.parse(JSON.stringify(trade))]);
      return duration;
    },
    formatDurationMinutes(minutes) { calls.push(['format', minutes]); return formatted; },
  });
  vm.runInContext(source, context, {filename: modulePath});
  vm.runInContext('updateTradeDurationField()', context);
  return {calls, elements};
}

test('missing duration target returns before reading form fields or calculating', () => {
  const {calls} = render();
  assert.deepEqual(calls, [['target', 't-duration']]);
});

test('trade duration field classic script loads once before app.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(scripts.filter(src => src === modulePath).length, 1);
  assert.ok(scripts.indexOf(modulePath) < scripts.indexOf('app.js'));
});

test('duration field preserves dates, times, dependency calls and formatted value', () => {
  const {calls, elements} = render({
    values: {
      't-duration': 'before',
      't-date': '2026-01-02',
      't-exitdate': '2026-01-03',
      't-opentime': '09:15',
      't-exittime': '11:45',
    },
    duration: 1590,
    formatted: '1d 2h 30m',
  });
  assert.equal(elements['t-duration'].value, '1d 2h 30m');
  assert.deepEqual(calls, [
    ['target', 't-duration'],
    ['target', 't-date'],
    ['target', 't-exitdate'],
    ['target', 't-opentime'],
    ['target', 't-exittime'],
    ['duration', {date: '2026-01-02', exitDate: '2026-01-03', openTime: '09:15', exitTime: '11:45'}],
    ['format', 1590],
  ]);
});

test('missing exit date falls back to a second read of entry date and null clears value', () => {
  const {calls, elements} = render({
    values: {'t-duration': 'before', 't-date': '2026-02-04'},
    duration: null,
  });
  assert.equal(elements['t-duration'].value, '');
  assert.deepEqual(calls, [
    ['target', 't-duration'],
    ['target', 't-date'],
    ['target', 't-exitdate'],
    ['target', 't-date'],
    ['target', 't-opentime'],
    ['target', 't-exittime'],
    ['duration', {date: '2026-02-04', exitDate: '2026-02-04', openTime: '', exitTime: ''}],
  ]);
});

test('zero duration is formatted instead of treated as empty', () => {
  const {calls, elements} = render({values: {'t-duration': 'before'}, duration: 0, formatted: '0 min'});
  assert.equal(elements['t-duration'].value, '0 min');
  assert.deepEqual(calls.slice(-2), [['duration', {date: '', exitDate: '', openTime: '', exitTime: ''}], ['format', 0]]);
});
