# CSRF Protection Implementation

This directory contains the CSRF (Cross-Site Request Forgery) protection implementation for LogicArena.

## Overview

CSRF protection prevents malicious websites from making unauthorized requests on behalf of authenticated users. Our implementation uses the Double Submit Cookie pattern with additional security measures.

## Architecture

### Components

1. **csrf.py** - Core CSRF token management
   - Token generation using cryptographically secure random strings
   - Redis-based token storage with expiration
   - Token validation logic
   - Session management

2. **csrf_router.py** - API endpoints for CSRF tokens
   - GET `/api/csrf/token` - Fetch CSRF token
   - POST `/api/csrf/refresh` - Refresh existing token
   - GET `/api/csrf/info` - Get CSRF configuration info

3. **middleware/csrf.py** - CSRF validation middleware
   - Automatic validation for state-changing requests
   - Session ID extraction from various sources
   - Token injection for authenticated responses

## How It Works

### Token Generation Flow

1. Client requests token from `/api/csrf/token`
2. Server generates cryptographically secure token
3. Token is stored in Redis with session identifier
4. Token returned to client in response and set as httpOnly cookie
5. Client includes token in `X-CSRF-Token` header for state-changing requests

### Token Validation Flow

1. Middleware intercepts state-changing requests (POST, PUT, DELETE, PATCH)
2. Extracts session ID from request (user ID, session cookie, auth token, or IP)
3. Retrieves token from `X-CSRF-Token` header or cookie
4. Validates token against stored value in Redis
5. Allows request if valid, returns 403 if invalid or missing

### Session Management

Sessions are identified by (in order of preference):
1. Authenticated user ID
2. Session cookie
3. Hashed Bearer token
4. Client IP address

## Security Features

- **Cryptographically Secure Tokens**: 32-byte URL-safe random strings
- **Token Binding**: Tokens tied to specific sessions/users
- **Expiration**: Configurable token lifetime (default: 1 hour)
- **Constant-Time Comparison**: Prevents timing attacks
- **HttpOnly Cookies**: Prevents XSS access to tokens
- **SameSite Cookies**: Additional CSRF protection
- **Automatic Refresh**: Client can refresh tokens before expiration

## Configuration

Environment variables:
- `CSRF_TOKEN_LIFETIME`: Token expiration in seconds (default: 3600)
- `CSRF_EXEMPT_PATHS`: Additional paths to exempt from CSRF checks

## Usage

### Backend

```python
from app.csrf import validate_csrf_token

# Protect an endpoint
@router.post("/protected", dependencies=[Depends(validate_csrf_token)])
async def protected_endpoint():
    return {"status": "protected"}

# Manual token validation
from app.csrf import csrf_protection

is_valid = await csrf_protection.validate_token(
    session_id="user:123",
    token="token_value",
    user_id="123"
)
```

### Frontend

```typescript
// Automatic token inclusion via Axios interceptors
await api.post('/api/endpoint', data);

// Manual token management
import { csrfAPI } from '@/lib/api';

// Get current token
const token = await csrfAPI.getToken();

// Refresh token
const newToken = await csrfAPI.refreshToken();
```

## Testing

### Unit Tests
```bash
pytest tests/test_csrf.py
```

### Integration Tests
```bash
pytest tests/test_csrf_integration.py
```

### Manual Testing
See `tests/CSRF_MANUAL_TEST_GUIDE.md` for comprehensive manual testing scenarios.

## Troubleshooting

### Common Issues

1. **"CSRF token missing"**
   - Ensure client is sending token in `X-CSRF-Token` header
   - Check if endpoint is accidentally exempt
   - Verify cookies are enabled

2. **"Invalid CSRF token"**
   - Token may be expired - client should refresh
   - Session may have changed - get new token
   - Check Redis connection

3. **"No session found"**
   - Ensure cookies are being sent (`withCredentials: true`)
   - Check if behind proxy that strips headers

### Debug Commands

```bash
# Check Redis for tokens
redis-cli
> KEYS csrf:token:*
> GET csrf:token:user:123

# Monitor CSRF logs
tail -f gateway.log | grep -i csrf
```

## Best Practices

1. **Never disable CSRF protection** for state-changing endpoints
2. **Use HTTPS in production** to prevent token interception
3. **Rotate tokens** on privilege changes (login, logout)
4. **Monitor failed validations** for potential attacks
5. **Keep tokens short-lived** to minimize exposure window

## Future Improvements

- [ ] Add rate limiting for token generation
- [ ] Implement token rotation on each use
- [ ] Add metrics for CSRF validation failures
- [ ] Support custom token headers
- [ ] Add IP-based validation as additional check