# TODO App Backend

このプロジェクトは、TODO アプリケーションのバックエンド API を提供します。AWS Lambda と DynamoDB を使用して構築されています。

## ローカル開発環境

ローカルマシンで Lambda 関数をテストおよびデバッグするために、DynamoDB Local とカスタム呼び出しスクリプトを使用できます。

### 前提条件

- Node.js (プロジェクトの `package.json` で指定されているバージョン)
- pnpm (または npm/yarn)
- Docker および Docker Compose (DynamoDB Local を実行するため)

### セットアップ

1.  **依存関係のインストール:**
    プロジェクトのルートディレクトリ (`todo-app/backend`) で以下のコマンドを実行します。
    ```bash
    pnpm install
    ```

2.  **環境変数の設定:**
    `.env.example` ファイルをコピーして `.env` という名前の新しいファイルを作成します。
    ```bash
    cp .env.example .env
    ```
    必要に応じて `.env` ファイル内の値を編集します。特に `TODO_TABLE_NAME` は、ローカルの DynamoDB で使用するテーブル名と一致している必要があります。`docker-compose.yml` で指定されているボリュームやデータパスによっては、テーブルを手動で作成する必要がある場合もあります。

3.  **TypeScript のビルド:**
    Lambda 関数は TypeScript で記述されているため、実行前に JavaScript にコンパイルする必要があります。
    ```bash
    pnpm build
    ```
    開発中は、変更を監視して自動的に再ビルドするために、`tsc -w` を別のターミナルで実行することもできます。

### DynamoDB Local の実行

ローカルテストには DynamoDB Local が必要です。以下のスクリプトを使用して Docker コンテナを管理します。

-   **DynamoDB Local の起動:**
    ```bash
    pnpm db:start
    ```
    これにより、`../localdb/docker-compose.yml` に基づいて DynamoDB Local がバックグラウンドで起動します。データは `./todo-app/localdb/docker/dynamodb` ディレクトリに永続化されます（`docker-compose.yml` の設定による）。

-   **DynamoDB Local の停止:**
    ```bash
    pnpm db:stop
    ```

-   **（オプション）テーブルの作成:**
    DynamoDB Local を初めて起動したとき、またはデータがクリアされた場合は、テーブルを手動で作成する必要があるかもしれません。AWS CLI を使用してローカルエンドポイントに対してテーブルを作成できます。
    例:
    ```bash
    aws dynamodb create-table \
        --table-name Todos \
        --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=todoId,AttributeType=S \
        --key-schema AttributeName=userId,KeyType=HASH AttributeName=todoId,KeyType=RANGE \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --endpoint-url http://localhost:8000
    ```
    `TODO_TABLE_NAME` 環境変数と一致するテーブル名を使用してください。

### Lambda 関数のローカル実行 (AWS SAM Local を使用)

AWS SAM Local を使用すると、ローカルマシン上で API Gateway をエミュレートし、Lambda 関数を HTTP リクエスト経由でテストできます。これにより、フロントエンドアプリケーションからの API コールをローカルで検証できます。

**前提条件 (追加):**
- AWS SAM CLI (インストール方法は[公式ドキュメント](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)を参照)
- Docker および Docker Compose (DynamoDB Local および SAM Local の実行に必要)

**セットアップ (SAM Local向け):**

1.  **`template.yaml` の作成:**
    プロジェクトのルート (`todo-app/backend`) に、API Gateway のエンドポイントと Lambda 関数を定義する `template.yaml` ファイルを作成します。このファイルは、SAM がローカルで API をエミュレートするために使用されます。
    ```yaml
    AWSTemplateFormatVersion: '2010-09-09'
    Transform: AWS::Serverless-2016-10-31
    Description: todo-app backend

    Globals:
      Function:
        Timeout: 10
        MemorySize: 128
        Runtime: nodejs20.x # プロジェクトのNode.jsバージョンに合わせて調整
        Environment:
          Variables:
            TODO_TABLE_NAME: Todos # .envの値と一致させる
            AWS_NODEJS_CONNECTION_REUSE_ENABLED: 1

    Resources:
      CreateTodoFunction:
        Type: AWS::Serverless::Function
        Properties:
          CodeUri: ./
          Handler: dist/src/handlers/createTodo.handler
          Events:
            CreateTodo:
              Type: Api
              Properties:
                Path: /todos
                Method: post
      # 他のLambda関数 (GetTodos, UpdateTodo, DeleteTodo) も同様に定義
      # 例: GetTodosFunction, UpdateTodoFunction, DeleteTodoFunction

    Outputs:
      ApiGatewayEndpoint:
        Description: "API Gateway endpoint URL for local stage"
        Value: "http://localhost:3000" # sam local start-api のデフォルト
    ```
    完全な `template.yaml` の例はプロジェクト内のファイルを参照してください。

