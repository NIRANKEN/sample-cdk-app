import {create} from 'zustand';
import { Todo, CreateTodoInput, UpdateTodoInput } from '../../domain/todo';
import { TodoApplicationService } from '../../application/todoService';
import { ApiTodoRepository } from '../../infrastructure/api/apiTodoRepository'; // 実装を直接利用
import { useAuthStore } from './authStore'; // 認証ストアからidTokenを取得

// TodoApplicationServiceのインスタンスを作成 (リポジトリを注入)
// 本来はDIコンテナやReact Context経由で注入するのが望ましいが、ここでは簡略化のため直接インスタンス化
const todoRepository = new ApiTodoRepository();
const todoAppService = new TodoApplicationService(todoRepository);

interface TodoState {
  todos: Todo[];
  isLoading: boolean;
  error: Error | null;
  fetchTodos: () => Promise<void>;
  addTodo: (todoInput: CreateTodoInput) => Promise<Todo | null>;
  updateTodo: (todoId: string, todoInput: UpdateTodoInput) => Promise<Todo | null>;
  deleteTodo: (todoId: string) => Promise<void>;
  toggleTodo: (todoId: string, currentCompletedStatus: boolean) => Promise<Todo | null>;
  clearError: () => void;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  isLoading: false,
  error: null,

  _getIdToken: (): string | null => { // ヘルパー関数
    // Zustandストアの外部で別のストアの最新状態を取得するには `getState()` を使う
    return useAuthStore.getState().isAuthenticated ? useAuthStore.getState().getSessionTokens().idToken : null;
  },

  fetchTodos: async () => {
    const idToken = get()._getIdToken();
    if (!idToken) {
      set({ error: new Error('Not authenticated'), isLoading: false, todos: [] });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const todos = await todoAppService.getMyTodos(idToken);
      set({ todos, isLoading: false });
    } catch (err: any) {
      set({ error: err, isLoading: false, todos: [] });
    }
  },

  addTodo: async (todoInput: CreateTodoInput) => {
    const idToken = get()._getIdToken();
    if (!idToken) {
      set({ error: new Error('Not authenticated') });
      return null;
    }
    set({ isLoading: true, error: null }); // أو isLoading: true for the specific item
    try {
      const newTodo = await todoAppService.createTodo(todoInput, idToken);
      set((state) => ({
        todos: [newTodo, ...state.todos], // 新しいTodoをリストの先頭に追加
        isLoading: false,
      }));
      return newTodo;
    } catch (err: any) {
      set({ error: err, isLoading: false });
      return null;
    }
  },

  updateTodo: async (todoId: string, todoInput: UpdateTodoInput) => {
    const idToken = get()._getIdToken();
    if (!idToken) {
      set({ error: new Error('Not authenticated') });
      return null;
    }
    // set({ isLoading: true, error: null }); // 全体ローディングにするか、項目ごとにするか
    try {
      const updatedTodo = await todoAppService.updateTodo(todoId, todoInput, idToken);
      set((state) => ({
        todos: state.todos.map((todo) =>
          todo.todoId === todoId ? { ...todo, ...updatedTodo } : todo // 更新された内容でマージ
        ),
        // isLoading: false,
      }));
      return updatedTodo;
    } catch (err: any) {
      set({ error: err /*, isLoading: false */ });
      return null;
    }
  },

  deleteTodo: async (todoId: string) => {
    const idToken = get()._getIdToken();
    if (!idToken) {
      set({ error: new Error('Not authenticated') });
      return;
    }
    // Optimistic update: UIから即座に削除
    const originalTodos = get().todos;
    set(state => ({
        todos: state.todos.filter(todo => todo.todoId !== todoId)
    }));

    try {
      await todoAppService.deleteTodo(todoId, idToken);
      // 成功時は何もしない (すでにUIは更新済み)
    } catch (err: any) {
      set({ error: err, todos: originalTodos }); // エラー時は元に戻す
    }
  },

  toggleTodo: async (todoId: string, currentCompletedStatus: boolean) => {
    const idToken = get()._getIdToken();
    if (!idToken) {
      set({ error: new Error('Not authenticated') });
      return null;
    }
     // Optimistic update
    set(state => ({
        todos: state.todos.map(todo =>
            todo.todoId === todoId ? { ...todo, completed: !todo.completed } : todo
        )
    }));

    try {
      // `completed` だけでなく、更新された日時なども返ってくる想定
      const updatedTodo = await todoAppService.toggleTodoCompletion(todoId, currentCompletedStatus, idToken);
      // APIからのレスポンスで再度状態を更新 (updatedAtなどを反映)
      set((state) => ({
        todos: state.todos.map((todo) =>
          todo.todoId === todoId ? updatedTodo : todo
        ),
      }));
      return updatedTodo;
    } catch (err: any) {
      // エラー時は元に戻す
      set(state => ({
        todos: state.todos.map(todo =>
            todo.todoId === todoId ? { ...todo, completed: currentCompletedStatus } : todo // 元の状態に戻す
        ),
        error: err
      }));
      return null;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

// 初期データフェッチのトリガー (ページコンポーネントのuseEffect内で行うのが一般的)
// useTodoStore.getState().fetchTodos();
