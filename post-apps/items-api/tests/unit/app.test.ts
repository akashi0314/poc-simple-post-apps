/**
 * Lambda API テストコード（教育用）
 * 
 * === このテストコードで学べること ===
 * 1. Jestを使った単体テストの書き方
 * 2. AWS SDKのモック方法
 * 3. 正常系・異常系のテストパターン
 * 4. テストの構造化（Arrange-Act-Assert）
 * 5. 境界値テストの重要性
 * 
 * === テスト実行方法 ===
 * npm test                    # すべてのテストを実行
 * npm test -- --coverage      # カバレッジレポート付きで実行
 * npm test -- --watch         # ファイル変更を監視して自動実行
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { lambdaHandler } from '../../app';

// ========================================
// モックの設定
// ========================================
/**
 * DynamoDB DocumentClient のモック
 * 
 * 学習ポイント：
 * - aws-sdk-client-mock を使ったモック方法
 * - 実際のAWSサービスを使わずにテストする利点
 * - モックのリセットの重要性
 */
const ddbMock = mockClient(DynamoDBDocumentClient);

// ========================================
// テストのセットアップ
// ========================================
/**
 * 各テスト前後の処理
 * 
 * 学習ポイント：
 * - beforeEach/afterEach の使い方
 * - テストの独立性を保つ重要性
 * - 環境変数の設定方法
 * - console.errorのモック（テストログをきれいに保つ）
 */

// console.errorをモック（エラーテスト時のログ出力を抑制）
let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
    // モックをリセット（前のテストの影響を受けないようにする）
    ddbMock.reset();
    
    // 環境変数を設定
    process.env.TABLE_NAME = 'TestTable';
    
    // console.errorをモック（テストログをきれいに保つ）
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
    // 環境変数をクリア
    delete process.env.TABLE_NAME;
    
    // console.errorのモックをリストア
    consoleErrorSpy.mockRestore();
});

// ========================================
// ヘルパー関数
// ========================================
/**
 * テスト用のAPIGatewayイベントを作成
 * 
 * 学習ポイント：
 * - テストデータの生成パターン
 * - 型安全なモックデータの作り方
 * - デフォルト値の活用
 * - null と undefined の使い分け
 */
function createMockEvent(
    method: string,
    body?: string | null,
    pathParameters?: Record<string, string> | null
): APIGatewayProxyEvent {
    return {
        httpMethod: method,
        body: body ?? null,
        pathParameters: pathParameters ?? null,
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/items',
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
    };
}

