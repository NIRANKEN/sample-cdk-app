import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBTodoRepository } from '../infrastructure/dynamoDBTodoRepository.js';
import { CreateTodoUseCase } from '../application/createTodoUseCase.js';
import { Todo } from '../domain/todo.js';

interface CreateTodoRequest {
  title: string;
  description?: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Request body is missing' }),
      };
    }

    const userId = event.requestContext.authorizer?.jwt?.claims?.sub;
    if (!userId || typeof userId !== 'string') {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Unauthorized: User ID not found in token' }),
      };
    }

    const requestBody = JSON.parse(event.body) as CreateTodoRequest;
    const { title, description } = requestBody;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Title is required and must be a non-empty string' }),
      };
    }
    if (description !== undefined && (typeof description !== 'string')) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Description must be a string if provided' }),
        };
    }

    const todoRepository = new DynamoDBTodoRepository();
    const createTodoUseCase = new CreateTodoUseCase(todoRepository);

    const newTodo: Todo = await createTodoUseCase.execute({
      userId,
      title,
      description,
    });

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Adjust for specific origins in production
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify(newTodo),
    };
  } catch (error: unknown) {
    console.error('Error creating todo:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const statusCode = error instanceof Error && error.message.includes('required') ? 400 : 500;

    return {
      statusCode: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ message }),
    };
  }
};
