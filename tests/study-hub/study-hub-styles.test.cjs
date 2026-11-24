/*
 * Teste de integridade byte a byte (hash SHA-256) da cascata de folhas de estilo
 * carregadas no app.
 *
 * Arquivos testados:
 * - `index.html` (declaracoes `<link rel="stylesheet">`)
 * - Todos os arquivos CSS referenciados na ordem exata de cascata.
 *
 * Estrategia de isolamento:
 * - Leitura estatica em disco via `fs.readFileSync` e hash criptografico via
 *   `node:crypto`, sem navegador nem execucao de JS.
 *
 * Regras criticas garantidas:
 * - Todas as folhas de estilo permanecem incondicionais (sem `media`, `disabled` ou
 *   `onload`) e dentro de `<head>`.
 * - A concatenacao de todos os CSS na ordem de cascata preserva exatamente o hash
 *   SHA-256 do baseline, garantindo que refatoracoes nao introduzam regressoes
 *   visuais acidentais.
 */

const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');

// Coleta todas as tags `<link rel="stylesheet">` na ordem em que aparecem no HTML.
const links = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map(match => match[0]);

// Garante que cada stylesheet esteja no `<head>`, carregue incondicionalmente e
// mantenha o digest SHA-256 exato do baseline.
test('loaded styles preserve every baseline byte in cascade order', () => {
  const content = links.map(link => {
    const href = link.match(/href="([^"]+)"/)[1];
    assert.ok(!/\b(?:media|disabled|onload)=/.test(link), 'Styles remain unconditional');
    assert.ok(html.indexOf(link) < html.indexOf('</head>'), 'Styles remain in the head');
    return readFileSync(path.join(root, href));
  });

  // Baseline e720023: folhas de estilo em cascata publicadas na branch de
  // refatoracao.
  assert.equal(createHash('sha256').update(Buffer.concat(content)).digest('hex'),
    '8ac2cf294c512953c12c5726d6d82ae689c3f023d41f08eda9bc091cdd2c2380');
});
