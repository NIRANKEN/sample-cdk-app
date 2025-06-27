"use client";

import React, { useEffect } from 'react';
import { useAuthStore } from '../../presentation/store/authStore'; // Adjust path as needed

const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { checkAuthState, isLoading: isAuthLoading } = useAuthStore();

  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  // Optional: Display a global loading spinner while auth state is being determined
  // if (isAuthLoading) {
  //   return (
  //     <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
  //       <p>Loading application...</p>
  //     </div>
  //   );
  // }

  return <>{children}</>;
};

export default AuthInitializer;
