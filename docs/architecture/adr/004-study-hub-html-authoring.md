# ADR-004: HTML de autoria StudyHub com asset clássico gerado

## Context

O runtime monta 151.521 bytes de HTML síncrono a partir de uma única linha JavaScript.
G6 separou as ferramentas, mas essa representação dificulta editar e localizar seus campos.
Deploy continua estático, sem build obrigatório no servidor; scripts clássicos, IDs e handlers devem permanecer compatíveis.

## Decision

Manter quatro fragmentos HTML de autoria em `src/modules/study-hub/presentation/templates/`, um por ferramenta.
Um script Node sem dependências gera `study-hub-template.js`, versionado e carregado sincronicamente antes do runtime.
A montagem continua atribuindo o mesmo texto a `host.innerHTML`, no mesmo ponto e com as mesmas guardas.
Cada fonte termina com LF editorial, removido na composição; os fragmentos são unidos por dois LF, preservando os separadores originais e a ausência de LF final no HTML montado.

Alternativas avaliadas: fetch dos fragmentos alteraria disponibilidade/timing; `<template>`/clonagem mudariam o caminho de parsing e montagem; manter strings JS de autoria continuaria dificultando a edição de HTML.

## Consequences

- Editar somente os quatro HTMLs e executar `node scripts/build-study-hub-template.cjs`.
- O asset gerado é distribuição, não fonte de autoria. Sua representação em linhas não deve ser editada nem carregada integralmente para análise por agentes.
- `node scripts/build-study-hub-template.cjs --check` e a suíte impedem divergência entre fontes e asset.
- Alterações intencionais da UI exigem revisar a caracterização/fingerprint, além de regenerar o asset; o fingerprint atual protege a refatoração sem mudança de comportamento.
- Nenhum framework, bundler, fetch ou dependência de runtime. O deploy permanece sem build porque o asset está commitado.
- Custo explícito: HTML e distribuição gerada coexistem no Git; essa duplicação permite servir a mesma aplicação estática e editar HTML legível.
- O shell `index.html`, estilos inline e wrappers globais ficam fora deste corte; remoção exige consumidores caracterizados.
