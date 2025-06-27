// IMPORTANT: This component needs to be refactored for Next.js App Router.
// react-router-dom hooks (useLocation, Navigate, Outlet) are not compatible.
// Consider using Next.js Middleware or a Higher-Order Component with useRouter.
"use client"; // If it contains client-side logic or hooks like useState/useEffect eventually

import React from 'react';
// import { Navigate, Outlet, useLocation } from 'react-router-dom'; // Not used in Next.js App Router
import { useAuthStore } from '../../presentation/store/authStore'; // Adjusted path
import { useRouter, usePathname } from 'next/navigation'; // For Next.js

interface ProtectedRouteProps {
  children: React.ReactNode; // In Next.js, protected routes often wrap children
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // useEffect(() => {
  // This logic will likely move to a middleware or a layout component
  // }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading authentication status...</p>
      </div>
    );
  }

  if (!isAuthenticated && !isLoading) { // Ensure not loading before redirecting
    // In Next.js, redirection is typically handled differently.
    // This could be in middleware, or a client-side redirect:
    if (typeof window !== 'undefined') { // Ensure it runs on client side
        // Store the current path to redirect back after login, if desired
        // localStorage.setItem('redirectAfterLogin', pathname);
        router.replace(`/login?redirect_to=${pathname}`); // Or just router.replace('/login');
    }
    return null; // Or a loading/redirecting indicator
  }

  // If authenticated, render the children components
  return <>{children}</>;
};

export default ProtectedRoute;
