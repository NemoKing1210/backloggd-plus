# Backloggd Plus

[English](README.md) · [Русский](README.ru.md) · [中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md)

[![CI](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml)
[![Install userscript](https://img.shields.io/badge/Install-userscript-7c5cff?style=for-the-badge)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Greasy Fork](https://img.shields.io/badge/Greasy_Fork-587296-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![ScriptCat](https://img.shields.io/badge/ScriptCat-7077-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://github.com/NemoKing1210/backloggd-plus/blob/main/LICENSE)
[![Version](https://img.shields.io/badge/version-0.7.101-green?style=for-the-badge)](https://github.com/NemoKing1210/backloggd-plus/blob/main/CHANGELOG.md)

Um userscript que amplia o [Backloggd](https://www.backloggd.com) com informações extras de jogos, uma interface mais rica e melhorias de qualidade de vida — sem sair do site.

Compatível com [Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/), [Greasemonkey](https://www.greasespot.net/), [ScriptCat](https://scriptcat.org/) e outros gerenciadores que aceitam o bloco de metadados `// ==UserScript==`.

Também listado no [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) e no [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

> **Nota:** as páginas de catálogo no Greasy Fork / ScriptCat podem ficar atrás deste repositório — nem sempre consigo publicar cada versão lá na hora. Desculpe. Para a compilação mais recente, prefira a [URL de instalação raw do GitHub](#instalação-rápida) (ou clone o repositório e rode `npm run build`). O `@updateURL` / `@downloadURL` do script também apontam para a `main` no GitHub.

> **Status:** inicial (`0.7.101`). Enriquecimento do Backloggd + badges nas listas + botões Steam / SteamDB → Backloggd.

## Capturas de tela

O userscript real rodando em uma página de jogo ao vivo do Backloggd.

![Painel de configurações do Backloggd Plus com as abas Geral, Perfil, Página do jogo, Cartão do jogo, Tradução, Cache, Depuração e Sobre](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/settings-panel.png)

| | |
|---|---|
| ![Linhas do Steam em uma página de jogo do Backloggd](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/game-page-steam.png)<br>**Linhas da página do jogo** — Steam: possui · preço · análises · tags e categorias, detalhes do SteamDB, Metacritic, Deck/Proton, jogadores, GameStatus | ![Nota Plus, galeria de capturas e jogos semelhantes](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/game-page-stats.png)<br>**Notas e extras** — média da nota Plus, galeria de capturas do Steam, jogos semelhantes com badges nas capas |
| ![Busca de configurações filtrando todas as abas](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/settings-search.png)<br>**Busca de configurações** — filtra todas as abas de uma vez; correspondências destacadas e resultados agrupados por aba | ![Linha de links rápidos com links integrados e próprios](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/quick-links.png)<br>**Links rápidos** — sites integrados mais seus próprios modelos de URL, como links ou botões |

Também nas páginas de jogo: esqueletos enquanto carrega, botões de tradução, Fix match, ID do jogo, ícone e capa do SteamDB, exportação (Notion CSV / Markdown / JSON) e mini-perfis ao passar o mouse nas capas.

## Instalação rápida

1. Instale um gerenciador de userscripts ([Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/) ou [ScriptCat](https://scriptcat.org/) recomendados).
2. Instale pelo GitHub (URL raw abaixo), pelo [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) ou pelo [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

**URL de instalação (GitHub — mais recente):**

```
https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js
```

[![Install](https://img.shields.io/badge/⬇_Install-GitHub_raw-1a1d24?style=for-the-badge&labelColor=7c5cff)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Install on Greasy Fork](https://img.shields.io/badge/⬇_Install-Greasy_Fork-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![Install on ScriptCat](https://img.shields.io/badge/⬇_Install-ScriptCat-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)

### Instalar por URL (painel do gerenciador)

| Gerenciador | Caminho |
|-------------|---------|
| Tampermonkey | Painel → **Utilities** → **Install from URL** |
| Violentmonkey | Painel → **+** → **Install from URL** |
| Greasemonkey | Menu da extensão → **New User Script** → cole a URL raw |
| ScriptCat | [Página do script](https://scriptcat.org/ru/script-show-page/7077) → **Установить скрипт**, ou instale a [extensão](https://scriptcat.org/) e use a URL raw do GitHub |

Cole a [URL de instalação do GitHub](#instalação-rápida) acima ao instalar pelo painel do gerenciador. Instalação pelos catálogos: [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) · [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

### Instalação manual

1. Abra o [`backloggd-plus.user.js`](https://github.com/NemoKing1210/backloggd-plus/blob/main/backloggd-plus.user.js) compilado neste repositório (ou rode `npm run build` após clonar).
2. Copie todo o conteúdo do arquivo.
3. No gerenciador de userscripts, crie um novo script e cole o código.
4. Salve e ative o script.

## Atualizações

O script inclui os metadados `@updateURL` e `@downloadURL` apontando para o arquivo raw no GitHub. Gerenciadores compatíveis verificam atualizações automaticamente.

Passos de release para mantenedores: veja [DEVELOPMENT.md § Releases](https://github.com/NemoKing1210/backloggd-plus/blob/main/DEVELOPMENT.md#releases).

## Recursos

**Páginas de jogo (`/games/{slug}/`):**

- Linhas nativas de detalhes em Platforms — **Steam** (possui · lista de desejos · preço · fim da promoção / mínimo recente · análises · tags), **SteamDB** (franquia · sistemas suportados · tecnologias · última atualização do registro), **Metacritic**, **OpenCritic**, **HLTB**, **Deck / Proton**, **Jogadores**, **GameStatus**, **Links**
- **Fix match** — substitui o Steam App ID automático quando a busca na loja erra (salvo por slug); deixe o App ID vazio para marcar um jogo como fora do Steam
- Visuais do SteamDB: ícone do app antes do título, logo sob **Change cover**, contagem de jogadores online
- Linha de detalhes do SteamDB: franquia / SO das APIs da loja Steam; tecnologias e última atualização do registro do SteamDB quando acessível
- Botão de exportação sob o cabeçalho do Steam e no editor de registros (opcional; Configurações → Página do jogo; Notion CSV / Markdown / JSON)
- ID do jogo no Backloggd opcional após o título (Configurações → Página do jogo; clique para copiar)
- Botões de tradução na descrição do jogo e nos cartões de análise (Configurações → Tradução; Google Translate)
- Cabeçalho / ícone da comunidade Steam nas páginas de jogo; galeria de capturas após as estatísticas do jogo
- Jogos semelhantes sob as capturas (Steam More Like This) com % de correspondência de tags; os cartões levam ao Backloggd e podem mostrar os mesmos badges de capa das grades de listas
- Esqueletos de carregamento enquanto Steam / GameStatus / notas chegam
- Links rápidos com favicons (IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, PCGamingWiki, IsThereAnyDeal, GOG DB, GamesLike); reordene arrastando e adicione seus próprios links a partir de um modelo de URL (`{title}` no formato que quiser, `{slug}`, `{appid}`, `{year}`, `{id}`) com ícone próprio opcional
- Badges **Possui** / **Wishlist** do Steam se você estiver logado no Steam no mesmo navegador (sem chave de API)
- Badges de status do GameStatus em páginas de jogo e grades de capas
- Funciona sem chaves de API (endpoints públicos da Steam Store + userdata da sessão + APIs públicas do GameStatus / HLTB / ProtonDB; o OpenCritic é encontrado via PCGamingWiki, com chave RapidAPI própria opcional nas Configurações)

**Listas / busca / diário (grades de capas):**

- Badges compactos nos cartões `.game-cover` — preço, % de análises do Steam, Possui, Wishlist, GameStatus (carregamento preguiçoso no viewport; alternadores por tipo em Configurações → Cartão do jogo)
- Mini-perfil nas capas (hover por padrão; ou clique direito / Shift + clique) — título, nota do Backloggd, plataformas, preço/análises do Steam, GameStatus, links rápidos; o nível do cartão (Rookie → Legend) segue a nota do Backloggd (pré-carregamento opcional no viewport)
- Os mesmos badges / mini-perfis nos cartões de jogos semelhantes (faixa da página do jogo)

**Páginas de apps da Steam** (`store.steampowered.com/app/*`, `steamcommunity.com/app/*`):

- Botão com ícone do Backloggd em `.apphub_OtherSiteInfo` (mesmo estilo do SteamDB / Community Hub)
- Link montado a partir do slug da URL do Steam ou do título do jogo

**Páginas de apps do SteamDB** (`steamdb.info/app/*`):

- Botão do Backloggd em `nav.app-links` (mesmo estilo `.btn` de Store / IGDB)
- Prefere o slug do IGDB da página quando disponível

**Configurações** (botão **Plus** na navbar do Backloggd / menu do gerenciador de userscripts):

- Painel com abas: Geral · Perfil · Página do jogo · Cartão do jogo · Tradução · Cache · Depuração · Sobre
- Busca de configurações: digite no campo (ou pressione `/` / `Ctrl+K`) para filtrar todas as abas de uma vez — correspondências em rótulos e dicas são destacadas, resultados agrupados por aba, `Esc` limpa
- Idioma da interface (automático ou locale fixo)
- Perfil: cartões de mini-perfil em avatares e nomes de usuário (hover por padrão; ou clique direito / Shift + clique; pré-carregamento opcional no viewport); capas dentro do cartão (favoritos / recentes) abrem o mini-perfil do jogo; o visual de nível por jogos jogados pode ser desligado; decoração da página de perfil com alternadores por bloco (cabeçalho, chip de nível, estatísticas, navegação, favoritos)
- Região da loja Steam (moeda dos preços)
- Alternadores para Steam / possui / lista de desejos / tags / Metacritic / OpenCritic / HLTB / Deck·Proton / GameStatus / jogadores / ícone e logo do SteamDB / galeria de capturas / jogos semelhantes / bloco nativo de estatísticas / ID do jogo / tradução (descrição e análises) / badges nas capas (por tipo) / mini-perfis de jogos / links / botões do Backloggd no Steam e no SteamDB
- Modo de depuração: um painel com links de origem clicáveis e dump completo das respostas
- Visibilidade de links por site (IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, PCGamingWiki, IsThereAnyDeal, GOG DB, GamesLike)
- Duração do cache + limpar cache (remoção de expirados + limite suave LRU; biblioteca e mapa de tags com TTLs curtos; jogadores online sempre ao vivo)

## Páginas suportadas

| Site | Padrão de URL |
|------|---------------|
| Backloggd | `https://www.backloggd.com/*` |
| Backloggd (sem www) | `https://backloggd.com/*` |
| Steam Store (app) | `https://store.steampowered.com/app/*` |
| Steam Community (app) | `https://steamcommunity.com/app/*` |
| SteamDB (app) | `https://steamdb.info/app/*` |

## Desenvolvimento e contribuição

- [DEVELOPMENT.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/DEVELOPMENT.md) — configuração local, estrutura do repositório, metadados, permissões, releases
- [CONTRIBUTING.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/CONTRIBUTING.md) — diretrizes de PR, convenções, localização, colaboradores
- [AGENTS.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/AGENTS.md) — notas de arquitetura para agentes de IA
- [SECURITY.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/SECURITY.md) — como relatar uma vulnerabilidade em particular, escopo e como o script trata seus dados

```bash
npm install
npm run dev      # Servidor Vite — instale o userscript gerado com prefixo "dev:"
npm run build    # Produção → dist/ + cópia para a raiz do repositório
npm run ci       # As mesmas verificações do GitHub Actions
```

## Afiliação

Este projeto **não é afiliado** ao Backloggd. É um userscript comunitário independente.

## Licença

[MIT](https://github.com/NemoKing1210/backloggd-plus/blob/main/LICENSE) — Copyright (c) 2026 NemoKing
