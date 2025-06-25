import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2_authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigwv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as s3_deployment from 'aws-cdk-lib/aws-s3-deployment'; // s3-deployment モジュールをインポート

export class TodoAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'TodoAppUserPool', {
      userPoolName: 'TodoAppUserPool',
      signInAliases: {
        email: true,
        username: false, // Eメールをユーザー名として使用
      },
      selfSignUpEnabled: true,
      autoVerify: {
        email: true, // Eメール検証を有効化
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false, // 簡単のためシンボルは不要に
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // デモ用。本番では RETAIN or SNAPSHOT
    });

    // User Pool Client
    const userPoolClient = userPool.addClient('TodoAppUserPoolClient', {
      userPoolClientName: 'TodoAppWebClient',
      authFlows: {
        userSrp: true, // Secure Remote Password protocol
        // adminUserPassword: true, // 必要に応じて
      },
      preventUserExistenceErrors: true, // ユーザー存在エラーを隠蔽
      // generateSecret: false, // Webクライアントなのでシークレットは不要
    });

    // Output the User Pool ID and Client ID
    new cdk.CfnOutput(this, 'UserPoolIdOutput', {
      value: userPool.userPoolId,
      description: 'User Pool ID for the Todo App',
    });

    new cdk.CfnOutput(this, 'UserPoolClientIdOutput', {
      value: userPoolClient.userPoolClientId,
      description: 'User Pool Client ID for the Todo App web client',
    });

    // S3 Bucket for Frontend Hosting
    const frontendBucket = new cdk.aws_s3.Bucket(this, 'FrontendBucket', {
      bucketName: `todo-app-frontend-bucket-${this.account}-${this.region}`, // 一意なバケット名
      publicReadAccess: false, // パブリックアクセスはさせない
      blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL, // すべてのパブリックアクセスをブロック
      removalPolicy: cdk.RemovalPolicy.DESTROY, // デモ用。本番では RETAIN
      autoDeleteObjects: true, // バケット削除時にオブジェクトも削除 (デモ用)
      websiteIndexDocument: 'index.html', // CloudFrontから参照されるが直接は使わない
      websiteErrorDocument: 'index.html', // SPAのためエラー時もindex.html
    });

    // Output the S3 Bucket Name
    new cdk.CfnOutput(this, 'FrontendBucketNameOutput', {
      value: frontendBucket.bucketName,
      description: 'S3 Bucket name for frontend hosting',
    });

    // CloudFront Distribution
    const originAccessIdentity = new cdk.aws_cloudfront.OriginAccessIdentity(this, 'OAI');
    frontendBucket.grantRead(originAccessIdentity); // S3バケットへの読み取り権限をOAIに付与

    const distribution = new cdk.aws_cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new cdk.aws_cloudfront_origins.S3Origin(frontendBucket, {
          originAccessIdentity: originAccessIdentity,
        }),
        viewerProtocolPolicy: cdk.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cdk.aws_cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cdk.aws_cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
      },
      // SPAのため、403, 404エラーは index.html にフォールバック
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(0),
        },
      ],
      priceClass: cdk.aws_cloudfront.PriceClass.PRICE_CLASS_200, // または PRICE_CLASS_ALL
      removalPolicy: cdk.RemovalPolicy.DESTROY, // デモ用
    });

    // Output the CloudFront Distribution Domain Name
    new cdk.CfnOutput(this, 'CloudFrontDomainNameOutput', {
      value: distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
    });

    // DynamoDB Table for Todos
    const todoTable = new cdk.aws_dynamodb.Table(this, 'TodoTable', {
      tableName: 'TodoAppTable',
      partitionKey: { name: 'userId', type: cdk.aws_dynamodb.AttributeType.STRING },
      sortKey: { name: 'todoId', type: cdk.aws_dynamodb.AttributeType.STRING },
      billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // デモ用。本番では RETAIN or SNAPSHOT
      // stream: cdk.aws_dynamodb.StreamViewType.NEW_AND_OLD_IMAGES, // 必要に応じて
    });

    // Output the DynamoDB Table Name
    new cdk.CfnOutput(this, 'DynamoDBTableNameOutput', {
      value: todoTable.tableName,
      description: 'DynamoDB Table name for Todos',
    });

    // Lambda Functions Layer (もし共通処理やライブラリがあれば)
    // const commonLambdaLayer = new cdk.aws_lambda.LayerVersion(this, 'CommonLambdaLayer', {
    //   code: cdk.aws_lambda.Code.fromAsset('backend/layer'), // 'backend/layer' に共通モジュールを配置
    //   compatibleRuntimes: [cdk.aws_lambda.Runtime.NODEJS_20_X],
    //   description: 'Common utilities for Lambda functions',
    // });

    // Lambda Functions
    const lambdaExecutionRole = new cdk.aws_iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    todoTable.grantReadWriteData(lambdaExecutionRole); // DynamoDBテーブルへの読み書き権限を付与

    const defaultLambdaProps = {
      runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
      // code: cdk.aws_lambda.Code.fromAsset('backend/dist'), // ビルド後のJSファイルがあるディレクトリ
      // layers: [commonLambdaLayer], // 必要であれば
      role: lambdaExecutionRole,
      environment: {
        TODO_TABLE_NAME: todoTable.tableName,
        // NODE_OPTIONS: '--enable-source-maps', // ソースマップを有効にする場合
      },
      timeout: cdk.Duration.seconds(10),
    };

    // CreateTodo Lambda
    const createTodoLambda = new cdk.aws_lambda_nodejs.NodejsFunction(this, 'CreateTodoLambda', {
      ...defaultLambdaProps,
      entry: 'backend/src/handlers/createTodo.ts', // Lambdaハンドラーのエントリポイント
      handler: 'handler',
      functionName: 'TodoApp-CreateTodo',
    });

    // GetTodos Lambda
    const getTodosLambda = new cdk.aws_lambda_nodejs.NodejsFunction(this, 'GetTodosLambda', {
      ...defaultLambdaProps,
      entry: 'backend/src/handlers/getTodos.ts',
      handler: 'handler',
      functionName: 'TodoApp-GetTodos',
    });

    // UpdateTodo Lambda
    const updateTodoLambda = new cdk.aws_lambda_nodejs.NodejsFunction(this, 'UpdateTodoLambda', {
      ...defaultLambdaProps,
      entry: 'backend/src/handlers/updateTodo.ts',
      handler: 'handler',
      functionName: 'TodoApp-UpdateTodo',
    });

    // DeleteTodo Lambda
    const deleteTodoLambda = new cdk.aws_lambda_nodejs.NodejsFunction(this, 'DeleteTodoLambda', {
      ...defaultLambdaProps,
      entry: 'backend/src/handlers/deleteTodo.ts',
      handler: 'handler',
      functionName: 'TodoApp-DeleteTodo',
    });

    // Output Lambda Function Names (optional)
    new cdk.CfnOutput(this, 'CreateTodoLambdaNameOutput', { value: createTodoLambda.functionName });
    new cdk.CfnOutput(this, 'GetTodosLambdaNameOutput', { value: getTodosLambda.functionName });
    new cdk.CfnOutput(this, 'UpdateTodoLambdaNameOutput', { value: updateTodoLambda.functionName });
    new cdk.CfnOutput(this, 'DeleteTodoLambdaNameOutput', { value: deleteTodoLambda.functionName });

    // API Gateway (HTTP API)
    const httpApi = new cdk.aws_apigatewayv2.HttpApi(this, 'TodoAppHttpApi', {
      apiName: 'TodoAppHttpApi',
      description: 'HTTP API for Todo App',
      corsPreflight: { // CORS設定
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
        allowMethods: [
          cdk.aws_apigatewayv2.CorsHttpMethod.OPTIONS,
          cdk.aws_apigatewayv2.CorsHttpMethod.GET,
          cdk.aws_apigatewayv2.CorsHttpMethod.POST,
          cdk.aws_apigatewayv2.CorsHttpMethod.PUT,
          cdk.aws_apigatewayv2.CorsHttpMethod.DELETE,
        ],
        allowOrigins: ['*'], // 本番ではCloudFrontのドメインなどに制限
        maxAge: cdk.Duration.days(1),
      },
    });

    // Cognito Authorizer for HTTP API
    const authorizer = new cdk.aws_apigatewayv2_authorizers.HttpUserPoolAuthorizer('CognitoAuthorizer', userPool, {
      userPoolClients: [userPoolClient],
      identitySource: ['$request.header.Authorization'], // 'Bearer <token>' 形式のヘッダーを期待
    });

    // Lambda Integrations
    const createTodoIntegration = new cdk.aws_apigatewayv2_integrations.HttpLambdaIntegration('CreateTodoIntegration', createTodoLambda);
    const getTodosIntegration = new cdk.aws_apigatewayv2_integrations.HttpLambdaIntegration('GetTodosIntegration', getTodosLambda);
    const updateTodoIntegration = new cdk.aws_apigatewayv2_integrations.HttpLambdaIntegration('UpdateTodoIntegration', updateTodoLambda);
    const deleteTodoIntegration = new cdk.aws_apigatewayv2_integrations.HttpLambdaIntegration('DeleteTodoIntegration', deleteTodoLambda);

    // Routes
    httpApi.addRoutes({
      path: '/todos',
      methods: [cdk.aws_apigatewayv2.HttpMethod.POST],
      integration: createTodoIntegration,
      authorizer: authorizer,
    });

    httpApi.addRoutes({
      path: '/todos',
      methods: [cdk.aws_apigatewayv2.HttpMethod.GET],
      integration: getTodosIntegration,
      authorizer: authorizer,
    });

    httpApi.addRoutes({
      path: '/todos/{todoId}',
      methods: [cdk.aws_apigatewayv2.HttpMethod.PUT],
      integration: updateTodoIntegration,
      authorizer: authorizer,
    });

    httpApi.addRoutes({
      path: '/todos/{todoId}',
      methods: [cdk.aws_apigatewayv2.HttpMethod.DELETE],
      integration: deleteTodoIntegration,
      authorizer: authorizer,
    });

    // Output the API Gateway URL
    new cdk.CfnOutput(this, 'ApiGatewayUrlOutput', {
      value: httpApi.url!,
      description: 'API Gateway URL',
    });

    // S3 Bucket Deployment for Frontend
    new cdk.aws_s3_deployment.BucketDeployment(this, 'DeployFrontend', {
      sources: [cdk.aws_s3_deployment.Source.asset('../frontend/build')], // ルートからの相対パス
      destinationBucket: frontendBucket,
      distribution: distribution, // CloudFrontディストリビューションを指定
      distributionPaths: ['/*'], // キャッシュを無効化するパス
      // memoryLimit: 1024, // ビルド資材が大きい場合はメモリを増やす
      // ephemeralStorageSize: cdk.Size.gibibytes(2), // 必要に応じて
      removalPolicy: cdk.RemovalPolicy.DESTROY, // スタック削除時にデプロイされたオブジェクトも削除
    });
  }
}
