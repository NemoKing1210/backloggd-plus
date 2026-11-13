# Backloggd Plus

[English](README.md) · [Русский](README.ru.md) · [中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md)

[![CI](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml)
[![Install userscript](https://img.shields.io/badge/Install-userscript-7c5cff?style=for-the-badge)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Greasy Fork](https://img.shields.io/badge/Greasy_Fork-587296-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![ScriptCat](https://img.shields.io/badge/ScriptCat-7077-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://github.com/NemoKing1210/backloggd-plus/blob/main/LICENSE)
[![Version](https://img.shields.io/badge/version-0.7.101-green?style=for-the-badge)](https://github.com/NemoKing1210/backloggd-plus/blob/main/CHANGELOG.md)

Un userscript que amplía [Backloggd](https://www.backloggd.com) con información extra de juegos, una interfaz más rica y mejoras de calidad de vida, sin salir del sitio.

Compatible con [Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/), [Greasemonkey](https://www.greasespot.net/), [ScriptCat](https://scriptcat.org/) y otros gestores que admitan el bloque de metadatos `// ==UserScript==`.

También está publicado en [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) y [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

> **Nota:** las páginas de catálogo de Greasy Fork / ScriptCat pueden ir por detrás de este repositorio: no siempre consigo publicar cada versión allí al momento. Disculpa las molestias. Para la compilación más reciente usa la [URL de instalación raw de GitHub](#instalación-rápida) (o clona el repo y ejecuta `npm run build`). Las etiquetas `@updateURL` / `@downloadURL` del script también apuntan a `main` en GitHub.

> **Estado:** temprano (`0.7.101`). Enriquecimiento de Backloggd + insignias en listas + botones Steam / SteamDB → Backloggd.

## Capturas

El userscript real funcionando en una página de juego en vivo de Backloggd.

![Panel de ajustes de Backloggd Plus con las pestañas General, Perfil, Página del juego, Tarjeta de juego, Traducción, Caché, Depuración y Acerca de](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/settings-panel.png)

| | |
|---|---|
| ![Filas de Steam en una página de juego de Backloggd](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/game-page-steam.png)<br>**Filas de la página del juego** — Steam: en propiedad · precio · reseñas · etiquetas y categorías, detalles de SteamDB, Metacritic, Deck/Proton, jugadores, GameStatus | ![Valoración Plus, galería de capturas y juegos similares](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/game-page-stats.png)<br>**Puntuaciones y extras** — media de la valoración Plus, galería de capturas de Steam, juegos similares con insignias en las portadas |
| ![Búsqueda de ajustes filtrando todas las pestañas](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/settings-search.png)<br>**Búsqueda de ajustes** — filtra todas las pestañas a la vez; coincidencias resaltadas y resultados agrupados por pestaña | ![Fila de enlaces rápidos con enlaces integrados y propios](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/quick-links.png)<br>**Enlaces rápidos** — sitios integrados más tus propias plantillas de URL, como enlaces o botones |

También en las páginas de juego: esqueletos mientras cargan los datos, botones de traducción, Fix match, ID del juego, icono y portada de SteamDB, exportación (Notion CSV / Markdown / JSON) y mini-perfiles al pasar el ratón por las portadas.

## Instalación rápida

1. Instala un gestor de userscripts ([Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/) o [ScriptCat](https://scriptcat.org/) recomendados).
2. Instala desde GitHub (URL raw abajo), [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) o [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

**URL de instalación (GitHub — la más reciente):**

```
https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js
```

[![Install](https://img.shields.io/badge/⬇_Install-GitHub_raw-1a1d24?style=for-the-badge&labelColor=7c5cff)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Install on Greasy Fork](https://img.shields.io/badge/⬇_Install-Greasy_Fork-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![Install on ScriptCat](https://img.shields.io/badge/⬇_Install-ScriptCat-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)

### Instalar desde URL (panel del gestor)

| Gestor | Ruta |
|--------|------|
| Tampermonkey | Panel → **Utilities** → **Install from URL** |
| Violentmonkey | Panel → **+** → **Install from URL** |
| Greasemonkey | Menú del complemento → **New User Script** → pega la URL raw |
| ScriptCat | [Página del script](https://scriptcat.org/ru/script-show-page/7077) → **Установить скрипт**, o instala la [extensión](https://scriptcat.org/) y usa la URL raw de GitHub |

Pega la [URL de instalación de GitHub](#instalación-rápida) de arriba cuando instales desde el panel del gestor. Instalación desde catálogos: [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) · [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

### Instalación manual

1. Abre el [`backloggd-plus.user.js`](https://github.com/NemoKing1210/backloggd-plus/blob/main/backloggd-plus.user.js) compilado en este repositorio (o ejecuta `npm run build` después de clonarlo).
2. Copia todo el contenido del archivo.
3. En tu gestor de userscripts, crea un script nuevo y pega el código.
4. Guarda y activa el script.

## Actualizaciones

El script incluye metadatos `@updateURL` y `@downloadURL` que apuntan al archivo raw de GitHub. Los gestores compatibles buscan actualizaciones automáticamente.

Pasos de publicación para mantenedores: consulta [DEVELOPMENT.md § Releases](https://github.com/NemoKing1210/backloggd-plus/blob/main/DEVELOPMENT.md#releases).

## Funciones

**Páginas de juego (`/games/{slug}/`):**

- Filas nativas de detalles bajo Platforms — **Steam** (en propiedad · lista de deseos · precio · fin de oferta / mínimo reciente · reseñas · etiquetas), **SteamDB** (franquicia · sistemas compatibles · tecnologías · última actualización del registro), **Metacritic**, **OpenCritic**, **HLTB**, **Deck / Proton**, **Jugadores**, **GameStatus**, **Enlaces**
- **Fix match** — sobrescribe el Steam App ID automático cuando la búsqueda en la tienda falla (se guarda por slug); deja el App ID vacío para marcar un juego como no disponible en Steam
- Aspectos de SteamDB: icono de la app antes del título, logo bajo **Change cover**, número de jugadores en línea
- Fila de detalles de SteamDB: franquicia / SO desde las APIs de la tienda de Steam; tecnologías y última actualización del registro desde SteamDB cuando es accesible
- Botón de exportación bajo el encabezado de Steam y en el editor de registros (opcional; Ajustes → Página del juego; Notion CSV / Markdown / JSON)
- ID de juego de Backloggd opcional tras el título (Ajustes → Página del juego; clic para copiar)
- Botones de traducción en la descripción del juego y en las tarjetas de reseñas (Ajustes → Traducción; Google Translate)
- Encabezado / icono de comunidad de Steam en las páginas de juego; galería de capturas tras las estadísticas del juego
- Juegos similares bajo las capturas (Steam More Like This) con % de coincidencia de etiquetas; las tarjetas llevan a Backloggd y pueden mostrar las mismas insignias de portada que las cuadrículas de listas
- Esqueletos de carga mientras llegan Steam / GameStatus / puntuaciones
- Enlaces rápidos con favicons (IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, PCGamingWiki, IsThereAnyDeal, GOG DB, GamesLike); reordénalos arrastrando y añade tus propios enlaces desde una plantilla de URL (`{title}` con el formato que elijas, `{slug}`, `{appid}`, `{year}`, `{id}`) con icono propio opcional
- Insignias **En propiedad** / **Wishlist** de Steam si has iniciado sesión en Steam en el mismo navegador (sin clave de API)
- Insignias de estado de GameStatus en páginas de juego y cuadrículas de portadas
- Funciona sin claves de API (endpoints públicos de Steam Store + userdata de la sesión + APIs públicas de GameStatus / HLTB / ProtonDB; OpenCritic se localiza vía PCGamingWiki, con clave RapidAPI propia opcional en Ajustes)

**Listas / búsqueda / diario (cuadrículas de portadas):**

- Insignias compactas en las tarjetas `.game-cover`: precio, % de reseñas de Steam, En propiedad, Wishlist, GameStatus (carga diferida en el viewport; interruptores por tipo en Ajustes → Tarjeta de juego)
- Mini-perfil en las portadas (al pasar el ratón por defecto; o clic derecho / Shift + clic): título, valoración de Backloggd, plataformas, precio/reseñas de Steam, GameStatus, enlaces rápidos; el nivel de la tarjeta (Rookie → Legend) sigue la valoración de Backloggd (precarga opcional en el viewport)
- Las mismas insignias / mini-perfiles en las tarjetas de juegos similares (franja de la página del juego)

**Páginas de apps de Steam** (`store.steampowered.com/app/*`, `steamcommunity.com/app/*`):

- Botón con icono de Backloggd en `.apphub_OtherSiteInfo` (mismo estilo que SteamDB / Community Hub)
- Enlace construido desde el slug de la URL de Steam o el título del juego

**Páginas de apps de SteamDB** (`steamdb.info/app/*`):

- Botón de Backloggd en `nav.app-links` (mismo estilo `.btn` que Store / IGDB)
- Prefiere el slug de IGDB de la página cuando está disponible

**Ajustes** (botón **Plus** en la barra de navegación de Backloggd / menú del gestor de userscripts):

- Panel con pestañas: General · Perfil · Página del juego · Tarjeta de juego · Traducción · Caché · Depuración · Acerca de
- Búsqueda de ajustes: escribe en el campo (o pulsa `/` / `Ctrl+K`) para filtrar todas las pestañas a la vez; las coincidencias en etiquetas y ayudas se resaltan, los resultados se agrupan por pestaña y `Esc` limpia la búsqueda
- Idioma de la interfaz (automático o una configuración regional fija)
- Perfil: tarjetas de mini-perfil en avatares y nombres de usuario (al pasar el ratón por defecto; o clic derecho / Shift + clic; precarga opcional en el viewport); las portadas dentro de la tarjeta (favoritos / recientes) abren el mini-perfil del juego; el aspecto de nivel por juegos jugados se puede desactivar; decoración de la página de perfil con interruptores por bloque (cabecera, chip de nivel, estadísticas, navegación, favoritos)
- Región de la tienda de Steam (moneda de los precios)
- Interruptores para Steam / en propiedad / lista de deseos / etiquetas / Metacritic / OpenCritic / HLTB / Deck·Proton / GameStatus / jugadores / icono y logo de SteamDB / galería de capturas / juegos similares / bloque nativo de estadísticas / ID del juego / traducción (descripción y reseñas) / insignias en portadas (por tipo) / mini-perfiles de juegos / enlaces / botones de Backloggd en Steam y SteamDB
- Modo de depuración: un panel con enlaces de origen clicables y un volcado completo de las respuestas
- Visibilidad de enlaces por sitio (IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, PCGamingWiki, IsThereAnyDeal, GOG DB, GamesLike)
- Duración de la caché + borrar caché (purga de caducados + límite suave LRU; biblioteca y mapa de etiquetas con TTL cortos; jugadores en línea siempre en vivo)

## Páginas compatibles

| Sitio | Patrón de URL |
|-------|---------------|
| Backloggd | `https://www.backloggd.com/*` |
| Backloggd (sin www) | `https://backloggd.com/*` |
| Steam Store (app) | `https://store.steampowered.com/app/*` |
| Steam Community (app) | `https://steamcommunity.com/app/*` |
| SteamDB (app) | `https://steamdb.info/app/*` |

## Desarrollo y contribución

- [DEVELOPMENT.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/DEVELOPMENT.md) — configuración local, estructura del repo, metadatos, permisos, publicaciones
- [CONTRIBUTING.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/CONTRIBUTING.md) — normas para PR, convenciones, localización, colaboradores
- [AGENTS.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/AGENTS.md) — notas de arquitectura para agentes de IA
- [SECURITY.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/SECURITY.md) — cómo informar de una vulnerabilidad en privado, alcance y cómo trata el script tus datos

```bash
npm install
npm run dev      # Servidor Vite — instala el userscript generado con prefijo "dev:"
npm run build    # Producción → dist/ + copia a la raíz del repo
npm run ci       # Las mismas comprobaciones que GitHub Actions
```

## Afiliación

Este proyecto **no está afiliado** a Backloggd. Es un userscript comunitario independiente.

## Licencia

[MIT](https://github.com/NemoKing1210/backloggd-plus/blob/main/LICENSE) — Copyright (c) 2026 NemoKing
