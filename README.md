# Trade Diary Dashboard

Aplicação estática para registrar operações, acompanhar contas e risco, analisar resultados e organizar estudos. Usa HTML, CSS, JavaScript clássico, Chart.js e `localStorage`.

Este repositório mantém a versão estática. Não há migração para framework planejada aqui.

## Abrir a aplicação

Na raiz do projeto:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Abra http://127.0.0.1:8000. Não é necessário `npm install`.

Os dados ficam no navegador e na origem utilizada. Trocar de porta/domínio cria outro espaço de armazenamento; exporte um backup antes de mudar. Chart.js, fontes, cotação e a importação XLSX usam serviços externos existentes.

## Estrutura final

```text
index.html             Aplicação pronta para servir, gerada e versionada
app.js                 Estado, composição e wrappers públicos
src/
  app/                 Shell, inicialização e persistência principal
  modules/             Funcionalidades: contas, operações, análises e demais páginas
  shared/              Widgets usados por várias funcionalidades
  styles/              Estilos comuns e responsividade
docs/
  architecture/        Guia atual, mapa e decisões
  archive/refactoring/ Histórico do processo de refatoração
tests/                 Testes de comportamento; não são carregados pelo site
scripts/               Geração e verificação; não são carregados pelo site
dist/                  Cópia de entrega local, criada pelo comando abaixo
```

Para entender ou editar uma funcionalidade, comece pelo [mapa do projeto](docs/architecture/project-map.md). Cada feature tem poucos arquivos com responsabilidades explícitas; não há um arquivo por função. A fonte atual reúne 48 scripts e 22 CSS, consolidados a partir de 95 e 40. `app.js` passou de 11.068 para 181 linhas.

## Pasta somente com a aplicação

```bash
node scripts/build-index.cjs --export
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

`dist/` contém somente os 71 arquivos carregados pelo site, a licença e instruções de execução: 73 arquivos ao todo. Não inclui testes, ferramentas, arquivos de agentes ou histórico. Mantém os mesmos bytes, caminhos e ordem dos scripts/CSS. É uma cópia de entrega; a manutenção continua nas fontes da raiz e de `src/`.

O comando verifica uma exportação idêntica sem reescrever. Se `dist/` tiver alterações, ele interrompe; preserve essa pasta com outro nome antes de exportar novamente. A pasta é ignorada pelo Git e pode ser recriada pelo comando.

## Onde editar

- HTML das páginas: encontre a feature no [manifesto](src/app/presentation/shell/index.fragments.json), edite seu HTML e execute `node scripts/build-index.cjs`.
- JavaScript e CSS: use o [mapa atual](docs/architecture/project-map.md) para localizar o arquivo responsável.
- Ferramentas StudyHub: edite `src/modules/study-hub/presentation/templates/` e execute `node scripts/build-study-hub-template.cjs`.

Os módulos separam apresentação, regras puras, coordenação e IO quando existe uma responsabilidade concreta. Estado e APIs globais permanecem por compatibilidade; os limites aceitos estão no [ADR-006](docs/architecture/adr/006-basic-static-version-closure.md).

## Verificar

```bash
node --test tests/*.test.cjs
node scripts/build-index.cjs --check
node scripts/build-study-hub-template.cjs --check
node scripts/browser-smoke.cjs
APP_ROOT=dist node scripts/browser-smoke.cjs
git diff --check
```

Node.js é necessário para as ferramentas; o smoke requer Chrome/Chromium e usa um perfil descartável. [Detalhes de manutenção](docs/architecture/tooling.md).

## Branches e histórico

`main` preserva a versão inicial; `develop` continua como cópia dela; `refactor` contém a versão reorganizada. A integração dessas branches é uma decisão separada. O [histórico arquivado](docs/archive/refactoring/README.md) documenta o aprendizado e os lotes anteriores, sem impor novas extrações.

Desenvolvido por Murilo Porto Pereira. [Licença MIT](LICENSE).
