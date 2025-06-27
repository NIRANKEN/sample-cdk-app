import { APIGatewayRequestAuthorizerEventV2, APIGatewayAuthorizerResult, Handler } from 'aws-lambda';

// 仮のJWTデコード関数（実際にはライブラリを使用）
// この関数はデモ用であり、実際の検証は行いません。
// 実際のJWTトークンが渡された場合に 'sub' クレームを模倣的に返すことを試みます。
const pseudoDecodeToken = (token: string): { sub: string | undefined } | undefined => {
  if (token.startsWith('Bearer ')) {
    const tokenPart = token.split(' ')[1];
    // これは実際のデコードではありません。
    // 簡単な例として、トークン自体が 'test-user-id' のような形式であると仮定するか、
    // 固定の値を返すようにします。
    // 実際のJWTライブラリ (例: jsonwebtoken) を使う場合は、ここで検証とデコードを行います。
    if (tokenPart === 'dummy-jwt-for-local') { // ローカルテスト用の特定のトークン文字列
      return { sub: 'local-user-from-dummy-jwt' };
    }
    // 固定のユーザーIDを返す例 (ローカル開発用)
    // return { sub: 'fixed-user-id-for-local' };
  }
  if (token === 'allow') { // SAM Localの以前のテスト用
      return { sub: 'user-allow-sam' };
  }
  return undefined;
};

export const handler: Handler<APIGatewayRequestAuthorizerEventV2 | any, APIGatewayAuthorizerResult> = async (
  event: APIGatewayRequestAuthorizerEventV2 | any
): Promise<APIGatewayAuthorizerResult> => {
  console.log('Incoming authorizer event:', JSON.stringify(event, null, 2));

  let token: string | undefined;

  if (event.headers) {
    token = event.headers.authorization ?? event.headers.Authorization;
  }
  if (!token && event.authorizationToken) { // SAM Local V1 event
    token = event.authorizationToken;
  }

  console.log('Token:', token);

  let effect: 'Allow' | 'Deny' = 'Deny';
  let principalId = 'user-unknown';
  let context: { [key: string]: any } | undefined = undefined; // contextを定義

  if (token) {
    // ローカル開発用の簡易的なユーザーID抽出ロジック
    // 実際のJWT検証・デコード処理に置き換える必要があります
    const decoded = pseudoDecodeToken(token);
    let userIdFromToken: string | undefined = decoded?.sub;

    // もしフロントエンドから送られてくるのが実際のCognitoのIDトークンで、
    // それをローカルで検証せずに使いたい場合、ここでuserIdFromTokenにそのsubをセットする
    // (ただし、これは安全ではありません。あくまでローカル開発の便宜のため)
    // 例: tokenが 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0VXNlcklkMTIzIiwiZXhwIjoxNzAwMDAwMDAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' のような形式の場合
    // const parts = token.split('.');
    // if (parts.length === 3) {
    //   try {
    //     const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    //     if (payload.sub) {
    //       userIdFromToken = payload.sub;
    //       console.log(`Extracted sub from pseudo-decoded JWT: ${userIdFromToken}`);
    //     }
    //   } catch (e) {
    //     console.warn("Could not pseudo-decode token payload:", e);
    //   }
    // }


    // ひとまずローカルでは 'allow' トークンか、特定のダミートークンを許可し、固定のuserIdを渡す
    if (token === 'allow' || (token && userIdFromToken)) {
      effect = 'Allow';
      principalId = userIdFromToken || 'user-allow-fixed'; // デコードできればそのID、ダメなら固定ID
      context = { // contextオブジェクトを設定
        userId: principalId, // getTodos.ts で参照するキー
        // 他の必要な情報をここに追加できます
        //例: tokenValue: token,
        //例: issuedAt: Date.now().toString(),
      };
      console.log(`Authorization ALLOWED. PrincipalId: ${principalId}, Context:`, context);
    } else {
      console.log('Authorization DENIED. Token not recognized or invalid for local setup.');
      effect = 'Deny';
      principalId = 'user-deny-invalid-token';
    }
  } else {
    console.log('Authorization DENIED. No token provided.');
    effect = 'Deny';
    principalId = 'user-deny-no-token';
  }

  const resourceArn = event.routeArn || event.methodArn;
  if (!resourceArn) {
    console.error('Resource ARN (routeArn or methodArn) is missing in the event.');
    return {
      principalId: 'unknown',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*',
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
        Resource: resourceArn, // 特定のルートARNまたはメソッドARNに対して許可/拒否
      },
    ],
  };

  const response: APIGatewayAuthorizerResult = {
    principalId,
    policyDocument,
    context, // contextをレスポンスに含める
  };

  console.log('Authorizer response:', JSON.stringify(response, null, 2));
  return response;
};
