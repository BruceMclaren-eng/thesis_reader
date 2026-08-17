# 論文リーダー

選択範囲を即座に学術的な日本語へ翻訳し、読了状況・翻訳量を可視化できる個人用のPDFリーダーPWAです。`plan.md` の設計に基づいて実装しています。

## 構成

- `client/` — React + Vite（PWA対応、pdf.js によるPDF描画）
- `server/` — Express（Claude APIへの翻訳リクエスト中継、SQLiteでの永続化）

## 前提条件

- Node.js（npm workspaces を使うため npm 7以降が必要。`node -v` で確認可能）

## セットアップ

```bash
npm install          # ルートで一括インストール（npm workspaces）
```

`server/.env` を作成し、APIキーを設定してください（`server/.env.example` を参照）。

```
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-5
DEEPL_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx
PORT=3001
```

すでにOS環境変数に `ANTHROPIC_API_KEY` が設定されている場合は、`.env` を作らなくてもそちらが使われます（`.env` は既存の環境変数を上書きしません）。

`DEEPL_API_KEY` は単語単位の意味検索（下記）専用です。[DeepL API Free](https://www.deepl.com/ja/pro-api) で取得できます（無料枠：月50万文字）。キーが `:fx` で終わっていれば自動的に無料版のエンドポイントを使います。

## 開発時の起動

```bash
npm run dev
```

Vite dev server と Express が同時に起動し、`/api` はプロキシされます。ブラウザで `http://localhost:5173` を開いてください。停止する場合はターミナルで `Ctrl+C`。

## 本番起動（iPadから使う場合）

Windows PC上で以下を実行すると、クライアントをビルドしてExpressが配信します（開発用の`npm run dev`とは別に、こちらだけ起動すればOK）。

```bash
npm start
```

同じPCから使う場合は `http://localhost:3001` を開いてください。iPadなど他端末からは、起動時にコンソールへ表示されるネットワークURL（例: `http://192.168.x.x:3001`）に、同じWi-Fi上のSafariからアクセスします。停止する場合はターミナルで `Ctrl+C`。

### iPadでPWAとして使う

1. SafariでサーバーのURLを開く
2. 共有ボタン →「ホーム画面に追加」
3. ホーム画面のアイコンから起動すると、アドレスバーなしのアプリのように使えます

テキスト選択→翻訳ボタンの表示は、iPad Safari特有の標準選択メニューと干渉する可能性があるため、実機での確認を推奨します（`SelectionToolbar` は選択範囲の下側にボタンを表示することで干渉を減らしています）。

## 単語単位の意味検索・単語帳

英単語を1語だけ選択すると（複数語を選ぶと従来通り文単位の学術翻訳になります）、選択範囲の下に「意味を調べる」ボタンが表示されます。押すとDeepL APIで単語の意味を取得し、ポップオーバーに表示します。

- 単語は活用形（`running` → `run`、`mice` → `mouse` など）を正規化してから検索・保存します（`wink-lemmatizer` によるオフライン処理、LLMは使いません）。ただし `damping` `sampling` のような工学論文特有の「-ing形の名詞」は、動詞の原形に変換すると意味が変わってしまうため正規化せずそのまま扱います。
- 同じ単語（正規化後）を調べるたびに検索回数が加算され、2回目以降はDeepLを呼ばずキャッシュした意味を返します。
- ナビゲーションの「単語帳」ページで、検索回数が多い順（＝まだ覚えていない可能性が高い順）に単語一覧を確認できます。「習得済みにする」で復習リストから外せます。

## アイコンについて

`client/public/icons/` 以下のPWAアイコンは `client/scripts/generate-icons.mjs` で自動生成したプレースホルダーです。差し替える場合は同名のPNGファイルを上書きしてください。

## アプリを更新したとき

Service Workerがアセットをキャッシュしているため、コード変更後は `npm run build -w client` → サーバー再起動をしても、既に開いているタブ／ホーム画面のPWAには反映が遅れることがあります。反映されない場合はアプリを完全に閉じて開き直す（iPadはホーム画面アプリを上スワイプで終了して再起動）か、一度だけSafari側からサイトを開き直してください。

## データの保存場所

- アップロードしたPDF: `server/uploads/`（gitignore対象）
- SQLiteデータベース: `server/data/thesis_reader.db`（gitignore対象）
