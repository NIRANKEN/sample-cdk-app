import axios, { AxiosInstance, AxiosError } from "axios";
import {
  Todo,
  CreateTodoInput,
  UpdateTodoInput,
  TodoRepository,
} from "../../domain/todo";
import { apiConfig } from "../../config/apiConfig";

// バックエンドAPIから返されるエラーの型 (例)
interface ApiErrorResponse {
  message: string;
  // 他のエラー詳細フィールド
}

export class ApiTodoRepository implements TodoRepository {
  private apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create({
      baseURL: `${apiConfig.baseUrl}/todos`, // API Gatewayの /todos エンドポイント
      // timeout: 5000, // 必要に応じてタイムアウト設定
    });

    // リクエストインターセプター: 認証ヘッダーを追加
    this.apiClient.interceptors.request.use(
      (config) => {
        // idTokenは各メソッドの引数で渡されるため、ここでは何もしないか、
        // config.headers.Authorization に設定されていることを確認する程度。
        // このインターセプターは、全てのAPIリクエストに共通のヘッダーを追加する場合に有用。
        // 今回は各メソッドで idToken をヘッダーに設定する。
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // レスポンスインターセプター: エラーハンドリング (オプション)
    this.apiClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiErrorResponse>) => {
        if (error.response) {
          // サーバーからのエラーレスポンス (例: 4xx, 5xx)
          console.error("API Error:", error.response.data);
          // 独自のエラーオブジェクトにラップしてスローすることも可能
          throw new Error(
            error.response.data.message || "An API error occurred"
          );
        } else if (error.request) {
          // リクエストは行われたがレスポンスがない (例: ネットワークエラー)
          console.error("Network Error:", error.request);
          throw new Error("Network error, please try again.");
        } else {
          // リクエスト設定時のエラー
          console.error("Request Setup Error:", error.message);
          throw new Error("Error setting up the request.");
        }
        // return Promise.reject(error); // オリジナルのAxiosErrorをスローする場合
      }
    );
  }

  private getAuthHeaders(idToken: string) {
    return {
      // Authorization: `Bearer ${idToken}`,
      Authorization: "allow", // ローカル開発用のテストトークン
      // 'Content-Type': 'application/json', // POST, PUTではaxiosが自動で設定する場合が多い
    };
  }

  async create(todoInput: CreateTodoInput, idToken: string): Promise<Todo> {
    try {
      const response = await this.apiClient.post<Todo>("", todoInput, {
        headers: this.getAuthHeaders(idToken),
      });
      return response.data;
    } catch (error) {
      // インターセプターで処理済みの場合、ここは通らないか、ラップされたエラーが来る
      console.error("Create Todo Failed:", error);
      throw error; // 再スローして上位のサービス層で処理
    }
  }

  async getAll(idToken: string): Promise<Todo[]> {
    try {
      const response = await this.apiClient.get<Todo[]>("", {
        headers: this.getAuthHeaders(idToken),
      });
      // バックエンドAPIが { items: Todo[] } のような形式で返す場合はここで調整
      // return response.data.items || response.data;
      return response.data;
    } catch (error) {
      console.error("Get All Todos Failed:", error);
      throw error;
    }
  }

  async update(
    todoId: string,
    todoInput: UpdateTodoInput,
    idToken: string
  ): Promise<Todo> {
    try {
      const response = await this.apiClient.put<Todo>(`/${todoId}`, todoInput, {
        headers: this.getAuthHeaders(idToken),
      });
      return response.data;
    } catch (error) {
      console.error(`Update Todo Failed (id: ${todoId}):`, error);
      throw error;
    }
  }

  async deleteById(todoId: string, idToken: string): Promise<void> {
    try {
      await this.apiClient.delete<void>(`/${todoId}`, {
        headers: this.getAuthHeaders(idToken),
      });
    } catch (error) {
      console.error(`Delete Todo Failed (id: ${todoId}):`, error);
      throw error;
    }
  }
}

// ApiTodoRepositoryのインスタンス (シングルトンとしてエクスポートも可能)
// export const apiTodoRepository = new ApiTodoRepository();
// ただし、baseURLが動的に変わる可能性がある場合やテストの容易さを考えると、
// アプリケーションサービスにDIする際にインスタンス化する方が柔軟性が高い。
