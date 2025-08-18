# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LogicArena is a competitive platform for practicing formal logic and natural deduction proofs. It features:
- Natural deduction proof system with Fitch-style notation
- Real-time proof validation via WebSocket connections
- Practice mode with categorized puzzles
- User profiles with XP, levels, and achievements
- Tutorial system with lessons and interactive practice
- Responsive design with mobile-first approach

## Development Workflow

- Work on develop branch, merge to main when ready for production

## Development Environment Setup and Management

### Quick Start - Docker Development

#### Starting the Development Environment
```bash
# Start all services with Docker Compose
docker-compose up -d

# Verify all containers are running (should see 8 containers)
docker ps

# Check service health
curl http://localhost:3000        # Frontend
curl http://localhost:8000/health  # Backend API
```

#### Common Database Migration Issues
If you encounter "Database schema needs to be updated" errors:
```bash
# Apply missing columns to database tables
docker exec logicarena-gateway-1 python -c "
import sys
sys.path.insert(0, '/app')
from app.db.session import engine
from app.models import Base
import asyncio
from sqlalchemy import text

async def update_schema():
    async with engine.begin() as conn:
        # Add missing puzzle columns
        await conn.execute(text('''
            ALTER TABLE puzzle 
            ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'any',
            ADD COLUMN IF NOT EXISTS chapter INTEGER,
            ADD COLUMN IF NOT EXISTS nested_depth INTEGER NOT NULL DEFAULT 0
        '''))
        
        # Add missing user columns
        await conn.execute(text('''
            ALTER TABLE \"user\" 
            ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
            ADD COLUMN IF NOT EXISTS supabase_id VARCHAR(255) UNIQUE,
            ADD COLUMN IF NOT EXISTS experience_points INTEGER DEFAULT 0 NOT NULL,
            ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1 NOT NULL
        '''))
        
        print('Schema updated successfully!')

asyncio.run(update_schema())
"

# Restart gateway to pick up changes
docker restart logicarena-gateway-1
```

#### Refreshing Frontend After Code Changes
```bash
# Method 1: Rebuild and restart frontend container
docker-compose build front && docker-compose up -d front

# Method 2: Force rebuild without cache (if changes aren't picked up)
docker-compose build --no-cache front && docker-compose up -d front

# Wait for build to complete (check logs)
docker logs -f logicarena-front-1

# Look for: "✓ Ready in XXXms"
```

#### Monitoring and Debugging
```bash
# View logs for specific service
docker logs --tail 50 logicarena-gateway-1
docker logs --tail 50 logicarena-front-1

# Follow logs in real-time
docker logs -f logicarena-gateway-1

# Check for errors
docker logs logicarena-gateway-1 2>&1 | grep ERROR

# Access container shell for debugging
docker exec -it logicarena-gateway-1 bash
docker exec -it logicarena-postgres-1 psql -U logicuser -d logicarena
```

#### Testing the Application
```bash
# Test API endpoints
curl http://localhost:8000/api/users/leaderboard
curl http://localhost:8000/api/puzzles/stats

# Test with CSRF token (required for POST requests)
TOKEN=$(curl -s http://localhost:8000/api/csrf/token | jq -r '.csrf_token')
curl -X POST http://localhost:8000/api/puzzles/hints \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{"puzzle_id": 1, "current_proof": ""}'

# Test WebSocket connection
wscat -c ws://localhost:8000/ws/notifications/test
```

#### Resetting the Environment
```bash
# Stop all containers
docker-compose down

# Clean up volumes (WARNING: deletes all data)
docker-compose down -v

# Remove all containers and rebuild
docker-compose down
docker system prune -f
docker-compose up -d --build
```

### Container Names Reference
The Docker containers follow this naming pattern:
- `logicarena-front-1` - Frontend (Next.js)
- `logicarena-gateway-1` - Backend API (FastAPI)
- `logicarena-postgres-1` - PostgreSQL database
- `logicarena-redis-1` - Redis cache
- `logicarena-proof-checker-1` - Proof validation service
- `logicarena-puzzle-1` - Puzzle generation service
- `logicarena-match-1` - Match/game service
- `logicarena-rating-1` - Rating calculation service

