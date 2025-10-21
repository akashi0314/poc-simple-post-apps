import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { lambdaHandler } from '../../app';
import { expect, describe, it } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Unit test for app handler', function () {
    it('verifies successful response', async () => {
        const event: APIGatewayProxyEvent = {
            httpMethod: 'get',
            body: '',
            headers: {},
            isBase64Encoded: false,
            multiValueHeaders: {},
            multiValueQueryStringParameters: {},
            path: '/hello',
            pathParameters: {},
            queryStringParameters: {},
            requestContext: {
                accountId: '123456789012',
                apiId: '1234',
                authorizer: {},
                httpMethod: 'get',
                identity: {
                    accessKey: '',
                    accountId: '',
                    apiKey: '',
                    apiKeyId: '',
                    caller: '',
                    clientCert: {
                        clientCertPem: '',
                        issuerDN: '',
                        serialNumber: '',
                        subjectDN: '',
                        validity: { notAfter: '', notBefore: '' },
                    },
                    cognitoAuthenticationProvider: '',
                    cognitoAuthenticationType: '',
                    cognitoIdentityId: '',
                    cognitoIdentityPoolId: '',
                    principalOrgId: '',
                    sourceIp: '',
                    user: '',
                    userAgent: '',
                    userArn: '',
                },
                path: '/hello',
                protocol: 'HTTP/1.1',
                requestId: 'c6af9ac6-7b61-11e6-9a41-93e8deadbeef',
                requestTimeEpoch: 1428582896000,
                resourceId: '123456',
                resourcePath: '/hello',
                stage: 'dev',
            },
            resource: '',
            stageVariables: {},
        };
        const result: APIGatewayProxyResult = await lambdaHandler(event);

        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(
            JSON.stringify({
                message: 'hello world',
            }),
        );
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
            body: JSON.stringify({ name: 'test', price: 100 }),
        } as any;

        const result = await lambdaHandler(event);

        expect(result.statusCode).toEqual(201);
        const body = JSON.parse(result.body);
        expect(body.name).toEqual('test');
        expect(body.id).toBeDefined();
        expect(body.createdAt).toBeDefined();
    });

    it('should get item via GET', async () => {
        ddbMock.on(GetCommand).resolves({
            Item: { id: '123', name: 'test', price: 100 },
        });

        const event: APIGatewayProxyEvent = {
            httpMethod: 'GET',
            pathParameters: { id: '123' },
        } as any;

        const result = await lambdaHandler(event);

        expect(result.statusCode).toEqual(200);
        const body = JSON.parse(result.body);
        expect(body.id).toEqual('123');
        expect(body.name).toEqual('test');
    });

    it('should return 404 for missing item', async () => {
        ddbMock.on(GetCommand).resolves({});

        const event: APIGatewayProxyEvent = {
            httpMethod: 'GET',
            pathParameters: { id: 'nonexistent' },
        } as any;

        const result = await lambdaHandler(event);

        expect(result.statusCode).toEqual(404);
    });
});
