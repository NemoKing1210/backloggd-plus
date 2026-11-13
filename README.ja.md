# Backloggd Plus

[English](README.md) · [Русский](README.ru.md) · [中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md)

[![CI](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml)
[![Install userscript](https://img.shields.io/badge/Install-userscript-7c5cff?style=for-the-badge)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Greasy Fork](https://img.shields.io/badge/Greasy_Fork-587296-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![ScriptCat](https://img.shields.io/badge/ScriptCat-7077-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://github.com/NemoKing1210/backloggd-plus/blob/main/LICENSE)
[![Version](https://img.shields.io/badge/version-0.7.99-green?style=for-the-badge)](https://github.com/NemoKing1210/backloggd-plus/blob/main/CHANGELOG.md)

[Backloggd](https://www.backloggd.com) を拡張するユーザースクリプトです。追加のゲーム情報、よりリッチな UI、QoL の改善を、サイトを離れずに提供します。

[Tampermonkey](https://www.tampermonkey.net/)、[Violentmonkey](https://violentmonkey.github.io/)、[Greasemonkey](https://www.greasespot.net/)、[ScriptCat](https://scriptcat.org/)、および `// ==UserScript==` メタデータブロックに対応するその他のマネージャーと互換性があります。

[Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) と [ScriptCat](https://scriptcat.org/ru/script-show-page/7077) でも公開しています。

> **注意:** Greasy Fork / ScriptCat のカタログページはこのリポジトリより遅れることがあります。すべてのリリースをすぐに反映できるわけではありません。申し訳ありません。最新版は [GitHub の raw インストール URL](#クイックインストール) を優先してください（またはリポジトリをクローンして `npm run build` を実行）。スクリプトの `@updateURL` / `@downloadURL` も GitHub の `main` を指しています。

> **ステータス:** 早期（`0.7.99`）。Backloggd の情報拡充 + リストのバッジ + Steam / SteamDB → Backloggd ボタン。

## スクリーンショット

実際のユーザースクリプトを Backloggd のゲームページで動かした様子です。

![Backloggd Plus の設定パネル（一般・プロフィール・ゲームページ・ゲームカード・翻訳・キャッシュ・デバッグ・このスクリプトについてのタブ）](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/settings-panel.png)

| | |
|---|---|
| ![Backloggd のゲームページに表示された Steam の行](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/game-page-steam.png)<br>**ゲームページの行** — Steam: 所持 · 価格 · レビュー · タグとカテゴリ、SteamDB の詳細、Metacritic、Deck/Proton、プレイヤー数、GameStatus | ![Plus 評価、スクリーンショットギャラリー、類似ゲーム](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/game-page-stats.png)<br>**スコアと追加情報** — Plus 評価の平均、Steam のスクリーンショットギャラリー、カバーバッジ付きの類似ゲーム |
| ![すべてのタブを絞り込む設定検索](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/settings-search.png)<br>**設定検索** — すべてのタブを一度に絞り込み。一致箇所はハイライトされ、結果はタブごとにグループ化 | ![組み込みリンクと独自リンクを含むクイックリンクの行](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/quick-links.png)<br>**クイックリンク** — 組み込みサイトと独自の URL テンプレートを、リンクまたはボタンとして表示 |

ゲームページではほかに、読み込み中のスケルトン、翻訳ボタン、Fix match、ゲーム ID、SteamDB アイコンとカバー、エクスポート（Notion CSV / Markdown / JSON）、カバーにホバーしたときのミニプロフィールも表示されます。

## クイックインストール

1. ユーザースクリプトマネージャーをインストールします（[Tampermonkey](https://www.tampermonkey.net/)、[Violentmonkey](https://violentmonkey.github.io/)、[ScriptCat](https://scriptcat.org/) 推奨）。
2. GitHub（下の raw URL）、[Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus)、[ScriptCat](https://scriptcat.org/ru/script-show-page/7077) からインストールします。

**インストール URL（GitHub — 最新）:**

```
https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js
```

[![Install](https://img.shields.io/badge/⬇_Install-GitHub_raw-1a1d24?style=for-the-badge&labelColor=7c5cff)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Install on Greasy Fork](https://img.shields.io/badge/⬇_Install-Greasy_Fork-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![Install on ScriptCat](https://img.shields.io/badge/⬇_Install-ScriptCat-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)

### URL からインストール（マネージャーのダッシュボード）

| マネージャー | 手順 |
|--------------|------|
| Tampermonkey | ダッシュボード → **Utilities** → **Install from URL** |
| Violentmonkey | ダッシュボード → **+** → **Install from URL** |
| Greasemonkey | アドオンメニュー → **New User Script** → raw URL を貼り付け |
| ScriptCat | [スクリプトページ](https://scriptcat.org/ru/script-show-page/7077) → **Установить скрипт**、または[拡張機能](https://scriptcat.org/)をインストールして GitHub の raw URL を使用 |

マネージャーのダッシュボードからインストールするときは、上の [GitHub インストール URL](#クイックインストール) を貼り付けてください。カタログからのインストール: [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) · [ScriptCat](https://scriptcat.org/ru/script-show-page/7077)。

### 手動インストール

1. このリポジトリのビルド済み [`backloggd-plus.user.js`](https://github.com/NemoKing1210/backloggd-plus/blob/main/backloggd-plus.user.js) を開きます（またはクローン後に `npm run build` を実行）。
2. ファイルの内容をすべてコピーします。
3. ユーザースクリプトマネージャーで新しいスクリプトを作成し、コードを貼り付けます。
4. 保存してスクリプトを有効にします。

## 更新

スクリプトには GitHub の raw ファイルを指す `@updateURL` と `@downloadURL` のメタデータが含まれています。対応マネージャーは自動で更新を確認します。

メンテナー向けのリリース手順: [DEVELOPMENT.md § Releases](https://github.com/NemoKing1210/backloggd-plus/blob/main/DEVELOPMENT.md#releases) を参照してください。

## 機能

**ゲームページ（`/games/{slug}/`）:**

- Platforms の下にネイティブな詳細行 — **Steam**（所持 · ウィッシュリスト · 価格 · セール終了 / 最近の最安値 · レビュー · タグ）、**SteamDB**（フランチャイズ · 対応システム · 技術 · 最終レコード更新）、**Metacritic**、**OpenCritic**、**HLTB**、**Deck / Proton**、**プレイヤー**、**GameStatus**、**リンク**
- **Fix match** — ストア検索が間違っているときに Steam App ID を手動で上書き（slug ごとに保存）。App ID を空にすると Steam にないゲームとして扱います
- SteamDB の見た目: タイトル前のアプリアイコン、**Change cover** 下のロゴ、オンラインプレイヤー数
- SteamDB 詳細行: フランチャイズ / OS は Steam ストア API から、技術と最終レコード更新は SteamDB にアクセスできる場合に取得
- Steam ヘッダー下とログエディター内のエクスポートボタン（任意。設定 → ゲームページ。Notion CSV / Markdown / JSON）
- タイトル後の任意の Backloggd ゲーム ID（設定 → ゲームページ。クリックでコピー）
- ゲーム説明とレビューカードの翻訳ボタン（設定 → 翻訳。Google Translate）
- ゲームページの Steam ヘッダー / コミュニティアイコン、ゲーム統計後のスクリーンショットギャラリー
- スクリーンショット下の類似ゲーム（Steam More Like This）。タグ一致率 % 付き。カードは Backloggd へリンクし、リストグリッドと同じカバーバッジを表示できます
- Steam / GameStatus / スコアの読み込み中はスケルトンを表示
- ファビコン付きクイックリンク（IGDB、Steam、SteamDB、Metacritic、OpenCritic、HLTB、PCGamingWiki、IsThereAnyDeal、GOG DB、GamesLike）。ドラッグで並べ替え、URL テンプレート（`{title}` は書式を選択可、`{slug}`、`{appid}`、`{year}`、`{id}`）から独自リンクを追加でき、カスタムアイコンも任意で設定可能
- 同じブラウザーで Steam にログインしていると Steam の **所持** / **ウィッシュリスト** バッジを表示（API キー不要）
- ゲームページとカバーグリッドに GameStatus のステータスバッジ
- API キーなしで動作（Steam ストアの公開エンドポイント + セッションの userdata + GameStatus / HLTB / ProtonDB の公開 API。OpenCritic は PCGamingWiki 経由で検索し、設定で任意の RapidAPI キーを使用可能）

**リスト / 検索 / ジャーナル（カバーグリッド）:**

- `.game-cover` カードのコンパクトなバッジ — 価格、Steam レビュー %、所持、ウィッシュリスト、GameStatus（ビューポート内で遅延読み込み。種類ごとの切り替えは 設定 → ゲームカード）
- カバーのミニプロフィール（既定はホバー。右クリック / Shift + クリックでも可）— タイトル、Backloggd 評価、プラットフォーム、Steam の価格/レビュー、GameStatus、クイックリンク。カードのティア（Rookie → Legend）は Backloggd 評価に連動（任意でビューポート先読み）
- 類似ゲームカードにも同じカバーバッジ / ミニプロフィール（ゲームページの帯）

**Steam アプリページ** (`store.steampowered.com/app/*`, `steamcommunity.com/app/*`):

- `.apphub_OtherSiteInfo` に Backloggd アイコンボタンを追加（SteamDB / Community Hub と同じスタイル）
- Steam URL の slug またはゲームタイトルからリンクを構築

**SteamDB アプリページ** (`steamdb.info/app/*`):

- `nav.app-links` に Backloggd ボタンを追加（Store / IGDB と同じ `.btn` スタイル）
- ページに IGDB slug があれば優先

**設定**（Backloggd のナビバーの **Plus** ボタン / ユーザースクリプトマネージャーのメニュー）:

- タブ付きパネル: 一般 · プロフィール · ゲームページ · ゲームカード · 翻訳 · キャッシュ · デバッグ · このスクリプトについて
- 設定検索: ボックスに入力（または `/` / `Ctrl+K`）するとすべてのタブを一度に絞り込み。ラベルとヒントの一致箇所がハイライトされ、結果はタブごとにグループ化。`Esc` でクリア
- UI 言語（自動または固定ロケール）
- プロフィール: アバターとユーザー名のミニプロフィールカード（既定はホバー。右クリック / Shift + クリックも可。任意でビューポート先読み）。カード内のゲームカバー（お気に入り / 最近）はゲームのミニプロフィールを開く。プレイ本数によるティアスキンはオフにできる。プロフィールページのティア装飾はブロックごとに切り替え可能（ヘッダー、ティアチップ、統計、ナビ、お気に入り）
- Steam ストアの地域（価格の通貨）
- 各種トグル: Steam / 所持 / ウィッシュリスト / タグ / Metacritic / OpenCritic / HLTB / Deck·Proton / GameStatus / プレイヤー / SteamDB アイコンとロゴ / スクリーンショットギャラリー / 類似ゲーム / ネイティブ統計ブロック / ゲーム ID / 翻訳（説明とレビュー）/ リストのカバーバッジ（種類別）/ ゲームのミニプロフィール / リンク / Steam と SteamDB の Backloggd ボタン
- デバッグモード: クリック可能なソースリンクと完全なレスポンスダンプを備えた 1 つのパネル
- サイト別のリンク表示（IGDB、Steam、SteamDB、Metacritic、OpenCritic、HLTB、PCGamingWiki、IsThereAnyDeal、GOG DB、GamesLike）
- キャッシュ期間 + キャッシュ消去（期限切れの削除 + ソフトな LRU 上限。ライブラリとタグマップは短い TTL、オンラインプレイヤーは常にライブ）

## 対応ページ

| サイト | URL パターン |
|--------|--------------|
| Backloggd | `https://www.backloggd.com/*` |
| Backloggd（www なし） | `https://backloggd.com/*` |
| Steam ストア（アプリ） | `https://store.steampowered.com/app/*` |
| Steam コミュニティ（アプリ） | `https://steamcommunity.com/app/*` |
| SteamDB（アプリ） | `https://steamdb.info/app/*` |

## 開発と貢献

- [DEVELOPMENT.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/DEVELOPMENT.md) — ローカル環境、リポジトリ構成、メタデータ、権限、リリース
- [CONTRIBUTING.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/CONTRIBUTING.md) — PR のガイドライン、規約、ローカライズ、コントリビューター
- [AGENTS.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/AGENTS.md) — AI コーディングエージェント向けのアーキテクチャメモ
- [SECURITY.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/SECURITY.md) — 脆弱性の非公開報告方法、対象範囲、スクリプトによるデータの取り扱い

```bash
npm install
npm run dev      # Vite サーバー — 生成された "dev:" ユーザースクリプトをインストール
npm run build    # 本番ビルド → dist/ + リポジトリ直下にコピー
npm run ci       # GitHub Actions と同じチェック
```

## Backloggd との関係

このプロジェクトは **Backloggd とは無関係** です。独立したコミュニティ製ユーザースクリプトです。

## ライセンス

[MIT](https://github.com/NemoKing1210/backloggd-plus/blob/main/LICENSE) — Copyright (c) 2026 NemoKing
