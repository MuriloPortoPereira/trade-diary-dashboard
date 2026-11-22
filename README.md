# Trade Diary Dashboard

Aplicação web estática em JavaScript clássico, HTML5 e CSS3 para registro, gestão de risco, análise de desempenho e acompanhamento operacional de trading, executada integralmente no navegador sem frameworks, sem bundler e sem backend.

Esta branch (`refactor`) contém a versão modularizada e finalizada da refatoração sem frameworks do **Trade Diary Dashboard**, organizada por funcionalidade e responsabilidade a partir da versão monolítica original preservada nas branches `main` e `develop`.

---

## 1. Apresentação e objetivo

O **Trade Diary Dashboard** centraliza em uma única interface estática o ciclo completo de acompanhamento de um operador de mercado: preparação pré-mercado, registro e edição de operações, controle de risco por conta e por período, análise estatística e comportamental, documentação de playbooks, simulações matemáticas e backup/importação de históricos.

O objetivo desta versão refatorada é entregar a aplicação completa com arquitetura modular legível e manutenível, mantendo zero dependências de build ou instalação e preservando compatibilidade com os dados locais, fluxos e contratos funcionais da versão original.

---

## 2. Funcionalidades efetivamente implementadas

A aplicação organiza a interface em **15 páginas internas** (`page-*` no shell de `index.html`) e **4 modais** (`tradeModal`, `accountModal`, `csvConfirmModal` e `appDialogModal`), alternadas localmente no cliente via `showPage(id)`:

- **Dashboard (`page-dashboard`)**: visão consolidada da conta ativa com filtro de período, curva de patrimônio, métricas principais, painel de limites de risco, mini calendário mensal e atalhos para fluxos frequentes.
- **Histórico de Operações (`page-log`)**: listagem, ordenação, filtros, seleção múltipla, cadastro, edição, duplicação, exclusão com dupla confirmação, tratamento sequencial de operações incompletas, registro de erros operacionais, emoções, observações e anexos de imagens por trade.
- **Diário de Performance (`page-calendar`)**: visualização em calendário mensal/diário de resultados financeiros e número de operações por dia.
- **Análises (`page-stats`)**: painel analítico dividido nas abas **Visão Geral**, **Por Estratégia**, **Por Tempo**, **Psicológico** e **Simulação** (dimensionamento de posição, expectativa e projeção Monte Carlo), incluindo análise de stops, taxas e desvios de plano.
- **Psicológico (`page-psych`)**: consolidação dedicada de indicadores comportamentais, emoções e erros recorrentes vinculados às operações.
- **Estratégias (`page-strategyHub`)**: biblioteca e comparação de desempenho entre estratégias configuradas.
- **Rotina do Trade (`page-premarket`)**: registro diário de pré-mercado, checklist e hábitos operacionais por mês.
- **Simulações (`page-studyHub`)**: centro de estudos reunindo simuladores e calculadoras integradas:
  - **PropFirm Simulator**: modelagem de risco, drawdown máximo/diário, stops e fases de mesas proprietárias;
  - **Plano de Trade**: cálculo de metas, recuperação de drawdown, sequências de perdas e módulo intradiário;
  - **Trade Simulator**: simulação de expectativa, sequências aleatórias com trava de stop diário, ciclos e projeções Monte Carlo em `<canvas>`;
  - **Ferramentas Mentais**: apoio quantitativo e comportamental para gestão de sequência e disciplina.
- **Documentos (`page-documents`)**: caderno interno de documentos e notas gerais (com modelos iniciais de Playbook Operacional e Mapa de Risco) e notas vinculadas a trades, com suporte a imagens.
- **Importações & Backup (`page-import`)**:
  - **Importar Operações**: leitura de arquivos CSV e planilhas XLSX (com carregamento sob demanda do SheetJS), pré-visualização, validação e detecção de campos incompletos;
  - **Exportar / Backup**: exportação de operações em CSV, exportação completa do estado em JSON e restauração de backup.
- **Contas (`page-accounts`) e Conta e Setup (`page-setup`)**: gerenciamento de múltiplas contas (`cfd_pct` para CFD/Forex/Índices, `prop_pct` para Prop Firms e `crypto` para Cripto), movimentações de caixa (depósitos e saques), limites de drawdown (diário, semanal, mensal e total), metas cíclicas compostas e bibliotecas operacionais.
- **Notificações (`page-notifications`)**: central de alertas e avisos operacionais derivados do estado das contas e operações.
- **Parceiros (`page-partners`)**: gestão e catálogo de links e parceiros configuráveis.
- **Perfil (`page-profile`)**: resumo e configurações de perfil local do operador.
- **Preferências globais**: alternância de idioma entre Português (`pt-BR`) e Inglês (`en-US`) e consulta opcional de cotação `USD/BRL` com persistência em cache local.

