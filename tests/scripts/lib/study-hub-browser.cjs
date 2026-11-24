// Disposable Chrome/CDP session for StudyHub visual regression checks. Node built-ins only.
const {spawn} = require('node:child_process');
const {createServer} = require('node:http');
const {readFile, mkdtemp, rm} = require('node:fs/promises');
const {tmpdir} = require('node:os');
const path = require('node:path');

module.exports = async function openStudyHubBrowser(root) {
  const profile = await mkdtemp(path.join(tmpdir(), 'study-hub-style-'));
  const missing = [];
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
    browser = spawn(process.env.CHROME_BIN || 'google-chrome', [
      '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run',
      '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, 'about:blank',
    ], {stdio: ['ignore', 'ignore', 'pipe']});
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
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
      pending.set(id, {resolve, reject, timer});
      socket.send(JSON.stringify({id, method, params, ...(sessionId ? {sessionId} : {})}));
    });
    const {targetId} = await send('Target.createTarget', {url: 'about:blank'});
    const {sessionId} = await send('Target.attachToTarget', {targetId, flatten: true});
    const command = (method, params) => send(method, params, sessionId);
    await command('Runtime.enable');
    await command('Page.enable');
    return {
      command, errors, missing, close,
      url: `http://127.0.0.1:${server.address().port}/`,
      async evaluate(expression) {
        const result = await command('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        return result.result.value;
      },
    };
  } catch (error) { await close(); throw error; }
};
