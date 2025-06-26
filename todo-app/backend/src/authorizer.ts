import { APIGatewayRequestAuthorizerEventV2, APIGatewayAuthorizerResult, Handler } from 'aws-lambda';

export const handler: Handler<APIGatewayRequestAuthorizerEventV2 | any, APIGatewayAuthorizerResult> = async (
  event: APIGatewayRequestAuthorizerEventV2 | any // SAM Local用にanyも許容
): Promise<APIGatewayAuthorizerResult> => {
  console.log('Incoming authorizer event:', JSON.stringify(event, null, 2));

  let token: string | undefined;

  // HTTP API (V2) event structure
  if (event.headers) {
    token = event.headers.authorization ?? event.headers.Authorization;
  }
  // API Gateway REST API (V1 for SAM Local) event structure
  if (!token && event.authorizationToken) {
    token = event.authorizationToken;
  }

  console.log('Token:', token);

  const effect: 'Allow' | 'Deny' = token === 'allow' ? 'Allow' : 'Deny';
  // 認証されたユーザーのID。実際のアプリケーションではトークンから抽出します。
  const principalId = token === 'allow' ? 'user-allow' : 'user-deny';

  // リソースARNの決定:
  // HTTP API (V2) の場合は event.routeArn
  // API Gateway REST API (V1, SAM Local用) の場合は event.methodArn
  const resourceArn = event.routeArn || event.methodArn;

  if (!resourceArn) {
    console.error('Resource ARN (routeArn or methodArn) is missing in the event.');
    // デフォルトでDenyポリシーを返す
    return {
      principalId: 'unknown',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*', // 特定できないため全拒否
          },
        ],
      },
    };
  }

  const policyDocument = {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resourceArn,
      },
    ],
  };

  const response: APIGatewayAuthorizerResult = {
    principalId,
    policyDocument,
    // context: { // オプショナル: バックエンドLambdaに渡す追加情報
    //   tokenValue: token,
    //   issuedAt: Date.now().toString(),
    // }
  };

  console.log('Authorizer response:', JSON.stringify(response, null, 2));
  return response;
};