### Common Issues and Solutions

#### Issue: "Failed to load profile" or "Loading profile..." stuck
**Solution**: User table missing columns
```bash
docker exec logicarena-postgres-1 psql -U logicuser -d logicarena -c "
ALTER TABLE \"user\" 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS total_practice_time INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
ADD COLUMN IF NOT EXISTS preferences JSON DEFAULT '{}',
ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_streak_date DATE;"

docker restart logicarena-gateway-1
```

#### Issue: "Using basic hints - contextual analysis unavailable" repeatedly
**Solution**: CSRF token race condition, already fixed in code but rebuild needed
```bash
docker-compose build front && docker-compose up -d front
```

#### Issue: Frontend changes not showing
**Solution**: Frontend serving cached build
```bash
# Force rebuild
docker-compose down front
docker-compose build --no-cache front
docker-compose up -d front
```

#### Issue: Database connection errors
**Solution**: Gateway can't reach database
```bash
# Check DATABASE_URL in gateway
docker exec logicarena-gateway-1 env | grep DATABASE_URL

# Should point to postgres container, not localhost
export DATABASE_URL="postgresql://logicuser:DevP%40ssw0rd2024%21@postgres:5432/logicarena"
docker-compose up -d gateway
```

## Development Commands

- Run ./scripts/dev.sh to start your local environment

### Frontend (Next.js 14 + TypeScript)
```bash
cd front
npm install                 # Install dependencies
npm run dev                # Start development server (http://localhost:3000)
npm run build             # Build for production
npm run lint              # Run ESLint
npm run typecheck         # Run TypeScript type checking
npm test                  # Run Jest tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage report
npm run format            # Format code with Prettier
```

### Backend (FastAPI + PostgreSQL)
```bash
cd gateway
python -m venv venv       # Create virtual environment
source venv/bin/activate  # Activate venv (use venv\Scripts\activate on Windows)
pip install -r requirements.txt

# Run the backend
uvicorn main:app --reload --port 8000

# Run tests
pytest                    # Run all tests
pytest -v                # Verbose output
pytest path/to/test.py   # Run specific test file
pytest -k "test_name"    # Run tests matching pattern

# Database migrations
python -m alembic upgrade head  # Apply all migrations
python -m alembic revision --autogenerate -m "description"  # Create new migration

# Code quality
ruff check .              # Run linter
mypy .                   # Run type checker
```

### Docker Development
```bash
docker-compose up -d      # Start all services
docker-compose logs -f gateway  # View gateway logs
docker-compose down      # Stop all services
docker-compose exec gateway bash  # Shell into gateway container
```

### Green-Blue Deployment (Staging/Production)

**Simple deployment commands for zero-downtime deployments:**

```bash
# Quick deployment to staging (recommended for most cases)
./scripts/quick-deploy.sh staging

# Check deployment status
./scripts/quick-deploy.sh status

# Emergency rollback
./scripts/quick-deploy.sh rollback
```

**For more control:**
```bash
# Initialize infrastructure (first time only)
./scripts/deploy-green-blue.sh init

# Deploy to inactive environment
./scripts/deploy-green-blue.sh deploy

# Switch traffic to new deployment
./scripts/deploy-green-blue.sh switch

# Rollback if issues
./scripts/deploy-green-blue.sh rollback

# Clean up old deployment (after confident)
./scripts/deploy-green-blue.sh cleanup
```

**Key points:**
- Green and Blue are identical environments
- Traffic switches instantly between them
- Old version stays running for quick rollback
- Health checks prevent switching to unhealthy deployments
- See `docs/GREEN_BLUE_DEPLOYMENT.md` for full documentation