// ========================================
// POST /items のテスト
// ========================================
describe('POST /items - アイテム作成', () => {
    /**
     * 正常系テスト：有効なデータでアイテムを作成
     * 
     * 学習ポイント：
     * - AAA パターン（Arrange-Act-Assert）
     * - モックの戻り値設定
     * - ステータスコードとレスポンスボディの検証
     */
    test('正常系：有効なデータでアイテムを作成できる', async () => {
        // Arrange（準備）: テストデータとモックの設定
        const requestBody = {
            name: 'テスト商品',
            price: 1000,
        };
        
        // DynamoDBのPutCommandが成功することをモック
        ddbMock.on(PutCommand).resolves({});

        const event = createMockEvent('POST', JSON.stringify(requestBody));

        // Act（実行）: 実際に関数を呼び出す
        const result = await lambdaHandler(event);

        // Assert（検証）: 期待される結果を確認
        expect(result.statusCode).toBe(201);
        
        const body = JSON.parse(result.body);
        expect(body).toHaveProperty('id');
        expect(body).toHaveProperty('createdAt');
        expect(body.name).toBe('テスト商品');
        expect(body.price).toBe(1000);
        
        // DynamoDBが正しく呼ばれたことを確認
        expect(ddbMock.calls()).toHaveLength(1);
    });

    /**
     * 正常系テスト：IDを指定してアイテムを作成
     * 
     * 学習ポイント：
     * - カスタムIDの処理
     * - 指定したIDが保持されることの確認
     */
    test('正常系：IDを指定してアイテムを作成できる', async () => {
        // Arrange
        const customId = 'custom-id-12345';
        const requestBody = {
            id: customId,
            name: 'カスタムID商品',
        };
        
        ddbMock.on(PutCommand).resolves({});
        const event = createMockEvent('POST', JSON.stringify(requestBody));

        // Act
        const result = await lambdaHandler(event);

        // Assert
        expect(result.statusCode).toBe(201);
        const body = JSON.parse(result.body);
        expect(body.id).toBe(customId);
    });

    /**
     * 異常系テスト：リクエストボディが空
     * 
     * 学習ポイント：
     * - 異常系のテストの重要性
     * - バリデーションエラーの確認
     * - 適切なエラーメッセージの検証
     */
    test('異常系：リクエストボディが空の場合400エラー', async () => {
        // Arrange
        const event = createMockEvent('POST', null);

        // Act
        const result = await lambdaHandler(event);

        // Assert
        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.error).toBe('Request body is required');
        expect(body).toHaveProperty('timestamp');
    });

    /**
     * 異常系テスト：不正なJSON形式
     * 
     * 学習ポイント：
     * - JSONパースエラーのハンドリング
     * - 境界値テスト
     */
    test('異常系：不正なJSON形式の場合400エラー', async () => {
        // Arrange
        const event = createMockEvent('POST', 'これは不正なJSON');

        // Act
        const result = await lambdaHandler(event);

        // Assert
        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.error).toBe('Invalid JSON format');
    });

    /**
     * 異常系テスト：空のオブジェクト
     * 
     * 学習ポイント：
     * - エッジケースのテスト
     * - 空データのバリデーション
     */
    test('異常系：空のオブジェクトの場合400エラー', async () => {
        // Arrange
        const event = createMockEvent('POST', '{}');

        // Act
        const result = await lambdaHandler(event);

        // Assert
        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.error).toBe('Request body cannot be empty');
    });

    /**
     * 異常系テスト：IDが空文字列
     * 
     * 学習ポイント：
     * - 文字列のバリデーション
     * - トリム処理の重要性
     */
    test('異常系：IDが空文字列の場合400エラー', async () => {
        // Arrange
        const requestBody = {
            id: '   ',  // 空白のみ
            name: 'テスト',
        };
        const event = createMockEvent('POST', JSON.stringify(requestBody));

        // Act
        const result = await lambdaHandler(event);

        // Assert
        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.error).toBe('ID must be a non-empty string');
    });

    /**
     * 異常系テスト：DynamoDBエラー
     * 
     * 学習ポイント：
     * - 外部サービスのエラーハンドリング
     * - モックでエラーを発生させる方法
     * - 503エラーの適切な使用
     */
    test('異常系：DynamoDBエラーの場合503エラー', async () => {
        // Arrange
        const requestBody = { name: 'テスト' };
        
        // DynamoDBがエラーを返すようにモック
        const error = new Error('DynamoDB Error');
        (error as any).name = 'ServiceUnavailable';
        ddbMock.on(PutCommand).rejects(error);

        const event = createMockEvent('POST', JSON.stringify(requestBody));

        // Act
        const result = await lambdaHandler(event);

        // Assert
        expect(result.statusCode).toBe(503);
        const body = JSON.parse(result.body);
        expect(body.error).toBe('Database service unavailable');
    });
});

// ========================================
// GET /items/{id} のテスト
// ========================================
describe('GET /items/{id} - アイテム取得', () => {
    /**
     * 正常系テスト：存在するアイテムを取得
     * 
     * 学習ポイント：
     * - GetCommandのモック方法
     * - 戻り値の検証
     */
    test('正常系：存在するアイテムを取得できる', async () => {
        // Arrange
        const itemId = 'test-id-12345';
        const mockItem = {
            id: itemId,
            name: 'テスト商品',
            price: 1000,
            createdAt: '2025-10-21T10:00:00.000Z',
        };

        // DynamoDBが指定したアイテムを返すようにモック
        ddbMock.on(GetCommand).resolves({
            Item: mockItem,
        });

        const event = createMockEvent('GET', undefined, { id: itemId });

        // Act
        const result = await lambdaHandler(event);

        // Assert
        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body).toEqual(mockItem);
        
        // DynamoDBが正しいパラメータで呼ばれたことを確認
        expect(ddbMock.calls()).toHaveLength(1);
    });

    /**
     * 異常系テスト：存在しないアイテム
     * 
     * 学習ポイント：
     * - 404エラーの適切な使用
     * - null/undefinedチェック
     */
    test('異常系：存在しないアイテムの場合404エラー', async () => {
        // Arrange
        const itemId = 'non-existent-id';

        // DynamoDBがアイテムを見つけられない場合をモック
        ddbMock.on(GetCommand).resolves({
            Item: undefined,
        });

        const event = createMockEvent('GET', undefined, { id: itemId });

        // Act
        const result = await lambdaHandler(event);

        // Assert
        expect(result.statusCode).toBe(404);
        const body = JSON.parse(result.body);
        expect(body.error).toBe('Item not found');
    });

    /**
     * 異常系テスト：パスパラメータがない
     * 
     * 学習ポイント：
     * - 必須パラメータのバリデーション
     * - API Gatewayの統合タイプによる違い
     */
    test('異常系：パスパラメータがない場合400エラー', async () => {
        // Arrange
        const event = createMockEvent('GET', null, null);

        // Act
        const result = await lambdaHandler(event);

        // Assert
        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.error).toBe('Path parameters are required');
    });

    /**
     * 異常系テスト：IDが空文字列
     * 
     * 学習ポイント：
     * - パラメータのバリデーション
     * - トリム処理
     */
    test('異常系：IDが空文字列の場合400エラー', async () => {
        // Arrange
        const event = createMockEvent('GET', undefined, { id: '   ' });

        // Act
        const result = await lambdaHandler(event);

        // Assert
        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.error).toBe('ID parameter is required');
    });

    /**
     * 異常系テスト：IDが長すぎる
     * 
     * 学習ポイント：
     * - 境界値テスト
     * - セキュリティ：長大な入力の拒否
     */
    test('異常系：IDが長すぎる場合400エラー', async () => {
        // Arrange
        const longId = 'a'.repeat(256); // 256文字（上限の255を超える）
        const event = createMockEvent('GET', undefined, { id: longId });

        // Act
        const result = await lambdaHandler(event);

        // Assert
        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.error).toBe('ID parameter is too long');
    });

    /**
     * 異常系テスト：DynamoDBエラー
     * 
     * 学習ポイント：
     * - 外部サービス障害のハンドリング
     * - エラーの適切な分類
     */
    test('異常系：DynamoDBエラーの場合503エラー', async () => {
        // Arrange
        const itemId = 'test-id';
        
        const error = new Error('DynamoDB Error');
        (error as any).name = 'ServiceUnavailable';
        ddbMock.on(GetCommand).rejects(error);

        const event = createMockEvent('GET', undefined, { id: itemId });

        // Act
        const result = await lambdaHandler(event);

        // Assert
        expect(result.statusCode).toBe(503);
        const body = JSON.parse(result.body);
        expect(body.error).toBe('Database service unavailable');
    });
});

