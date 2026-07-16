// ==UserScript==
// @name              Backloggd Plus
// @name:ru           Backloggd Plus
// @name:zh-CN        Backloggd Plus
// @name:es           Backloggd Plus
// @name:pt-BR        Backloggd Plus
// @name:de           Backloggd Plus
// @name:fr           Backloggd Plus
// @name:ja           Backloggd Plus
// @name:ko           Backloggd Plus
// @name:pl           Backloggd Plus
// @namespace         https://github.com/NemoKing1210/backloggd-plus
// @version           0.4.9
// @description       Extends Backloggd and adds a Backloggd button on Steam game pages
// @description:ru    Расширяет Backloggd и добавляет кнопку Backloggd на страницах игр Steam
// @description:zh-CN 扩展 Backloggd：更多游戏信息、更丰富的界面与使用体验
// @description:es    Amplía Backloggd con más información de juegos, UI enriquecida y mejoras QoL
// @description:pt-BR  Amplia o Backloggd com mais info de jogos, UI enriquecida e melhorias QoL
// @description:de     Erweitert Backloggd um mehr Spielinfos, reichere UI und QoL-Features
// @description:fr     Enrichit Backloggd avec plus d’infos jeux, une UI améliorée et des QoL
// @description:ja     Backloggdを拡張：追加のゲーム情報、UI強化、QoL機能
// @description:ko     Backloggd 확장: 추가 게임 정보, 풍부한 UI, QoL 기능
// @description:pl     Rozszerza Backloggd o więcej informacji, bogatsze UI i usprawnienia QoL
// @author             NemoKing1210
// @tag                backloggd
// @tag                games
// @homepageURL        https://github.com/NemoKing1210/backloggd-plus
// @supportURL         https://github.com/NemoKing1210/backloggd-plus/issues
// @updateURL          https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js
// @downloadURL        https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js
// @license            MIT
// @icon               https://www.backloggd.com/favicon.ico
// @match              https://www.backloggd.com/*
// @match              https://backloggd.com/*
// @match              https://store.steampowered.com/app/*
// @match              https://steamcommunity.com/app/*
// @match              https://steamdb.info/app/*
// @grant              GM_xmlhttpRequest
// @grant              GM_getValue
// @grant              GM_setValue
// @grant              GM_addStyle
// @grant              GM_registerMenuCommand
// @connect            store.steampowered.com
// @connect            api.steampowered.com
// @connect            gamestatus.info
// @run-at             document-idle
// @noframes
// ==/UserScript==
