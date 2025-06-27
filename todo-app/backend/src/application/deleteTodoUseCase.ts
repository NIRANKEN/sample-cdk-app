import { TodoRepository } from '../domain/todoRepository.js';

export interface DeleteTodoCommand {
  userId: string;
  todoId: string;
}

export class DeleteTodoUseCase {
  constructor(private readonly todoRepository: TodoRepository) {}

  async execute(command: DeleteTodoCommand): Promise<void> {
    const { userId, todoId } = command;

    if (!userId) {
      throw new Error('User ID is required.');
    }
    if (!todoId) {
      throw new Error('Todo ID is required.');
    }

    // Optional: Check if todo exists before attempting delete,
    // depending on whether you want to return a specific error or not.
    // const existingTodo = await this.todoRepository.findByTodoId(todoId, userId); // Changed findById to findByTodoId
    // if (!existingTodo) {
    //   throw new Error('Todo not found'); // Or handle as a success if idempotent delete is preferred
    // }

    await this.todoRepository.deleteByTodoId(todoId, userId); // Changed delete to deleteByTodoId
  }
}
