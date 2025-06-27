import { Todo } from '../domain/todo.js';
import { TodoRepository } from '../domain/todoRepository.js';

export interface GetTodosQuery {
  userId: string;
}

export class GetTodosUseCase {
  constructor(private readonly todoRepository: TodoRepository) {}

  async execute(query: GetTodosQuery): Promise<Todo[]> {
    if (!query.userId) {
      throw new Error('User ID is required to get todos.');
    }
    return this.todoRepository.findAllByUserId(query.userId);
  }
}
