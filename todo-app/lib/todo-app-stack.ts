import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda'; // aws_lambdaのインポートを追加
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2_authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigwv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as s3_deployment from 'aws-cdk-lib/aws-s3-deployment';

export class TodoAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool (今回は直接使用しないが、既存リソースとして残す)
    const userPool = new cognito.UserPool(this, 'TodoAppUserPool', {
      userPoolName: 'TodoAppUserPool',
      signInAliases: { email: true, username: false },
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = userPool.addClient('TodoAppUserPoolClient', {
      userPoolClientName: 'TodoAppWebClient',
      authFlows: { userSrp: true },
      preventUserExistenceErrors: true,
    });

    new cdk.CfnOutput(this, 'UserPoolIdOutput', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientIdOutput', { value: userPoolClient.userPoolClientId });

    // S3 Bucket for Frontend Hosting
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `todo-app-frontend-bucket-${this.account}-${this.region}`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
    });
    new cdk.CfnOutput(this, 'FrontendBucketNameOutput', { value: frontendBucket.bucketName });

    // CloudFront Distribution
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI');
    frontendBucket.grantRead(originAccessIdentity);

    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new cloudfront_origins.S3Origin(frontendBucket, { originAccessIdentity }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
      },
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.minutes(0) },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.minutes(0) },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
    });
    new cdk.CfnOutput(this, 'CloudFrontDomainNameOutput', { value: distribution.distributionDomainName });

    // DynamoDB Table for Todos
    const todoTable = new dynamodb.Table(this, 'TodoTable', {
      tableName: 'TodoAppTableCDK', // SAMのテーブル名と区別するため変更
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'todoId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    new cdk.CfnOutput(this, 'DynamoDBTableNameOutputCDK', { value: todoTable.tableName });

    // Lambda Execution Role
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });
    todoTable.grantReadWriteData(lambdaExecutionRole);

    const defaultLambdaProps = {
      runtime: lambda.Runtime.NODEJS_20_X, // lambda.Runtime を使用
      role: lambdaExecutionRole,
      environment: {
        TODO_TABLE_NAME: todoTable.tableName, // CDKで作成したテーブル名を参照
      },
      timeout: cdk.Duration.seconds(10),
      bundling: {
        minify: false,
        sourceMap: true,
      },
    };

    // Lambda Authorizer Function for HTTP API
    const authorizerLambda = new lambdaNodejs.NodejsFunction(this, 'AuthorizerLambda', {
      ...defaultLambdaProps,
      entry: 'backend/src/authorizer.ts',
      handler: 'handler',
      functionName: 'TodoApp-HttpApiAuthorizer',
    });

    // HTTP API Lambda Authorizer
    const httpLambdaAuthorizer = new apigwv2_authorizers.HttpLambdaAuthorizer('HttpLambdaAuthorizer', authorizerLambda, {
      authorizerName: 'HttpLambdaAuthorizer',
      responseTypes: [apigwv2_authorizers.HttpLambdaResponseType.IAM],
      identitySource: ['$request.header.Authorization'],
      resultsCacheTtl: cdk.Duration.seconds(0), // For development, disable cache
    });

    // CreateTodo Lambda
    const createTodoLambda = new lambdaNodejs.NodejsFunction(this, 'CreateTodoLambda', {
      ...defaultLambdaProps,
      entry: 'backend/src/handlers/createTodo.ts',
      handler: 'handler',
      functionName: 'TodoApp-CreateTodo-CDK',
    });

    // GetTodos Lambda
    const getTodosLambda = new lambdaNodejs.NodejsFunction(this, 'GetTodosLambda', {
      ...defaultLambdaProps,
      entry: 'backend/src/handlers/getTodos.ts',
      handler: 'handler',
      functionName: 'TodoApp-GetTodos-CDK',
    });

    // UpdateTodo Lambda
    const updateTodoLambda = new lambdaNodejs.NodejsFunction(this, 'UpdateTodoLambda', {
      ...defaultLambdaProps,
      entry: 'backend/src/handlers/updateTodo.ts',
      handler: 'handler',
      functionName: 'TodoApp-UpdateTodo-CDK',
    });

    // DeleteTodo Lambda
    const deleteTodoLambda = new lambdaNodejs.NodejsFunction(this, 'DeleteTodoLambda', {
      ...defaultLambdaProps,
      entry: 'backend/src/handlers/deleteTodo.ts',
      handler: 'handler',
      functionName: 'TodoApp-DeleteTodo-CDK',
    });

    // API Gateway (HTTP API)
    const httpApi = new apigwv2.HttpApi(this, 'TodoAppHttpApi', {
      apiName: 'TodoAppHttpApi-CDK',
      description: 'HTTP API for Todo App (CDK)',
      corsPreflight: {
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token', 'X-Amz-User-Agent'], // X-Amz-User-Agentを追加 (Cognito対策だったもの、念のため)
        allowMethods: [
          apigwv2.CorsHttpMethod.OPTIONS,
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
        ],
        allowOrigins: ['*'],
        maxAge: cdk.Duration.days(1),
      },
    });

    // Lambda Integrations
    const createTodoIntegration = new apigwv2_integrations.HttpLambdaIntegration('CreateTodoIntegration', createTodoLambda);
    const getTodosIntegration = new apigwv2_integrations.HttpLambdaIntegration('GetTodosIntegration', getTodosLambda);
    const updateTodoIntegration = new apigwv2_integrations.HttpLambdaIntegration('UpdateTodoIntegration', updateTodoLambda);
    const deleteTodoIntegration = new apigwv2_integrations.HttpLambdaIntegration('DeleteTodoIntegration', deleteTodoLambda);

    // Routes with new HttpLambdaAuthorizer
    httpApi.addRoutes({
      path: '/todos',
      methods: [apigwv2.HttpMethod.POST],
      integration: createTodoIntegration,
      authorizer: httpLambdaAuthorizer,
    });

    httpApi.addRoutes({
      path: '/todos',
      methods: [apigwv2.HttpMethod.GET],
      integration: getTodosIntegration,
      authorizer: httpLambdaAuthorizer,
    });

    httpApi.addRoutes({
      path: '/todos/{todoId}',
      methods: [apigwv2.HttpMethod.PUT],
      integration: updateTodoIntegration,
      authorizer: httpLambdaAuthorizer,
    });

    httpApi.addRoutes({
      path: '/todos/{todoId}',
      methods: [apigwv2.HttpMethod.DELETE],
      integration: deleteTodoIntegration,
      authorizer: httpLambdaAuthorizer,
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrlOutputCDK', { value: httpApi.url! });

    // S3 Bucket Deployment for Frontend
    new s3_deployment.BucketDeployment(this, 'DeployFrontendCDK', {
      sources: [s3_deployment.Source.asset('../frontend/build')], // Assuming frontend is in ../frontend/build
      destinationBucket: frontendBucket,
      distribution: distribution,
      distributionPaths: ['/*'],
    });
  }
}
