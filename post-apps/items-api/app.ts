import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME || 'Items';

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const method = event.httpMethod;

    try {
        // POST /items
        if (method === 'POST') {
            const body = JSON.parse(event.body || '{}');

            // IDが無ければ自動生成
            if (!body.id) {
                body.id = randomUUID();
            }

            // タイムスタンプ追加
            body.createdAt = new Date().toISOString();

            // DynamoDBに保存
            await dynamodb.send(
                new PutCommand({
                    TableName: tableName,
                    Item: body,
                }),
            );

            return {
                statusCode: 201,
                body: JSON.stringify(body),
            };
        }

        // GET /items/{id}
        else if (method === 'GET') {
            const itemId = event.pathParameters?.id;

            if (!itemId) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Missing id parameter' }),
                };
            }

            // DynamoDBから取得
            const response = await dynamodb.send(
                new GetCommand({
                    TableName: tableName,
                    Key: { id: itemId },
                }),
            );

            if (!response.Item) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'Not found' }),
                };
            }

            return {
                statusCode: 200,
                body: JSON.stringify(response.Item),
            };
        }

        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
