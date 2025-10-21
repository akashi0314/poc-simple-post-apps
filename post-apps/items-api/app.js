"use strict";
/**
 * 最もシンプルなPOST/GET API実装（教育用）
 *
 * === このコードで学べること ===
 * 1. AWS Lambda の基本構造とイベント駆動アーキテクチャ
 * 2. API Gateway との連携方法
 * 3. DynamoDB へのデータ保存と取得
 * 4. TypeScript での型安全な実装
 * 5. 適切なバリデーションとエラーハンドリング
 *
 * === 学習の進め方 ===
 * ステップ1: lambdaHandler から読み始める
 * ステップ2: HTTPメソッドによる分岐を理解する
 * ステップ3: 各関数の役割を確認する
 * ステップ4: 実際にデプロイして動かしてみる
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.lambdaHandler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const crypto_1 = require("crypto");
// ========================================
// 設定値の定数定義
// ========================================
/**
 * HTTPステータスコードの定数
 *
 * 学習ポイント：
 * - マジックナンバーを避け、コードの可読性を高める
 * - as constで型を厳密にし、変更を防ぐ
 */
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
};
/**
 * アプリケーション設定値
 *
 * 学習ポイント：
 * - 環境変数を使った設定管理
 * - デフォルト値の設定方法
 */
const CONFIG = {
    TABLE_NAME: process.env.TABLE_NAME || 'Items',
    MAX_ID_LENGTH: 255,
};
// ========================================
// DynamoDBクライアントの初期化
// ========================================
/**
 * DynamoDBクライアントのセットアップ
 *
 * 学習ポイント：
 * - AWS SDK v3 の使い方
 * - DocumentClient を使うことで、DynamoDBの型変換を自動化
 */
const client = new client_dynamodb_1.DynamoDBClient({});
const dynamodb = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
// ========================================
// メインハンドラー
// ========================================
/**
 * Lambda関数のメインハンドラー
 *
 * API GatewayからのリクエストをHTTPメソッドに応じて処理する
 *
 * 学習ポイント：
 * - Lambda関数のエントリーポイント
 * - async/await の使い方
 * - エラーハンドリングの基本パターン
 *
 * @param event - API Gatewayから渡されるイベント情報
 * @returns API Gatewayに返すレスポンス
 */
