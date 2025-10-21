"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lambdaHandler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const crypto_1 = require("crypto");
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
};
const CONFIG = {
    TABLE_NAME: process.env.TABLE_NAME || 'Items',
    MAX_ID_LENGTH: 255,
};
const client = new client_dynamodb_1.DynamoDBClient({});
const dynamodb = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const lambdaHandler = async (event) => {
    try {
        const method = event.httpMethod;
        if (method === 'POST') {
            return await createItem(event);
        }
        if (method === 'GET') {
            return await getItem(event);
        }
        return createErrorResponse(HTTP_STATUS.METHOD_NOT_ALLOWED, 'Method not allowed');
    }
    catch (err) {
        console.error('Unexpected error:', err);
        return createErrorResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
};
exports.lambdaHandler = lambdaHandler;
async function createItem(event) {
    try {
        const validation = validateRequestBody(event.body);
        if (!validation.isValid) {
            return createErrorResponse(HTTP_STATUS.BAD_REQUEST, validation.error);
        }
        const body = validation.data;
        if (body.id !== undefined) {
            if (typeof body.id !== 'string' || body.id.trim() === '') {
                return createErrorResponse(HTTP_STATUS.BAD_REQUEST, 'ID must be a non-empty string');
            }
        }
        else {
            body.id = (0, crypto_1.randomUUID)();
        }
        body.createdAt = new Date().toISOString();
        await dynamodb.send(new lib_dynamodb_1.PutCommand({
            TableName: CONFIG.TABLE_NAME,
            Item: body,
        }));
        return createSuccessResponse(HTTP_STATUS.CREATED, body);
    }
    catch (err) {
        console.error('Error creating item:', err);
        if (isDynamoDBError(err)) {
            return createErrorResponse(HTTP_STATUS.SERVICE_UNAVAILABLE, 'Database service unavailable');
        }
        throw err;
    }
}
async function getItem(event) {
    try {
        if (!event.pathParameters) {
            return createErrorResponse(HTTP_STATUS.BAD_REQUEST, 'Path parameters are required');
        }
        const itemId = event.pathParameters.id;
        if (!itemId || itemId.trim() === '') {
            return createErrorResponse(HTTP_STATUS.BAD_REQUEST, 'ID parameter is required');
        }
        if (itemId.length > CONFIG.MAX_ID_LENGTH) {
            return createErrorResponse(HTTP_STATUS.BAD_REQUEST, 'ID parameter is too long');
        }
        const response = await dynamodb.send(new lib_dynamodb_1.GetCommand({
            TableName: CONFIG.TABLE_NAME,
            Key: { id: itemId },
        }));
        if (!response.Item) {
            return createErrorResponse(HTTP_STATUS.NOT_FOUND, 'Item not found');
        }
        return createSuccessResponse(HTTP_STATUS.OK, response.Item);
    }
    catch (err) {
        console.error('Error getting item:', err);
        if (isDynamoDBError(err)) {
            return createErrorResponse(HTTP_STATUS.SERVICE_UNAVAILABLE, 'Database service unavailable');
        }
        throw err;
    }
}
function validateRequestBody(body) {
    if (!body) {
        return { isValid: false, error: 'Request body is required' };
    }
    let parsedBody;
    try {
        parsedBody = JSON.parse(body);
    }
    catch (parseError) {
        return { isValid: false, error: 'Invalid JSON format' };
    }
    if (Object.keys(parsedBody).length === 0) {
        return { isValid: false, error: 'Request body cannot be empty' };
    }
    return { isValid: true, data: parsedBody };
}
function createSuccessResponse(statusCode, data) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    };
}
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
function isDynamoDBError(err) {
    if (typeof err === 'object' && err !== null) {
        const error = err;
        const dynamoDBErrors = [
            'ResourceNotFoundException',
            'ProvisionedThroughputExceededException',
            'ServiceUnavailable',
        ];
        return dynamoDBErrors.includes(error.name || '');
    }
    return false;
}
