import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { lambdaHandler } from '../../app';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Unit test for app handler', () => {
    beforeEach(() => {
        ddbMock.reset();
    });

    it('verifies successful response', async () => {
        const mockItem = { id: 'test-id', name: 'Test Item', description: 'Test Description' };
        ddbMock.on(GetCommand).resolves({ Item: mockItem });

        const event: APIGatewayProxyEvent = {
            httpMethod: 'GET',
            path: '/items/test-id',
            pathParameters: { id: 'test-id' },
            body: null,
            headers: {},
            multiValueHeaders: {},
            isBase64Encoded: false,
            queryStringParameters: null,
            multiValueQueryStringParameters: null,
            requestContext: {} as any,
            resource: '',
            stageVariables: {},
        };
        const result: APIGatewayProxyResult = await lambdaHandler(event);

        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(JSON.stringify(mockItem));
    });
});

describe('Items API Tests', () => {
    beforeEach(() => {
        ddbMock.reset();
    });

    it('should create item via POST', async () => {
        ddbMock.on(PutCommand).resolves({});

        const event: APIGatewayProxyEvent = {
            httpMethod: 'POST',
            path: '/items',
            body: JSON.stringify({ name: 'New Item', description: 'New Description' }),
            headers: {},
            multiValueHeaders: {},
            isBase64Encoded: false,
            pathParameters: null,
            queryStringParameters: null,
            multiValueQueryStringParameters: null,
            requestContext: {} as any,
            resource: '',
            stageVariables: {},
        };

        const result: APIGatewayProxyResult = await lambdaHandler(event);

        expect(result.statusCode).toEqual(201);
        const body = JSON.parse(result.body);
        expect(body.name).toEqual('New Item');
        expect(body.description).toEqual('New Description');
        expect(body.id).toBeDefined();
        expect(body.createdAt).toBeDefined();
    });

    it('should get item via GET', async () => {
        const mockItem = { id: 'test-id', name: 'Test Item', description: 'Test Description' };
        ddbMock.on(GetCommand).resolves({ Item: mockItem });

        const event: APIGatewayProxyEvent = {
            httpMethod: 'GET',
            path: '/items/test-id',
            pathParameters: { id: 'test-id' },
            body: null,
            headers: {},
            multiValueHeaders: {},
            isBase64Encoded: false,
            queryStringParameters: null,
            multiValueQueryStringParameters: null,
            requestContext: {} as any,
            resource: '',
            stageVariables: {},
        };

        const result: APIGatewayProxyResult = await lambdaHandler(event);

        expect(result.statusCode).toEqual(200);
        const body = JSON.parse(result.body);
        expect(body).toEqual(mockItem);
    });

    it('should return 404 for missing item', async () => {
        ddbMock.on(GetCommand).resolves({});

        const event: APIGatewayProxyEvent = {
            httpMethod: 'GET',
            path: '/items/missing-id',
            pathParameters: { id: 'missing-id' },
            body: null,
            headers: {},
            multiValueHeaders: {},
            isBase64Encoded: false,
            queryStringParameters: null,
            multiValueQueryStringParameters: null,
            requestContext: {} as any,
            resource: '',
            stageVariables: {},
        };

        const result: APIGatewayProxyResult = await lambdaHandler(event);

        expect(result.statusCode).toEqual(404);
    });
});
