/**
 * Todoエンティティ
 */
export interface Todo {
  todoId: string; // パーティションキーの一部 (バックエンドでuserIdと組み合わせて使われる)
  userId: string; // どのユーザーのTODOか (バックエンドで設定される想定)
  title: string;
  description?: string; // オプショナル
  completed: boolean;
  createdAt: string; // ISO 8601形式の文字列を想定
  updatedAt: string; // ISO 8601形式の文字列を想定
}

/**
 * Todoエンティティの作成時に必要なデータ型 (IDや日時は自動生成されるため除外)
 * userIdもバックエンドで設定される想定なので、フロントからの作成時には不要
 */
export type CreateTodoInput = Omit<Todo, 'todoId' | 'userId' | 'createdAt' | 'updatedAt' | 'completed'> & {
  completed?: boolean; // 作成時に指定できるようにする (デフォルトはfalse)
};


/**
 * Todoエンティティの更新時に必要なデータ型
 * todoIdは必須、他はオプショナル
 */
export type UpdateTodoInput = Partial<Omit<Todo, 'todoId' | 'userId' | 'createdAt' | 'updatedAt'>> & {
  // completed?: boolean; // Partialに含まれる
  // title?: string; // Partialに含まれる
  // description?: string; // Partialに含まれる
};


/**
 * Todoリポジトリのインターフェース
 * バックエンドAPIとの通信を抽象化する
 */
export interface TodoRepository {
  /**
   * 新しいTodoを作成する
   * @param todoInput 作成するTodoの情報 (userIdはバックエンドで付与される)
   * @param idToken ユーザー認証トークン
   * @returns 作成されたTodoエンティティ
   */
  create(todoInput: CreateTodoInput, idToken: string): Promise<Todo>;

  /**
   * 指定されたユーザーの全てのTodoを取得する
   * @param idToken ユーザー認証トークン
   * @returns Todoエンティティの配列
   */
  getAll(idToken: string): Promise<Todo[]>;

  /**
   * 指定されたIDのTodoを更新する
   * @param todoId 更新するTodoのID
   * @param todoInput 更新内容
   * @param idToken ユーザー認証トークン
   * @returns 更新されたTodoエンティティ
   */
  update(todoId: string, todoInput: UpdateTodoInput, idToken: string): Promise<Todo>;

  /**
   * 指定されたIDのTodoを削除する
   * @param todoId 削除するTodoのID
   * @param idToken ユーザー認証トークン
   * @returns void
   */
  deleteById(todoId: string, idToken: string): Promise<void>;
}
