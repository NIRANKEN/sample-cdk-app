"use client";
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../presentation/store/authStore'; // Adjusted path
import { useRouter } from 'next/navigation'; // Changed from react-router-dom

type FormType = 'signIn' | 'signUp' | 'confirmSignUp' | 'forgotPassword' | 'confirmNewPassword';

const LoginPage: React.FC = () => {
  const router = useRouter(); // Changed from useNavigate
  const {
    signIn,
    signUp,
    confirmSignUp,
    forgotPassword,
    confirmPassword,
    isAuthenticated,
    isLoading,
    error,
    clearError,
  } = useAuthStore();

  const [formType, setFormType] = useState<FormType>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/todos'); // Changed from navigate('/todos')
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (error) {
      const cognitoError = error as any;
      setFormError(cognitoError.message || 'An unknown error occurred.');
    } else {
      setFormError(null);
    }
  }, [error]);

  const handleFormSwitch = (type: FormType) => {
    setFormType(type);
    setEmail('');
    setPassword('');
    setNewPassword('');
    setConfirmationCode('');
    clearError();
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormError(null);

    try {
      switch (formType) {
        case 'signIn':
          await signIn({ username: email, password_old: password });
          // Successful redirect is handled by useEffect
          break;
        case 'signUp':
          await signUp({
            username: email,
            password_old: password,
            attributes: [{ Name: 'email', Value: email }],
          });
          setFormType('confirmSignUp');
          setPassword('');
          break;
        case 'confirmSignUp':
          await confirmSignUp({ username: email, code: confirmationCode });
          setFormType('signIn');
          setConfirmationCode('');
          alert('Verification successful! Please sign in.');
          break;
        case 'forgotPassword':
          await forgotPassword(email);
          setFormType('confirmNewPassword');
          alert('A confirmation code has been sent to your email. Please check it to reset your password.');
          break;
        case 'confirmNewPassword':
          await confirmPassword(email, confirmationCode, newPassword);
          setFormType('signIn');
          setNewPassword('');
          setConfirmationCode('');
          alert('Password has been reset successfully! Please sign in with your new password.');
          break;
      }
    } catch (_err: any) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Error is set in Zustand store, so no special handling here
    }
  };

  const renderForm = () => {
    switch (formType) {
      case 'signIn':
        return (
          <>
            <h2>Sign In</h2>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
            <p>
              <button type="button" onClick={() => handleFormSwitch('forgotPassword')} style={{background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer'}}>
                Forgot Password?
              </button>
            </p>
            <p>
              Don&apos;t have an account?{' '}
              <button type="button" onClick={() => handleFormSwitch('signUp')} style={{background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer'}}>
                Sign Up
              </button>
            </p>
          </>
        );
      case 'signUp':
        return (
          <>
            <h2>Sign Up</h2>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password (min 8 chars, upper, lower, number)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Signing Up...' : 'Sign Up'}
            </button>
            <p>
              Already have an account?{' '}
              <button type="button" onClick={() => handleFormSwitch('signIn')} style={{background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer'}}>
                Sign In
              </button>
            </p>
          </>
        );
      case 'confirmSignUp':
        return (
          <>
            <h2>Confirm Sign Up</h2>
            <p>A confirmation code has been sent to {email}. Please enter it below.</p>
            <input
              type="text"
              placeholder="Email (Verification Target)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled
            />
            <input
              type="text"
              placeholder="Confirmation Code"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              required
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Confirming...' : 'Confirm Sign Up'}
            </button>
            <p>
              <button type="button" onClick={() => handleFormSwitch('signIn')} style={{background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer'}}>
                Back to Sign In
              </button>
            </p>
          </>
        );
        case 'forgotPassword':
        return (
          <>
            <h2>Forgot Password</h2>
            <p>Enter your email address to receive a password reset code.</p>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Sending Code...' : 'Send Reset Code'}
            </button>
            <p>
              <button type="button" onClick={() => handleFormSwitch('signIn')} style={{background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer'}}>
                Back to Sign In
              </button>
            </p>
          </>
        );
      case 'confirmNewPassword':
        return (
          <>
            <h2>Reset Password</h2>
            <p>A confirmation code was sent to {email}. Enter the code and your new password.</p>
            <input
              type="email"
              placeholder="Email"
              value={email}
              disabled
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="Confirmation Code"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="New Password (min 8 chars, upper, lower, number)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
            <p>
              <button type="button" onClick={() => handleFormSwitch('signIn')} style={{background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer'}}>
                Back to Sign In
              </button>
            </p>
          </>
        );
      default:
        return null;
    }
  };

  const pageStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80vh',
    fontFamily: 'Arial, sans-serif'
  };

  const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    width: '300px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  return (
    <div style={pageStyle}>
      <form onSubmit={handleSubmit} style={formStyle}>
        {renderForm()}
        {formError && <p style={{ color: 'red', marginTop: '10px' }}>{formError}</p>}
      </form>
      <style>{`
        input[type="email"], input[type="password"], input[type="text"] {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
          width: 100%;
        }
        button[type="submit"], button[type="button"] {
          padding: 10px 15px;
          border: none;
          border-radius: 4px;
          background-color: #007bff;
          color: white;
          cursor: pointer;
          font-size: 16px;
        }
        button[type="submit"]:disabled {
          background-color: #aaa;
        }
        button[type="button"] {
            background-color: #6c757d;
        }
        button[type="button"]:hover:not(:disabled) {
            opacity: 0.9;
        }
        form p button {
            background: none;
            border: none;
            color: #007bff;
            text-decoration: underline;
            cursor: pointer;
            padding: 0;
            font-size: 1em;
        }
        form p button:hover {
            color: #0056b3;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
