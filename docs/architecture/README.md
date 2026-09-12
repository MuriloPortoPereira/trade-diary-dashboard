# Architecture

Comece pelo [mapa compacto](project-map.md). Abra somente a feature necessária.

| Documento | Uso |
|---|---|
| [Arquitetura atual](current-architecture.md) | Stack, baseline, hotspots e riscos |
| [Mapa de módulos](module-map.md) | Símbolos, responsabilidades e dependências |
| [Arquitetura alvo](target-architecture.md) | Limites pretendidos por feature |
| [Dependências](dependency-rules.md) | Direção e compatibilidade |
| [Roadmap](refactoring-roadmap.md) | Lotes e primeiro plano executável |
| [Progresso](refactoring-progress.md) | Entregue, próximo e limitações |
| [Análise global](modularization-analysis.md) | Diagnóstico atualizado e estratégia de preservação |
| [Extração JavaScript](javascript-extraction-map.md) | Destinos por responsabilidade, dependências e contratos |
| [Extração CSS](css-extraction-map.md) | Fronteiras de todo stylesheet, cascata e primeiro corte |
| [Extração HTML](html-extraction-map.md) | Todas as páginas/modais, handlers e validação por fluxo |
| [Ferramentas](tooling.md) | Instalação, verificação e comandos |
| [ADR-001](adr/001-incremental-classic-scripts.md) | Scripts clássicos durante transição |
| [ADR-002](adr/002-characterization-tests.md) | Testes de caracterização |

Baseline auditado: `ab0cb63`; branch `develop/clean-architecture`.
Linhas do baseline são referências históricas; localize símbolos após cada extração.
