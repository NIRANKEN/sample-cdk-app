export interface Todo {
  id: string;
  userId: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TodoCreationParams = Omit<Todo, 'id' | 'createdAt' | 'updatedAt' | 'completed'>;
export type TodoUpdateParams = Partial<Omit<Todo, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;

export const createTodo = (params: TodoCreationParams, userId: string, id: string): Todo => {
  const now = new Date();
  return {
    id,
    userId,
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