### Docker Container Management (Production - Legacy)
For direct Docker management without green-blue deployment:
```bash
# IMPORTANT: Always remove old containers to avoid 'ContainerConfig' errors
# For a specific service (e.g., frontend):
docker stop logicarena_front_1
docker rm logicarena_front_1
docker-compose up -d front

# For gateway service:
docker stop logicarena_gateway_1
docker rm logicarena_gateway_1
docker-compose up -d gateway

# If container names have prefixes, find them first:
docker ps -a | grep front  # or gateway, etc.
docker rm <container_name_from_output>

# To rebuild with changes:
docker-compose up -d --build <service_name>

# If persistent errors, clean everything:
docker-compose down
docker system prune -f
docker-compose up -d
```

### Environment Variables for Production
Before running docker-compose, ensure environment variables are exported:
```bash
# Source .env file (if variables aren't exported)
set -a
source .env
set +a

# Or export specific variables:
export NEXT_PUBLIC_SUPABASE_URL=<your_url>
export NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_key>
```

### Database Backup System
Automated PostgreSQL backup system with Docker:

**Quick Start:**
```bash
# Start backup system
docker-compose -f docker-compose.yml -f docker-compose.backup.yml up -d backup

# Run manual backup
docker exec logicarena_backup /backups/scripts/backup.sh

# List available backups
docker exec logicarena_backup /backups/scripts/restore.sh list

# Restore from backup (interactive)
docker exec -it logicarena_backup /backups/scripts/restore.sh restore /backups/data/daily/[backup-file]

# Test backup system
./backups/test-backup-system.sh
```

**Features:**
- Automated daily, weekly, and monthly backups
- Retention policies (7 daily, 4 weekly, 12 monthly)
- Backup verification and integrity checks
- Pre-restore safety backups
- Optional webhook notifications

**Documentation:**
- Quick start: `backups/QUICK_START.md`
- Full documentation: `backups/README.md`
- Future cloud migration plan: `FUTURE_PLANS.md`

## Architecture Overview

### Frontend Architecture
- **App Router**: Pages in `front/src/app/` using Next.js 14 App Router
  - `(main)/` - Authenticated pages with responsive navigation
  - `(auth)/` - Authentication pages (login, signup, etc.)
- **Components**: Organized in `front/src/components/`
  - Responsive UI components in `ui/`
  - Logic-specific components (proof editors, tutorial framework)
- **Contexts**: Global state management
  - `AuthContext` - Supabase authentication
  - `InputContext` - Device/input method detection
  - `ToastContext` - Global notifications
- **API Integration**: `front/src/lib/api.ts` for backend communication
- **WebSocket**: Real-time features via `front/src/lib/websocket.ts`

### Backend Architecture
- **API Gateway**: Main FastAPI application in `gateway/main.py`
- **Routers**: Feature-specific endpoints
  - `users/` - User management and profiles
  - `puzzles/` - Puzzle CRUD and verification
  - `games/` - Game logic and WebSocket handling
- **Models**: SQLAlchemy models in `app/models.py`
- **WebSocket Manager**: Real-time connections in `app/websocket/manager.py`
- **Database**: PostgreSQL with async SQLAlchemy
  - Connection pooling and optimization
  - Redis for caching and pub/sub

### Proof Validation
- **Puzzle Service**: Validates proofs and generates puzzles
- **Verification System**: Background verification of puzzle solvability
- **Proof Rules**: Natural deduction rules (Modus Ponens, Conjunction, etc.)

## Key Development Patterns

### API Endpoints
```python
# Standard CRUD pattern with authentication
@router.get("/puzzles", response_model=List[PuzzleSchema])
async def get_puzzles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
):
    # Implementation
```

### Frontend API Calls
```typescript
// Use the centralized API client
import { apiClient } from '@/lib/api';

const puzzles = await apiClient.get('/puzzles');
const result = await apiClient.post('/puzzles/submit', { solution });
```

### Responsive Components
```tsx
// Always use responsive components for mobile support
import { ResponsiveButton, ResponsiveCard } from '@/components/ui';

<ResponsiveButton variant="primary" onClick={handleClick}>
  Submit
</ResponsiveButton>
```

