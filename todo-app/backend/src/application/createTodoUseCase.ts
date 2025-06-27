import { Todo, TodoCreationParams, createTodo } from '../domain/todo.js';
import { TodoRepository } from '../domain/todoRepository.js';
import { v4 as uuidv4 } from 'uuid';

export interface CreateTodoCommand extends TodoCreationParams {
  userId: string;
}

export class CreateTodoUseCase {
  constructor(private readonly todoRepository: TodoRepository) {}

  async execute(command: CreateTodoCommand): Promise<Todo> {
    const { userId, title, description } = command;

    if (!userId) {
      throw new Error('User ID is required to create a todo.');
    }
    if (!title || title.trim() === '') {
      throw new Error('Title is required and cannot be empty.');
    }

    const newTodoEntity = createTodo(
      {
        userId, // Pass the correct userId from the command
        title,
        description,
      },
      uuidv4() // Generate a new UUID for the todoId
    );

    await this.todoRepository.save(newTodoEntity);
    return newTodoEntity;
  }
}
