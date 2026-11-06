# Manutenção

## Executar

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Abra http://127.0.0.1:8000. A aplicação não exige instalação npm ou compilação. Node.js 24 é usado nas ferramentas; Chrome/Chromium é necessário para o smoke (`CHROME_BIN` permite indicar outro executável).

## Editar e gerar

- Consulte `project-map.md`; altere os arquivos da feature responsável.
- HTML das páginas: manifesto em `src/app/presentation/shell/index.fragments.json`; gere com `node scripts/build-index.cjs`.
- HTML StudyHub: `src/modules/study-hub/presentation/templates/`; gere com `node scripts/build-study-hub-template.cjs`.
- Versione fonte e saída; `index.html` e o asset do template são servidos prontos. Preserve ordem de scripts/CSS, globals, dados e handlers.

## Entregar somente o site

```bash
node scripts/build-index.cjs --export
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

A cópia ignorada pelo Git contém 73 arquivos: HTML, 48 JS, 22 CSS, licença e instruções. O exportador lê o manifesto atual de assets e preserva os bytes. Uma pasta existente com conteúdo diferente é preservada e causa interrupção; use outro nome para guardá-la antes de exportar novamente. Continue editando as fontes do repositório.

## Verificar

```bash
node --test tests/*.test.cjs
node scripts/build-index.cjs --check
node scripts/build-study-hub-template.cjs --check
node --check app.js
node scripts/browser-smoke.cjs
APP_ROOT=dist node scripts/browser-smoke.cjs
git diff --check
```

Execute `node --check` nos scripts JS/CJS alterados. Não existe linter/typecheck geral configurado. O smoke usa navegador isolado e dados sintéticos; não altera o perfil habitual. `APP_ROOT` permite verificar a pasta exportada.

Os scripts `shell-style-check.cjs`, `study-hub-style-check.cjs` e `compare-browser-images.py` são verificadores visuais ativos; suas fixtures ficam em `scripts/lib/`. Metodologia e limites da matriz histórica estão no [registro completo](../archive/refactoring/tooling.md).

## Ferramentas de agentes

`AGENTS.md` define as instruções; `.codex/config.toml` configura Serena e Context7. Prefira Serena e buscas localizadas; Context7 só para documentação externa. Caveman reduz a narrativa. As skills/plugins pertencem ao ambiente de desenvolvimento e não integram o site exportado. Preserve bibliotecas instaladas; não faça limpeza automática de skills.
