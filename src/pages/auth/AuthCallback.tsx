import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuthStatus } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Completing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      const token = searchParams.get('token');
      const errorParam = searchParams.get('error');
      
      if (errorParam) {
        // Handle URL error parameters
        const errorMessages: { [key: string]: string } = {
          'auth_failed': 'Authentication failed. Please try again.',
          'drive_conflict': 'This Google Drive is already linked to another account.',
          'email_conflict': 'This email is already registered with a different Google account.',
          'google_account_conflict': 'This Google account is already linked to a different user.',
        };
        
        setError(errorMessages[errorParam] || 'An unexpected error occurred during authentication.');
        
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 5000);
        return;
      }
      
      if (token) {
        try {
          // Store the JWT token
          localStorage.setItem('token', token);
          
          setLoadingMessage('Verifying authentication...');
          // Check auth status to load user data
          await checkAuthStatus();
          
          setLoadingMessage('Refreshing your data...');
          // Invalidate all queries to ensure fresh data after authentication
          await queryClient.invalidateQueries();
          
          setLoadingMessage('Setting up your drives...');
          // Wait longer to allow backend sync to complete and then additional time for data to propagate
          setTimeout(() => {
            setLoadingMessage('Almost ready...');
            // Additional delay to ensure file sync has time to complete
            setTimeout(() => {
              // Redirect to dashboard
              navigate('/', { replace: true });
            }, 2000); 
          }, 4000); // First delay for drive setup
        } catch (error) {
          console.error('Auth check failed:', error);
          setError('Failed to complete authentication. Please try logging in again.');
          localStorage.removeItem('token');
          
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
        }
      } else {
        // No token, redirect to login with error
        setError('No authentication token received. Please try again.');
        setTimeout(() => {
          navigate('/login?error=auth_failed', { replace: true });
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate, checkAuthStatus, queryClient]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="flex flex-col items-center gap-4 max-w-md text-center p-6 bg-background rounded-lg border border-destructive/20">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold text-destructive">Authentication Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">You will be redirected to the login page shortly...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-muted-foreground">{loadingMessage}</p>
        <p className="text-sm text-muted-foreground">This may take a few moments for new accounts...</p>
      </div>
    </div>
  );
}
