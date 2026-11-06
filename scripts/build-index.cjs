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

if (require.main === module) {
  try {
    if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('Usage: node scripts/build-index.cjs [--check]');
    const generated = renderIndex(), target = path.join(root, 'index.html');
    if (process.argv.includes('--check')) {
      if (!fs.existsSync(target) || !fs.readFileSync(target).equals(generated)) {
        throw new Error('index.html is stale; run node scripts/build-index.cjs');
      }
      console.log('PASS: index.html matches authored fragments');
    } else {
      fs.writeFileSync(target, generated);
      console.log('Generated index.html');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {fragmentFiles, renderIndex};
