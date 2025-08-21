"""
LLM API Key Management Module
Handles user-provided and platform API keys with encryption
"""

import os
import json
from typing import Dict, Any, Optional, List
from cryptography.fernet import Fernet
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
import openai
import anthropic
import google.generativeai as genai
from fastapi import HTTPException, status
import structlog
import aiohttp

from db_models import (
    User, UserApiKey, PlatformApiKey, LLMProvider, 
    UserSubscription, SubscriptionPlan, ApiUsage
)

logger = structlog.get_logger()

class APIKeyEncryption:
    """Handles encryption/decryption of API keys"""
    
    def __init__(self, encryption_key: str = None):
        if encryption_key:
            self.cipher = Fernet(encryption_key.encode())
        else:
            # Generate key if not provided (should be stored securely)
            self.cipher = Fernet(Fernet.generate_key())
    
    def encrypt(self, plaintext: str) -> str:
        """Encrypt API key"""
        return self.cipher.encrypt(plaintext.encode()).decode()
    
    def decrypt(self, ciphertext: str) -> str:
        """Decrypt API key"""
        return self.cipher.decrypt(ciphertext.encode()).decode()

class LLMProviderValidator:
    """Validates API keys for different LLM providers"""
    
    @staticmethod
    async def validate_openai_key(api_key: str) -> Dict[str, Any]:
        """Validate OpenAI API key"""
        try:
            client = openai.OpenAI(api_key=api_key)
            # Make a minimal API call to validate
            response = client.models.list()
            
            return {
                "valid": True,
                "models": [model.id for model in response.data],
                "error": None
            }
        except Exception as e:
            return {
                "valid": False,
                "models": [],
                "error": str(e)
            }
    
    @staticmethod
    async def validate_anthropic_key(api_key: str) -> Dict[str, Any]:
        """Validate Anthropic API key"""
        try:
            client = anthropic.Anthropic(api_key=api_key)
            # Test with a minimal request
            response = client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=1,
                messages=[{"role": "user", "content": "test"}]
            )
            
            return {
                "valid": True,
                "models": ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
                "error": None
            }
        except Exception as e:
            return {
                "valid": False,
                "models": [],
                "error": str(e)
            }
    
    @staticmethod
    async def validate_google_key(api_key: str) -> Dict[str, Any]:
        """Validate Google Gemini API key"""
        try:
            genai.configure(api_key=api_key)
            # List available models
            models = [m.name for m in genai.list_models()]
            
            return {
                "valid": True,
                "models": models,
                "error": None
            }
        except Exception as e:
            return {
                "valid": False,
                "models": [],
                "error": str(e)
            }
    
    @staticmethod
    async def validate_perplexity_key(api_key: str) -> Dict[str, Any]:
        """Validate Perplexity API key"""
        try:
            # Perplexity uses OpenAI-compatible API
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://api.perplexity.ai/models",
                    headers=headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "valid": True,
                            "models": [m["id"] for m in data.get("data", [])],
                            "error": None
                        }
                    else:
                        return {
                            "valid": False,
                            "models": [],
                            "error": f"API returned status {response.status}"
                        }
        except Exception as e:
            return {
                "valid": False,
                "models": [],
                "error": str(e)
            }

