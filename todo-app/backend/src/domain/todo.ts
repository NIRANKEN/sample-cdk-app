export interface Todo {
  todoId: string; // Changed from id to todoId
  userId: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TodoCreationParams = Omit<Todo, 'todoId' | 'createdAt' | 'updatedAt' | 'completed'>; // Changed from id to todoId
export type TodoUpdateParams = Partial<Omit<Todo, 'todoId' | 'userId' | 'createdAt' | 'updatedAt'>>; // Changed from id to todoId

export const createTodo = (params: TodoCreationParams, todoId: string): Todo => { // Changed id to todoId
  const now = new Date();
  return {
    todoId, // Changed from id
    userId: params.userId,
    title: params.title,
    description: params.description,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };
};

export const updateTodo = (todo: Todo, updates: TodoUpdateParams): Todo => {
  return {
    ...todo,
    ...updates,
    updatedAt: new Date(),
  };
};
