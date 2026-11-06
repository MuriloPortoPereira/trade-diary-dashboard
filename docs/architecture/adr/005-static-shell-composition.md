# ADR-005: Composição estática do shell por fontes de autoria

## Context

`index.html` contém quinze páginas, navegação, quatro modais e a ordem de carga global.
Mover DOM para fetch ou montagem tardia mudaria IDs disponíveis durante bootstrap.
G7a validou fontes HTML com distribuição versionada; o shell ainda era o ponto único de edição.

## Decision

Usar uma fonte por página dentro da feature correspondente e dois blocos em
`src/app/presentation/shell/`: abertura/navegação e fechamento/modais/scripts.
O manifesto `index.fragments.json` explicita a ordem completa. Não há includes aninhados ou engine de templates.
`node scripts/build-index.cjs` concatena buffers, sem parsing, interpolação, separadores ou normalização.
O resultado `index.html` permanece versionado e idêntico aos 107.193 bytes da baseline `953d990` neste corte.

Alternativas: manter um HTML monolítico de autoria preservaria o custo de navegação;
composição no navegador mudaria timing; um framework/bundler ampliaria o escopo sem necessidade.

## Consequences

- Editar os fragmentos da feature ou shell e regenerar `index.html`; `--check` e a suíte detectam saída desatualizada.
- Deploy continua sem build e sem dependências de runtime: todos os arquivos publicados estão commitados.
- Fonte e distribuição coexistem no Git. Os fragmentos por página são views coesas, não divisões por campo/widget.
- O arquivo publicado mantém DOM, IDs, handlers, inline styles e scripts exatamente como antes; wrappers globais não são removidos neste lote.
- `.gitattributes` preserva os bytes dos novos fragmentos e de `index.html`, inclusive LF/CRLF mistos e separadores vazios originais. A exceção de whitespace é restrita a esses dados, como já ocorre nos blocos CSS legados; as demais verificações permanecem ativas.
- Alterações intencionais de UI exigem revisar o fingerprint da caracterização e validar o comportamento, além de regenerar a saída.
