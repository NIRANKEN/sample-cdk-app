import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// import * as jose from 'jose'; // Assuming 'jose' could be installed
// import { cognitoConfig } from './config/awsCognito'; // For JWKS URI and claims validation

// --- Placeholder for JWT Validation (jose library couldn't be installed in sandbox) ---
// const JWKS_URI = `https://cognito-idp.${cognitoConfig.Region}.amazonaws.com/${cognitoConfig.UserPoolId}/.well-known/jwks.json`;
// const ISSUER = `https://cognito-idp.${cognitoConfig.Region}.amazonaws.com/${cognitoConfig.UserPoolId}`;
// const AUDIENCE = cognitoConfig.ClientId; // This should be the App Client ID

async function verifyToken(token: string): Promise<boolean> {
  // console.log("Attempting to verify token:", token);
  // if (!token) return false;

  // try {
  //   const jwks = jose.createRemoteJWKSet(new URL(JWKS_URI));
  //   const { payload } = await jose.jwtVerify(token, jwks, {
  //     issuer: ISSUER,
  //     audience: AUDIENCE,
  //   });

  //   // Check if token is expired (already handled by jwtVerify by default if 'exp' claim exists)
  //   // if (payload.exp && Date.now() >= payload.exp * 1000) {
  //   //   console.warn("Middleware: Token expired.");
  //   //   return false;
  //   // }

  //   // Add any other custom claim validations if needed
  //   // e.g., if (payload.token_use !== 'id') { console.warn("Token is not an ID token"); return false; }

  //   console.log("Middleware: Token verified successfully. Payload:", payload);
  //   return true;
  // } catch (error: any) {
  //   console.error("Middleware: Token verification failed.", error.code, error.message);
  //   // Specific error codes from jose can be checked here, e.g., 'ERR_JWT_EXPIRED', 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED'
  //   return false;
  // }

  // Fallback for sandbox environment where 'jose' cannot be used:
  // This is NOT a secure way to validate tokens and should NOT be used in production.
  // It only checks for token existence.
  if (token) {
    console.warn("Middleware: Basic token existence check (SANDBOX FALLBACK - NOT SECURE).");
    // You could try a very basic decode if you had a lightweight base64url decoder
    // to check expiry, but without signature validation, it's not secure.
    return true;
  }
  return false;
}
// --- End Placeholder for JWT Validation ---

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const idToken = request.cookies.get('id_token')?.value;
  // const accessToken = request.cookies.get('access_token')?.value; // If using access token for auth

  if (!idToken) {
    console.log("Middleware: No id_token cookie found.");
    return false;
  }

  // Using the placeholder/fallback verification
  return await verifyToken(idToken);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 認証状態を取得
  const authenticated = await isAuthenticated(request);

  // 保護したいパスのリスト
  const protectedPaths = ['/todos'];
  // 認証が不要なパス (ログインページなど)
  const publicPaths = ['/login'];

  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (isProtectedPath) {
    if (!authenticated) {
      // 未認証で保護されたパスにアクセスしようとした場合、ログインページにリダイレクト
      // リダイレクト後、ログイン成功したら元のページに戻れるようにnext_urlに現在のパスを渡す
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next_url', pathname);
      console.log(`Middleware: Unauthenticated access to ${pathname}, redirecting to ${loginUrl.toString()}`);
      return NextResponse.redirect(loginUrl);
    }
  } else if (isPublicPath) {
    if (authenticated && pathname === '/login') {
      // 認証済みでログインページにアクセスしようとした場合、TODOページにリダイレクト
      const todosUrl = new URL('/todos', request.url);
      console.log(`Middleware: Authenticated access to ${pathname}, redirecting to ${todosUrl.toString()}`);
      return NextResponse.redirect(todosUrl);
    }
  }

  // 上記以外の場合はリクエストを続行
  return NextResponse.next();
}

// ミドルウェアを適用するパスを指定
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
