"""
Configuration validation for production deployment.
Ensures all required secrets are properly configured.
"""

import sys
import os
from app.config import settings

def validate_config():
    """Validate that all required configuration values are set."""
    errors = []
    
    # Check required secrets
    required_secrets = {
        'JWT_SECRET': settings.JWT_SECRET,
        'SECRET_KEY': settings.SECRET_KEY,
        'CSRF_SECRET': settings.CSRF_SECRET,
        'DATABASE_URL': settings.DATABASE_URL,
    }
    
    for key, value in required_secrets.items():
        if not value:
            errors.append(f"❌ {key} is not set")
    
    # Check OAuth configuration if in production
    if os.getenv("ENVIRONMENT", "").lower() == "production":
        if not settings.GOOGLE_CLIENT_ID:
            errors.append("❌ GOOGLE_CLIENT_ID is not set (required for production)")
        if not settings.GOOGLE_CLIENT_SECRET:
            errors.append("❌ GOOGLE_CLIENT_SECRET is not set (required for production)")
    
    # Validate Redis URL has password in production
    if os.getenv("ENVIRONMENT", "").lower() == "production":
        if settings.REDIS_URL and "@redis:" in settings.REDIS_URL and ":@redis:" in settings.REDIS_URL:
            errors.append("⚠️  Redis password not set in REDIS_URL")
    
    # Check for default values that shouldn't be used
    dangerous_defaults = [
        "dev_secret_key_change_in_production",
        "csrf_secret_change_in_production",
        "another_dev_secret_change_me",
        "logicpass"
    ]
    
    config_str = str(settings.model_dump())
    for dangerous in dangerous_defaults:
        if dangerous in config_str:
            errors.append(f"🚨 Found dangerous default value: {dangerous}")
    
    # Report results
    if errors:
        print("❌ Configuration validation failed!\n")
        for error in errors:
            print(f"  {error}")
        print("\n💡 Run ./scripts/generate-secrets.sh to generate secure secrets")
        return False
    else:
        print("✅ Configuration validation passed!")
        print("  - All required secrets are configured")
        print("  - No dangerous default values detected")
        return True

if __name__ == "__main__":
    if not validate_config():
        sys.exit(1)