### Database Operations
```python
# Always use async operations with proper session management
async with get_db() as db:
    result = await db.execute(
        select(Puzzle).where(Puzzle.difficulty == difficulty)
    )
    puzzles = result.scalars().all()
```

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (.env)
```
DATABASE_URL=postgresql://logicuser:logicpass@localhost:5432/logicarena
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key
CORS_ORIGINS=http://localhost:3000
VERIFY_PUZZLES_ON_SEED=true
```

## Testing Guidelines

### Frontend Tests
- Component tests in `__tests__` folders
- Use React Testing Library patterns
- Mock API calls and WebSocket connections
- Test responsive behavior on different devices

### Backend Tests
- Async test fixtures in `conftest.py`
- Use pytest-asyncio for async tests
- Mock external services (Redis, proof checker)
- Test WebSocket connections with mock clients

## Code Style and UI Guidelines

### Dark Theme Color Palette
- Main background: `bg-gray-900`
- Card background: `bg-gray-800/30` with `backdrop-blur-sm`
- Borders: `border-gray-700/50`
- Primary text: `text-gray-200`
- Success: Green variants (border-green-600/30, text-green-400)
- Error: Red variants (border-red-600/30, text-red-400)

### Component Patterns
- Use semi-transparent backgrounds for depth
- Add hover states with transitions
- Minimum 44px touch targets on mobile
- Consistent spacing with Tailwind utilities

### Responsive Design
- Mobile-first approach
- Use responsive hooks: `useBreakpoint()`, `useAdaptiveClick()`
- Test touch gestures and swipe actions
- Adaptive layouts with `ResponsiveGrid` and `ResponsiveStack`

## Common Development Tasks

### Adding a New Puzzle Category
1. Update the database schema in `models.py`
2. Create migration: `alembic revision --autogenerate -m "add category"`
3. Update puzzle schemas and endpoints
4. Add category to frontend CategorySelector component
5. Update seed scripts if needed

### Implementing a New Tutorial
1. Create tutorial content in `tutorials/` data structure
2. Add to tutorial router in backend
3. Create interactive components using TutorialFramework
4. Implement step validation and progress tracking
5. Add to tutorial navigation

### Adding a New Achievement
1. Define achievement in database models
2. Create achievement checking logic in progress tracker
3. Add achievement UI component
4. Implement unlock conditions
5. Test achievement notifications

## Performance Considerations
- Use React.lazy() for code splitting heavy components
- Implement virtual scrolling for long lists
- Cache puzzle solutions in Redis
- Use database connection pooling
- Optimize WebSocket message payloads
- Monitor with Sentry in production

## Deployment Notes
- Frontend builds to standalone Next.js app
- Backend runs with Uvicorn in production
- Use Docker Compose for multi-service deployment
- Configure Nginx for reverse proxy
- Set up SSL certificates for WebSocket support
- Monitor database connections and Redis memory

## Security Features

### CSRF Protection

The application implements comprehensive CSRF (Cross-Site Request Forgery) protection:

#### Backend Implementation
- **Token Generation**: Cryptographically secure tokens using Python's `secrets` module
- **Storage**: Redis-based token storage with configurable expiration (default: 1 hour)
- **Validation**: Automatic validation via middleware for all state-changing requests
- **Session Management**: Tokens tied to user sessions or IP addresses

#### Frontend Implementation
- **Automatic Token Management**: Axios interceptors handle token inclusion
- **Token Refresh**: Automatic retry with new token on expiration
- **Cookie Support**: HttpOnly cookies for enhanced security

#### Protected Endpoints
All POST, PUT, DELETE, and PATCH endpoints require valid CSRF tokens except:
- `/api/users/login` - Authentication endpoint
- `/api/users/register` - Registration endpoint  
- `/api/csrf/*` - CSRF token management endpoints
- `/health/*` - Health check endpoints
- `/ws/*` - WebSocket connections

