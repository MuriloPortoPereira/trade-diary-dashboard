<div align="center">

# Trade Diary Dashboard

Dashboard web para registro, análise e acompanhamento de operações de trading.

Projeto front-end desenvolvido para centralizar métricas operacionais, controle de risco, disciplina, contas, importação de trades e análise de performance em uma interface visual.

<br>

[![Projeto Online](https://img.shields.io/badge/Projeto%20Online-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://trade-diary-dashboard.vercel.app/)
[![GitHub](https://img.shields.io/badge/Repositório-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/MuriloPortoPereira/trade-diary-dashboard)
[![Status](https://img.shields.io/badge/status-em%20evolução-22c55e?style=for-the-badge)](#roadmap)
[![License](https://img.shields.io/badge/licença-MIT-blue?style=for-the-badge)](./LICENSE)

</div>

---

## Demonstração

| Acesso | Link |
|---|---|
| Projeto online | [https://trade-diary-dashboard.vercel.app/](https://trade-diary-dashboard.vercel.app/) |
| Repositório | [https://github.com/MuriloPortoPereira/trade-diary-dashboard](https://github.com/MuriloPortoPereira/trade-diary-dashboard) |

---

## Preview da interface

![Preview do Trade Diary Dashboard](https://drive.google.com/uc?export=view&id=1nVj7awfGgIHCebEtdbLw6vkEcPVdM-5p)

Caso a imagem não carregue no GitHub, acesse pelo link abaixo:

[Visualizar screenshot no Google Drive](https://drive.google.com/file/d/1nVj7awfGgIHCebEtdbLw6vkEcPVdM-5p/view?usp=sharing)

---

## Visão geral

O **Trade Diary Dashboard** é uma aplicação web criada para ajudar traders a registrarem, organizarem e analisarem suas operações em um painel centralizado.

A proposta do projeto é transformar dados operacionais em uma visão mais clara sobre performance, risco, disciplina e evolução da banca.

A versão publicada foi mantida com uma estrutura mínima e funcional, priorizando:

- carregamento simples;
- publicação rápida na Vercel;
- código acessível para análise;
- apresentação objetiva para portfólio;
- uso direto pelo navegador.

---

## Problema que o projeto resolve

Muitos traders registram operações em planilhas, prints, anotações soltas ou arquivos separados.

Esse fluxo dificulta a análise de pontos importantes, como:

| Dificuldade | Impacto |
|---|---|
| Dados espalhados | Dificulta revisar performance |
| Falta de padronização | Prejudica comparação entre operações |
| Pouca visibilidade de risco | Aumenta chance de decisões impulsivas |
| Ausência de histórico centralizado | Dificulta identificar padrões |
| Falta de métricas comportamentais | Reduz clareza sobre disciplina operacional |

O **Trade Diary Dashboard** busca centralizar essas informações em uma interface visual, ajudando o usuário a revisar suas operações de forma mais organizada.

---

## Funcionalidades

| Área | Funcionalidades |
|---|---|
| Dashboard | Visão geral das operações e métricas principais |
| Trades | Registro, análise e acompanhamento de operações |
| Contas | Filtro e organização por conta operacional |
| Risco | Métricas relacionadas a exposição e gerenciamento |
| Disciplina | Apoio à leitura de comportamento operacional |
| Importação | Importação de operações via planilhas |
| Performance | Visualização de evolução e resultados |
| Cotação | Consumo externo de cotação USD/BRL |
| Interface | Layout web responsivo e publicado como site estático |

---

## Tecnologias utilizadas

<div align="center">

![HTML5](https://img.shields.io/badge/HTML5-111827?style=for-the-badge&logo=html5)
![CSS3](https://img.shields.io/badge/CSS3-111827?style=for-the-badge&logo=css3&logoColor=1572B6)
![JavaScript](https://img.shields.io/badge/JavaScript-111827?style=for-the-badge&logo=javascript)
![Chart.js](https://img.shields.io/badge/Chart.js-111827?style=for-the-badge&logo=chartdotjs)
![Vercel](https://img.shields.io/badge/Vercel-111827?style=for-the-badge&logo=vercel)

</div>

| Tecnologia | Uso no projeto |
|---|---|
| HTML5 | Estrutura principal da aplicação |
| CSS3 | Estilização, layout e responsividade |
| JavaScript | Lógica de interação, cálculos e manipulação de dados |
| LocalStorage | Persistência local de informações no navegador |
| Chart.js | Apoio visual com gráficos via CDN |
| XLSX | Importação de planilhas via CDN |
| API USD/BRL | Consulta externa de cotação |
| Vercel | Deploy da versão web |

---

## Estrutura do projeto

A versão pública foi organizada de forma mínima para facilitar análise e deploy.

```txt
trade-diary-dashboard/
├── index.html
├── app.js
├── styles.css
├── README.md
└── LICENSE
```

| Arquivo | Função |
|---|---|
| `index.html` | Estrutura principal da aplicação |
| `app.js` | Regras de interação, cálculos e comportamento do dashboard |
| `styles.css` | Estilos visuais da interface |
| `README.md` | Documentação do projeto |
| `LICENSE` | Licença de uso |

---

## Como rodar localmente

Clone o repositório:

```bash
git clone https://github.com/MuriloPortoPereira/trade-diary-dashboard.git
```

Acesse a pasta:

```bash
cd trade-diary-dashboard
```

Rode um servidor local:

```bash
python -m http.server 8000
```

Depois acesse no navegador:

```txt
http://localhost:8000
```

---

## Deploy

O projeto está publicado na Vercel:

```txt
https://trade-diary-dashboard.vercel.app/
```

Configuração recomendada para deploy:

| Campo | Configuração |
|---|---|
| Framework Preset | Other |
| Build Command | vazio |
| Output Directory | vazio ou `.` |
| Root Directory | raiz do projeto |

---

## Decisões técnicas

A publicação foi feita em uma versão reduzida, contendo apenas os arquivos essenciais para execução do projeto.

Arquivos internos de desenvolvimento, testes, versões antigas, ferramentas auxiliares, documentos de referência e snapshots foram removidos da versão pública para manter o repositório mais objetivo.

Essa decisão deixa o projeto mais fácil de acessar, revisar e publicar.

---

## Aprendizados

Durante o desenvolvimento e organização deste projeto, foram praticados conceitos como:

- estruturação de aplicações front-end sem framework;
- organização de dashboards com HTML, CSS e JavaScript;
- manipulação de dados no navegador;
- uso de bibliotecas externas via CDN;
- importação de planilhas;
- visualização de métricas operacionais;
- publicação de site estático na Vercel;
- preparação de projeto para portfólio técnico.

---

## Roadmap

Melhorias planejadas para próximas versões:

| Versão | Melhorias |
|---|---|
| V1.1 | Adicionar screenshots reais diretamente no repositório |
| V1.2 | Melhorar documentação das métricas |
| V1.3 | Criar filtros avançados por período |
| V1.4 | Adicionar exportação de relatórios |
| V1.5 | Melhorar responsividade em telas menores |
| V1.6 | Separar módulos internos por responsabilidade |
| V1.7 | Adicionar persistência mais robusta |
| V1.8 | Reintroduzir testes automatizados em versão completa |

---

## Aviso educacional e financeiro

Este projeto possui finalidade educacional, analítica e organizacional.

Ele não representa recomendação de investimento, promessa de rentabilidade ou aconselhamento financeiro.

Os dados, cálculos e visualizações devem ser utilizados apenas como apoio para estudo, organização pessoal e análise operacional.

---

## Autor

Desenvolvido por **Murilo Porto Pereira**.

| Canal | Link |
|---|---|
| GitHub | [MuriloPortoPereira](https://github.com/MuriloPortoPereira) |
| Projeto online | [Trade Diary Dashboard](https://trade-diary-dashboard.vercel.app/) |
| Repositório | [trade-diary-dashboard](https://github.com/MuriloPortoPereira/trade-diary-dashboard) |

---

## Licença

Este projeto está distribuído sob a licença MIT.

Consulte o arquivo [LICENSE](./LICENSE) para mais detalhes.
