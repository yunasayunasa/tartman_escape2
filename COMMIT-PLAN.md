# 公開・復元メモ

2026-09-07。依頼された実装・ローカル検証を済ませ、コミット直前で停止するためのメモ。

## 対象
`tartman_escape2/visual-zone` を独立したゲームのルートとする。親の旧版と `prototype-v2` は凍結したまま。
GitHubリポジトリ `yunasayunasa/tartman_escape2` の `main` で管理し、GitHub Pagesへ公開する。

## コミットに含めるファイル
- `.gitignore`, `package.json`, `package-lock.json`, `vite.config.js`, `index.html`
- `src/` のゲーム、描画、素材解析、操作、音、CSS
- `tests/zone.test.js`, `tests/balance-simulation.mjs`, `tests/browser.mjs`, `tests/browser-outcomes.mjs`
- `public/assets/` の実際に使用する6画像と `public/CREDITS.md`
- `README.md`, `BALANCE.md`, `IMAGEGEN-PROMPT.md`, 本メモ

除外：`node_modules/`, `dist/`, `validation/`, `reference-downloads/`（既存 `.gitignore` に記載）。ダウンロード元ZIP、未使用素材、スクリーンショット、ログをコミット対象に混ぜない。

推奨コミット題名：`feat: add four forest areas, five keys, and balanced pursuit AI`

## 検証証拠
- `npm run verify`：29テスト（鍵配置100seed、敵なし50完走を含む）、敵あり90探索、本番ビルド。
- `validation/four-areas/result.json`：実ブラウザ11/11成功、失敗0・警告0。390×844 / 360×640 / 1280×900。
- `validation/outcomes/result.json`：敵あり・実入力の5鍵取得、脱出、再挑戦の3/3成功。ブラウザ検証合計14/14。
- 同ディレクトリの画像：4エリア、入口、スマホ設定・道案内。
- 詳細な調整値・自動探索結果は `BALANCE.md`。自動探索の勝率を人間の勝率とは扱わない。

## 復元
変更前のソース・設定・テストのバックアップ：
`C:/Users/guestuser/Desktop/コウセイ/_codex_backups/tartman-visual-zone-before-four-areas-20260907`

サーバーを終了し、バックアップの `src/`, `tests/`, `index.html`, `README.md`, `package.json`, `package-lock.json`, `vite.config.js`, `.gitignore` を本フォルダーの同名箇所へ戻す。バックアップ直下 `CREDITS.md` は `public/CREDITS.md` へ戻す。今回追加の `public/assets/tartman.png`, `BALANCE.md`, `COMMIT-PLAN.md`, `tests/balance-simulation.mjs`, `tests/browser-outcomes.mjs` を取り除き、`npm run build` で生成物を再作成する。
