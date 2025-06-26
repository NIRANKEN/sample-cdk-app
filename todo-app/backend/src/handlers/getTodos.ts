import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBTodoRepository } from '../infrastructure/dynamoDBTodoRepository.js';
import { GetTodosUseCase } from '../application/getTodosUseCase.js';
import { Todo } from '../domain/todo.js';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // ユーザーIDの取得元を authorizer.lambda.userId に変更
    // console.log('getTodos event:', JSON.stringify(event, null, 2)); // デバッグ用にイベント全体をログ出力
    const userId = event.requestContext.authorizer?.lambda?.userId; // ★ 変更点

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

    const todoRepository = new DynamoDBTodoRepository();
    const getTodosUseCase = new GetTodosUseCase(todoRepository);

    const todos: Todo[] = await getTodosUseCase.execute({ userId });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Adjust for specific origins in production
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify(todos),
    };
  } catch (error: unknown) {
    console.error('Error getting todos:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    // エラーレスポンスにもCORSヘッダーを含める
    const statusCode = error instanceof Error && error.message.includes('required') ? 400 : 500;

    return {
      statusCode: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ message }),
    };
  }
};
