/*
 * Helper de sessão descartável Chrome/CDP (Chrome DevTools Protocol) sem dependências
 * externas.
 *
 * Objetivo:
 *   Fornecer uma interface mínima usando apenas módulos nativos do Node.js para
 *   servir a aplicação localmente em `127.0.0.1`, iniciar uma instância headless do
 *   Chrome com perfil temporário e enviar comandos CDP via WebSocket.
 *
 * Papel na verificação visual:
 *   Base de infraestrutura compartilhada por `study-hub-style-check.cjs` e
 *   `shell-style-check.cjs` para navegação, avaliação de scripts, inspeção DOM/CSSOM,
 *   forçamento de pseudo-estados e captura de screenshots.
 *
 * Pontos-chave:
 *   - Restringe o servidor HTTP estático aos arquivos públicos da aplicação
 *     (`index.html`, `app.js`, `styles.css` e arquivos `.js`/`.css` em `src/`),
 *     registrando qualquer ativo ausente.
 *   - Captura exceções (`Runtime.exceptionThrown`) e erros de console
 *     (`console.error`).
 *   - Garante limpeza segura de WebSocket, processo do navegador, servidor HTTP e
 *     perfil temporário.
 */

const {spawn} = require('node:child_process');
const {createServer} = require('node:http');
const {readFile, mkdtemp, rm} = require('node:fs/promises');
const {tmpdir} = require('node:os');
const path = require('node:path');

/*
 * Inicia servidor local e sessão Chrome/CDP isolada apontando para `root`. Retorna
 * `{command, evaluate, errors, missing, close, url}`.
 */
module.exports = async function openStudyHubBrowser(root) {
  // Cria diretório temporário exclusivo para o perfil do Chrome nesta execução.
  const profile = await mkdtemp(path.join(tmpdir(), 'study-hub-style-'));
  const missing = [];

  // Servidor HTTP estático restrito à raiz da aplicação para evitar exposição de
  // metadados.
  const server = createServer(async (request, response) => {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).slice(1) || 'index.html';
    if (relative === 'favicon.ico') { response.writeHead(204); response.end(); return; }
    const filename = path.resolve(root, relative);
    if ((!['index.html', 'app.js', 'styles.css'].includes(relative) && !/^src\/[\w/.-]+\.(js|css)$/.test(relative)) || !filename.startsWith(root + path.sep)) {
      missing.push(relative); response.writeHead(404); response.end(); return;
    }
    try {
      const content = await readFile(filename);
      response.writeHead(200, {'Content-Type': relative.endsWith('.css') ? 'text/css' : relative.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript'});
      response.end(content);
    } catch { missing.push(relative); response.writeHead(404); response.end(); }
  });
  let browser, socket, nextId = 0;
  const pending = new Map();
  const errors = [];

  // Encerra requisições CDP pendentes, fecha o socket, mata o Chrome e remove o
  // perfil temporário.
  async function close() {
    for (const {reject, timer} of pending.values()) { clearTimeout(timer); reject(new Error('Browser session closed')); }
    pending.clear();
    socket?.close();
    if (browser && browser.exitCode === null) {
      const stopped = new Promise(resolve => browser.once('close', resolve));
      browser.kill('SIGKILL');
      await stopped;
    }
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});
  }
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

    // Inicia Chrome headless com porta de depuração remota efêmera
    // (`--remote-debugging-port=0`).
    browser = spawn(process.env.CHROME_BIN || 'google-chrome', [
      '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run',
      '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, 'about:blank',
    ], {stdio: ['ignore', 'ignore', 'pipe']});

    // Lê o endpoint WebSocket anunciado pelo Chrome no stderr (`DevTools listening on
    // ws://...`).
    const endpoint = await new Promise((resolve, reject) => {
      let stderr = '';
      const timer = setTimeout(() => reject(new Error(`Chrome endpoint timeout: ${stderr.slice(-1000)}`)), 15000);
      browser.once('error', error => { clearTimeout(timer); reject(error); });
      browser.stderr.on('data', data => {
        stderr = (stderr + data).slice(-4000);
        const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
    });

    // Conecta o cliente WebSocket CDP e registra o despachante de respostas e eventos
    // de erro.
    socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const request = pending.get(message.id); pending.delete(message.id); clearTimeout(request.timer);
        if (message.error) request.reject(new Error(JSON.stringify(message.error)));
        else request.resolve(message.result);
      }
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        errors.push(message.params.args.map(arg => arg.value ?? arg.description).join(' '));
      }
    };

    // Envia comando CDP numerado com timeout de 30s e suporte opcional a `sessionId`
    // (modo flatten).
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
      pending.set(id, {resolve, reject, timer});
      socket.send(JSON.stringify({id, method, params, ...(sessionId ? {sessionId} : {})}));
    });

    // Cria uma aba limpa (`target`) e anexa a sessão CDP com domínios `Runtime` e
    // `Page` ativos.
    const {targetId} = await send('Target.createTarget', {url: 'about:blank'});
    const {sessionId} = await send('Target.attachToTarget', {targetId, flatten: true});
    const command = (method, params) => send(method, params, sessionId);
    await command('Runtime.enable');
    await command('Page.enable');
    return {
      command, errors, missing, close,
      url: `http://127.0.0.1:${server.address().port}/`,

      // Avalia expressões JavaScript na aba aguardando Promises e propagando exceções
      // do runtime.
      async evaluate(expression) {
        const result = await command('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        return result.result.value;
      },
    };
  } catch (error) { await close(); throw error; }
};
