import { Todo, CreateTodoInput, UpdateTodoInput, TodoRepository } from '../domain/todo';
// import { getSessionTokens } from './authService'; // authServiceからトークン取得関数をインポート

/**
 * Todoアプリケーションサービス
 * TodoRepositoryの実装は注入される（DI）
 */
export class TodoApplicationService {
  private todoRepository: TodoRepository;

  constructor(todoRepository: TodoRepository) {
    this.todoRepository = todoRepository;
  }

  /**
   * 新しいTodoを作成する
   * @param todoInput 作成するTodoの情報
   * @param idToken ユーザー認証トークン
   * @returns 作成されたTodo
   */
  async createTodo(todoInput: CreateTodoInput, idToken: string): Promise<Todo> {
    if (!idToken) {
      throw new Error('Authentication token is required to create a todo.');
    }
    // バリデーションやビジネスロジックをここに追加可能
    if (!todoInput.title || todoInput.title.trim() === '') {
      throw new Error('Title is required.');
    }
    const newTodo = await this.todoRepository.create(todoInput, idToken);
    return newTodo;
  }

  /**
   * ログインユーザーの全てのTodoを取得する
   * @param idToken ユーザー認証トークン
   * @returns Todoの配列
   */
  async getMyTodos(idToken: string): Promise<Todo[]> {
    if (!idToken) {
      throw new Error('Authentication token is required to get todos.');
    }
    const todos = await this.todoRepository.getAll(idToken);
    // 必要であれば、ここで取得したTodoリストに対する処理（ソートなど）を追加
    return todos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * 指定されたIDのTodoを更新する
   * @param todoId 更新するTodoのID
   * @param todoInput 更新内容
   * @param idToken ユーザー認証トークン
   * @returns 更新されたTodo
   */
  async updateTodo(todoId: string, todoInput: UpdateTodoInput, idToken: string): Promise<Todo> {
    if (!idToken) {
      throw new Error('Authentication token is required to update a todo.');
    }
    if (Object.keys(todoInput).length === 0) {
      throw new Error('No update data provided.');
    }
    // ここで更新内容のバリデーションなどを行う
    const updatedTodo = await this.todoRepository.update(todoId, todoInput, idToken);
    return updatedTodo;
  }

  /**
   * 指定されたIDのTodoを削除する
   * @param todoId 削除するTodoのID
   * @param idToken ユーザー認証トークン
   */
  async deleteTodo(todoId: string, idToken: string): Promise<void> {
    if (!idToken) {
      throw new Error('Authentication token is required to delete a todo.');
    }
    await this.todoRepository.deleteById(todoId, idToken);
  }

  /**
   * Todoの完了状態をトグルする
   * @param todoId トグルするTodoのID
   * @param completed 現在の完了状態
   * @param idToken ユーザー認証トークン
   * @returns 更新されたTodo
   */
  async toggleTodoCompletion(todoId: string, completed: boolean, idToken: string): Promise<Todo> {
    if (!idToken) {
        throw new Error('Authentication token is required to update a todo.');
    }
    const updatedTodo = await this.todoRepository.update(todoId, { completed: !completed }, idToken);
    return updatedTodo;
  }
}

// TodoRepositoryの具体的な実装はインフラストラクチャ層で定義し、
// アプリケーションのエントリーポイントに近い場所でこのサービスに注入する。
// 例:
// import { ApiTodoRepository } from '../infrastructure/api/apiTodoRepository';
// const apiTodoRepository = new ApiTodoRepository('YOUR_API_ENDPOINT');
// export const todoAppService = new TodoApplicationService(apiTodoRepository);

// 今回は、UI層で直接インスタンス化するか、Context APIやDIコンテナを使って注入することを想定。
