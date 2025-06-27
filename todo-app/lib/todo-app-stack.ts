import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
// import * as s3 from 'aws-cdk-lib/aws-s3'; // No longer needed for frontend hosting if using Amplify
// import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'; // No longer needed
// import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins'; // No longer needed
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2_authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigwv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
// import * as s3_deployment from 'aws-cdk-lib/aws-s3-deployment'; // No longer needed
import * as amplify from 'aws-cdk-lib/aws-amplify'; // Using L1 CfnApp, or L2 if available and suitable
// For advanced Next.js SSR features, aws-amplify-alpha might be needed.
// import { App as AmplifyApp, Platform } from '@aws-cdk/aws-amplify-alpha'; // Example if using alpha

export class TodoAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool (remains the same)
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
    new cdk.CfnOutput(this, 'AwsRegionOutput', { value: this.region });

    // API Gateway (HTTP API) - Moved Up
    const httpApi = new apigwv2.HttpApi(this, 'TodoAppHttpApi', {
      apiName: 'TodoAppHttpApi-CDK',
      description: 'HTTP API for Todo App (CDK)',
      corsPreflight: {
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token', 'X-Amz-User-Agent'],
        allowMethods: [
          apigwv2.CorsHttpMethod.OPTIONS,
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
        ],
        allowOrigins: ['*'], // Should be restricted in production
        maxAge: cdk.Duration.days(1),
      },
    });
    new cdk.CfnOutput(this, 'ApiGatewayUrlOutputCDK', { value: httpApi.url! });

    // --- Amplify App for Frontend Hosting ---
    // This uses CfnApp (L1 construct). For full local asset deployment & richer Next.js features,
    // consider aws-cdk-lib/aws-amplify-alpha's App construct (L2) if available and compatible.
    // This setup assumes you might connect a Git repository later or use Amplify CLI to publish.
    const amplifyApp = new amplify.CfnApp(this, 'TodoAmplifyApp', {
      name: 'todo-app-frontend-nextjs',
      platform: 'WEB_COMPUTE', // Essential for Next.js SSR/ISR/API Routes
      buildSpec: `
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - pnpm install --frozen-lockfile
    build:
      commands:
        - pnpm run build
  artifacts:
    baseDirectory: .next # Default for Next.js build output
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/* # Next.js build cache
`,
      // IMPORTANT: To deploy from local source code directly with CDK (without Git repo):
      // You would typically use the @aws-cdk/aws-amplify-alpha L2 construct's `code` property.
      // Since we are using CfnApp (L1) and cannot install alpha in sandbox,
      // the source code needs to be provided via a connected repository or by `amplify publish` CLI.
      // `repository` property is omitted here, implying manual connection or CLI usage.
      // repository: 'YOUR_GIT_REPO_URL_HERE', // Example if connecting to Git

      environmentVariables: [
        { name: 'NEXT_PUBLIC_COGNITO_USER_POOL_ID', value: userPool.userPoolId },
        { name: 'NEXT_PUBLIC_COGNITO_CLIENT_ID', value: userPoolClient.userPoolClientId },
        { name: 'NEXT_PUBLIC_API_BASE_URL', value: httpApi.url! }, // Ensure httpApi.url is available
        { name: 'NEXT_PUBLIC_AWS_REGION', value: this.region },
        // Server-side specific env vars (not prefixed with NEXT_PUBLIC_)
        // { name: 'AWS_REGION', value: this.region },
        // { name: 'COGNITO_USER_POOL_ID', value: userPool.userPoolId },
      ],
      // Optional: Add custom domain, access control, etc.
      // customRules: [{ source: '/<*>', target: '/index.html', status: '404-200' }], // For SPAs, less relevant for Next.js SSR
    });

    // It's good practice to define at least one branch, typically 'main' or your default.
    const mainBranch = new amplify.CfnBranch(this, 'MainBranch', {
      appId: amplifyApp.attrAppId,
      branchName: 'main', // Or your primary branch name
      stage: 'PRODUCTION', // Example stage
      // enableAutoBuild: true, // Set to true if repository is connected and auto-build is desired
    });

    new cdk.CfnOutput(this, 'AmplifyAppIdOutput', { value: amplifyApp.attrAppId });
    // The default domain for Amplify apps follows a pattern like: main.APP_ID.amplifyapp.com
    // However, it's best to check the Amplify console for the exact domain after deployment.
    // Using Fn.join to construct a probable domain.
    new cdk.CfnOutput(this, 'AmplifyAppDefaultDomain', {
      value: cdk.Fn.join('.', [mainBranch.branchName, amplifyApp.attrAppId, 'amplifyapp.com']),
      description: 'Default domain of the Amplify app. Verify in Amplify console as format can vary.',
    });
    // --- End Amplify App section ---


    // --- S3 Bucket and CloudFront for Frontend Hosting (REMOVED/COMMENTED OUT) ---
    /*
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
    */
    // --- End of S3/CloudFront section ---

    // DynamoDB Table for Todos (remains the same)
    const todoTable = new dynamodb.Table(this, 'TodoTable', {
      tableName: 'TodoAppTableCDK',
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
      runtime: lambda.Runtime.NODEJS_20_X,
      role: lambdaExecutionRole,
      environment: {
        TODO_TABLE_NAME: todoTable.tableName,
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
      resultsCacheTtl: cdk.Duration.seconds(0),
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

    // Lambda Integrations (moved up to be with httpApi definition)
    const createTodoIntegration = new apigwv2_integrations.HttpLambdaIntegration('CreateTodoIntegration', createTodoLambda);
    const getTodosIntegration = new apigwv2_integrations.HttpLambdaIntegration('GetTodosIntegration', getTodosLambda);
    const updateTodoIntegration = new apigwv2_integrations.HttpLambdaIntegration('UpdateTodoIntegration', updateTodoLambda);
    const deleteTodoIntegration = new apigwv2_integrations.HttpLambdaIntegration('DeleteTodoIntegration', deleteTodoLambda);

    // Routes with new HttpLambdaAuthorizer (moved up to be with httpApi definition)
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

    // S3 Bucket Deployment for Frontend (REMOVED)
    /*
    new s3_deployment.BucketDeployment(this, 'DeployFrontendCDK', {
      sources: [s3_deployment.Source.asset('../frontend/build')],
      destinationBucket: frontendBucket,
      distribution: distribution,
      distributionPaths: ['/*'],
    });
    */
  }
}
