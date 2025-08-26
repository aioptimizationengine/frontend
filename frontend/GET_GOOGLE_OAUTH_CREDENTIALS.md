# 🔐 How to Get Google OAuth Credentials

## **Step 1: Go to Google Cloud Console**
1. Visit: https://console.cloud.google.com/
2. Sign in with your Google account
3. Create a new project or select an existing one

## **Step 2: Enable Google+ API**
1. Go to "APIs & Services" > "Library"
2. Search for "Google+ API" and enable it
3. Also enable "Google Identity API"

## **Step 3: Configure OAuth Consent Screen**
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in required information:
   - App name: "AI Optimization Engine"
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes:
   - `openid`
   - `email`
   - `profile`
5. Add test users (your email addresses)

## **Step 4: Create OAuth 2.0 Credentials**
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized JavaScript origins:
   - `http://localhost:8080` (for development)
   - `http://localhost:3000` (alternative port)
   - Your production domain
5. Add authorized redirect URIs:
   - `http://localhost:8080`
   - `http://localhost:3000`
   - Your production domain
6. **Copy the Client ID and Client Secret**

## **Step 5: Update Environment Variables**

### **Local Development (.env file):**
```env
# Google OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID=your_actual_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=your_actual_client_secret_here
VITE_GOOGLE_CLIENT_ID=your_actual_client_id_here
```

### **Railway Production:**
Go to your Railway dashboard and set:
```env
GOOGLE_OAUTH_CLIENT_ID=your_actual_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=your_actual_client_secret_here
JWT_SECRET_KEY=ai-optimization-jwt-secret-key-2024-production
```

## **Step 6: Test the Setup**
1. Restart your development server
2. Open browser console (F12)
3. Click "Continue with Google"
4. Check console logs for:
   - Environment variables
   - API calls
   - Response details

## **Important Notes:**
- **Never commit real credentials** to version control
- **Client Secret** is only needed on the backend
- **Client ID** is needed on both frontend and backend
- **Test users** must be added if your app is in testing mode
- **Authorized origins** must match your actual domains exactly

## **Troubleshooting:**
- If you get "Invalid Client ID" error, check the Client ID is correct
- If you get "Redirect URI mismatch", add your domain to authorized redirect URIs
- If you get "OAuth consent screen not configured", complete the consent screen setup
- Check browser console for detailed error logs
