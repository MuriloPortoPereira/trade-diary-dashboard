const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const modulePath = 'src/modules/trades/domain/trade-timing.js';
const moduleFile = path.join(root, modulePath);

function between(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `missing source range: ${start}`);
  return source.slice(from, to);
}

function loadTiming() {
  const context = vm.createContext({});
  if (fs.existsSync(moduleFile)) {
    vm.runInContext(fs.readFileSync(moduleFile, 'utf8'), context, {filename: modulePath});
  }
  const padClock = appSource.match(/^const padClock = .*;$/m)?.[0] ?? '';
  if (!fs.existsSync(moduleFile)) assert.ok(padClock, 'legacy timing requires padClock');
  const timingStart = appSource.includes('const tradeTimingDomain=')
    ? 'const tradeTimingDomain='
    : 'function normalizeClockTime(';
  const timing = between(appSource, timingStart, '\nfunction parseMTNumber(');
  const normalizers = between(appSource, 'function parseMTNumber(', '\nfunction mtTradeStatus(');
  vm.runInContext(`${padClock}\n${normalizers}\n${timing}`, context, {filename: 'app.js#trade-timing'});
  return context;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('clock normalization preserves dates, supported text shapes and legacy loose ranges', () => {
  const api = loadTiming();
  assert.equal(api.normalizeClockTime(null), '');
  assert.equal(api.normalizeClockTime(' 9:05:44 '), '09:05');
  assert.equal(api.normalizeClockTime('9.07.30'), '09:07');
  assert.equal(api.normalizeClockTime('930'), '09:30');
  assert.equal(api.normalizeClockTime('25:61'), '25:61');
  assert.equal(api.normalizeClockTime('not a clock'), '');
  assert.equal(vm.runInContext('normalizeClockTime(new Date(2026, 0, 2, 9, 5))', api), '09:05');
  assert.equal(api.clockToMinutes('7:30'), 450);
  assert.equal(api.clockToMinutes('invalid'), null);
  assert.equal(api.clockToMinutes('25:61'), 1561);
});

test('clock and duration formatting preserve rounding, wrapping and invalid fallbacks', () => {
  const api = loadTiming();
  assert.equal(api.formatClockMinutes(-1), '23:59');
  assert.equal(api.formatClockMinutes(1440), '00:00');
  assert.equal(api.formatClockMinutes(90.6), '01:31');
  assert.equal(api.formatClockMinutes(Infinity), '—');
  assert.equal(api.formatDurationMinutes(-1), '—');
  assert.equal(api.formatDurationMinutes(59.6), '1h');
  assert.equal(api.formatDurationMinutes(61), '1h 1min');
  assert.equal(api.formatDurationMinutes(120), '2h');
});

test('trade duration preserves same-day, midnight rollover, explicit dates and invalid ranges', () => {
  const api = loadTiming();
  assert.equal(api.getTradeDurationMinutes({date: '2026-01-02', openTime: '09:15', exitTime: '11:45'}), 150);
  assert.equal(api.getTradeDurationMinutes({date: '2026-01-02', openTime: '23:30', exitTime: '00:30'}), 60);
  assert.equal(api.getTradeDurationMinutes({date: '2026-01-02', exitDate: '2026-01-03', openTime: '09:15', exitTime: '11:45'}), 1590);
  assert.equal(api.getTradeDurationMinutes({date: '2026-01-03', exitDate: '2026-01-01', openTime: '09:15', exitTime: '08:45'}), null);
  assert.equal(api.getTradeDurationMinutes({date: '2026-01-02', openTime: '09:15', exitTime: '09:15'}), 0);
  assert.equal(api.getTradeDurationMinutes({date: '2026-01-02', openTime: '', exitTime: '09:15'}), null);
  assert.throws(() => api.getTradeDurationMinutes(null), {name: 'TypeError'});
});

test('timing statistics retain closed-status groups, averages and strategy ordering', () => {
  const api = loadTiming();
  const source = [
    {status: 'WIN', strategy: 'Alpha', date: '2026-01-02', placedTime: '09:00', openTime: '10:00', exitTime: '11:00'},
    {status: 'LOSS', strategy: 'Beta', date: '2026-01-02', placedTime: '08:00', openTime: '23:30', exitTime: '00:30'},
    {status: 'BE', strategy: 'Alpha', date: '2026-01-02', placedTime: '', openTime: '', exitTime: ''},
    {status: 'OPEN', strategy: 'Ignored', date: '2026-01-02', placedTime: '12:00', openTime: '12:00', exitTime: '13:00'},
  ];
  const before = JSON.stringify(source);
  const result = plain(api.getTradeTimingStats(source));
  assert.deepEqual(result.overall, {count: 3, avgPlacedMinutes: 340, avgOpenMinutes: 670, avgExitMinutes: 230, avgDurationMinutes: 40});
  assert.deepEqual(result.wins, {count: 1, avgPlacedMinutes: 540, avgOpenMinutes: 600, avgExitMinutes: 660, avgDurationMinutes: 60});
  assert.deepEqual(result.losses, {count: 1, avgPlacedMinutes: 480, avgOpenMinutes: 1410, avgExitMinutes: 30, avgDurationMinutes: 60});
  assert.deepEqual(result.byStrategy.map(row => [row.name, row.count]), [['Alpha', 2], ['Beta', 1]]);
  assert.equal(JSON.stringify(source), before);
});

test('timing statistics preserve empty inputs and the missing-strategy label', () => {
  const api = loadTiming();
  assert.deepEqual(plain(api.getTradeTimingStats(null)), {
    overall: {count: 0, avgPlacedMinutes: null, avgOpenMinutes: null, avgExitMinutes: null, avgDurationMinutes: null},
    wins: {count: 0, avgPlacedMinutes: null, avgOpenMinutes: null, avgExitMinutes: null, avgDurationMinutes: null},
    losses: {count: 0, avgPlacedMinutes: null, avgOpenMinutes: null, avgExitMinutes: null, avgDurationMinutes: null},
    byStrategy: [],
  });
  const result = plain(api.getTradeTimingStats([{status: 'BE', strategy: '', date: '2026-01-02'}]));
  assert.deepEqual(result.byStrategy.map(row => [row.name, row.count]), [['Sem estratégia', 1]]);
});

test('isolated timing domain exposes one factory without UI, storage or IO access', () => {
  const forbidden = ['document', 'localStorage', 'fetch', 'Chart'];
  const sandbox = {};
  for (const name of forbidden) Object.defineProperty(sandbox, name, {get() { throw new Error(`timing domain accessed ${name}`); }});
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(moduleFile, 'utf8'), context, {filename: modulePath});
  assert.deepEqual(Object.getOwnPropertyNames(context).filter(name => !forbidden.includes(name)), ['TradeDiaryTradeTiming']);
  assert.deepEqual(Object.keys(context.TradeDiaryTradeTiming), ['createTradeTiming']);
  const api = context.TradeDiaryTradeTiming.createTradeTiming({normalizeDate: value => String(value || '').slice(0, 10)});
  assert.deepEqual(Object.keys(api).sort(), [
    'averageMinutes', 'buildTradeDateTime', 'clockToMinutes', 'formatClockMinutes',
    'formatDurationMinutes', 'getTradeDurationMinutes', 'getTradeTimingStats',
    'normalizeClockTime', 'summarizeTradeTimingGroup',
  ]);
  assert.equal(api.getTradeDurationMinutes({date: '2026-01-02', openTime: '23:30', exitTime: '00:30'}), 60);
});

test('timing domain loads once before presentation consumers and legacy wrappers remain global', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => ({
    attributes: match[1], src: match[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1],
  }));
  const matches = scripts.filter(script => script.src === modulePath);
  assert.equal(matches.length, 1);
  assert.doesNotMatch(matches[0].attributes, /\b(?:type|async|defer|nomodule)\b/i);
  const domainIndex = scripts.findIndex(script => script.src === modulePath);
  for (const consumer of [
    'src/modules/trades/presentation/trade-duration-field.js',
    'src/modules/analytics/presentation/strategy-comparison.js',
    'src/modules/analytics/presentation/statistics-page.js',
    'app.js',
  ]) {
    assert.ok(domainIndex < scripts.findIndex(script => script.src === consumer));
  }
  for (const name of [
    'normalizeClockTime', 'clockToMinutes', 'formatClockMinutes', 'formatDurationMinutes',
    'buildTradeDateTime', 'getTradeDurationMinutes', 'averageMinutes',
    'summarizeTradeTimingGroup', 'getTradeTimingStats',
  ]) {
    assert.match(appSource, new RegExp(`^function ${name}\\(`, 'm'));
  }
});
