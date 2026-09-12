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
  // Baseline 73716db: original styles.css, including mixed CRLF/LF and repeated rules.
  assert.equal(createHash('sha256').update(Buffer.concat(content)).digest('hex'),
    'd7c3d68345de15f0476620841ec03ff0725ffe30342bd0858e25bd25d827312c');
});
