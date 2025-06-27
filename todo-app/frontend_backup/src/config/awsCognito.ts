export const cognitoConfig = {
  UserPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID || 'YOUR_USER_POOL_ID', // CDKのOutputを参照
  ClientId: process.env.REACT_APP_COGNITO_CLIENT_ID || 'YOUR_USER_POOL_CLIENT_ID', // CDKのOutputを参照
  Region: process.env.REACT_APP_AWS_REGION || 'ap-northeast-1', // CDKスタックがデプロイされるリージョンに合わせてください
};