// ========================================
// その他のHTTPメソッドのテスト
// ========================================
describe('サポートされていないHTTPメソッド', () => {
    /**
     * 異常系テスト：PUTメソッド
     * 
     * 学習ポイント：
     * - 405 Method Not Allowed の使用
     * - サポートされていないメソッドの拒否
     */
    test('異常系：PUTメソッドは405エラー', async () => {
        // Arrange
        const event = createMockEvent('PUT', JSON.stringify({ name: 'test' }));

        // Act
        const result = await lambdaHandler(event);

        // Assert
        expect(result.statusCode).toBe(405);
        const body = JSON.parse(result.body);
        expect(body.error).toBe('Method not allowed');
    });

    /**
     * 異常系テスト：DELETEメソッド
     */
    test('異常系：DELETEメソッドは405エラー', async () => {
        // Arrange
        const event = createMockEvent('DELETE');

        // Act
        const result = await lambdaHandler(event);

        // Assert
        expect(result.statusCode).toBe(405);
    });

    /**
     * 異常系テスト：PATCHメソッド
     */
    test('異常系：PATCHメソッドは405エラー', async () => {
        // Arrange
        const event = createMockEvent('PATCH', JSON.stringify({ name: 'test' }));

        // Act
        const result = await lambdaHandler(event);

        // Assert
        expect(result.statusCode).toBe(405);
    });
});

// ========================================
// エッジケースのテスト
// ========================================
describe('エッジケースとセキュリティ', () => {
    /**
     * セキュリティテスト：特殊文字を含むID
     * 
     * 学習ポイント：
     * - 入力のサニタイゼーション
     * - インジェクション攻撃の防御
     */
    test('セキュリティ：特殊文字を含むIDでも正常に動作', async () => {
        // Arrange
        const specialId = 'test-id-<script>alert("xss")</script>';
        
        ddbMock.on(GetCommand).resolves({
            Item: { id: specialId, name: 'test' },
        });

        const event = createMockEvent('GET', undefined, { id: specialId });

        // Act
        const result = await lambdaHandler(event);

        // Assert
        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.id).toBe(specialId);
    });

    /**
     * パフォーマンステスト：大きなJSONボディ
     * 
     * 学習ポイント：
     * - 大きなデータの処理
     * - メモリ使用量の考慮
     */
    test('エッジケース：大きなJSONボディでも処理できる', async () => {
        // Arrange
        const largeObject = {
            name: 'テスト',
            description: 'a'.repeat(1000), // 1000文字の説明
            tags: Array(100).fill('tag'), // 100個のタグ
        };

        ddbMock.on(PutCommand).resolves({});
        const event = createMockEvent('POST', JSON.stringify(largeObject));

        // Act
        const result = await lambdaHandler(event);

        // Assert
        expect(result.statusCode).toBe(201);
    });
});