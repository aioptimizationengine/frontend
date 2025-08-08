# Google OAuth Setup Guide

This guide will help you set up Google OAuth for your application.

## Overview

Google OAuth is available **only for regular users**. Admin accounts must use hardcoded credentials for security reasons.

## Prerequisites

1. A Google account
2. Access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API and Google Identity API

## Step 2: Configure OAuth Consent Screen

1. In Google Cloud Console, go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required information:
   - App name: Your app name
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes:
   - `openid`
   - `email`
   - `profile`
5. Add test users (your email addresses)

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized JavaScript origins:
   - `http://localhost:5173` (for development)
   - `http://localhost:8080` (for production)
   - Your production domain
5. Add authorized redirect URIs:
   - `http://localhost:5173`
   - `http://localhost:8080`
   - Your production domain
6. Copy the Client ID

## Step 4: Configure Environment Variables

Create a `.env` file in your project root with:

```env
# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_ID=your-google-client-id-here

# Server Configuration
PORT=8080
NODE_ENV=development

# Backend URL (if using proxy)
BACKEND_URL=http://192.168.0.105:8000
```

Replace `your-google-client-id-here` with the actual Client ID from Step 3.

## Step 5: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the registration page: `/auth/register`
3. Click "Continue with Google"
4. You should be redirected to Google's OAuth consent screen
5. After authorization, you should be logged in as a regular user

## Authentication Flow

### For Regular Users:
- **Registration**: `/auth/register` - Includes Google OAuth option
- **Login**: `/auth/login` - Can use Google OAuth or email/password
- **Google OAuth**: Available for both registration and login

### For Admin Users:
- **Login**: `/auth/login` - Can use hardcoded admin credentials or Google OAuth (if they have a regular user account)
- **No OAuth for Admin Role**: If an admin tries to use Google OAuth, they'll get an error message
- **Admin Registration**: Not available - admin accounts are pre-created with hardcoded credentials

## Admin Credentials (Hardcoded)

The following admin credentials are hardcoded for security:

```
Email: admin@example.com
Password: admin123
```

**Note**: Admin users cannot use Google OAuth and must use these hardcoded credentials.

## Troubleshooting

### Common Issues

1. **"Invalid Client ID" error**
   - Make sure the Client ID is correct
   - Check that the domain is authorized in Google Cloud Console

2. **"Redirect URI mismatch" error**
   - Add your domain to authorized redirect URIs in Google Cloud Console

3. **"OAuth consent screen not configured" error**
   - Complete the OAuth consent screen setup
   - Add test users if in testing mode

4. **"Google OAuth is not available for admin accounts" error**
   - This is expected behavior - admin accounts must use hardcoded credentials
   - Use the admin email/password combination instead

### Development vs Production

- For development: Use `http://localhost:5173` and `http://localhost:8080`
- For production: Add your actual domain to authorized origins and redirect URIs

## Security Notes

1. Never commit your `.env` file to version control
2. Use different Client IDs for development and production
3. Regularly rotate your OAuth credentials
4. Monitor OAuth usage in Google Cloud Console
5. Admin credentials are hardcoded for security - do not expose them in client-side code

## Additional Configuration

### Customizing the OAuth Button

You can customize the Google OAuth button by modifying the `GoogleOAuth.tsx` component:

```tsx
<GoogleLogin
  onSuccess={handleSuccess}
  onError={handleError}
  useOneTap
  disabled={isLoading}
  theme="outline" // or "filled_blue", "filled_black"
  size="large" // or "medium", "small"
  text="signin_with" // or "signup_with", "continue_with"
  shape="rectangular" // or "round", "square"
  locale="en"
/>
```

### Adding More OAuth Providers

To add other OAuth providers (GitHub, Microsoft, etc.), follow a similar pattern:

1. Install the provider's SDK
2. Create a new component similar to `GoogleOAuth.tsx`
3. Add the provider to your auth context
4. Update the server routes to handle the new provider

## Support

If you encounter issues:

1. Check the browser console for errors
2. Verify your Google Cloud Console configuration
3. Ensure environment variables are loaded correctly
4. Check that the Google OAuth library is properly installed
5. Remember that admin users cannot use OAuth - they must use hardcoded credentials 