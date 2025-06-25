import * as cognitoAuth from '../infrastructure/auth/cognitoAuthService';
import { ISignUpResult } from 'amazon-cognito-identity-js';

export interface User {
  username: string; // email
  // 他のユーザー属性もここに追加可能
  email?: string;
  email_verified?: boolean;
  // ...
}

export const signUp = async (params: cognitoAuth.SignUpParams): Promise<ISignUpResult> => {
  try {
    const result = await cognitoAuth.signUp(params);
    // ここでドメインイベントを発行したり、追加のロジックを実行したりできる
    return result;
  } catch (error) {
    console.error('SignUp Error:', error);
    throw error;
  }
};

export const confirmSignUp = async (params: cognitoAuth.ConfirmSignUpParams): Promise<string> => {
  try {
    const result = await cognitoAuth.confirmSignUp(params);
    return result;
  } catch (error) {
    console.error('Confirm SignUp Error:', error);
    throw error;
  }
};

export const signIn = async (params: cognitoAuth.SignInParams): Promise<{ idToken: string, accessToken: string, refreshToken: string, user: User }> => {
  try {
    const cognitoSession = await cognitoAuth.signIn(params);
    cognitoAuth.storeTokens({
        idToken: cognitoSession.idToken,
        accessToken: cognitoSession.accessToken,
        refreshToken: cognitoSession.refreshToken,
    });

    // CognitoUserから必要なユーザー情報を取得・整形
    const cognitoUser = cognitoSession.user;
    const attributes = await cognitoAuth.getUserAttributes(cognitoUser);
    const userAttributes: { [key: string]: any } = {};
    attributes.forEach(attr => {
        userAttributes[attr.getName()] = attr.getValue();
    });

    return {
      idToken: cognitoSession.idToken,
      accessToken: cognitoSession.accessToken,
      refreshToken: cognitoSession.refreshToken,
      user: {
        username: cognitoUser.getUsername(),
        email: userAttributes.email,
        email_verified: userAttributes.email_verified,
        // 他の属性も同様にマッピング
      },
    };
  } catch (error) {
    console.error('SignIn Error:', error);
    // エラーオブジェクトの型をチェックして、より具体的なエラーメッセージをスローすることも検討
    throw error;
  }
};

export const signOut = (): void => {
  cognitoAuth.signOut();
  // 状態管理ストアのユーザー情報もクリアする
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const cognitoUser = await cognitoAuth.getCurrentAuthenticatedUser();
    if (cognitoUser) {
      const attributes = await cognitoAuth.getUserAttributes(cognitoUser);
      const userAttributes: { [key: string]: any } = {};
      attributes.forEach(attr => {
          userAttributes[attr.getName()] = attr.getValue();
      });
      return {
        username: cognitoUser.getUsername(),
        email: userAttributes.email,
        email_verified: userAttributes.email_verified,
        // 他の属性
      };
    }
    return null;
  } catch (error) {
    // getCurrentAuthenticatedUser はエラー時に null を返すようにしているので、
    // ここでキャッチされるのは予期せぬエラーの可能性が高い
    console.error('Error getting current user:', error);
    return null;
  }
};

export const getSessionTokens = (): { idToken: string | null, accessToken: string | null, refreshToken: string | null } => {
    return {
        idToken: cognitoAuth.getStoredIdToken(),
        accessToken: cognitoAuth.getStoredAccessToken(),
        refreshToken: cognitoAuth.getStoredRefreshToken(),
    };
};

export const forgotPassword = async (email: string): Promise<any> => {
  try {
    return await cognitoAuth.forgotPassword(email);
  } catch (error) {
    console.error('Forgot Password Error:', error);
    throw error;
  }
};

export const confirmPassword = async (email: string, verificationCode: string, newPassword_old: string): Promise<string> => {
  try {
    return await cognitoAuth.confirmPassword(email, verificationCode, newPassword_old);
  } catch (error) {
    console.error('Confirm Password Error:', error);
    throw error;
  }
};
