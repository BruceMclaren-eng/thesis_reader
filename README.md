# 論文リーダー

選択範囲を即座に学術的な日本語へ翻訳し、読了状況・翻訳量を可視化できる個人用のPDFリーダーです。

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

`DEEPL_API_KEY` は単語単位の意味検索（下記）専用です。[DeepL API Free](https://www.deepl.com/ja/pro-api) で取得できます（無料枠：月50万文字）。

## 使い方

### 開発時の起動

```bash
npm run dev
```

Vite dev server と Express が同時に起動し、`/api` はプロキシされます。ブラウザで `http://localhost:5173` を開いてください。停止する場合はターミナルで `Ctrl+C`。

### 本番起動

Windows PC上で以下を実行すると、クライアントをビルドしてExpressが配信します（開発用の`npm run dev`とは別に、こちらだけ起動すればOK）。

```bash
npm start
```

`http://localhost:3001` を開いてください。停止する場合はターミナルで `Ctrl+C`。

### デスクトップからワンクリックで起動（Windows）

毎回ターミナルを開いて `npm start` するのが面倒な場合は、`scripts/start-app.bat` へのショートカットをデスクトップに作っておくと、アイコンをダブルクリックするだけで起動できます。

1. エクスプローラーで `scripts` フォルダを開き、`start-app.bat` を右クリック
2. 「その他のオプションを表示」→「送る」→「デスクトップ（ショートカットを作成）」を選択
   （Windows 11で「送る」が出ない場合は、右クリックメニューの「その他のオプションを表示」から辿れます）
3. デスクトップに作成されたショートカットを、わかりやすいように「論文リーダーを起動」などにリネーム

これでアイコンをダブルクリックすると `npm start`（ビルド＋サーバー起動）が実行され、サーバーが応答可能になり次第、既定のブラウザで自動的に `http://localhost:3001` が開きます。サーバーを止めたいときは、開いた黒いウィンドウ（`thesis-reader server`）で `Ctrl+C`。

### 論文タイトルの変更

リーダー画面上部のタイトルをクリックすると編集できます。`Enter` または入力欄の外をクリックすると保存され、`Escape` でキャンセルできます。

### 翻訳パネルの幅調整

デスクトップ表示（画面幅900px以上）では、PDF表示エリアと翻訳パネルの境界にカーソルを合わせるとドラッグでき、左右の幅を自由に調整できます。調整した幅はブラウザに保存され、次回開いたときも復元されます。

### 単語単位の意味検索・単語帳

英単語を1語だけ選択すると（複数語を選ぶと従来通り文単位の学術翻訳になります）、選択範囲の下に「意味を調べる」ボタンが表示されます。押すとDeepL APIで単語の意味を取得し、ポップオーバーに表示します。

- 単語は活用形（`running` → `run`、`mice` → `mouse` など）を正規化してから検索・保存します（`wink-lemmatizer` によるオフライン処理、LLMは使いません）。ただし `damping` `sampling` のような工学論文特有の「-ing形の名詞」は、動詞の原形に変換すると意味が変わってしまうため正規化せずそのまま扱います。
- 同じ単語（正規化後）を調べるたびに検索回数が加算され、2回目以降はDeepLを呼ばずキャッシュした意味を返します。
- ナビゲーションの「単語帳」ページで、検索回数が多い順（＝まだ覚えていない可能性が高い順）に単語一覧を確認できます。「習得済みにする」で復習リストから外せます。

### アプリを更新したとき

Service Workerがアセットをキャッシュしているため、コード変更後は `npm run build -w client` → サーバー再起動をしても、既に開いているタブには反映が遅れることがあります。反映されない場合はタブを完全に閉じて開き直してください。

## データの保存場所

- アップロードしたPDF: `server/uploads/`（gitignore対象）
- SQLiteデータベース: `server/data/thesis_reader.db`（gitignore対象）

## 構成

- `client/` — React + Vite（PWA対応、pdf.js によるPDF描画）
- `server/` — Express（Claude APIへの翻訳リクエスト中継、SQLiteでの永続化）

## アイコンについて

`client/public/icons/` 以下のPWAアイコンは `client/scripts/generate-icons.mjs` で自動生成したプレースホルダーです。差し替える場合は同名のPNGファイルを上書きしてください。
