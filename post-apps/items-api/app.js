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
    console.log('[START] Lambda Handler');
    console.log('[REQUEST] Method:', event.httpMethod);
    console.log('[REQUEST] Path:', event.path);
    console.log('[REQUEST] Body:', event.body);
    try {
        const method = event.httpMethod;
        if (method === 'POST') {
            console.log('[ROUTE] POST /items - Create Item');
            return await createItem(event);
        }
        if (method === 'GET') {
            console.log('[ROUTE] GET /items/{id} - Get Item');
            return await getItem(event);
        }
        console.log('[ERROR] Method not allowed:', method);
        return createErrorResponse(HTTP_STATUS.METHOD_NOT_ALLOWED, 'Method not allowed');
    }
    catch (err) {
        console.error('[ERROR] Unexpected error:', err);
        return createErrorResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
    }
};
exports.lambdaHandler = lambdaHandler;
async function createItem(event) {
    console.log('[CREATE] Starting create item process');
    try {
        console.log('[VALIDATE] Validating request body');
        const validation = validateRequestBody(event.body);
        if (!validation.isValid) {
            console.log('[VALIDATE] Validation failed:', validation.error);
            return createErrorResponse(HTTP_STATUS.BAD_REQUEST, validation.error);
        }
        console.log('[VALIDATE] Validation passed');
        const body = validation.data;
        if (body.id !== undefined) {
            console.log('[ID] User provided ID:', body.id);
            if (typeof body.id !== 'string' || body.id.trim() === '') {
                console.log('[ID] Invalid ID format');
                return createErrorResponse(HTTP_STATUS.BAD_REQUEST, 'ID must be a non-empty string');
            }
        }
        else {
            body.id = (0, crypto_1.randomUUID)();
            console.log('[ID] Generated UUID:', body.id);
        }
        body.createdAt = new Date().toISOString();
        console.log('[TIMESTAMP] Created at:', body.createdAt);
        console.log('[DYNAMODB] Saving to table:', CONFIG.TABLE_NAME);
        console.log('[DYNAMODB] Item data:', JSON.stringify(body));
        await dynamodb.send(new lib_dynamodb_1.PutCommand({
            TableName: CONFIG.TABLE_NAME,
            Item: body,
        }));
        console.log('[DYNAMODB] Item saved successfully');
        console.log('[SUCCESS] Item created with ID:', body.id);
        return createSuccessResponse(HTTP_STATUS.CREATED, body);
    }
    catch (err) {
        console.error('[ERROR] Error creating item:', err);
        if (isDynamoDBError(err)) {
            console.error('[ERROR] DynamoDB service error');
            return createErrorResponse(HTTP_STATUS.SERVICE_UNAVAILABLE, 'Database service unavailable');
        }
        throw err;
    }
}
async function getItem(event) {
    console.log('[GET] Starting get item process');
    try {
        if (!event.pathParameters) {
            console.log('[ERROR] Path parameters missing');
            return createErrorResponse(HTTP_STATUS.BAD_REQUEST, 'Path parameters are required');
        }
        const itemId = event.pathParameters.id;
        console.log('[GET] Requested item ID:', itemId);
        if (!itemId || itemId.trim() === '') {
            console.log('[ERROR] ID parameter is empty');
            return createErrorResponse(HTTP_STATUS.BAD_REQUEST, 'ID parameter is required');
        }
        if (itemId.length > CONFIG.MAX_ID_LENGTH) {
            console.log('[ERROR] ID parameter too long:', itemId.length);
            return createErrorResponse(HTTP_STATUS.BAD_REQUEST, 'ID parameter is too long');
        }
        console.log('[DYNAMODB] Getting item from table:', CONFIG.TABLE_NAME);
        const response = await dynamodb.send(new lib_dynamodb_1.GetCommand({
            TableName: CONFIG.TABLE_NAME,
            Key: { id: itemId },
        }));
        if (!response.Item) {
            console.log('[NOT_FOUND] Item not found for ID:', itemId);
            return createErrorResponse(HTTP_STATUS.NOT_FOUND, 'Item not found');
        }
        console.log('[SUCCESS] Item retrieved:', JSON.stringify(response.Item));
        return createSuccessResponse(HTTP_STATUS.OK, response.Item);
    }
    catch (err) {
        console.error('[ERROR] Error getting item:', err);
        if (isDynamoDBError(err)) {
            console.error('[ERROR] DynamoDB service error');
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
        console.log('[VALIDATE] JSON parse error:', parseError);
        return { isValid: false, error: 'Invalid JSON format' };
    }
    if (Object.keys(parsedBody).length === 0) {
        return { isValid: false, error: 'Request body cannot be empty' };
    }
    return { isValid: true, data: parsedBody };
}
function createSuccessResponse(statusCode, data) {
    console.log('[RESPONSE] Success response:', statusCode);
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    };
}
function createErrorResponse(statusCode, message) {
    console.log('[RESPONSE] Error response:', statusCode, message);
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
