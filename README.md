# Trade Diary Dashboard

Aplicação web estática para registrar operações de trading, acompanhar contas e risco, analisar resultados e organizar estudos. Funciona no navegador com HTML, CSS, JavaScript clássico, Chart.js e `localStorage`; não há backend, login ou etapa de build.

[Versão pública informada pelo projeto](https://trade-diary-dashboard.vercel.app/) · [Repositório](https://github.com/MuriloPortoPereira/trade-diary-dashboard) · [Licença MIT](LICENSE)

> **Branch `refactor`:** versão em reorganização arquitetural. A versão estável original permanece em `main` e está marcada por `v1.0.0`. Esta branch ainda não representa uma nova versão publicada.

> Os dados ficam no `localStorage` do navegador e da origem usada para abrir a aplicação. Não há sincronização entre dispositivos ou contas de usuário. Exporte backups antes de limpar os dados do navegador ou mudar de origem.

## O que a aplicação oferece

| Área | Recursos existentes |
|---|---|
| Diário e dashboard | Registro de trades, filtros, tabelas, métricas, gráficos e calendário |
| Contas e risco | Múltiplas contas, visão geral de saldos, limites e acompanhamento de risco |
| Análises | Estratégias, resultados, disciplina, psicologia e simulação |
| Rotina e StudyHub | Checklist pré-mercado e ferramentas de estudo integradas |
| Dados | Importação de relatórios/planilhas, exportação CSV e backup JSON |
| Workspace | Documentos, notificações, parceiros, perfil e preferências de idioma |

A interface contém 15 páginas internas alternadas por `showPage(id)`. O perfil é um resumo local da conta ativa; não implementa autenticação. Este software é uma ferramenta de registro e estudo, não aconselhamento financeiro.

## Executar localmente

Não é necessário `npm install`. Use um servidor HTTP na raiz do repositório para carregar os scripts e CSS locais:

```bash
git clone https://github.com/MuriloPortoPereira/trade-diary-dashboard.git
cd trade-diary-dashboard
git switch --track origin/refactor
python3 -m http.server 8000
```

Abra [http://localhost:8000](http://localhost:8000). A versão publicada usa arquivos estáticos; não há compilação. Chart.js pelo CDN, fontes externas e a consulta da cotação USD/BRL exigem conexão com a internet; os arquivos locais continuam disponíveis sem ela. A biblioteca XLSX é carregada pelo CDN apenas quando uma importação de planilha exige isso.

A branch `refactor` contém o trabalho incremental de refatoração. A aplicação continua usando scripts clássicos síncronos; a ordem dos `<script>` e `<link>` em `index.html` faz parte do contrato de compatibilidade.

## Branches, GitFlow e versões

| Branch | Responsabilidade |
|---|---|
| `main` | Versão estável. Atualmente representa a versão inicial `v1.0.0` e permanece sem alterações durante a refatoração. |
| `develop` | Integração de funcionalidades. Por enquanto é uma cópia da `main`; receberá a refatoração somente após a conclusão e validação desta branch. |
| `refactor` | Trabalho arquitetural em andamento, com histórico completo dos lotes seguros e verificáveis. |
| `feature/*` | Funcionalidades futuras criadas a partir da `develop` e integradas novamente nela após revisão. |
| `hotfix/*` | Correções urgentes criadas a partir da `main`, devolvidas à `main` e à `develop`. |

Fluxo planejado para esta reorganização:

```text
main (v1.0.0) ────────────────┐
  └─ refactor ── lotes G1–G7 ─┴─> develop ── validação final ──> main (v2.0.0)
```

Depois da versão 2, o fluxo normal será `develop` → `feature/*` → `develop` → `main`. A `main` recebe apenas versões validadas; tags seguem versionamento semântico (`v1.0.0`, `v2.0.0` e versões posteriores). Commits permanecem pequenos e conceituais, e cada integração deve registrar testes e revisão correspondentes.

## Estrutura do repositório

```text
index.html                  Distribuição HTML gerada e versionada
app.js                      Estado, bootstrap e fluxos ainda legados
src/app/presentation/shell/  Manifesto e fontes da navegação/modais/scripts
src/styles/                 CSS comum e responsividade
src/modules/                Código e CSS organizados por feature
  accounts/presentation/    Visão de contas
  partners/presentation/    Página e estilos de parceiros
  profile/presentation/     Página de perfil
  preferences/presentation/ Idiomas, catálogos e widgets
  simulation/{domain,presentation}/ Cálculo e projeção do sizing
  data-transfer/infrastructure/ Serialização CSV
  data-transfer/presentation/ Resumo de backup e filtro de exportação
  trades/presentation/        Operação e apresentação do diário
  ...                       Demais módulos extraídos gradualmente
tests/                      Testes Node de caracterização
scripts/                    Smoke e comparação visual no navegador
docs/architecture/          Mapas, arquitetura, roadmap e progresso
AGENTS.md                   Instruções operacionais dos agentes
```

`src/modules/` também contém módulos de apresentação para analytics, calendar, documents, routine, StudyHub e trades. O [mapa do projeto](docs/architecture/project-map.md) é a fonte rápida para localizar código real. O [mapa de extração JavaScript](docs/architecture/javascript-extraction-map.md) distingue destinos propostos dos arquivos já criados.

## Arquitetura e compatibilidade

A refatoração segue Clean Architecture de forma proporcional a uma aplicação estática:

- **Presentation:** DOM, renderização, handlers e CSS da feature.
- **Application:** coordenação de casos de uso, quando houver um boundary real.
- **Domain:** cálculos e regras puras, sem DOM, Chart.js ou storage.
- **Infrastructure:** formatos, `localStorage`, arquivos e integrações externas.
- **Composição legada:** `app.js` ainda liga os módulos e preserva funções globais usadas pelo HTML.

As extrações são feitas por responsabilidade, com testes antes da mudança. Funções globais, handlers inline, dados salvos, ordem dos scripts e comportamento existente devem continuar compatíveis. Não há migração para ES modules nem dependência de runtime nova. Consulte [arquitetura alvo](docs/architecture/target-architecture.md), [regras de dependência](docs/architecture/dependency-rules.md) e [ADRs](docs/architecture/README.md).

## Testes e verificação

Requer Node.js para os testes. O smoke também requer Chrome ou Chromium instalado; configure `CHROME_BIN` se o executável não for `google-chrome`.

```bash
node --test tests/*.test.cjs
node scripts/build-index.cjs --check
node scripts/build-study-hub-template.cjs --check
node scripts/browser-smoke.cjs
node --check app.js
git diff --check
```

Para verificar scripts alterados, execute `node --check caminho/do/arquivo.js` em cada um. O smoke usa um perfil isolado do navegador, verifica navegação e assets locais e não usa os dados do seu navegador habitual. A comparação visual por estados, geometria e imagens é descrita em [ferramentas e verificações](docs/architecture/tooling.md). A cobertura caracteriza fluxos específicos; ela não equivale a uma prova de todos os cálculos ou estados possíveis.

Para editar HTML, localize a página no [manifesto de composição](src/app/presentation/shell/index.fragments.json), altere sua fonte em `src/modules/<feature>/presentation/` e execute `node scripts/build-index.cjs`. O shell fica em `src/app/presentation/shell/`. Para as quatro ferramentas StudyHub, edite `presentation/templates/*.html` da feature e execute `node scripts/build-study-hub-template.cjs`. Versione fontes e saídas geradas; o deploy continua servindo os arquivos prontos, sem executar build.

## Estado da refatoração

| Frente | Situação |
|---|---|
| Preparação, auditoria e mapas | Concluídos |
| Sizing, CSV e idiomas | Extrações iniciais concluídas, com compatibilidade |
| G1–G2: CSS | Extração concluída; consolidados de 40 para 22 arquivos mantendo bytes/cascata |
| G3: JavaScript por feature | Concluído para apresentação; renderers, shell, formulários e controles principais separados |
| G4: regras de domínio | Núcleo planejado extraído; resíduos/acoplamentos seguem para revisão final |
| G5: persistência/importação | Formatos, coordenação, IO, bootstrap e workflows extraídos em G5a–G5p |
| G6: StudyHub | Estrutura concluída: quatro ferramentas privadas, domínio, estado, storage e runtime de montagem |
| G7: HTML e compatibilidade | Autoria concluída, controllers consolidados e contrato clássico verificado em G7a–G7j; resíduos/acoplamentos ainda pendentes |

O trabalho avança em commits por responsabilidade, sem reescrever a aplicação. O [progresso detalhado](docs/architecture/refactoring-progress.md) registra o último lote validado; o [roadmap](docs/architecture/refactoring-roadmap.md) define as verificações seguintes. `app.js` passou de 11.068 para 1.114 linhas; ainda contém estado, integração e resíduos a revisar. Documentos, rotina, simulação, estratégias, parceiros, contas e controles do diário possuem módulos coesos; dois arquivos pequenos foram incorporados aos módulos responsáveis.

Após G7j, a prioridade passou à consolidação: scripts locais de 95 para 48 e CSS de 40 para 22, com 65 arquivos de produção a menos no acumulado. Nesta segunda rodada, foram 36 arquivos a menos. Cada feature tem poucos pontos de entrada: contas e análises possuem um workspace UI, cálculos ficam no domínio, e transferência separa página, fluxos, formatos e IO. O [mapa compacto](docs/architecture/project-map.md) mostra os caminhos atuais.

Validação: 607 testes Node nos mesmos 100 arquivos, 113 verificações no navegador, dois geradores, sintaxe dos 85 scripts alterados e revisões independentes, em cópia limpa. Corpos e namespaces JS foram preservados; catálogos mantêm 585 chaves por idioma. Marcação da interface e os 162.576 bytes CSS na mesma ordem permaneceram intactos. A última matriz visual completa foi executada no G3g, com 922 estados equivalentes dentro da tolerância documentada.

Faltam os resíduos de importação/demonstração, consultas/normalização, estatísticas/alertas e apresentação comum de app.js, seguidos do fechamento das dependências globais documentadas. Os próximos cortes devem aproveitar os módulos existentes.

## Deploy e dados

A aplicação pode ser servida como site estático a partir da raiz do repositório, mantendo os caminhos e a ordem dos assets de `index.html`. O endereço Vercel acima é o link divulgado pelo projeto; esta branch de refatoração não é publicada automaticamente por este README.

Trades, contas, configuração e dados do StudyHub usam armazenamento local do navegador. Importação, exportação e restauração têm contratos próprios: consulte [mapa de módulos](docs/architecture/module-map.md) e [mapa do projeto](docs/architecture/project-map.md) antes de alterá-los. Não mude chaves de storage ou formato de backup como parte de uma extração visual ou de arquivos.

## Documentação e contribuição

Comece pelo [índice de arquitetura](docs/architecture/README.md). Para contribuir em um lote, leia [AGENTS.md](AGENTS.md), localize a feature no mapa, registre o comportamento atual, faça uma extração coesa, rode as verificações e revise o diff. Ferramentas de agente como Serena, Context7, Caveman e Superpowers auxiliam o desenvolvimento; a aplicação não depende delas em runtime.

Desenvolvido por **Murilo Porto Pereira**. Licenciado sob [MIT](LICENSE).
