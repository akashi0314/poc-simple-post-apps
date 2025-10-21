# app.tsの責任範囲（教育的なシンプル実装）

> このアプリは **JSONデータをPOSTしてDynamoDBに保存する最もシンプルな実装** です。
> 教育目的で、必要最小限の機能のみを実装しています。

## 主要な責任

| カテゴリ | 責任範囲 | 学習ポイント |
|---------|---------|-------------|
| **エントリーポイント** | Lambda関数のハンドラー | `lambdaHandler`関数がAPI Gatewayからのイベントを受け取る基本パターン |
| **HTTPルーティング** | メソッドの振り分け | `event.httpMethod`でPOST/GETを判定するシンプルなルーティング |
| **POST処理<br>`/items`** | アイテムの作成 | ① リクエストボディをパース<br>② IDを自動生成（UUID）<br>③ タイムスタンプを付与<br>④ DynamoDBに保存<br>⑤ 201で作成したデータを返却 |
| **GET処理<br>`/items/{id}`** | アイテムの取得 | ① パスパラメータからIDを取得<br>② DynamoDBから検索<br>③ 存在確認（なければ404）<br>④ 200でデータを返却 |
| **DynamoDB操作** | データの永続化 | DocumentClientを使ったシンプルなPut/Get操作 |
| **エラーハンドリング** | 最小限の例外処理 | try-catchで全体をラップし、500エラーで安全に返す |

## データフロー（POST）

```
API Gateway → Lambda → DynamoDB
   ↓           ↓          ↓
 JSON      ID生成      保存
          + timestamp
```

## データフロー（GET）

```
API Gateway → Lambda → DynamoDB
   ↓           ↓          ↓
 ID指定     検索        取得
```

## 環境変数

| 変数名 | 用途 | デフォルト値 | 設定箇所 |
|--------|------|-------------|---------|
| TABLE_NAME | DynamoDBテーブル名 | 'Items' | template.yaml |

## 依存パッケージ

| パッケージ | 用途 | 学習ポイント |
|-----------|------|-------------|
| `aws-lambda` | Lambda関数の型定義 | TypeScriptでの型安全な実装 |
| `@aws-sdk/client-dynamodb` | DynamoDBクライアント | AWS SDKv3の基本 |
| `@aws-sdk/lib-dynamodb` | DocumentClient | JSON形式で簡単にDB操作 |
| `crypto` | UUID生成 | Node.js標準ライブラリの活用 |

## 学習に適したシンプルさ

- **単一ファイル**: app.ts 1つだけで完結
- **明確な責務**: POSTで保存、GETで取得
- **最小限のエラーハンドリング**: 基本的な400/404/500のみ
- **直感的な構造**: if文でのシンプルなルーティング
- **コメント付き**: 各処理に日本語コメントあり