---

## 3. Tecnologias utilizadas

| Camada / Recurso | Tecnologia | Uso efetivo no projeto |
|---|---|---|
| Estrutura | HTML5 | Shell estático único (`index.html`) com 15 views e 4 modais |
| Estilização | CSS3 | 22 folhas de estilo separadas entre base compartilhada (`src/styles/`) e módulos |
| Lógica | JavaScript clássico (ES6+, sem bundler) | 48 scripts carregados em ordem explícita via `<script src="...">` |
| Gráficos | Chart.js `4.4.1` (CDN Cloudflare) | Curvas de patrimônio, distribuições e gráficos analíticos |
| Planilhas | SheetJS / XLSX `0.18.5` (CDN Cloudflare, sob demanda) | Leitura de planilhas `.xlsx` na importação de trades |
| Tipografia | Google Fonts (`Syne`, `DM Mono`, `Inter`) | Tipografia de interface e valores numéricos |
| Cotação externa | AwesomeAPI (`economia.awesomeapi.com.br/json/last/USD-BRL`) | Consulta opcional da taxa USD/BRL com cache em `localStorage` |
| Persistência | Web Storage API (`localStorage`) | Armazenamento local de trades, contas, configurações, rotina, documentos e simuladores |

### Chaves de persistência em `localStorage`

- Estado principal (`src/app/infrastructure/app-state-storage.js`): `tl_trades`, `tl_accounts`, `tl_activeAccount`, `tl_config`, `tl_pm`, `tl_studyhub`.
- Preferências (`src/modules/preferences/`): `appLanguage`, `appCotacao`.
- Calculadoras legadas do StudyHub (`src/modules/study-hub/infrastructure/study-hub-storage.js`): `cot`, `diary2026`, `hubCiclos`, `pfCot`, `pfState`.

---

## 4. Arquitetura e estrutura de diretórios

A aplicação é organizada por **funcionalidade (feature)** em `src/modules/` e por **responsabilidade** somente quando há fronteira concreta:

- `domain/`: cálculos e regras puras, sem dependência direta de DOM, storage ou rede.
- `application/`: coordenação de fluxos e casos de uso.
- `infrastructure/`: persistência em `localStorage`, leitura/escrita de arquivos, formatos CSV/XLSX/JSON e chamadas de rede.
- `presentation/`: renderização de interface, eventos, gráficos, traduções e CSS específico da funcionalidade.
- `src/app/`: composição de inicialização (`bootstrap-app.js`), carga de estado (`load-app-state.js`), storage principal e workspace do shell.
- `src/shared/` e `src/styles/`: widgets analíticos reutilizáveis e folhas de estilo globais/responsivas.

### Organização na raiz e remoção do diretório `legacy/`

Durante a preparação intermediária do projeto, os arquivos da refatoração sem frameworks chegaram a ser movidos para um diretório `legacy/` como base de referência para uma eventual migração futura para framework. Como nesta branch a implementação sem frameworks é o produto principal e finalizado — e a versão monolítica anterior já está preservada integralmente nas branches `main` e `develop` —, a estrutura da nova branch `refactor` promove os arquivos da aplicação diretamente para a raiz (`index.html`, `app.js` e `src/`). Isso elimina diretórios intermediários desnecessários, evita duplicação da versão original e permite servir o projeto diretamente da raiz em qualquer servidor estático.

### Estrutura final de diretórios