class APIKeyManager:
    """Manages both user-provided and platform API keys"""
    
    def __init__(self, db: Session, encryption_key: str = None):
        self.db = db
        self.encryptor = APIKeyEncryption(encryption_key)
        self.validator = LLMProviderValidator()
        
        # Cost tracking (per 1K tokens)
        self.token_costs = {
            LLMProvider.OPENAI: {
                "gpt-4": {"input": 0.03, "output": 0.06},
                "gpt-4-turbo": {"input": 0.01, "output": 0.03},
                "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015}
            },
            LLMProvider.ANTHROPIC: {
                "claude-3-opus": {"input": 0.015, "output": 0.075},
                "claude-3-sonnet": {"input": 0.003, "output": 0.015},
                "claude-3-haiku": {"input": 0.00025, "output": 0.00125}
            },
            LLMProvider.GOOGLE: {
                "gemini-pro": {"input": 0.00025, "output": 0.0005},
                "gemini-pro-vision": {"input": 0.00025, "output": 0.0005}
            },
            LLMProvider.PERPLEXITY: {
                "pplx-7b-online": {"input": 0.0002, "output": 0.0002},
                "pplx-70b-online": {"input": 0.001, "output": 0.001}
            }
        }
    
    async def add_user_api_key(
        self,
        user: User,
        provider: LLMProvider,
        api_key: str,
        key_name: str = None
    ) -> UserApiKey:
        """Add or update user's API key"""
        
        # Validate subscription allows user keys
        subscription = self.db.query(UserSubscription).filter(
            and_(
                UserSubscription.user_id == user.id,
                UserSubscription.status == "active"
            )
        ).first()
        
        if not subscription or subscription.plan not in [
            SubscriptionPlan.BRING_YOUR_OWN_KEY,
            SubscriptionPlan.ENTERPRISE
        ]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your subscription plan does not support custom API keys"
            )
        
        # Validate the API key
        validation_result = await self._validate_key(provider, api_key)
        if not validation_result["valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid API key: {validation_result['error']}"
            )
        
        # Check if user already has a key for this provider
        existing_key = self.db.query(UserApiKey).filter(
            and_(
                UserApiKey.user_id == user.id,
                UserApiKey.provider == provider
            )
        ).first()
        
        if existing_key:
            # Update existing key
            existing_key.encrypted_key = self.encryptor.encrypt(api_key)
            existing_key.key_hint = api_key[-4:] if len(api_key) > 4 else "****"
            existing_key.is_valid = True
            existing_key.last_validated = datetime.utcnow()
            existing_key.validation_error = None
            existing_key.key_name = key_name or existing_key.key_name
            
            self.db.commit()
            logger.info(f"Updated {provider.value} API key for user {user.id}")
            return existing_key
        else:
            # Create new key
            new_key = UserApiKey(
                user_id=user.id,
                provider=provider,
                key_name=key_name or f"{provider.value} API Key",
                encrypted_key=self.encryptor.encrypt(api_key),
                key_hint=api_key[-4:] if len(api_key) > 4 else "****",
                is_valid=True,
                last_validated=datetime.utcnow()
            )
            
            self.db.add(new_key)
            self.db.commit()
            
            logger.info(f"Added {provider.value} API key for user {user.id}")
            return new_key
    
    async def remove_user_api_key(self, user: User, provider: LLMProvider) -> bool:
        """Remove user's API key"""
        
        key = self.db.query(UserApiKey).filter(
            and_(
                UserApiKey.user_id == user.id,
                UserApiKey.provider == provider
            )
        ).first()
        
        if key:
            self.db.delete(key)
            self.db.commit()
            logger.info(f"Removed {provider.value} API key for user {user.id}")
            return True
        
        return False
    
    async def get_user_api_keys(self, user: User) -> List[Dict[str, Any]]:
        """Get user's API keys (without decrypting)"""
        
        keys = self.db.query(UserApiKey).filter(
            UserApiKey.user_id == user.id
        ).all()
        
        return [
            {
                "provider": key.provider.value,
                "key_name": key.key_name,
                "key_hint": key.key_hint,
                "is_valid": key.is_valid,
                "last_validated": key.last_validated.isoformat() if key.last_validated else None,
                "last_used": key.last_used.isoformat() if key.last_used else None,
                "usage_count": key.usage_count,
                "created_at": key.created_at.isoformat()
            }
            for key in keys
        ]
    
    async def get_api_key_for_request(
        self,
        user: User,
        provider: LLMProvider,
        prefer_user_key: bool = True
    ) -> Dict[str, Any]:
        """Get appropriate API key for a request"""
        
        subscription = self.db.query(UserSubscription).filter(
            and_(
                UserSubscription.user_id == user.id,
                UserSubscription.status == "active"
            )
        ).first()
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No active subscription"
            )
        
        # For BYOK plans, must use user keys
        if subscription.plan == SubscriptionPlan.BRING_YOUR_OWN_KEY:
            user_key = self.db.query(UserApiKey).filter(
                and_(
                    UserApiKey.user_id == user.id,
                    UserApiKey.provider == provider,
                    UserApiKey.is_valid == True
                )
            ).first()
            
            if not user_key:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No valid {provider.value} API key configured. Please add your API key."
                )
            
            # Update usage
            user_key.last_used = datetime.utcnow()
            user_key.usage_count += 1
            self.db.commit()
            
            return {
                "api_key": self.encryptor.decrypt(user_key.encrypted_key),
                "source": "user",
                "provider": provider
            }
        
        # For platform-managed plans, use platform keys
        elif subscription.plan in [SubscriptionPlan.PLATFORM_MANAGED, SubscriptionPlan.FREE]:
            platform_key = self.db.query(PlatformApiKey).filter(
                and_(
                    PlatformApiKey.provider == provider,
                    PlatformApiKey.is_active == True
                )
            ).first()
            
            if not platform_key:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"{provider.value} service temporarily unavailable"
                )
            
            # Check platform key limits
            if platform_key.monthly_token_limit:
                if platform_key.tokens_used_this_month >= platform_key.monthly_token_limit:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Platform API limit reached for this month"
                    )
            
            return {
                "api_key": self.encryptor.decrypt(platform_key.encrypted_key),
                "source": "platform",
                "provider": provider
            }
        
        # Enterprise plans can use either
        elif subscription.plan == SubscriptionPlan.ENTERPRISE:
            if prefer_user_key:
                # Try user key first
                user_key = self.db.query(UserApiKey).filter(
                    and_(
                        UserApiKey.user_id == user.id,
                        UserApiKey.provider == provider,
                        UserApiKey.is_valid == True
                    )
                ).first()
                
                if user_key:
                    return {
                        "api_key": self.encryptor.decrypt(user_key.encrypted_key),
                        "source": "user",
                        "provider": provider
                    }
            
            # Fall back to platform key
            platform_key = self.db.query(PlatformApiKey).filter(
                and_(
                    PlatformApiKey.provider == provider,
                    PlatformApiKey.is_active == True
                )
            ).first()
            
            if platform_key:
                return {
                    "api_key": self.encryptor.decrypt(platform_key.encrypted_key),
                    "source": "platform",
                    "provider": provider
                }
            
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"No API key available for {provider.value}"
            )
    
    async def record_api_usage(
        self,
        user: User,
        provider: LLMProvider,
        model: str,
        tokens_input: int,
        tokens_output: int,
        endpoint: str,
        key_source: str,
        success: bool = True,
        error_message: str = None
    ) -> ApiUsage:
        """Record API usage for tracking and billing"""
        
        # Calculate estimated cost
        cost_per_1k_input = self.token_costs.get(provider, {}).get(model, {}).get("input", 0)
        cost_per_1k_output = self.token_costs.get(provider, {}).get(model, {}).get("output", 0)
        
        estimated_cost = (
            (tokens_input / 1000 * cost_per_1k_input) +
            (tokens_output / 1000 * cost_per_1k_output)
        )
        
        # Create usage record
        usage = ApiUsage(
            user_id=user.id,
            endpoint=endpoint,
            method="POST",
            llm_provider=provider,
            llm_model=model,
            api_key_source=key_source,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            estimated_cost=estimated_cost,
            response_status=200 if success else 500,
            error_message=error_message
        )
        
        self.db.add(usage)
        
        # Update platform key usage if applicable
        if key_source == "platform":
            platform_key = self.db.query(PlatformApiKey).filter(
                PlatformApiKey.provider == provider
            ).first()
            
            if platform_key:
                platform_key.tokens_used_this_month += (tokens_input + tokens_output)
        
        self.db.commit()
        
        return usage
    
    async def validate_all_user_keys(self, user: User) -> List[Dict[str, Any]]:
        """Validate all user's API keys"""
        
        keys = self.db.query(UserApiKey).filter(
            UserApiKey.user_id == user.id
        ).all()
        
        results = []
        
        for key in keys:
            decrypted_key = self.encryptor.decrypt(key.encrypted_key)
            validation_result = await self._validate_key(key.provider, decrypted_key)
            
            key.is_valid = validation_result["valid"]
            key.last_validated = datetime.utcnow()
            key.validation_error = validation_result.get("error")
            
            results.append({
                "provider": key.provider.value,
                "valid": validation_result["valid"],
                "error": validation_result.get("error")
            })
        
        self.db.commit()
        
        return results
    
    async def _validate_key(self, provider: LLMProvider, api_key: str) -> Dict[str, Any]:
        """Validate API key based on provider"""
        
        if provider == LLMProvider.OPENAI:
            return await self.validator.validate_openai_key(api_key)
        elif provider == LLMProvider.ANTHROPIC:
            return await self.validator.validate_anthropic_key(api_key)
        elif provider == LLMProvider.GOOGLE:
            return await self.validator.validate_google_key(api_key)
        elif provider == LLMProvider.PERPLEXITY:
            return await self.validator.validate_perplexity_key(api_key)
        else:
            return {"valid": False, "error": "Unknown provider"}
    
    async def get_optimal_provider(
        self,
        user: User,
        query_type: str = "general",
        max_cost_per_query: float = None
    ) -> Dict[str, Any]:
        """Get optimal LLM provider based on availability, cost, and query type"""
        
        subscription = self.db.query(UserSubscription).filter(
            and_(
                UserSubscription.user_id == user.id,
                UserSubscription.status == "active"
            )
        ).first()
        
        if not subscription:
            return None
        
        available_providers = []
        
        # Get available providers based on subscription
        if subscription.plan == SubscriptionPlan.BRING_YOUR_OWN_KEY:
            # Get user's valid keys
            user_keys = self.db.query(UserApiKey).filter(
                and_(
                    UserApiKey.user_id == user.id,
                    UserApiKey.is_valid == True
                )
            ).all()
            
            for key in user_keys:
                available_providers.append({
                    "provider": key.provider,
                    "source": "user",
                    "cost_per_1k": self.token_costs.get(key.provider, {})
                })
        
        elif subscription.plan in [SubscriptionPlan.PLATFORM_MANAGED, SubscriptionPlan.FREE]:
            # Get platform keys
            platform_keys = self.db.query(PlatformApiKey).filter(
                PlatformApiKey.is_active == True
            ).all()
            
            for key in platform_keys:
                # Check token limits
                if key.monthly_token_limit:
                    if key.tokens_used_this_month >= key.monthly_token_limit:
                        continue
                
                available_providers.append({
                    "provider": key.provider,
                    "source": "platform",
                    "cost_per_1k": {
                        "input": key.cost_per_1k_input_tokens or 0,
                        "output": key.cost_per_1k_output_tokens or 0
                    }
                })
        
        if not available_providers:
            return None
        
        # Select optimal provider based on query type and cost
        if query_type == "simple" or subscription.plan == SubscriptionPlan.FREE:
            # Prefer cheaper models
            provider_priority = [
                LLMProvider.GOOGLE,
                LLMProvider.PERPLEXITY,
                LLMProvider.OPENAI,
                LLMProvider.ANTHROPIC
            ]
        else:
            # Prefer quality models
            provider_priority = [
                LLMProvider.ANTHROPIC,
                LLMProvider.OPENAI,
                LLMProvider.GOOGLE,
                LLMProvider.PERPLEXITY
            ]
        
        # Find first available provider in priority order
        for priority_provider in provider_priority:
            for available in available_providers:
                if available["provider"] == priority_provider:
                    return {
                        "provider": priority_provider,
                        "source": available["source"],
                        "estimated_cost": available["cost_per_1k"]
                    }
        
        # Return first available if no priority match
        return {
            "provider": available_providers[0]["provider"],
            "source": available_providers[0]["source"],
            "estimated_cost": available_providers[0]["cost_per_1k"]
        }