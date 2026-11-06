# Arquitetura atual

Aplicação estática: 15 páginas internas, JavaScript clássico, CSS, Chart.js CDN e `localStorage`. Não possui backend, autenticação, banco remoto nem migração para framework neste repositório.

| Área | Responsabilidade |
|---|---|
| `app.js` | Estado/defaults, composição e APIs globais compatíveis; 181 linhas |
| `src/app/` | Shell HTML, navegação, bootstrap, carga e persistência principal |
| `src/modules/<feature>/presentation/` | DOM, gráficos, handlers, HTML e CSS da funcionalidade |
| `domain/` | Cálculos e regras puros, sem DOM/storage/rede |
| `application/` | Coordenação dos fluxos; adapters globais legados explicitados |
| `infrastructure/` | Formatos, arquivos, storage e rede |
| `src/shared/` e `src/styles/` | Widgets reutilizados e estilos comuns |

Uma feature só possui as camadas de que precisa. Scripts clássicos e handlers inline permanecem como contratos. Alguns controllers e workflows compartilham estado/adaptadores globais; esta organização não representa isolamento integral de todas as camadas.

`index.html` é distribuição versionada; suas fontes são quinze views de feature e dois fragmentos do shell. O template StudyHub também é gerado a partir de quatro HTMLs legíveis. Não há montagem assíncrona nem bundler em produção.

A ordem completa de scripts e CSS está nos fragmentos do shell. A distribuição tem 48 scripts e 22 CSS, todos utilizados; o mapa atual mostra onde editar. CSS e marcação funcional mantêm a versão original. A exportação em `dist/` copia apenas a aplicação, com os mesmos caminhos e bytes.

Chaves persistidas, formatos de backup e APIs públicas permanecem compatíveis. Dados ficam associados à origem no navegador. [Mapa](project-map.md), [regras](dependency-rules.md), [limites aceitos](adr/006-basic-static-version-closure.md) e [auditoria histórica](../archive/refactoring/current-architecture.md).