const lambdaHandler = async (event) => {
    try {
        // HTTPメソッドを取得
        const method = event.httpMethod;
        // POST /items - アイテムを作成
        if (method === 'POST') {
            return await createItem(event);
        }
        // GET /items/{id} - アイテムを取得
        if (method === 'GET') {
            return await getItem(event);
        }
        // 上記以外のメソッドはサポートしない
        return createErrorResponse(HTTP_STATUS.METHOD_NOT_ALLOWED, 'Method not allowed');
    }
    catch (err) {
        // 予期しないエラーが発生した場合
        console.error('Unexpected error:', err);
        return createErrorResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
};
exports.lambdaHandler = lambdaHandler;
// ========================================
// POST /items - アイテム作成
// ========================================
/**
 * POST /items - アイテムを作成する
 *
 * リクエストボディのJSONをDynamoDBに保存する
 *
 * 使用例：
 * curl -X POST https://your-api.com/items \
 *   -H "Content-Type: application/json" \
 *   -d '{"name": "サンプル商品", "price": 1000}'
 *
 * 成功時のレスポンス：
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "name": "サンプル商品",
 *   "price": 1000,
 *   "createdAt": "2025-10-21T10:30:00.000Z"
 * }
 *
 * 学習ポイント：
 * - リクエストボディのバリデーション
 * - DynamoDBへのデータ保存
 * - 適切なHTTPステータスコードの返却
 */
async function createItem(event) {
    try {
        // ========================================
        // バリデーション
        // ========================================
        const validation = validateRequestBody(event.body);
        if (!validation.isValid) {
            return createErrorResponse(HTTP_STATUS.BAD_REQUEST, validation.error);
        }
        const body = validation.data;
        // ========================================
        // IDの処理
        // ========================================
        /**
         * IDが指定されていない場合はUUIDを自動生成
         *
         * なぜUUIDを使うのか：
         * - グローバルに一意なIDを生成できる
         * - 分散システムでも衝突の心配がない
         * - セキュリティ：連番IDと違い推測されにくい
         */
        if (body.id !== undefined) {
            // IDが指定されている場合はバリデーション
            if (typeof body.id !== 'string' || body.id.trim() === '') {
                return createErrorResponse(HTTP_STATUS.BAD_REQUEST, 'ID must be a non-empty string');
            }
        }
        else {
            // IDが指定されていない場合は自動生成
            body.id = (0, crypto_1.randomUUID)();
        }
        // ========================================
        // タイムスタンプの追加
        // ========================================
        /**
         * 作成日時を自動追加
         *
         * 学習ポイント：
         * - ISO 8601形式の日時文字列
         * - サーバー側でタイムスタンプを管理する重要性
         */
        body.createdAt = new Date().toISOString();
        // ========================================
        // DynamoDBに保存
        // ========================================
        /**
         * PutCommand でアイテムを保存
         *
         * 学習ポイント：
         * - AWS SDK v3 のコマンドパターン
         * - async/await での非同期処理
         * - 同じIDがある場合は上書きされる（Putの特性）
         */
        await dynamodb.send(new lib_dynamodb_1.PutCommand({
            TableName: CONFIG.TABLE_NAME,
            Item: body,
        }));
        // 作成したアイテムを返す（201 Created）
        return createSuccessResponse(HTTP_STATUS.CREATED, body);
    }
    catch (err) {
        // DynamoDB関連のエラー
        console.error('Error creating item:', err);
        // DynamoDBのエラーを適切に処理
        if (isDynamoDBError(err)) {
            return createErrorResponse(HTTP_STATUS.SERVICE_UNAVAILABLE, 'Database service unavailable');
        }
        throw err; // 予期しないエラーは上位でキャッチ
    }
}
// ========================================
// GET /items/{id} - アイテム取得
// ========================================
/**
 * GET /items/{id} - 指定されたIDのアイテムを取得する
 *
 * パスパラメータからIDを取得してDynamoDBから検索する
 *
 * 使用例：
 * curl https://your-api.com/items/550e8400-e29b-41d4-a716-446655440000
 *
 * 成功時のレスポンス：
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "name": "サンプル商品",
 *   "price": 1000,
 *   "createdAt": "2025-10-21T10:30:00.000Z"
 * }
 *
 * 学習ポイント：
 * - パスパラメータの取得方法
 * - DynamoDBからのデータ取得
 * - 404エラーの適切な処理
 */
async function getItem(event) {
    try {
        // ========================================
        // パスパラメータの検証
        // ========================================
        /**
         * パスパラメータの存在確認
         *
         * 学習ポイント：
         * - 早期リターンパターン（ガード節）
         * - null/undefined チェックの重要性
         */
        if (!event.pathParameters) {
            return createErrorResponse(HTTP_STATUS.BAD_REQUEST, 'Path parameters are required');
        }
        // パスパラメータからIDを取得
        const itemId = event.pathParameters.id;
        // IDのバリデーション
        if (!itemId || itemId.trim() === '') {
            return createErrorResponse(HTTP_STATUS.BAD_REQUEST, 'ID parameter is required');
        }
        // IDの形式チェック（基本的なサニタイゼーション）
        if (itemId.length > CONFIG.MAX_ID_LENGTH) {
            return createErrorResponse(HTTP_STATUS.BAD_REQUEST, 'ID parameter is too long');
        }
        // ========================================
        // DynamoDBから取得
        // ========================================
        /**
         * GetCommand でアイテムを取得
         *
         * 学習ポイント：
         * - プライマリキーを指定したGet操作
         * - 取得結果が存在しない場合の処理
         */
        const response = await dynamodb.send(new lib_dynamodb_1.GetCommand({
            TableName: CONFIG.TABLE_NAME,
            Key: { id: itemId },
        }));
        // アイテムが見つからない場合は404エラー
        if (!response.Item) {
            return createErrorResponse(HTTP_STATUS.NOT_FOUND, 'Item not found');
        }
        // 取得したアイテムを返す（200 OK）
        return createSuccessResponse(HTTP_STATUS.OK, response.Item);
    }
    catch (err) {
        // DynamoDB関連のエラー
        console.error('Error getting item:', err);
        // DynamoDBのエラーを適切に処理
        if (isDynamoDBError(err)) {
            return createErrorResponse(HTTP_STATUS.SERVICE_UNAVAILABLE, 'Database service unavailable');
        }
        throw err; // 予期しないエラーは上位でキャッチ
    }
}
// ========================================
// バリデーション関数
// ========================================
/**
 * リクエストボディのバリデーション
 *
 * 学習ポイント：
 * - バリデーションロジックの分離
 * - 明確な戻り値の型定義
 * - 段階的なチェックと早期リターン
 *
 * @param body - リクエストボディの文字列
 * @returns バリデーション結果オブジェクト
 */
function validateRequestBody(body) {
    // 1. ボディの存在チェック
    if (!body) {
        return { isValid: false, error: 'Request body is required' };
    }
    // 2. JSONパース
    let parsedBody;
    try {
        parsedBody = JSON.parse(body);
    }
    catch (parseError) {
        return { isValid: false, error: 'Invalid JSON format' };
    }
    // 3. 空オブジェクトチェック
    if (Object.keys(parsedBody).length === 0) {
        return { isValid: false, error: 'Request body cannot be empty' };
    }
    return { isValid: true, data: parsedBody };
}
// ========================================
// レスポンス生成ヘルパー関数
// ========================================
/**
 * 成功レスポンスを作成するヘルパー関数
 *
 * 学習ポイント：
 * - API Gatewayのレスポンス形式
 * - JSONシリアライゼーション
 * - Content-Typeヘッダーの重要性
 *
 * @param statusCode - HTTPステータスコード
 * @param data - レスポンスボディのデータ
 * @returns API Gatewayレスポンスオブジェクト
 */
function createSuccessResponse(statusCode, data) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    };
}
/**
 * エラーレスポンスを作成するヘルパー関数
 *
 * 学習ポイント：
 * - 一貫性のあるエラーレスポンス形式
 * - タイムスタンプの付与（デバッグ用）
 * - 適切なHTTPステータスコードの使用
 *
 * @param statusCode - HTTPステータスコード
 * @param message - エラーメッセージ
 * @returns API Gatewayレスポンスオブジェクト
 */
function createErrorResponse(statusCode, message) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            error: message,
            statusCode,
            timestamp: new Date().toISOString(),
        }),
    };
}
// ========================================
// エラー判定ヘルパー関数
// ========================================
/**
 * DynamoDBのエラーかどうかを判定するヘルパー関数
 *
 * 学習ポイント：
 * - unknown型の安全な型チェック方法
 * - Type Guardパターン
 * - DynamoDBの主要なエラー種類
 *
 * @param err - チェックするエラーオブジェクト
 * @returns DynamoDBエラーの場合true
 */
function isDynamoDBError(err) {
    if (typeof err === 'object' && err !== null) {
        const error = err;
        /**
         * 既知のDynamoDBエラー名のリスト
         *
         * 主なエラーの意味：
         * - ResourceNotFoundException: テーブルが存在しない
         * - ProvisionedThroughputExceededException: スループット制限超過
         * - ServiceUnavailable: DynamoDBサービスが利用不可
         */
        const dynamoDBErrors = [
            'ResourceNotFoundException',
            'ProvisionedThroughputExceededException',
            'ServiceUnavailable',
        ];
        return dynamoDBErrors.includes(error.name || '');
    }
    return false;
}
