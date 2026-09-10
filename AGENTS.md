# Project Agent Instructions

## Primary Goal
Preserve behavior while continuously improving modularity, readability, testability and architecture.

## Architecture
Aplicação estática: JavaScript clássico, HTML/CSS e Chart.js 4.4.1 por CDN.
Transição incremental do monólito `app.js` para módulos por feature.
Leia primeiro `docs/architecture/project-map.md`; visão atual e alvo no índice arquitetural.
Não existe backend, banco remoto, ORM nem autenticação.

## Main Modules
Operações; contas/risco; dashboard/análise; calendário/rotina; simulação;
importação/backup; StudyHub; documentos; parceiros/perfil; idiomas/cotação.
Localização e símbolos: `docs/architecture/module-map.md`.

## Dependency Direction
Presentation usa Application; Application usa Domain e contratos de IO.
Infrastructure implementa IO. Domain não acessa DOM, storage, rede nem Chart.js.
Crie camadas somente quando existir responsabilidade concreta.
`app.js` continua como composição e legado durante a migração.
Scripts clássicos e funções globais de compatibilidade permanecem por enquanto.
Não crie `shared` sem reutilização comprovada.

## Important Entry Points
- `index.html`: shell, páginas e handlers inline; ordem de scripts é contrato.
- `app.js`: inicialização em `window.load`, `showPage`, estado global e wrappers.
- `styles.css`: estilos e cascata atuais; preservar ordem ao separar.
- `src/modules/simulation/domain/calculate-simulation-sizing.js`: primeiro domínio extraído.

## Commands
- Servir: `python3 -m http.server 8000 --bind 127.0.0.1`.
- Testes: `node --test tests/*.test.cjs` (Node.js 24 usado na validação).
- Sintaxe: `node --check app.js` e `node --check` nos scripts alterados.
- Verificação de diff: `git diff --check`.
- Build, lint, typecheck e formatador não existiam no baseline; não reportar como aprovados.
- Smoke e instalação de ferramentas: `docs/architecture/tooling.md`.

## Code Conventions
Preserve nomes públicos, defaults, tipos de retorno, chaves de storage e IDs do DOM.
Mantenha estilo do trecho alterado; não reformate arquivos gigantes.
Use nomes de arquivo específicos e JS sem etapa de compilação.
Não introduza aliases, framework, ESM ou runtime dependencies incidentalmente.

## Testing
Antes de extrair regras, fixe expectativas do comportamento atual em testes de caracterização.
Cubra entradas inválidas, defaults, arredondamento e compatibilidade dos consumidores.
Teste domínio sem DOM/storage; execute smoke no navegador para mudanças na carga de scripts.
Documente cobertura real e limites; teste unitário não comprova toda a aplicação.

## Refactoring Rules
Verifique `git status` antes de alterar. Preserve mudanças preexistentes.
Leia mapa, localize símbolos/referências, caracterize, extraia, valide, revise diff.
Lotes pequenos; uma responsabilidade por lote. Commits conceituais, sem push automático.
Investigue funções >40–60 linhas e arquivos >300; >500 fortes candidatos; >800 prioridade.
Arquivos >1.000 linhas exigem justificativa temporária e estratégia registrada no roadmap.
Não divida apenas por contagem. Atualize mapa/ADR/progresso quando houver mudança estrutural.
Use subagentes para investigação/revisão independentes; um escritor por arquivo.

## Token Efficiency
Leia `project-map.md` antes da feature. Serena > rg localizado > trecho > arquivo inteiro.
Serena: `get_symbols_overview`, `find_symbol`, `find_referencing_symbols`; limites de resposta curtos.
Ative a raiz como projeto Serena. Linhas Serena são base zero; documentação usa base um.
Se MCP estiver indisponível, use busca localizada e registre a limitação; não paralise a tarefa.
Context7 somente para documentação externa e versões, nunca envie código interno.
Não leia node_modules, dist, build, coverage, .cache, .next, vendor, target, venv,
.venv, generated ou logs sem razão explícita. Não envie binários/artefatos para contexto.
Não repita leituras sem alterações. Uma linha do StudyHub contém ~157 KB: nunca imprima inteira.
Caveman `full` no trabalho cotidiano, `lite` nas decisões arquiteturais; clareza prevalece.
Progresso curto: Feito / Validado / Próximo. Preserve código, comandos e erros exatos.
Superpowers: planejamento/revisão/verificação quando úteis; sem burocracia em extrações triviais.

## Forbidden Changes
Sem reescrita, mudança de comportamento, schema/storage, API, cálculos ou decisão de produto disfarçada de refatoração.
Não descarte trabalho local. Não remova código sem verificar referências, inclusive HTML e strings.
Não altere dados reais do navegador nos testes; use perfil isolado.
Não introduza CQRS, buses, DI containers ou interfaces sem boundary real.
Não execute push sem autorização explícita.

## Architectural Decisions
- `docs/architecture/adr/001-incremental-classic-scripts.md`: módulos e compatibilidade estática.
- `docs/architecture/adr/002-characterization-tests.md`: proteção antes de extrações.
- Estado dos lotes: `docs/architecture/refactoring-progress.md`.
