import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  ICognitoUserPoolData,
  ISignUpResult,
  ICognitoUserData,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';
import { cognitoConfig } from '../../config/awsCognito';

const userPoolData: ICognitoUserPoolData = {
  UserPoolId: cognitoConfig.UserPoolId,
  ClientId: cognitoConfig.ClientId,
};

const userPool = new CognitoUserPool(userPoolData);

export interface SignUpParams {
  username: string; // email
  password_old: string; // password
  attributes: { Name: string; Value: string }[];
}

export interface ConfirmSignUpParams {
  username: string;
  code: string;
}

export interface SignInParams {
  username: string; // email
  password_old: string; // password
}

export const signUp = (params: SignUpParams): Promise<ISignUpResult> => {
  const attributeList = params.attributes.map(
    (attr) => new CognitoUserAttribute(attr)
  );

  return new Promise((resolve, reject) => {
    userPool.signUp(
      params.username,
      params.password_old,
      attributeList,
      [], // validationData
      (err, result) => {
        if (err || !result) {
          return reject(err);
        }
        resolve(result);
      }
    );
  });
};

export const confirmSignUp = (
  params: ConfirmSignUpParams
): Promise<string> => {
  const userData: ICognitoUserData = {
    Username: params.username,
    Pool: userPool,
  };
  const cognitoUser = new CognitoUser(userData);

  return new Promise((resolve, reject) => {
    cognitoUser.confirmRegistration(params.code, true, (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result as string);
    });
  });
};

export const signIn = (params: SignInParams): Promise<any> => {
  const authenticationData = {
    Username: params.username,
    Password: params.password_old,
  };
  const authenticationDetails = new AuthenticationDetails(authenticationData);
  const userData: ICognitoUserData = {
    Username: params.username,
    Pool: userPool,
  };
  const cognitoUser = new CognitoUser(userData);

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (session) => {
        resolve({
          idToken: session.getIdToken().getJwtToken(),
          accessToken: session.getAccessToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken(),
          user: cognitoUser, // Include the user object for further operations like signOut
        });
      },
      onFailure: (err) => {
        reject(err);
      },
      // mfaRequired: (codeDeliveryDetails) => { // MFAが必要な場合
      //   cognitoUser.sendMFACode(mfaCode, this)
      //   reject('MFA is required');
      // },
      // newPasswordRequired: (userAttributes, requiredAttributes) => { // 新しいパスワードが必要な場合
      //   // cognitoUser.completeNewPasswordChallenge(newPassword, userAttributes, this);
      //   reject('New password is required');
      // }
    });
  });
};

export const getCurrentAuthenticatedUser = (): Promise<CognitoUser | null> => {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      return resolve(null);
    }
    cognitoUser.getSession((err: any, session: any) => {
      if (err) {
        // 通常、セッションが無効または期限切れの場合にエラーが発生
        // これはエラーとして扱わず、ユーザーが認証されていないと判断できる
        return resolve(null);
      }
      if (session && session.isValid()) {
        resolve(cognitoUser);
      } else {
        resolve(null);
      }
    });
  });
};

export const getUserAttributes = (cognitoUser: CognitoUser): Promise<CognitoUserAttribute[]> => {
    return new Promise((resolve, reject) => {
        cognitoUser.getUserAttributes((err, attributes) => {
            if (err) {
                return reject(err);
            }
            resolve(attributes || []);
        });
    });
};


export const signOut = (): void => {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
  // ここでlocalStorage等に保存したトークンもクリアする必要がある
  localStorage.removeItem('idToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

// トークンをlocalStorageに保存する例
export const storeTokens = (tokens: { idToken: string, accessToken: string, refreshToken: string }) => {
  localStorage.setItem('idToken', tokens.idToken);
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
};

export const getStoredIdToken = (): string | null => {
  return localStorage.getItem('idToken');
}
export const getStoredAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
}
export const getStoredRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
}

// --- Cookie Helper Functions ---
// These functions run on the client-side.
// For HttpOnly cookies, a backend (BFF) is typically required.

const thirtyDaysInSeconds = 30 * 24 * 60 * 60; // Example: 30 days expiry for cookies

export const setAuthCookie = (token: string, tokenType: 'id_token' | 'access_token') => {
  if (typeof window === 'undefined') return; // Ensure runs only on client
  // console.log(`Setting ${tokenType} in cookie (non-HttpOnly)`);
  // Max-age should ideally align with token expiry.
  // Secure flag should be used in production (HTTPS).
  const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure;' : '';
  // For simplicity, using a fixed max-age. Consider actual token expiry.
  document.cookie = `${tokenType}=${token}; path=/; max-age=${thirtyDaysInSeconds}; SameSite=Lax; ${secureFlag}`;
};

export const removeAuthCookie = (tokenType: 'id_token' | 'access_token') => {
  if (typeof window === 'undefined') return; // Ensure runs only on client
  // console.log(`Removing ${tokenType} from cookie`);
  document.cookie = `${tokenType}=; path=/; max-age=0; SameSite=Lax;`;
};
// --- End Cookie Helper Functions ---


// 必要に応じて、トークンリフレッシュの処理もここに追加できます。
// CognitoUser.refreshSession(refreshToken, callback) を使用
// ただし、Amplify SDK を使うとこのあたりは自動でやってくれることが多い

export const forgotPassword = (username: string): Promise<any> => {
  const userData: ICognitoUserData = {
    Username: username,
    Pool: userPool,
  };
  const cognitoUser = new CognitoUser(userData);

  return new Promise((resolve, reject) => {
    cognitoUser.forgotPassword({
      onSuccess: (data) => {
        resolve(data);
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
};

export const confirmPassword = (username: string, verificationCode: string, newPassword_old: string): Promise<string> => {
  const userData: ICognitoUserData = {
    Username: username,
    Pool: userPool,
  };
  const cognitoUser = new CognitoUser(userData);

  return new Promise((resolve, reject) => {
    cognitoUser.confirmPassword(verificationCode, newPassword_old, {
      onSuccess: () => {
        resolve("Password confirmed successfully!");
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
};