#### Usage
```typescript
// Frontend automatically includes CSRF tokens
await api.post('/api/puzzles/submit', data);  // Token added automatically

// Backend validation via dependency
@router.post("/endpoint", dependencies=[Depends(validate_csrf_token)])
async def protected_endpoint():
    pass
```

#### Configuration
- `CSRF_TOKEN_LIFETIME`: Token expiration time in seconds (default: 3600)
- `CSRF_EXEMPT_PATHS`: Additional paths to exempt from CSRF checks

#### Testing CSRF Protection
- Unit tests: `gateway/tests/test_csrf.py`
- Integration tests: `gateway/tests/test_csrf_integration.py`
- Frontend tests: `front/src/lib/__tests__/api.csrf.test.ts`
- Manual testing guide: `gateway/tests/CSRF_MANUAL_TEST_GUIDE.md`

### Other Security Features

1. **Rate Limiting**: Configured per endpoint type
2. **CORS**: Strict origin validation
3. **Security Headers**: X-Frame-Options, CSP, HSTS, etc.
4. **Request ID Tracking**: Unique IDs for request tracing

## Logging and Monitoring

### Structured Logging System

The application implements comprehensive structured JSON logging for both frontend and backend:

#### Backend Logging
- **JSON Format**: All logs are in structured JSON format for easy parsing
- **Request Context**: Automatic request ID and user ID tracking
- **Log Levels**: DEBUG, INFO, WARNING, ERROR with environment-based filtering
- **File Rotation**: Automatic log rotation to manage disk space
- **Performance Metrics**: Response times tracked in logs

Configuration via environment variables:
```bash
LOG_LEVEL=INFO          # Minimum log level
LOG_DIR=logs           # Directory for log files
ENABLE_CONSOLE_LOGS=true
ENABLE_FILE_LOGS=true
```

#### Frontend Logging
- **Browser Logger**: Captures console output and errors
- **Batch Sending**: Logs batched and sent to backend
- **Error Tracking**: Automatic capture of uncaught errors
- **Session Tracking**: Unique session IDs for user journey tracking
- **Context Enrichment**: Browser info, viewport, and user data

Usage:
```typescript
import { logger } from '@/lib/logger';

logger.info('User action', { component: 'Button', action: 'click' });
logger.error('API failed', { error, endpoint: '/api/users' });
```

#### Log Aggregation and Viewing
- **Log Viewer Dashboard**: Available at `/logs` for authorized users
- **Search and Filter**: Search by level, user, request ID, or text
- **Request Tracing**: View complete request flow through the system
- **Statistics**: Response time percentiles, error rates, and trends
- **Real-time Updates**: Live log streaming for debugging

API Endpoints:
- `POST /api/logs/client` - Submit client-side logs
- `POST /api/logs/viewer/search` - Search aggregated logs
- `GET /api/logs/viewer/statistics` - Get log statistics
- `GET /api/logs/viewer/trace/{request_id}` - Trace specific request

#### Log Analysis Features
- **Error Grouping**: Top errors aggregated by message
- **Performance Monitoring**: P50, P95, P99 response times
- **Service Breakdown**: Logs grouped by service (gateway, frontend)
- **Time-based Analysis**: Hourly breakdown of log volume

#### Best Practices
1. **Use Structured Logging**: Always include context in logs
   ```python
   log_with_context(logger, "info", "User action", 
                   action="login", user_id=user.id)
   ```

2. **Log at Appropriate Levels**:
   - DEBUG: Detailed diagnostic info
   - INFO: General operational events
   - WARNING: Warning conditions
   - ERROR: Error conditions with stack traces

3. **Include Request Context**: Use LogContext for request-scoped logging
   ```python
   with LogContext(request_id=req_id, user_id=user_id):
       # All logs in this block include context
       logger.info("Processing request")
   ```

4. **Monitor Key Metrics**:
   - API response times
   - Error rates by endpoint
   - User actions and flows
   - System health indicators