```text
trade-diary-dashboard/
├── .gitattributes
├── .gitignore
├── LICENSE
├── README.md
├── index.html                                          # Shell estático com 15 páginas e 4 modais (1.503 linhas)
├── app.js                                              # Estado compartilhado e APIs de compatibilidade (181 linhas)
└── src/
    ├── app/
    │   ├── application/
    │   │   ├── bootstrap-app.js                        # Inicialização no evento load e normalização inicial
    │   │   └── load-app-state.js                       # Carga e mesclagem do estado persistido
    │   ├── infrastructure/
    │   │   └── app-state-storage.js                    # Adaptador de leitura/escrita das chaves tl_*
    │   └── presentation/
    │       └── app-workspace.js                        # Navegação, topbar, modais, diálogos e tooltips
    ├── modules/
    │   ├── accounts/
    │   │   ├── application/account-risk-workflows.js   # Orquestração de risco e fluxo de contas
    │   │   ├── domain/account-risk-calculations.js     # Cálculos puros de cashflow, risco, drawdown e metas cíclicas
    │   │   └── presentation/
    │   │       ├── account-overview.css
    │   │       ├── account-risk-and-cashflow.css
    │   │       └── accounts-workspace.js
    │   ├── analytics/
    │   │   ├── application/strategy-analysis.js        # Consultas e agregações por estratégia
    │   │   ├── domain/calculate-trade-metrics.js       # Cálculos puros de métricas financeiras e comportamentais
    │   │   └── presentation/
    │   │       ├── analytics-workspace.js
    │   │       └── strategy-comparison.css
    │   ├── calendar/
    │   │   └── presentation/
    │   │       ├── calendar-grids.css
    │   │       ├── calendar-page.js
    │   │       └── dashboard-calendar.js
    │   ├── data-transfer/
    │   │   ├── application/transfer-workflows.js       # Casos de uso de importação, exportação e backup
    │   │   ├── domain/import-trade-rules.js            # Regras de validação e campos obrigatórios na importação
    │   │   ├── infrastructure/
    │   │   │   ├── browser-file-io.js                  # Leitura de arquivos, download e loader sob demanda de XLSX
    │   │   │   └── trade-file-formats.js               # Parsing CSV/planilhas, normalização e serializer de backup
    │   │   └── presentation/
    │   │       ├── data-transfer-page.js
    │   │       └── data-transfer.css
    │   ├── documents/
    │   │   └── presentation/
    │   │       ├── documents-page.js
    │   │       └── documents.css
    │   ├── notifications/
    │   │   └── presentation/notifications-page.js
    │   ├── partners/
    │   │   └── presentation/
    │   │       ├── partners-page.js
    │   │       └── partners.css
    │   ├── preferences/
    │   │   ├── infrastructure/exchange-rate.js         # Consulta e cache local de USD/BRL
    │   │   └── presentation/
    │   │       ├── language-selector.js
    │   │       ├── translation-catalog.js
    │   │       └── locales/
    │   │           ├── en-US.js
    │   │           └── pt-BR.js
    │   ├── profile/
    │   │   └── presentation/profile-page.js
    │   ├── psychology/
    │   │   └── presentation/psychology-page.js
    │   ├── routine/
    │   │   └── presentation/
    │   │       ├── premarket-page.js
    │   │       └── premarket.css
    │   ├── simulation/
    │   │   ├── domain/simulation-calculations.js       # Cálculos puros de sizing, expectativa e Monte Carlo
    │   │   └── presentation/simulation-panel.js
    │   ├── study-hub/
    │   │   ├── application/study-hub-state.js          # Estado integrado do StudyHub
    │   │   ├── domain/study-hub-calculations.js        # Cálculos puros nativos do StudyHub
    │   │   ├── infrastructure/study-hub-storage.js     # Persistência das chaves privadas do StudyHub
    │   │   └── presentation/
    │   │       ├── legacy-controls.css
    │   │       ├── legacy-panels.css
    │   │       ├── study-hub-intraday.js
    │   │       ├── study-hub-legacy-runtime.js
    │   │       ├── study-hub-mental.js
    │   │       ├── study-hub-native.css
    │   │       ├── study-hub-page.js
    │   │       ├── study-hub-plan.js
    │   │       ├── study-hub-propfirm.js
    │   │       ├── study-hub-template.js
    │   │       └── study-hub-tradesim.js
    │   └── trades/
    │       ├── application/
    │       │   ├── demo-data.js                        # Geração dos dados iniciais de demonstração
    │       │   └── trade-workflows.js                  # Criação, edição, duplicação e exclusão de trades
    │       ├── domain/trade-rules.js                   # Regras puras de horário, duração e normalização de mídia
    │       └── presentation/
    │           ├── error-chips.css
    │           ├── trade-form.js
    │           ├── trade-log.js
    │           └── trade-tables.css
    ├── shared/
    │   └── presentation/analysis-widgets.js            # Widgets analíticos reutilizáveis
    └── styles/
        ├── analysis-panels.css                         # Cards, indicadores e layouts de análise
        ├── app-shell.css                               # Fontes, tokens, shell, navegação e topbar
        ├── page-layout.css                             # Superfícies, cabeçalhos e ações das páginas
        ├── page-motion.css                             # Keyframes de transição
        ├── responsive.css                              # Breakpoints comuns de desktop, tablet e mobile
        ├── tag-cloud.css                               # Estilos de tags e nuvens de etiquetas
        ├── workspace-controls.css                      # Campos, modais e controles de interação
        ├── workspace-integration.css                   # Regras tardias de diálogos, navegação e grids
        └── workspace-summaries.css                     # Blocos de resumo de workspace
```

