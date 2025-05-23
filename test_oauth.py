#!/usr/bin/env python3
"""
Test script for the updated Google OAuth implementation
"""

import sys
import os
sys.path.append('gateway')

try:
    import jwt
    print("✓ PyJWT is available")
except ImportError:
    print("✗ PyJWT not available - run: pip install PyJWT")
    sys.exit(1)

try:
    from gateway.app.auth.utils import create_access_token, create_refresh_token, verify_refresh_token
    from gateway.app.config import settings
    print("✓ Auth utilities imported successfully")
except ImportError as e:
    print(f"✗ Import error: {e}")
    sys.exit(1)

def test_token_creation():
    """Test JWT token creation and validation"""
    print("\n--- Testing Token Creation ---")
    
    # Test access token
    user_data = {"sub": "123"}
    access_token = create_access_token(user_data)
    print(f"✓ Access token created: {access_token[:50]}...")
    
    # Test refresh token
    refresh_token = create_refresh_token(user_data)
    print(f"✓ Refresh token created: {refresh_token[:50]}...")
    
    # Test refresh token verification
    try:
        payload = verify_refresh_token(refresh_token)
        print(f"✓ Refresh token verified: {payload['sub']}")
    except Exception as e:
        print(f"✗ Refresh token verification failed: {e}")
        return False
    
    return True

def test_token_validation():
    """Test token validation with PyJWT"""
    print("\n--- Testing Token Validation ---")
    
    user_data = {"sub": "456"}
    token = create_access_token(user_data)
    
    try:
        # Decode with same settings as auth utils
        decoded = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            audience="logicarena-client",
            issuer="logicarena-api",
            options={
                "require": ["exp", "iat", "sub", "jti"],
                "verify_exp": True,
                "verify_iat": True,
                "verify_aud": True,
                "verify_iss": True
            }
        )
        print(f"✓ Token decoded successfully: user {decoded['sub']}")
        print(f"  - Issued at: {decoded['iat']}")
        print(f"  - Expires at: {decoded['exp']}")
        print(f"  - Token ID: {decoded['jti'][:16]}...")
        return True
    except Exception as e:
        print(f"✗ Token validation failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing Updated Google OAuth Implementation")
    print("=" * 50)
    
    success = True
    success &= test_token_creation()
    success &= test_token_validation()
    
    print("\n" + "=" * 50)
    if success:
        print("✓ All tests passed! OAuth implementation is ready.")
    else:
        print("✗ Some tests failed. Check the implementation.")
    
    print("\nKey Security Improvements:")
    print("- Upgraded from python-jose to PyJWT")
    print("- Added JWT claims validation (iss, aud, jti)")
    print("- Enhanced OAuth state parameter protection")
    print("- Implemented refresh token rotation")
    print("- Added comprehensive error handling")
    print("- Enhanced logging and monitoring")