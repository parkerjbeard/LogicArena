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
    
    # Check required secrets (auth removed)
    required_secrets = {
        'DATABASE_URL': settings.DATABASE_URL,
    }
    
    for key, value in required_secrets.items():
        if not value:
            errors.append(f"❌ {key} is not set")
    
    # Validate Redis URL has password in production
    if os.getenv("ENVIRONMENT", "").lower() == "production":
        if settings.REDIS_URL and "@redis:" in settings.REDIS_URL and ":@redis:" in settings.REDIS_URL:
            errors.append("⚠️  Redis password not set in REDIS_URL")
    
    # Report results
    if errors:
        print("❌ Configuration validation failed!\n")
        for error in errors:
            print(f"  {error}")
        return False
    else:
        print("✅ Configuration validation passed!")
        print("  - All required configuration values are set")
        return True

if __name__ == "__main__":
    if not validate_config():
        sys.exit(1)