Ao todo, a aplicação publicada é composta por **71 arquivos de runtime**: `index.html`, `48` scripts `.js` e `22` folhas `.css`, todos efetivamente referenciados pelo `index.html` (zero scripts ou estilos órfãos).

---

## 5. Explicação da refatoração sem frameworks

A refatoração foi conduzida de forma incremental, orientada por caracterização de comportamento antes dos cortes e por separação progressiva de responsabilidades, mantendo estritamente o mesmo modelo de entrega estática (JavaScript clássico sem bundler nem runtime de framework):

1. **Separação física preservando contratos**: blocos coesos de JavaScript e CSS foram extraídos do monólito mantendo a ordem de carregamento, assinaturas globais, handlers inline, IDs de DOM, chaves de `localStorage` e ordem de cascata CSS.
2. **Isolamento de domínio e infraestrutura**: cálculos financeiros, métricas de trades, limites de risco, metas cíclicas, drawdown, sizing, projeções Monte Carlo, regras de importação e serialização de CSV/backup foram movidos para módulos dedicados (`domain/` e `infrastructure/`) com entradas explícitas via namespaces `globalThis.TradeDiary*`.
3. **Consolidação por coesão**: após a extração inicial (que atingiu 95 scripts e 40 arquivos CSS), arquivos excessivamente fragmentados foram consolidados em pontos de entrada coesos por funcionalidade, chegando à distribuição final de **48 scripts JS** e **22 arquivos CSS**.
4. **Encapsulamento do StudyHub**: os simuladores internos (`PropFirm`, `Plano de Trade`, `Trade Simulator`, `Ferramentas Mentais` e `Intradiário`) foram isolados em fábricas dedicadas com escopo próprio para evitar colisões globais e preservar o isolamento de estado.
5. **Refinamentos finais integrados**: o corte final inclui a correção da regra de bloqueio por limite de perda diária no simulador (`dailyPnl <= -p.dailyStop` em `study-hub-tradesim.js`, evitando disparar stop diário quando o dia fecha positivo), a centralização de `createDefaultGeneralDocuments()` em `documents-page.js` e a padronização dos comentários em português.

---

## 6. Comparação entre a implementação original e a refatorada

Os números abaixo foram medidos diretamente nos arquivos da branch `main` (versão monolítica original) e da nova branch `refactor` (versão modular finalizada):

| Dimensão | Implementação original (`main`) | Implementação refatorada (`refactor`) |
|---|---|---|
| Arquivos de runtime | 3 (`index.html`, `app.js`, `styles.css`) | 71 (`index.html`, 48 `.js`, 22 `.css`) |
| Tamanho de `app.js` | 11.068 linhas (734.222 bytes) | 181 linhas (7.705 bytes) — redução de 98,4% no arquivo principal |
| Distribuição do JavaScript | 1 arquivo monolítico (11.068 linhas) | 48 arquivos em `app.js` + `src/` (12.829 linhas totais; 760.455 bytes) |
| Distribuição do CSS | 1 arquivo (`styles.css`: 6.090 linhas; 162.576 bytes) | 22 arquivos (6.090 linhas totais; 162.632 bytes) |
| Tamanho do `index.html` | 1.435 linhas (96.773 bytes) | 1.503 linhas (102.112 bytes; +68 linhas devido às tags `<link>` e `<script>`) |
| Total de código da aplicação | 18.593 linhas (993.571 bytes) | 20.422 linhas (1.025.199 bytes) |
| Maior arquivo JS de lógica | `app.js` (11.068 linhas) | `study-hub-page.js` (759 linhas); `study-hub-template.js` (1.415 linhas de template HTML) |
| Maior arquivo CSS | `styles.css` (6.090 linhas) | `legacy-controls.css` (703 linhas) e `app-shell.css` (699 linhas) |
| Separação de camadas | Inexistente (tudo misturado em um arquivo) | 14 módulos em `src/modules/`, `src/app/`, `src/shared/` e `src/styles/` |
| Cálculos puros isolados | Acoplados ao DOM e ao estado global | Isolados em `domain/` (contas, análises, simulação, trades, importação, StudyHub) |
| Compatibilidade de dados | Chaves `tl_*`, `appLanguage`, StudyHub | 100% preservada |
| Build / dependências locais | Nenhum | Nenhum |