2.  **`.env.json` の作成:**
    SAM Local が Lambda 関数に環境変数を渡すために、`.env.json` ファイルを作成します。これは `.env` ファイルを元に関数ごとの環境変数をJSON形式で記述したものです。
    例 (`.env.json`):
    ```json
    {
      "CreateTodoFunction": {
        "TODO_TABLE_NAME": "Todos",
        "DYNAMODB_ENDPOINT_URL": "http://localhost:8000"
      },
      "GetTodosFunction": { /* ... */ },
      "UpdateTodoFunction": { /* ... */ },
      "DeleteTodoFunction": { /* ... */ }
    }
    ```
    `DYNAMODB_ENDPOINT_URL` は、ローカルの DynamoDB を使用する場合に設定します。

3.  **`package.json` へのスクリプト追加:**
    `sam local start-api` を簡単に実行できるように、`package.json` の `scripts` にコマンドを追加します。
    ```json
    "scripts": {
      // ...
      "sam:local": "sam local start-api --env-vars .env.json --warm-containers EAGER"
    }
    ```

**ローカル実行手順:**

1.  **依存関係のインストールとビルド:**
    ```bash
    pnpm install
    pnpm build
    ```
2.  **DynamoDB Local の起動 (必要な場合):**
    Docker がインストールされていれば、`pnpm db:start` で DynamoDB Local を起動できます。
    ```bash
    pnpm db:start
    ```
    初回起動時やデータがない場合は、テーブル作成が必要な場合があります (README の「DynamoDB Local の実行」セクション参照)。
3.  **SAM Local API Gateway の起動:**
    ```bash
    pnpm sam:local
    ```
    これにより、デフォルトで `http://localhost:3000` で API Gateway が起動します。

4.  **フロントエンドからの接続:**
    フロントエンドアプリケーション (`./todo-app/frontend`) の API 設定 (`src/config/apiConfig.ts` など) で、API のベース URL を `http://localhost:3000` に設定します。
    これで、フロントエンドから行われた API リクエストは、ローカルで実行されている Lambda 関数にルーティングされます。

### 注意事項 (SAM Local)

-   **必要なツール:** AWS SAM CLI と Docker がローカルマシンに正しくインストールされ、設定されている必要があります。
-   **DynamoDB Local:** Lambda 関数が DynamoDB を使用する場合、DynamoDB Local を起動し、必要に応じてテーブルを作成し、Lambda 関数がローカルエンドポイント (`http://localhost:8000`) を向くように環境変数 (`DYNAMODB_ENDPOINT_URL`) を設定する必要があります。
-   **ホットリロード:** `sam local start-api` は、コード変更時の自動リロード機能が限定的です。コードを変更した場合は、SAM Local を再起動するか、`--warm-containers LAZY` などのオプションを検討してください。
-   **認証・認可:** API Gateway の認証・認可メカニズム (例: Cognito Authorizer) は、`sam local start-api` では完全にはエミュレートされない場合があります。テスト用のトークンやモックを使用する必要があるかもしれません。

## デプロイ

（ここにデプロイ手順を追加します。例: AWS SAM, Serverless Framework, AWS CDK など）

## TODO

（将来的な改善点や未実装の機能など）
- 他の Lambda 関数のための `dev:*` スクリプトとイベントファイルの追加。
- より高度なローカルテストのために AWS SAM Local や Serverless Offline の導入を検討。
