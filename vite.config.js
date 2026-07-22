import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import pkg from './package.json' with { type: 'json' };

const RAW_BASE =
  'https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Production userscript: minify JS + CSS for smaller download / install size.
    minify: 'terser',
    terserOptions: {
      compress: { passes: 2, pure_getters: true },
      mangle: true,
      format: { comments: false },
    },
    cssMinify: true,
    target: 'es2018',
    reportCompressedSize: true,
  },
  esbuild: {
    legalComments: 'none',
  },
  plugins: [
    monkey({
      entry: 'src/main.js',
      userscript: {
        name: {
          '': 'Backloggd Plus',
          ru: 'Backloggd Plus',
          'zh-CN': 'Backloggd Plus',
          es: 'Backloggd Plus',
          'pt-BR': 'Backloggd Plus',
          de: 'Backloggd Plus',
          fr: 'Backloggd Plus',
          ja: 'Backloggd Plus',
          ko: 'Backloggd Plus',
          pl: 'Backloggd Plus',
        },
        namespace: 'https://github.com/NemoKing1210/backloggd-plus',
        version: pkg.version,
        description: {
          '': 'Extends Backloggd and adds a Backloggd button on Steam game pages',
          ru: 'Расширяет Backloggd и добавляет кнопку Backloggd на страницах игр Steam',
          'zh-CN': '扩展 Backloggd：更多游戏信息、更丰富的界面与使用体验',
          es: 'Amplía Backloggd con más información de juegos, UI enriquecida y mejoras QoL',
          'pt-BR': 'Amplia o Backloggd com mais info de jogos, UI enriquecida e melhorias QoL',
          de: 'Erweitert Backloggd um mehr Spielinfos, reichere UI und QoL-Features',
          fr: 'Enrichit Backloggd avec plus d’infos jeux, une UI améliorée et des QoL',
          ja: 'Backloggdを拡張：追加のゲーム情報、UI強化、QoL機能',
          ko: 'Backloggd 확장: 추가 게임 정보, 풍부한 UI, QoL 기능',
          pl: 'Rozszerza Backloggd o więcej informacji, bogatsze UI i usprawnienia QoL',
        },
        author: 'NemoKing1210',
        tag: ['backloggd', 'games'],
        homepageURL: 'https://github.com/NemoKing1210/backloggd-plus',
        supportURL: 'https://github.com/NemoKing1210/backloggd-plus/issues',
        updateURL: `${RAW_BASE}/backloggd-plus.user.js`,
        downloadURL: `${RAW_BASE}/backloggd-plus.user.js`,
        license: 'MIT',
        icon: 'https://www.backloggd.com/favicon.ico',
        match: [
          'https://www.backloggd.com/*',
          'https://backloggd.com/*',
          'https://store.steampowered.com/app/*',
          'https://steamcommunity.com/app/*',
          'https://steamdb.info/app/*',
        ],
        connect: [
          'www.backloggd.com',
          'backloggd.com',
          'store.steampowered.com',
          'api.steampowered.com',
          'steamdb.info',
          'gamestatus.info',
          'howlongtobeat.com',
          'api.opencritic.com',
          'opencritic.com',
          'html.duckduckgo.com',
          'www.protondb.com',
          'protondb.com',
          'cdn.jsdelivr.net',
          'latest.currency-api.pages.dev',
          'translate.googleapis.com',
        ],
        'run-at': 'document-idle',
        noframes: true,
      },
      server: {
        prefix: 'dev:',
      },
      build: {
        fileName: 'backloggd-plus.user.js',
        metaFileName: true,
      },
    }),
  ],
});