---

## 7. Análise de qualidade, organização e manutenibilidade

### Pontos fortes verificados no código

- **Navegabilidade previsível**: cada funcionalidade possui proprietário claro em `src/modules/<feature>/`, reduzindo drasticamente o custo de localizar onde alterar regras, layout ou fluxos em comparação ao monólito de 11.068 linhas.
- **Limites de tamanho saudáveis na lógica**: todos os arquivos JavaScript de lógica de negócio e apresentação ficaram abaixo de 800 linhas (o único arquivo acima disso é `study-hub-template.js`, com 1.415 linhas, por conter o markup HTML estático dos simuladores).
- **Cálculos críticos desacoplados**: regras financeiras e matemáticas (`account-risk-calculations.js`, `calculate-trade-metrics.js`, `simulation-calculations.js`, `trade-rules.js`, `import-trade-rules.js`, `study-hub-calculations.js`) operam sobre parâmetros explícitos, permitindo verificação automatizada sem navegador.
- **Zero ativos mortos**: verificação automatizada confirma que todos os 48 scripts e 22 estilos presentes em disco são efetivamente carregados em `index.html` e sem caminhos quebrados.
- **Padronização de comentários e contratos**: comentários revisados em português e contratos de compatibilidade mantidos explícitos em `app.js`.

### Trocas conscientes (trade-offs)

- O aumento líquido de ~1.829 linhas (+31,6 KB no total de texto) em relação ao monólito decorre de envoltórios de módulos (`globalThis.TradeDiary*`), cabeçalhos de arquivos, separação de interfaces, tags `<link>`/`<script>` no `index.html` e comentários explicativos — custo pequeno frente ao ganho de legibilidade e manutenção.
- A arquitetura adota uma separação pragmática em JavaScript clássico, não isolamento integral de Clean Architecture: workflows e controllers ainda compartilham globais de estado declarados em `app.js` para manter compatibilidade total sem introdução de bundler ou framework.

---

## 8. Análise de desempenho (dados verificáveis)

Não foram inventados benchmarks sintéticos ou métricas artificiais de Lighthouse. As observações verificáveis diretamente no código e nos ativos publicados são:

- **Volume total de payload estático**: 1.025.199 bytes (~1,0 MB bruto não comprimido, antes de gzip/Brotli do servidor HTTP) distribuídos em 71 arquivos, ante 993.571 bytes (~994 KB) em 3 arquivos na versão original (+3,18% de volume bruto).
- **Overhead de requisições HTTP**: a modularização em scripts clássicos sem bundler aumenta o número de arquivos locais carregados na carga inicial de **3 para 71 requisições** (`1 HTML + 22 CSS + 48 JS`). Em ambientes com HTTP/2 ou HTTP/3 (como Vercel, Netlify, Cloudflare Pages ou GitHub Pages), o impacto é mitigado por multiplexação e cache individual por arquivo; em conexões HTTP/1.1 de alta latência sem bundler, o número de requisições é o principal trade-off desta arquitetura.
- **Zero custo de hidratação ou runtime de framework**: não há download, parse nem reconciliação de biblioteca de UI; a troca de páginas alterna classes CSS (`.active`) sobre DOM já presente no documento.
- **Carregamento sob demanda de SheetJS (`xlsx`)**: o script externo `xlsx.full.min.js` só é carregado dinamicamente por `browser-file-io.js` quando o usuário importa uma planilha, evitando custo na abertura inicial do dashboard.
- **Cache de cotação externa**: a taxa `USD/BRL` é armazenada em `localStorage`, reduzindo dependência imediata de rede em recarregamentos subsequentes.

---

## 9. Decisões técnicas e justificativas

As decisões abaixo consolidam os registros arquiteturais (ADRs) adotados ao longo da refatoração:

