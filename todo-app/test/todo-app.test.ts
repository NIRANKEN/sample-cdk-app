import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as TodoApp from '../lib/todo-app-stack';

describe('TodoAppStack CDK Tests', () => {
  let app: cdk.App;
  let stack: TodoApp.TodoAppStack;
  let template: Template;

  beforeAll(() => {
    app = new cdk.App();
    // WHEN
    stack = new TodoApp.TodoAppStack(app, 'MyTestStack');
    // THEN
    template = Template.fromStack(stack);
  });

  test('Cognito UserPool and Client Created', () => {
    template.resourceCountIs('AWS::Cognito::UserPool', 1);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserPoolName: 'TodoAppUserPool',
      SignInAliases: { Email: true, Username: false },
    });
    template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      UserPoolClientName: 'TodoAppWebClient',
    });
  });

  test('DynamoDB Table Created', () => {
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'TodoAppTableCDK',
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },
        { AttributeName: 'todoId', KeyType: 'RANGE' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    });
  });

  test('API Gateway (HTTP API) and Lambda Functions Created', () => {
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      Name: 'TodoAppHttpApi-CDK',
    });
    // Check for at least one Lambda function (e.g., CreateTodo)
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'TodoApp-CreateTodo-CDK',
    });
    // More specific tests for each Lambda and route can be added
  });

  test('Amplify App and Branch Created with Correct Settings', () => {
    template.resourceCountIs('AWS::Amplify::App', 1);
    template.hasResourceProperties('AWS::Amplify::App', {
      Name: 'todo-app-frontend-nextjs',
      Platform: 'WEB_COMPUTE',
      // BuildSpec is a string, so exact match or contains can be tricky.
      // Check for a key part of the buildSpec:
      BuildSpec: Match.stringLikeRegexp('pnpm install --frozen-lockfile'),
      EnvironmentVariables: Match.arrayWith([
        { Name: 'NEXT_PUBLIC_COGNITO_USER_POOL_ID', Value: Match.anyValue() }, // Check specific value if needed via Fn::GetAtt or Ref
        { Name: 'NEXT_PUBLIC_COGNITO_CLIENT_ID', Value: Match.anyValue() },
        { Name: 'NEXT_PUBLIC_API_BASE_URL', Value: Match.anyValue() },
        { Name: 'NEXT_PUBLIC_AWS_REGION', Value: Match.anyValue() },
        { Name: 'AWS_REGION', Value: Match.anyValue() },
        { Name: 'COGNITO_USER_POOL_ID', Value: Match.anyValue() },
      ]),
    });

    template.resourceCountIs('AWS::Amplify::Branch', 1);
    template.hasResourceProperties('AWS::Amplify::Branch', {
      // AppId requires resolving the Ref, which is complex here.
      // Check BranchName and Stage as simpler proxies.
      BranchName: 'main',
      Stage: 'PRODUCTION',
    });
  });

  test('S3 Bucket for Frontend Hosting NOT Created', () => {
    const s3Buckets = template.findResources('AWS::S3::Bucket');
    let frontendBucketFound = false;
    for (const bucketId in s3Buckets) {
      // Check for a bucket that might have been our frontend bucket
      // This is a heuristic; more specific naming conventions or tags would make this more robust.
      // For this test, we assume no other S3 buckets are created by this stack,
      // or if they are, they have distinct properties.
      // A simpler check if NO S3 buckets are expected at all for frontend:
      // template.resourceCountIs('AWS::S3::Bucket', 0); (Adjust if other buckets exist)

      // Since we don't know the exact generated name of the old bucket anymore,
      // we rely on the fact that we removed its definition.
      // A more direct test is that the logical ID 'FrontendBucket' is gone.
      // However, `findResources` works on resource types.
      // A lack of any bucket named like `todo-app-frontend-bucket-*` could be an indicator,
      // but that's prone to false positives if other buckets exist.
      // The most straightforward way is to ensure no bucket has website configuration.
      if (s3Buckets[bucketId].Properties && s3Buckets[bucketId].Properties.WebsiteConfiguration) {
        frontendBucketFound = true;
        break;
      }
    }
    expect(frontendBucketFound).toBe(false);
    // Or, more simply, if you know the logical ID used for the bucket:
    // expect(template.findResources('AWS::S3::Bucket', {
    //   LogicalResourceId: 'FrontendBucket' // This is not how findResources works; it needs properties.
    // })).toEqual({}); // This check is not right.

    // Better: Ensure no bucket has website hosting enabled.
    template.allResourcesProperties('AWS::S3::Bucket', {
        WebsiteConfiguration: Match.absent()
    });

  });

  test('CloudFront Distribution for Frontend Hosting NOT Created', () => {
    template.resourceCountIs('AWS::CloudFront::Distribution', 0);
  });
});
