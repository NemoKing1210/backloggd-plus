# Backloggd Plus

[English](README.md) · [Русский](README.ru.md) · [中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md)

[![CI](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml)
[![Install userscript](https://img.shields.io/badge/Install-userscript-7c5cff?style=for-the-badge)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Greasy Fork](https://img.shields.io/badge/Greasy_Fork-587296-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![ScriptCat](https://img.shields.io/badge/ScriptCat-7077-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://github.com/NemoKing1210/backloggd-plus/blob/main/LICENSE)
[![Version](https://img.shields.io/badge/version-0.7.100-green?style=for-the-badge)](https://github.com/NemoKing1210/backloggd-plus/blob/main/CHANGELOG.md)

[Backloggd](https://www.backloggd.com)를 확장하는 사용자 스크립트입니다. 추가 게임 정보, 더 풍부한 UI, 편의성 개선을 사이트를 떠나지 않고 제공합니다.

[Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/), [Greasemonkey](https://www.greasespot.net/), [ScriptCat](https://scriptcat.org/) 및 `// ==UserScript==` 메타데이터 블록을 지원하는 다른 관리자와 호환됩니다.

[Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus)와 [ScriptCat](https://scriptcat.org/ru/script-show-page/7077)에도 등록되어 있습니다.

> **참고:** Greasy Fork / ScriptCat의 카탈로그 페이지는 이 저장소보다 늦을 수 있습니다. 모든 릴리스를 바로 반영하지는 못합니다. 죄송합니다. 최신 빌드는 [GitHub raw 설치 URL](#빠른-설치)을 사용하세요(또는 저장소를 클론한 뒤 `npm run build` 실행). 스크립트의 `@updateURL` / `@downloadURL`도 GitHub `main`을 가리킵니다.

> **상태:** 초기 (`0.7.100`). Backloggd 정보 보강 + 목록 배지 + Steam / SteamDB → Backloggd 버튼.

## 스크린샷

실제 사용자 스크립트가 Backloggd 게임 페이지에서 동작하는 모습입니다.

![일반, 프로필, 게임 페이지, 게임 카드, 번역, 캐시, 디버그, 정보 탭이 있는 Backloggd Plus 설정 패널](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/settings-panel.png)

| | |
|---|---|
| ![Backloggd 게임 페이지의 Steam 행](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/game-page-steam.png)<br>**게임 페이지 행** — Steam: 보유 · 가격 · 리뷰 · 태그와 카테고리, SteamDB 세부 정보, Metacritic, Deck/Proton, 플레이어, GameStatus | ![Plus 평가, 스크린샷 갤러리, 비슷한 게임](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/game-page-stats.png)<br>**점수와 추가 정보** — Plus 평가 평균, Steam 스크린샷 갤러리, 커버 배지가 있는 비슷한 게임 |
| ![모든 탭을 필터링하는 설정 검색](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/settings-search.png)<br>**설정 검색** — 모든 탭을 한 번에 필터링; 일치 항목은 강조되고 결과는 탭별로 그룹화 | ![기본 링크와 사용자 링크가 있는 빠른 링크 행](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/quick-links.png)<br>**빠른 링크** — 기본 사이트와 직접 만든 URL 템플릿을 링크 또는 버튼으로 표시 |

게임 페이지에는 그 외에도 데이터 로딩 중 스켈레톤, 번역 버튼, Fix match, 게임 ID, SteamDB 아이콘과 커버, 내보내기(Notion CSV / Markdown / JSON), 커버에 마우스를 올렸을 때의 미니 프로필이 있습니다.

## 빠른 설치

1. 사용자 스크립트 관리자를 설치합니다([Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/), [ScriptCat](https://scriptcat.org/) 권장).
2. GitHub(아래 raw URL), [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus), [ScriptCat](https://scriptcat.org/ru/script-show-page/7077)에서 설치합니다.

**설치 URL (GitHub — 최신):**

```
https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js
```

[![Install](https://img.shields.io/badge/⬇_Install-GitHub_raw-1a1d24?style=for-the-badge&labelColor=7c5cff)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Install on Greasy Fork](https://img.shields.io/badge/⬇_Install-Greasy_Fork-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![Install on ScriptCat](https://img.shields.io/badge/⬇_Install-ScriptCat-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)

### URL로 설치 (관리자 대시보드)

| 관리자 | 경로 |
|--------|------|
| Tampermonkey | 대시보드 → **Utilities** → **Install from URL** |
| Violentmonkey | 대시보드 → **+** → **Install from URL** |
| Greasemonkey | 부가 기능 메뉴 → **New User Script** → raw URL 붙여넣기 |
| ScriptCat | [스크립트 페이지](https://scriptcat.org/ru/script-show-page/7077) → **Установить скрипт**, 또는 [확장 기능](https://scriptcat.org/)을 설치하고 GitHub raw URL 사용 |

관리자 대시보드에서 설치할 때는 위의 [GitHub 설치 URL](#빠른-설치)을 붙여넣으세요. 카탈로그 설치: [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) · [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

### 수동 설치

1. 이 저장소의 빌드된 [`backloggd-plus.user.js`](https://github.com/NemoKing1210/backloggd-plus/blob/main/backloggd-plus.user.js)를 엽니다(또는 클론 후 `npm run build` 실행).
2. 파일 내용 전체를 복사합니다.
3. 사용자 스크립트 관리자에서 새 스크립트를 만들고 코드를 붙여넣습니다.
4. 저장하고 스크립트를 활성화합니다.

## 업데이트

스크립트에는 GitHub raw 파일을 가리키는 `@updateURL`과 `@downloadURL` 메타데이터가 포함되어 있습니다. 지원되는 관리자는 자동으로 업데이트를 확인합니다.

메인테이너용 릴리스 절차: [DEVELOPMENT.md § Releases](https://github.com/NemoKing1210/backloggd-plus/blob/main/DEVELOPMENT.md#releases)를 참고하세요.

## 기능

**게임 페이지 (`/games/{slug}/`):**

- Platforms 아래의 기본 세부 정보 행 — **Steam**(보유 · 위시리스트 · 가격 · 할인 종료 / 최근 최저가 · 리뷰 · 태그), **SteamDB**(프랜차이즈 · 지원 시스템 · 기술 · 마지막 레코드 업데이트), **Metacritic**, **OpenCritic**, **HLTB**, **Deck / Proton**, **플레이어**, **GameStatus**, **링크**
- **Fix match** — 스토어 검색이 틀렸을 때 Steam App ID를 직접 덮어씁니다(slug별 저장). App ID를 비워 두면 Steam에 없는 게임으로 표시합니다
- SteamDB 시각 요소: 제목 앞 앱 아이콘, **Change cover** 아래 로고, 온라인 플레이어 수
- SteamDB 세부 정보 행: 프랜차이즈 / OS는 Steam 스토어 API에서, 기술과 마지막 레코드 업데이트는 SteamDB에 접근 가능할 때 가져옵니다
- Steam 헤더 아래와 로그 편집기의 내보내기 버튼(선택; 설정 → 게임 페이지; Notion CSV / Markdown / JSON)
- 제목 뒤의 선택적 Backloggd 게임 ID(설정 → 게임 페이지; 클릭하여 복사)
- 게임 설명과 리뷰 카드의 번역 버튼(설정 → 번역; Google Translate)
- 게임 페이지의 Steam 헤더 / 커뮤니티 아이콘, 게임 통계 뒤의 스크린샷 갤러리
- 스크린샷 아래의 비슷한 게임(Steam More Like This), 태그 일치율 % 포함; 카드는 Backloggd로 연결되고 목록 그리드와 같은 커버 배지를 표시할 수 있습니다
- Steam / GameStatus / 점수 로딩 중 스켈레톤 표시
- 파비콘이 있는 빠른 링크(IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, PCGamingWiki, IsThereAnyDeal, GOG DB, GamesLike); 드래그로 순서를 바꾸고 URL 템플릿(`{title}`은 원하는 형식으로, `{slug}`, `{appid}`, `{year}`, `{id}`)으로 직접 링크를 추가할 수 있으며 사용자 아이콘도 선택 가능
- 같은 브라우저에서 Steam에 로그인되어 있으면 Steam **보유** / **위시리스트** 배지 표시(API 키 불필요)
- 게임 페이지와 커버 그리드의 GameStatus 상태 배지
- API 키 없이 동작(Steam 스토어 공개 엔드포인트 + 세션 userdata + GameStatus / HLTB / ProtonDB 공개 API; OpenCritic은 PCGamingWiki를 통해 찾고, 설정에서 선택적으로 RapidAPI 키 사용)

**목록 / 검색 / 저널 (커버 그리드):**

- `.game-cover` 카드의 간결한 배지 — 가격, Steam 리뷰 %, 보유, 위시리스트, GameStatus(뷰포트에서 지연 로딩; 유형별 토글은 설정 → 게임 카드)
- 커버의 미니 프로필(기본은 호버, 또는 우클릭 / Shift + 클릭) — 제목, Backloggd 평점, 플랫폼, Steam 가격/리뷰, GameStatus, 빠른 링크; 카드 티어(Rookie → Legend)는 Backloggd 평점을 따릅니다(선택적 뷰포트 사전 로딩)
- 비슷한 게임 카드에도 같은 커버 배지 / 미니 프로필(게임 페이지의 띠)

**Steam 앱 페이지** (`store.steampowered.com/app/*`, `steamcommunity.com/app/*`):

- `.apphub_OtherSiteInfo`에 Backloggd 아이콘 버튼 주입(SteamDB / Community Hub와 같은 스타일)
- Steam URL의 slug 또는 게임 제목으로 링크 생성

**SteamDB 앱 페이지** (`steamdb.info/app/*`):

- `nav.app-links`에 Backloggd 버튼 주입(Store / IGDB와 같은 `.btn` 스타일)
- 페이지에 IGDB slug가 있으면 우선 사용

**설정** (Backloggd 내비바의 **Plus** 버튼 / 사용자 스크립트 관리자 메뉴):

- 탭 패널: 일반 · 프로필 · 게임 페이지 · 게임 카드 · 번역 · 캐시 · 디버그 · 정보
- 설정 검색: 상자에 입력(또는 `/` / `Ctrl+K`)하면 모든 탭을 한 번에 필터링합니다. 레이블과 힌트의 일치 항목이 강조되고 결과는 탭별로 그룹화되며 `Esc`로 지웁니다
- UI 언어(자동 또는 고정 로케일)
- 프로필: 아바타와 사용자 이름의 미니 프로필 카드(기본은 호버, 또는 우클릭 / Shift + 클릭, 선택적 뷰포트 사전 로딩); 카드 안의 게임 커버(즐겨찾기 / 최근)는 게임 미니 프로필을 엽니다; 플레이한 게임 수에 따른 티어 스킨은 끌 수 있습니다; 프로필 페이지 티어 장식은 블록별로 토글 가능(헤더, 티어 칩, 통계, 내비게이션, 즐겨찾기)
- Steam 스토어 지역(가격 통화)
- 토글: Steam / 보유 / 위시리스트 / 태그 / Metacritic / OpenCritic / HLTB / Deck·Proton / GameStatus / 플레이어 / SteamDB 아이콘과 로고 / 스크린샷 갤러리 / 비슷한 게임 / 기본 통계 블록 / 게임 ID / 번역(설명과 리뷰) / 목록 커버 배지(유형별) / 게임 미니 프로필 / 링크 / Steam 및 SteamDB의 Backloggd 버튼
- 디버그 모드: 클릭 가능한 소스 링크와 전체 응답 덤프가 있는 패널 하나
- 사이트별 링크 표시(IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, PCGamingWiki, IsThereAnyDeal, GOG DB, GamesLike)
- 캐시 기간 + 캐시 지우기(만료 항목 정리 + 소프트 LRU 한도; 라이브러리와 태그 맵은 짧은 TTL, 온라인 플레이어는 항상 실시간)

## 지원 페이지

| 사이트 | URL 패턴 |
|--------|----------|
| Backloggd | `https://www.backloggd.com/*` |
| Backloggd(www 없음) | `https://backloggd.com/*` |
| Steam 스토어(앱) | `https://store.steampowered.com/app/*` |
| Steam 커뮤니티(앱) | `https://steamcommunity.com/app/*` |
| SteamDB(앱) | `https://steamdb.info/app/*` |

## 개발 및 기여

- [DEVELOPMENT.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/DEVELOPMENT.md) — 로컬 설정, 저장소 구조, 메타데이터, 권한, 릴리스
- [CONTRIBUTING.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/CONTRIBUTING.md) — PR 가이드라인, 규칙, 현지화, 기여자
- [AGENTS.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/AGENTS.md) — AI 코딩 에이전트를 위한 아키텍처 노트
- [SECURITY.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/SECURITY.md) — 취약점 비공개 신고 방법, 범위, 스크립트의 데이터 처리 방식

```bash
npm install
npm run dev      # Vite 서버 — 생성된 "dev:" 사용자 스크립트 설치
npm run build    # 프로덕션 → dist/ + 저장소 루트로 복사
npm run ci       # GitHub Actions와 동일한 검사
```

## Backloggd와의 관계

이 프로젝트는 **Backloggd와 관련이 없습니다**. 독립적인 커뮤니티 사용자 스크립트입니다.

## 라이선스

[MIT](https://github.com/NemoKing1210/backloggd-plus/blob/main/LICENSE) — Copyright (c) 2026 NemoKing