1. **Scripts clássicos em vez de ESM ou bundler**: preservam execução direta em servidor estático simples, mantêm compatibilidade com handlers inline do HTML e evitam etapa obrigatória de compilação.
2. **Composição estática do shell em `index.html`**: todas as 15 páginas permanecem no documento inicial em vez de carregamento assíncrono via `fetch`, garantindo que todos os IDs de DOM existam no momento do bootstrap e dos inicializadores do StudyHub.
3. **Preservação integral das chaves de `localStorage` e formatos de backup**: evita perda de dados de usuários que já utilizam o aplicativo na mesma origem.
4. **Camadas sob demanda por módulo**: nem toda feature possui `domain/`, `application/` e `infrastructure/`; camadas só existem quando há regra pura, orquestração ou IO real, evitando abstrações vazias.
5. **Consolidação por coesão (48 JS / 22 CSS)**: interrompeu-se a fragmentação excessiva (antes em 95 JS / 40 CSS) para equilibrar clareza estrutural e facilidade de edição sem pulverizar funções triviais em dezenas de arquivos.
6. **Preservação do escopo isolado do StudyHub**: manteve-se o encapsulamento dos módulos de simulação em funções fábrica para evitar colisão de identificadores no escopo global.

---

## 10. Instruções de instalação e execução

O projeto não exige `npm install`, compilação ou variáveis de ambiente.

### Requisitos

- Qualquer navegador moderno (Chrome, Edge, Firefox, Safari).
- Um servidor HTTP estático local (por exemplo, Python 3 ou Node.js).

### Passo a passo

1. Clone o repositório e selecione a branch `refactor`:

```bash
git clone -b refactor https://github.com/MuriloPortoPereira/trade-diary-dashboard.git
cd trade-diary-dashboard
```

2. Inicie um servidor HTTP local na raiz do projeto:

Com Python 3:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Ou com Node.js:

```bash
npx serve -l 8000 .
```

3. Acesse no navegador:

```text
http://127.0.0.1:8000
```

> **Observação sobre dados locais:** todos os dados são armazenados no `localStorage` vinculado à origem (`protocolo + host + porta`). Antes de trocar de porta ou domínio, utilize a página **Importações & Backup** para exportar um backup em JSON.

### Publicação estática (deploy)

O projeto pode ser publicado diretamente em serviços estáticos (Vercel, Netlify, GitHub Pages, Cloudflare Pages) apontando para a raiz do repositório, sem comando de build e sem diretório de saída específico.

---

## 11. Limitações conhecidas e possibilidades de evolução

### Limitações conhecidas

- **Persistência exclusivamente local**: não há backend, autenticação ou sincronização em nuvem; a limpeza de dados do navegador apaga o histórico local se não houver backup JSON exportado.
- **Estado global compartilhado**: `app.js` mantém variáveis globais compartilhadas entre workflows e apresentação por compatibilidade com o runtime clássico.
- **Múltiplas requisições estáticas sem bundler**: 48 scripts e 22 folhas CSS são carregados individualmente em `index.html`.
- **Template estático extenso no StudyHub**: `study-hub-template.js` concentra 1.415 linhas de markup HTML embutido em array JavaScript para injeção síncrona no painel de simulações.
- **Dependência de CDNs externas para recursos auxiliares**: gráficos (Chart.js), importação XLSX (SheetJS), fontes (Google Fonts) e cotação `USD/BRL` (AwesomeAPI) requerem acesso à internet na primeira carga ou quando acionados.
- **Cotações em módulos legados do StudyHub**: ainda existem chamadas de cotação separadas em `exchange-rate.js` e nos módulos legados do StudyHub, preservadas por compatibilidade.

### Possibilidades de evolução

- Adotar empacotamento/minificação opcional (por exemplo, Vite ou esbuild) em etapa futura para reduzir o número de requisições HTTP em produção, caso o projeto deixe o modelo puramente estático sem build.
- Unificar o serviço de cotação `USD/BRL` e eliminar gradualmente o acoplamento ao estado global de `app.js` em favor de um store explícito.
- Migrar a persistência local de `localStorage` para `IndexedDB` (melhor suporte a imagens anexadas e grandes volumes de trades) ou integrar sincronização opcional com backend autenticado.
- Evoluir os módulos isolados em `domain/` diretamente como núcleo reutilizável caso o projeto seja futuramente migrado para um framework baseado em componentes (como React, Vue ou Svelte) com TypeScript.

---

## Aviso educacional e financeiro

Este projeto tem finalidade estritamente educacional, analítica e de organização pessoal. Não constitui recomendação de investimento, consultoria financeira ou garantia de resultados.

## Autor e licença

Desenvolvido por **Murilo Porto Pereira**. Distribuído sob a licença MIT — consulte o arquivo [LICENSE](LICENSE).
