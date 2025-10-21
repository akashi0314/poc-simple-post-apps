# 最もシンプルなPoC実装

## API設計（超シンプル版）

### POST /items
- JSONをそのままDynamoDBに保存
- 成功/失敗を返す

### GET /items/{id}
- DynamoDBから取得
- JSONを返す

## アーキテクチャ

```
API Gateway
  │
  └── Lambda Function (単一)
        │
        ├── POST /items → PutItem
        └── GET /items/{id} → GetItem
              │
              └── DynamoDB Table
```

## 実装例（AWS Lambda + Python）

### lambda_function.py

```python
import json
import boto3
import uuid
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Items')

def lambda_handler(event, context):
    method = event['httpMethod']
    
    # POST /items
    if method == 'POST':
        body = json.loads(event['body'])
        
        # IDが無ければ自動生成
        if 'id' not in body:
            body['id'] = str(uuid.uuid4())
        
        # タイムスタンプ追加
        body['createdAt'] = datetime.now().isoformat()
        
        # DynamoDBに保存
        table.put_item(Item=body)
        
        return {
            'statusCode': 201,
            'body': json.dumps(body)
        }
    
    # GET /items/{id}
    elif method == 'GET':
        item_id = event['pathParameters']['id']
        
        # DynamoDBから取得
        response = table.get_item(Key={'id': item_id})
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Not found'})
            }
        
        return {
            'statusCode': 200,
            'body': json.dumps(response['Item'])
        }
```

## DynamoDB設定

- **テーブル名**: `Items`
- **パーティションキー**: `id` (String)

## API Gateway設定

- `POST /items` → Lambda統合
- `GET /items/{id}` → Lambda統合

## テスト

### 1. アイテム作成

```bash
curl -X POST https://your-api.execute-api.region.amazonaws.com/items \
  -H "Content-Type: application/json" \
  -d '{"name": "test", "price": 100}'
```

### 2. アイテム取得

```bash
curl https://your-api.execute-api.region.amazonaws.com/items/YOUR_ID
```

## デプロイ手順（最短）

### AWS SAM テンプレート

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  ItemsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: Items
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
      BillingMode: PAY_PER_REQUEST

  ItemsFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: .
      Handler: lambda_function.lambda_handler
      Runtime: python3.11
      Policies:
        - DynamoDBCrudPolicy:
            TableName: Items
      Events:
        CreateItem:
          Type: Api
          Properties:
            Path: /items
            Method: POST
        GetItem:
          Type: Api
          Properties:
            Path: /items/{id}
            Method: GET

Outputs:
  ApiUrl:
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/"
```

### デプロイコマンド

```bash
sam build
sam deploy --guided
```

## さらにシンプルにする場合

### エラーハンドリングなし版

```python
import json
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Items')

def lambda_handler(event, context):
    if event['httpMethod'] == 'POST':
        item = json.loads(event['body'])
        table.put_item(Item=item)
        return {'statusCode': 201, 'body': json.dumps(item)}
    
    else:  # GET
        response = table.get_item(Key={'id': event['pathParameters']['id']})
        return {'statusCode': 200, 'body': json.dumps(response['Item'])}
```

これ以上シンプルにはできません！🎯

