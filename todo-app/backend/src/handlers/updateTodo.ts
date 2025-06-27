import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBTodoRepository } from '../infrastructure/dynamoDBTodoRepository.js';
import { UpdateTodoUseCase } from '../application/updateTodoUseCase.js';
import { Todo, TodoUpdateParams } from '../domain/todo.js';

interface UpdateTodoRequest extends TodoUpdateParams {}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Request body is missing' }),
      };
    }

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

    const requestBody = JSON.parse(event.body) as UpdateTodoRequest;
    // Basic validation for requestBody content
    if (typeof requestBody.title === 'string' && requestBody.title.trim() === '') {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Title cannot be empty if provided' }),
        };
    }
    if (requestBody.description !== undefined && typeof requestBody.description !== 'string') {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Description must be a string if provided' }),
        };
    }
    if (requestBody.completed !== undefined && typeof requestBody.completed !== 'boolean') {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Completed must be a boolean if provided' }),
        };
    }
    if (Object.keys(requestBody).length === 0) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Update data is required' }),
        };
    }


    const todoRepository = new DynamoDBTodoRepository();
    const updateTodoUseCase = new UpdateTodoUseCase(todoRepository);

    const updatedTodo: Todo | null = await updateTodoUseCase.execute({
      userId,
      todoId,
      updates: requestBody,
    });

    if (!updatedTodo) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: JSON.stringify({ message: `Todo with id ${todoId} not found for user ${userId}` }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Adjust for specific origins in production
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify(updatedTodo),
    };
  } catch (error: unknown) {
    console.error('Error updating todo:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    let statusCode = 500;
    if (error instanceof Error) {
        if (error.message.includes('required') || error.message.includes('No updates provided') || error.message.includes('cannot be empty')) {
            statusCode = 400;
        }
    }

    return {
      statusCode: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ message }),
    };
  }
};
