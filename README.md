# Items API - 教育用シンプルなサーバーレスAPI

> **学習目的のシンプルな実装**  
> TypeScript + AWS SAM + DynamoDBを使った、最小限のPOST/GET API実装です。

## 📋 概要

このプロジェクトは、AWSサーバーレスアーキテクチャの基礎を学ぶための教育用APIです。

### 学べること

1. **AWS Lambda** の基本構造とイベント駆動アーキテクチャ
2. **API Gateway** との連携方法
3. **DynamoDB** へのデータ保存と取得
4. **TypeScript** での型安全な実装
5. **Jest** を使った単体テスト
6. 適切なバリデーションとエラーハンドリング

## 🏗️ アーキテクチャ

```
API Gateway
  │
  └── Lambda Function (TypeScript)
        │
        ├── POST /items → PutCommand
        └── GET /items/{id} → GetCommand
              │
              └── DynamoDB Table
```

## 🚀 API仕様

### POST /items

アイテムを作成します。

**リクエスト例:**
```bash
curl -X POST https://your-api.execute-api.region.amazonaws.com/Prod/items \
  -H "Content-Type: application/json" \
  -d '{"name": "商品A", "price": 1000}'
```

**レスポンス例 (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "商品A",
  "price": 1000,
  "createdAt": "2025-10-21T10:30:00.000Z"
}
```

### GET /items/{id}

IDを指定してアイテムを取得します。

**リクエスト例:**
```bash
curl https://your-api.execute-api.region.amazonaws.com/Prod/items/550e8400-e29b-41d4-a716-446655440000
```

**レスポンス例 (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "商品A",
  "price": 1000,
  "createdAt": "2025-10-21T10:30:00.000Z"
}
```

## 💾 DynamoDB テーブル設計

| 項目 | 値 |
|------|-----|
| **テーブル名** | `Items` |
| **パーティションキー** | `id` (String) |
| **課金モード** | PAY_PER_REQUEST (オンデマンド) |

## 🛠️ 技術スタック

- **言語**: TypeScript
- **ランタイム**: Node.js 22.x
- **フレームワーク**: AWS SAM (Serverless Application Model)
- **データベース**: Amazon DynamoDB
- **テストフレームワーク**: Jest
- **主要ライブラリ**:
  - `@aws-sdk/client-dynamodb` - DynamoDBクライアント
  - `@aws-sdk/lib-dynamodb` - DocumentClient
  - `aws-lambda` - Lambda型定義

## 📦 セットアップ

### 前提条件

- Node.js 22.x
- AWS CLI
- AWS SAM CLI

### インストール

```bash
cd post-apps/items-api
npm install
```

### ビルド

```bash
npm run build
```

## 🧪 テスト

### テスト実行

```bash
# すべてのテストを実行
npm test

# カバレッジレポート付きで実行
npm test -- --coverage

# ウォッチモードで実行
npm test -- --watch
```

### テストカバレッジ目標

- **Branches**: 80%以上
- **Functions**: 80%以上
- **Lines**: 80%以上
- **Statements**: 80%以上

## 🚢 デプロイ

### ローカルテスト

```bash
sam build
sam local start-api
```

### AWSへのデプロイ

```bash
# 初回デプロイ（ガイド付き）
sam deploy --guided

# 2回目以降
sam deploy
```

### デプロイ後の確認

```bash
# スタック情報を確認
aws cloudformation describe-stacks --stack-name items-api

# APIエンドポイントを取得
aws cloudformation describe-stacks \
  --stack-name items-api \
  --query 'Stacks[0].Outputs[?OutputKey==`ItemsApi`].OutputValue' \
  --output text
```

## 📁 プロジェクト構造

```
post-apps/items-api/
├── app.ts                 # Lambda関数のメインコード
├── app.js                 # コンパイル済みJavaScript
├── template.yaml          # SAMテンプレート
├── package.json           # 依存関係管理
├── tsconfig.json          # TypeScript設定
├── jest.config.ts         # Jestテスト設定
├── tests/
│   └── unit/
│       └── app.test.ts    # 単体テスト
└── README.md              # このファイル
```

## 🎓 学習の進め方

1. **ステップ1**: `app.ts` の `lambdaHandler` 関数から読み始める
2. **ステップ2**: HTTPメソッドによる分岐を理解する
3. **ステップ3**: `createItem` と `getItem` の各関数の役割を確認する
4. **ステップ4**: `tests/unit/app.test.ts` でテストコードを学ぶ
5. **ステップ5**: 実際にデプロイして動かしてみる

## 📚 参考リソース

- [AWS SAM 公式ドキュメント](https://docs.aws.amazon.com/serverless-application-model/)
- [AWS Lambda TypeScript](https://docs.aws.amazon.com/lambda/latest/dg/lambda-typescript.html)
- [DynamoDB DocumentClient](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/modules/_aws_sdk_lib_dynamodb.html)
- [Jest 公式ドキュメント](https://jestjs.io/)

## 🔧 トラブルシューティング

### ビルドエラーが発生する場合

```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### デプロイに失敗する場合

```bash
# SAMキャッシュをクリア
sam build --use-container
```

### テストが失敗する場合

```bash
# Jestキャッシュをクリア
npm test -- --clearCache
```

## 📝 ライセンス

このプロジェクトは教育目的で作成されています。

## 🤝 コントリビューション

このプロジェクトは学習用のため、プルリクエストは受け付けていません。