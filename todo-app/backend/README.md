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

### Lambda 関数のローカル実行

Lambda 関数をローカルで呼び出すためのスクリプトが提供されています。

1.  **ビルド:** TypeScript コードが JavaScript にコンパイルされていることを確認してください (`pnpm build`)。
2.  **DynamoDB Local の起動:** `pnpm db:start` が実行されていることを確認してください。
3.  **関数の呼び出し:**
    `package.json` の `scripts` セクションに、各関数を呼び出すための `dev:*` スクリプトが定義されています。
    例えば、`createTodo` 関数を呼び出すには:
    ```bash
    pnpm dev:createTodo
    ```
    このスクリプトは、`scripts/invoke-local.js` を使用して、指定されたハンドラー (`src/handlers/createTodo.handler`) を、対応するイベント JSON ファイル (`events/createTodoEvent.json`) の内容をペイロードとして実行します。環境変数は `.env` ファイルから読み込まれます。

    新しい Lambda 関数を追加したり、既存の関数の呼び出し方を変更したりする場合は、以下の手順に従います。
    *   `events/` ディレクトリに新しいイベント JSON ファイルを作成します。
    *   `package.json` の `scripts` セクションに新しい `dev:*` スクリプトを追加し、正しいハンドラパスとイベントファイルパスを指定します。
    *   必要に応じて `.env` ファイルに環境変数を追加します。

### 注意事項

-   `invoke-local.js` スクリプトは、完全な API Gateway や Lambda 環境をエミュレートするわけではありません。主にハンドラロジックと DynamoDB との連携をテストするためのものです。
-   認証や認可の側面は、ローカル実行では簡略化されています。`createTodoEvent.json` の中の `requestContext.authorizer.jwt.claims.sub` のように、テスト用のユーザーIDをイベントデータに含める必要があります。
-   ローカルでの実行パスは、ビルド後の JavaScript ファイル (`dist` ディレクトリではなく、`.js` を解決する `src` からの相対パス) を指すように `invoke-local.js` で調整されています。これは `tsconfig.json` の `outDir` 設定と `package.json` の `type: "module"` に依存します。

## デプロイ

（ここにデプロイ手順を追加します。例: AWS SAM, Serverless Framework, AWS CDK など）

## TODO

（将来的な改善点や未実装の機能など）
- 他の Lambda 関数のための `dev:*` スクリプトとイベントファイルの追加。
- より高度なローカルテストのために AWS SAM Local や Serverless Offline の導入を検討。
