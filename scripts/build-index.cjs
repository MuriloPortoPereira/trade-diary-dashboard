// Authoring helper. index.html stays committed for static/no-build hosting.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const layoutFile = 'src/app/presentation/shell/index.fragments.json';
const fragmentFiles = JSON.parse(fs.readFileSync(path.join(root, layoutFile), 'utf8'));
if (!Array.isArray(fragmentFiles) || !fragmentFiles.length || new Set(fragmentFiles).size !== fragmentFiles.length ||
  fragmentFiles.some(file => typeof file !== 'string' || !file.startsWith('src/') ||
    !file.endsWith('.html') || file.split('/').includes('..'))) {
  throw new Error('Expected unique HTML fragment paths within src/');
}

function renderIndex() {
  // Exact bytes: no separators, newline normalization, parsing or interpolation.
  return Buffer.concat(fragmentFiles.map(file => fs.readFileSync(path.join(root, file))));
}

function exportSite(target = path.join(root, 'dist')) {
  const index = renderIndex();
  const files = new Map([['index.html', index]]);
  for (const tag of index.toString().matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    const asset = tag[0].match(/\b(?:src|href)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!asset || /^(?:https?:)?\/\//i.test(asset)) continue;
    if (!/^(?:app\.js|src\/[\w/.-]+\.(?:js|css))$/.test(asset) || asset.split('/').includes('..')) {
      throw new Error(`Unsupported local asset: ${asset}`);
    }
    files.set(asset, fs.readFileSync(path.join(root, asset)));
  }
  files.set('LICENSE', fs.readFileSync(path.join(root, 'LICENSE')));
  files.set('README.md', Buffer.from('# Trade Diary Dashboard\n\nAplicação estática pronta para servir. Nesta pasta, execute:\n\n```bash\npython3 -m http.server 8000 --bind 127.0.0.1\n```\n\nAbra http://127.0.0.1:8000. Os dados ficam no localStorage desta origem. Chart.js, fontes, cotação e importação XLSX mantêm suas dependências externas. Fontes de autoria, testes e histórico ficam no repositório original.\n'));
  if (fs.existsSync(target)) {
    const entries = [];
    function visit(dir, prefix = '') {
      if (fs.lstatSync(dir).isSymbolicLink()) throw new Error('Export target cannot contain symbolic links');
      for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const relative = prefix + entry.name;
        if (entry.isDirectory()) visit(path.join(dir, entry.name), relative + '/');
        else if (entry.isFile()) entries.push(relative);
        else throw new Error(`Unsupported export entry: ${relative}`);
      }
    }
    visit(target);
    if (entries.length !== files.size || entries.some(file => !files.has(file) || !fs.readFileSync(path.join(target, file)).equals(files.get(file)))) {
      throw new Error('Export folder already exists with different files; preserve it under another name before exporting');
    }
    return [...files.keys()];
  }
  // Read all sources before creating the delivery. Never replace an existing copy.
  fs.mkdirSync(target);
  for (const [file, data] of files) {
    fs.mkdirSync(path.dirname(path.join(target, file)), {recursive: true});
    fs.writeFileSync(path.join(target, file), data, {flag: 'wx'});
  }
  return [...files.keys()];
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || args.some(arg => !['--check', '--export'].includes(arg))) throw new Error('Usage: node scripts/build-index.cjs [--check|--export]');
    const generated = renderIndex(), target = path.join(root, 'index.html');
    if (process.argv.includes('--check')) {
      if (!fs.existsSync(target) || !fs.readFileSync(target).equals(generated)) {
        throw new Error('index.html is stale; run node scripts/build-index.cjs');
      }
      console.log('PASS: index.html matches authored fragments');
    } else if (args.includes('--export')) {
      console.log(`Exported ${exportSite().length} files to dist/`);
    } else {
      fs.writeFileSync(target, generated);
      console.log('Generated index.html');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {fragmentFiles, renderIndex, exportSite};
