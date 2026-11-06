# Estado da versão estática

## Completed
- Refatoração básica encerrada: módulos por feature/camada, autoria HTML, consolidação JS/CSS e compatibilidade clássica.
- `app.js`: 11.068 → 181 linhas; 95 → 48 scripts e 40 → 22 CSS após a consolidação.
- Validação do fechamento: 637 testes, 113 checks no navegador, sintaxe dos 180 scripts, dois geradores, diff e revisão independente.
- Organização final: documentação operacional curta; planos/mapas antigos em `docs/archive/refactoring/`; entrega isolada em `dist/` pelo exportador existente.

## Current
- Manutenção da versão estática. Este repositório não tem migração para framework planejada.
- Exportação protege arquivos já existentes e mantém bytes/caminhos/ordem dos assets.

## Next
- Revisar e usar a aplicação. Novas funcionalidades ou integração de branches exigem escopo próprio.

## Risks
- Estado/adaptadores globais e controllers privados do StudyHub continuam por compatibilidade; não há isolamento integral das camadas.
- Cobertura é específica aos cenários executados, não prova todos os estados possíveis. As limitações detalhadas dos lotes estão no [histórico](../archive/refactoring/refactoring-progress.md).
- Alterações locais do usuário são preservadas; a suíte limpa não valida a edição local do teste de calendário.

## Decisions
- [ADR-006](adr/006-basic-static-version-closure.md): manter versão clássica e owners coesos; evitar cortes apenas por tamanho.
- Histórico completo em [arquivo da refatoração](../archive/refactoring/README.md).
