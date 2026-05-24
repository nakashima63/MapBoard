# MapBoard — CLAUDE.md

## プロジェクト概要

Google Mapsの保存済みスポットを見やすく管理するための個人用Webアプリ。
バックエンドなし・DBなしの完全静的サイト。自分だけが使う。

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Vanilla JS（フレームワークなし） |
| データ同期 | remoteStorage.js v0.14 |
| 地図表示 | Google Maps JavaScript API |
| スポット検索 | Google Places API (New) |
| ホスティング | GitHub Pages |

フレームワークは使わない。HTML + CSS + Vanilla JS で完結させる。
ビルドステップも不要。すべてのファイルはそのままブラウザで動く状態にする。

## ファイル構成

```
/
├── index.html          # スポット一覧（メイン画面）
├── detail.html         # スポット詳細・マップ表示
├── import.html         # Google TakeoutのJSONインポート画面
├── css/
│   └── style.css       # 共通スタイル
├── js/
│   ├── app.js          # 一覧画面のロジック
│   ├── detail.js       # 詳細画面のロジック
│   ├── import.js       # インポート処理
│   ├── storage.js      # remoteStorage の読み書きラッパー
│   └── places.js       # Places API のラッパー
└── CLAUDE.md
```

## データ構造

remoteStorage に保存するスポットのスキーマ。
キーは `place_id`（Google Maps の一意ID）。

```json
{
  "ChIJXXXXXXXXXXX": {
    "place_id": "string",
    "name": "string",
    "category": "string",
    "memo": "string",
    "visited": false,
    "saved_at": "YYYY-MM-DD"
  }
}
```

スポットの詳細情報（住所・電話番号・写真・営業時間・評価）は保存しない。
必要なときに Places API から都度取得する。

## 機能要件

### P1（最初に作る）

- スポット検索・登録（Places API で検索 → remoteStorage に保存）
- カテゴリ別カード一覧表示
- スポット詳細画面（Places API の情報 + Maps JS API の地図埋め込み）
- メモ・カテゴリ編集（remoteStorage に保存）

### P2（P1完成後に追加）

- 訪問済みフラグの管理
- Google Takeout JSON のインポート

### スコープ外

- ユーザー認証
- 複数人での利用・共有機能
- ルート検索

## APIキーの扱い

APIキーは `js/config.js` に記載する（このファイルは .gitignore に追加する）。

```js
// js/config.js（gitignore対象）
const CONFIG = {
  MAPS_API_KEY: 'YOUR_API_KEY_HERE',
};
```

**GCP側で必ずHTTPリファラー制限をかけること。**
許可するリファラー: `https://<username>.github.io/*`

リファラー制限なしでAPIキーをコードに書かない。

## コーディング規約

- インデントはスペース2つ
- 変数宣言は `const` を優先、再代入が必要な場合のみ `let`。`var` は使わない
- 非同期処理は `async/await` を使う。コールバックや `.then()` チェーンは書かない
- DOM操作は `document.getElementById` または `document.querySelector` を使う
- エラーは `console.error` で記録し、ユーザーには日本語のメッセージを表示する
- コメントは日本語で書く

## remoteStorage の使い方

読み書きは必ず `js/storage.js` のラッパー関数を経由する。
他のファイルから remoteStorage を直接操作しない。

```js
// storage.js が提供する関数
await StorageModule.getSpots()        // 全スポット取得
await StorageModule.saveSpot(spot)    // スポット保存・更新
await StorageModule.deleteSpot(id)    // スポット削除
```

## Places API の使い方

Places API の呼び出しは必ず `js/places.js` のラッパー関数を経由する。
APIレスポンスをそのまま他のファイルで使わない。

```js
// places.js が提供する関数
await PlacesModule.search(query)      // テキスト検索
await PlacesModule.getDetail(placeId) // 詳細情報取得
```

## UI方針

- スマホ（375px〜）とPC（1024px〜）の両方で使いやすいレイアウトにする
- カード一覧はCSSグリッドで実装する
- タップターゲットは最小44px確保する（スマホ操作を想定）
- 外部CSSフレームワークは使わない。style.css に書く

## 作業の進め方

新しい機能を追加するときは以下の順序で進める。

1. `storage.js` または `places.js` のデータ層から実装する
2. 動作確認（console.log でデータが取れることを確認）
3. HTML/CSS でUIを作る
4. 結合して動作確認

一度に複数の機能を実装しない。1機能ずつ完成させてからコミットする。