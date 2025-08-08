"""
OAuth Authentication Module
Implements Google OAuth and password reset functionality
"""

import os
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from google.auth.transport import requests
from google.oauth2 import id_token
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import jwt
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import structlog

from db_models import User, UserRole
from utils import AuthUtils, EnhancedPasswordValidator

logger = structlog.get_logger()

class OAuthManager:
    """Manages OAuth authentication with Google"""
    
    def __init__(self, config: Dict[str, Any] = None):
        # Use auth_utils constants if no config provided
        if config is None:
            config = {}
        
        self.google_client_id = config.get('google_oauth_client_id')
        self.google_client_secret = config.get('google_oauth_client_secret')
        self.jwt_secret = config.get('jwt_secret_key') or os.getenv("JWT_SECRET_KEY", "supersecretkey")
        self.jwt_algorithm = "HS256"
        self.smtp_config = {
            'host': config.get('smtp_host'),
            'port': config.get('smtp_port', 587),
            'user': config.get('smtp_user'),
            'password': config.get('smtp_password'),
            'from_email': config.get('notification_from_email')
        }
    
    async def verify_google_token(self, token: str) -> Dict[str, Any]:
        """Verify Google OAuth token and return user info"""
        try:
            # Verify the token with Google
            idinfo = id_token.verify_oauth2_token(
                token, 
                requests.Request(), 
                self.google_client_id
            )
            
            # Token is valid, extract user info
            return {
                'oauth_id': idinfo['sub'],
                'email': idinfo['email'],
                'full_name': idinfo.get('name'),
                'email_verified': idinfo.get('email_verified', False),
                'picture': idinfo.get('picture')
            }
            
        except ValueError as e:
            logger.error(f"Invalid Google token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
    
    async def authenticate_or_create_user(
        self, 
        google_user_info: Dict[str, Any], 
        db: Session
    ) -> User:
        """Authenticate existing user or create new one from Google OAuth"""
        
        email = google_user_info['email']
        oauth_id = google_user_info['oauth_id']
        
        # Check if user exists with this email
        user = db.query(User).filter(User.email == email).first()
        
        if user:
            # Update OAuth info if not already set
            if not user.oauth_id:
                user.oauth_provider = 'google'
                user.oauth_id = oauth_id
                user.is_verified = google_user_info.get('email_verified', False)
            
            # Update last login
            user.last_login = datetime.utcnow()
            
        else:
            # Create new user
            user = User(
                email=email,
                full_name=google_user_info.get('full_name'),
                oauth_provider='google',
                oauth_id=oauth_id,
                is_verified=google_user_info.get('email_verified', False),
                role='client',  # Use string value directly for PostgreSQL enum
                is_active=True
            )
            db.add(user)
        
        db.commit()
        db.refresh(user)
        
        logger.info(f"User authenticated via Google OAuth: {email}")
        return user
    
    def create_access_token(self, user: User, expires_delta: timedelta = None) -> str:
        """Create JWT access token for authenticated user"""
        if expires_delta is None:
            expires_delta = timedelta(hours=24)
        
        expire = datetime.utcnow() + expires_delta
        
        to_encode = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.lower() if user.role else 'client',  # Normalize role to lowercase
            "exp": expire,
            "iat": datetime.utcnow()
        }
        
        encoded_jwt = jwt.encode(to_encode, self.jwt_secret, algorithm=self.jwt_algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(
                token, 
                self.jwt_secret, 
                algorithms=[self.jwt_algorithm]
            )
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None

class PasswordResetManager:
    """Manages password reset functionality"""
    
    def __init__(self, config: Dict[str, Any] = None):
        # Use environment variables if no config provided
        if config is None:
            config = {}
            
        self.smtp_config = {
            'host': config.get('smtp_host') or os.getenv('SMTP_HOST'),
            'port': config.get('smtp_port', 587) or int(os.getenv('SMTP_PORT', 587)),
            'user': config.get('smtp_user') or os.getenv('SMTP_USER'),
            'password': config.get('smtp_password') or os.getenv('SMTP_PASSWORD'),
            'from_email': config.get('notification_from_email') or os.getenv('NOTIFICATION_FROM_EMAIL')
        }
        self.frontend_url = config.get('frontend_url') or os.getenv('FRONTEND_URL', 'http://localhost:8080')
        self.token_expiry_hours = 2
    
    def generate_reset_token(self) -> str:
        """Generate secure password reset token"""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(32))
    
    async def initiate_password_reset(self, email: str, db: Session) -> bool:
        """Initiate password reset process"""
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Don't reveal if user exists
            logger.warning(f"Password reset attempted for non-existent email: {email}")
            return True
        
        # Generate reset token
        reset_token = self.generate_reset_token()
        user.reset_token = AuthUtils.hash_password(reset_token)  # Store hashed
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=self.token_expiry_hours)
        
        db.commit()
        
        # Send reset email
        await self.send_reset_email(user.email, user.full_name or "User", reset_token)
        
        logger.info(f"Password reset initiated for user: {email}")
        return True
    
    async def send_reset_email(self, email: str, name: str, token: str):
        """Send password reset email"""
        reset_link = f"{self.frontend_url}/reset-password?token={token}&email={email}"
        
        html_content = f"""
        <html>
            <body>
                <h2>Password Reset Request</h2>
                <p>Hi {name},</p>
                <p>We received a request to reset your password. Click the link below to reset it:</p>
                <p><a href="{reset_link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
                <p>This link will expire in {self.token_expiry_hours} hours.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <br>
                <p>Best regards,<br>AI Optimization Engine Team</p>
            </body>
        </html>
        """
        
        text_content = f"""
        Hi {name},
        
        We received a request to reset your password. Visit the link below to reset it:
        
        {reset_link}
        
        This link will expire in {self.token_expiry_hours} hours.
        
        If you didn't request this, please ignore this email.
        
        Best regards,
        AI Optimization Engine Team
        """
        
        await self._send_email(
            to_email=email,
            subject="Password Reset Request - AI Optimization Engine",
            html_content=html_content,
            text_content=text_content
        )
    
    async def reset_password(
        self, 
        email: str, 
        token: str, 
        new_password: str, 
        db: Session
    ) -> bool:
        """Reset user password with valid token"""
        user = db.query(User).filter(User.email == email).first()
        
        if not user or not user.reset_token:
            logger.warning(f"Invalid password reset attempt for: {email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset request"
            )
        
        # Check token expiry
        if user.reset_token_expires < datetime.utcnow():
            logger.warning(f"Expired password reset token for: {email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token has expired"
            )
        
        # Verify token
        if not AuthUtils.verify_password(token, user.reset_token):
            logger.warning(f"Invalid password reset token for: {email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token"
            )
        
        # Validate new password
        is_valid, errors = EnhancedPasswordValidator.validate_password(new_password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Password does not meet requirements", "errors": errors}
            )
        
        # Update password
        user.password_hash = AuthUtils.hash_password(new_password)
        user.reset_token = None
        user.reset_token_expires = None
        
        db.commit()
        
        logger.info(f"Password successfully reset for user: {email}")
        return True
    
    async def _send_email(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str, 
        text_content: str
    ):
        """Send email using SMTP"""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.smtp_config['from_email']
            msg['To'] = to_email
            
            # Create the parts
            text_part = MIMEText(text_content, 'plain')
            html_part = MIMEText(html_content, 'html')
            
            msg.attach(text_part)
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_config['host'], self.smtp_config['port']) as server:
                server.starttls()
                server.login(self.smtp_config['user'], self.smtp_config['password'])
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to: {to_email}")
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            # Don't raise exception to avoid revealing email sending issues