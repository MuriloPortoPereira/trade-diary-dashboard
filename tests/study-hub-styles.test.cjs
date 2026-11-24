const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');

const root = path.resolve(__dirname, '..');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const links = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map(match => match[0]);

test('loaded styles preserve every baseline byte in cascade order', () => {
  const content = links.map(link => {
    const href = link.match(/href="([^"]+)"/)[1];
    assert.ok(!/\b(?:media|disabled|onload)=/.test(link), 'Styles remain unconditional');
    assert.ok(html.indexOf(link) < html.indexOf('</head>'), 'Styles remain in the head');
    return readFileSync(path.join(root, href));
  });
  // Baseline e720023: cascade stylesheets published on refactor branch.
  assert.equal(createHash('sha256').update(Buffer.concat(content)).digest('hex'),
    '8ac2cf294c512953c12c5726d6d82ae689c3f023d41f08eda9bc091cdd2c2380');
});
