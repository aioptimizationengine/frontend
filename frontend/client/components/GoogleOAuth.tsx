import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface GoogleOAuthProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export const GoogleOAuth: React.FC<GoogleOAuthProps> = ({
  onSuccess,
  onError,
  variant = 'outline',
  size = 'default',
  className = '',
}) => {
  const { loginWithGoogle, isLoading } = useAuth();

  const handleSuccess = async (credentialResponse: any) => {
    try {
      await loginWithGoogle(credentialResponse.credential);
      toast.success('Successfully signed in with Google!');
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google sign-in failed';
      toast.error(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleError = () => {
    const errorMessage = 'Google sign-in failed. Please try again.';
    toast.error(errorMessage);
    onError?.(errorMessage);
  };

  return (
    <div className={className}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap
        disabled={isLoading}
        theme="outline"
        size="large"
        text="signin_with"
        shape="rectangular"
        locale="en"
      />
    </div>
  );
};

export default GoogleOAuth; 