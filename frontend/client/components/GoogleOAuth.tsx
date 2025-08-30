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
  
  // Log the client ID when component renders
  console.log('🔍 GoogleOAuth Component Rendered');
  console.log('🔍 VITE_GOOGLE_CLIENT_ID from env:', process.env?.VITE_GOOGLE_CLIENT_ID || 'NOT_SET');
  console.log('🔍 All env variables:', process.env);

  const handleSuccess = async (credentialResponse: any) => {
    console.log('🎯 Google OAuth Success Callback Triggered');
    console.log('Credential Response:', credentialResponse);
    console.log('Credential Type:', typeof credentialResponse.credential);
    console.log('Credential Length:', credentialResponse.credential?.length || 0);
    
    try {
      console.log('🚀 Calling loginWithGoogle function...');
      await loginWithGoogle(credentialResponse.credential);
      console.log('✅ loginWithGoogle completed successfully');
      toast.success('Successfully signed in with Google!');
      onSuccess?.();
    } catch (error) {
      console.error('❌ loginWithGoogle failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Google sign-in failed';
      toast.error(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleError = () => {
    console.error('❌ Google OAuth Error Callback Triggered');
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