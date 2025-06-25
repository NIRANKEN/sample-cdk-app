import { Todo, TodoUpdateParams, updateTodo } from '../domain/todo.js';
import { TodoRepository } from '../domain/todoRepository.js';

export interface UpdateTodoCommand {
  userId: string;
  todoId: string;
  updates: TodoUpdateParams;
}

export class UpdateTodoUseCase {
  constructor(private readonly todoRepository: TodoRepository) {}

  async execute(command: UpdateTodoCommand): Promise<Todo | null> {
    const { userId, todoId, updates } = command;

    if (!userId) {
      throw new Error('User ID is required.');
    }
    if (!todoId) {
      throw new Error('Todo ID is required.');
    }
    if (Object.keys(updates).length === 0) {
      throw new Error('No updates provided.');
    }
    // Optional: Validate specific fields in updates if necessary
    // e.g., if (updates.title !== undefined && updates.title.trim() === '') throw new Error('Title cannot be empty');


    const existingTodo = await this.todoRepository.findById(todoId, userId);
    if (!existingTodo) {
      return null; // Or throw a NotFoundError
    }

    const updatedTodoEntity = updateTodo(existingTodo, updates);

    await this.todoRepository.save(updatedTodoEntity);
    return updatedTodoEntity;
  }
}
