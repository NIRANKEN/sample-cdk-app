import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBTodoRepository } from '../infrastructure/dynamoDBTodoRepository.js';
import { DeleteTodoUseCase } from '../application/deleteTodoUseCase.js';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // ユーザーIDの取得元を authorizer.lambda.userId に変更
    console.log('getTodos event:', JSON.stringify(event, null, 2)); // デバッグ用にイベント全体をログ出力
    const userId = event.requestContext.authorizer?.userId; // ★ 変更点

    if (!userId || typeof userId !== 'string') {
      console.error('User ID not found or invalid in authorizer context:', event.requestContext.authorizer);
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: JSON.stringify({ message: 'Unauthorized: User ID not found in authorizer context' }),
      };
    }
    console.log(`Successfully retrieved userId: ${userId} from authorizer context`);

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
