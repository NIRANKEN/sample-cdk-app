export const cognitoConfig = {
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'YOUR_USER_POOL_ID', // CDKのOutputを参照
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || 'YOUR_USER_POOL_CLIENT_ID', // CDKのOutputを参照
  Region: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-1', // CDKスタックがデプロイされるリージョンに合わせてください
};
