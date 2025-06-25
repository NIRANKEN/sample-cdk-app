import { Todo } from './todo';

export interface TodoRepository {
  save(todo: Todo): Promise<void>;
  findById(id: string, userId: string): Promise<Todo | null>;
  findAllByUserId(userId: string): Promise<Todo[]>;
  delete(id: string, userId: string): Promise<void>;
}
