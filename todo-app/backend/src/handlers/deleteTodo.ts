import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBTodoRepository } from '../infrastructure/dynamoDBTodoRepository.js';
import { DeleteTodoUseCase } from '../application/deleteTodoUseCase.js';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub;
    if (!userId || typeof userId !== 'string') {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Unauthorized: User ID not found in token' }),
      };
    }

    const todoId = event.pathParameters?.todoId;
    if (!todoId || typeof todoId !== 'string') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'todoId path parameter is missing or invalid' }),
      };
    }

    const todoRepository = new DynamoDBTodoRepository();
    const deleteTodoUseCase = new DeleteTodoUseCase(todoRepository);

    // Consider if a "not found" error should be explicitly returned.
    // The current DeleteTodoUseCase doesn't check for existence before deleting.
    // If the item doesn't exist, DynamoDB's DeleteCommand doesn't error.
    await deleteTodoUseCase.execute({
      userId,
      todoId,
    });

    return {
      statusCode: 204, // No Content, standard for successful DELETE with no body
      headers: {
        'Access-Control-Allow-Origin': '*', // Adjust for specific origins in production
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: '', // No body for 204
    };
  } catch (error: unknown) {
    console.error('Error deleting todo:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const statusCode = error instanceof Error && error.message.includes('required') ? 400 : 500;

    return {
      statusCode: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ message }),
    };
  }
};
