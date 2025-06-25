import { Todo } from './todo.js';

export interface TodoRepository {
  save(todo: Todo): Promise<void>;
  findByTodoId(todoId: string, userId: string): Promise<Todo | null>; // Renamed from findById and changed id to todoId
  findAllByUserId(userId: string): Promise<Todo[]>;
  deleteByTodoId(todoId: string, userId: string): Promise<void>; // Renamed from delete and changed id to todoId
}
