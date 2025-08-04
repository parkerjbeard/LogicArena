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

## Development Commands

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

### Docker Container Management (Production)
When updating services after pulling from git:
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