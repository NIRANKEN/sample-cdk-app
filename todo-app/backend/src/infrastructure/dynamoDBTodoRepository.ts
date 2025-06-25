import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { Todo } from '../domain/todo';
import { TodoRepository } from '../domain/todoRepository';

interface TodoItemSchema extends Omit<Todo, 'createdAt' | 'updatedAt'> {
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export class DynamoDBTodoRepository implements TodoRepository {
  private readonly client: DynamoDBClient;
  private readonly docClient: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor() {
    this.client = new DynamoDBClient({}); // リージョンはLambda実行環境から自動的に設定される
    this.docClient = DynamoDBDocumentClient.from(this.client);

    const tableNameFromEnv = process.env.TODO_TABLE_NAME;
    if (!tableNameFromEnv) {
      throw new Error('TODO_TABLE_NAME environment variable is not set.');
    }
    this.tableName = tableNameFromEnv;
  }

  private toItem(todo: Todo): TodoItemSchema {
    return {
      ...todo,
      createdAt: todo.createdAt.toISOString(),
      updatedAt: todo.updatedAt.toISOString(),
    };
  }

  private fromItem(item: TodoItemSchema): Todo {
    return {
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    };
  }

  async save(todo: Todo): Promise<void> {
    const item = this.toItem(todo);
    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });
    await this.docClient.send(command);
  }

  async findById(id: string, userId: string): Promise<Todo | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        userId: userId,
        todoId: id,
      },
    });
    const result = await this.docClient.send(command);
    if (!result.Item) {
      return null;
    }
    return this.fromItem(result.Item as TodoItemSchema);
  }

  async findAllByUserId(userId: string): Promise<Todo[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    });
    const result = await this.docClient.send(command);
    return result.Items ? result.Items.map(item => this.fromItem(item as TodoItemSchema)) : [];
  }

  async delete(id: string, userId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        userId: userId,
        todoId: id,
      },
    });
    await this.docClient.send(command);
  }
}
