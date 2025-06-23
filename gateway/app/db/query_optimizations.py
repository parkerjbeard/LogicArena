"""
Query optimization utilities for preventing N+1 queries

This module provides optimized query patterns using SQLAlchemy's eager loading
strategies to prevent N+1 query issues throughout the application.
"""

from sqlalchemy.orm import selectinload, joinedload, subqueryload
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import logging

from app.models import User, Game, Round, Puzzle, Submission

logger = logging.getLogger(__name__)


async def get_game_with_details(db: AsyncSession, game_id: int) -> Optional[Game]:
    """
    Get a game with all related data loaded efficiently.
    Uses selectinload for collections and joinedload for single relationships.
    """
    result = await db.execute(
        select(Game)
        .filter(Game.id == game_id)
        .options(
            # Load users efficiently
            joinedload(Game.player_a_user),
            joinedload(Game.player_b_user),
            joinedload(Game.winner_user),
            # Load rounds with puzzle data
            selectinload(Game.game_rounds).options(
                joinedload(Round.puzzle),
                joinedload(Round.winner_user),
                # Load submissions for each round
                selectinload(Round.submissions).options(
                    joinedload(Submission.user)
                )
            ),
            # Load all game submissions
            selectinload(Game.submissions).options(
                joinedload(Submission.user),
                joinedload(Submission.puzzle)
            )
        )
    )
    return result.scalar_one_or_none()


async def get_user_games_optimized(
    db: AsyncSession, 
    user_id: int, 
    limit: int = 20, 
    offset: int = 0
) -> List[Game]:
    """
    Get user's games with all necessary data loaded efficiently.
    """
    result = await db.execute(
        select(Game)
        .filter((Game.player_a == user_id) | (Game.player_b == user_id))
        .order_by(Game.started.desc())
        .limit(limit)
        .offset(offset)
        .options(
            joinedload(Game.player_a_user),
            joinedload(Game.player_b_user),
            joinedload(Game.winner_user),
            # Only load round count, not all rounds
            subqueryload(Game.game_rounds).load_only(Round.id)
        )
    )
    return result.scalars().unique().all()


async def get_active_games_optimized(db: AsyncSession) -> List[Game]:
    """
    Get all active games with player information loaded.
    """
    result = await db.execute(
        select(Game)
        .filter(Game.ended.is_(None))
        .options(
            joinedload(Game.player_a_user),
            joinedload(Game.player_b_user),
            # Load current round info
            selectinload(Game.game_rounds).options(
                joinedload(Round.puzzle)
            )
        )
    )
    return result.scalars().unique().all()


async def get_puzzle_with_stats(db: AsyncSession, puzzle_id: int) -> Optional[Puzzle]:
    """
    Get a puzzle with submission statistics loaded efficiently.
    """
    result = await db.execute(
        select(Puzzle)
        .filter(Puzzle.id == puzzle_id)
        .options(
            # Load submissions with user data for statistics
            selectinload(Puzzle.submissions).options(
                joinedload(Submission.user)
            )
        )
    )
    return result.scalar_one_or_none()


async def get_user_with_full_profile(db: AsyncSession, user_id: int) -> Optional[User]:
    """
    Get a user with all profile data loaded efficiently.
    """
    result = await db.execute(
        select(User)
        .filter(User.id == user_id)
        .options(
            # Load recent games
            selectinload(User.games_as_player_a).limit(10).options(
                joinedload(Game.player_b_user),
                joinedload(Game.winner_user)
            ),
            selectinload(User.games_as_player_b).limit(10).options(
                joinedload(Game.player_a_user),
                joinedload(Game.winner_user)
            ),
            # Load recent submissions
            selectinload(User.submissions).limit(20).options(
                joinedload(Submission.puzzle)
            ),
            # Load login activities
            selectinload(User.login_activities).limit(10)
        )
    )
    return result.scalar_one_or_none()


async def get_round_with_submissions(db: AsyncSession, round_id: int) -> Optional[Round]:
    """
    Get a round with all submissions loaded efficiently.
    """
    result = await db.execute(
        select(Round)
        .filter(Round.id == round_id)
        .options(
            joinedload(Round.game).options(
                joinedload(Game.player_a_user),
                joinedload(Game.player_b_user)
            ),
            joinedload(Round.puzzle),
            selectinload(Round.submissions).options(
                joinedload(Submission.user)
            )
        )
    )
    return result.scalar_one_or_none()


async def get_leaderboard_users(db: AsyncSession, limit: int = 100) -> List[User]:
    """
    Get top users by rating with game statistics loaded efficiently.
    """
    result = await db.execute(
        select(User)
        .filter(User.is_active == True)
        .order_by(User.rating.desc())
        .limit(limit)
        .options(
            # Load game counts without loading all games
            subqueryload(User.games_as_player_a).load_only(Game.id),
            subqueryload(User.games_as_player_b).load_only(Game.id),
            subqueryload(User.won_games).load_only(Game.id)
        )
    )
    return result.scalars().unique().all()


# Query optimization guidelines:
"""
1. Use joinedload() for one-to-one and many-to-one relationships
2. Use selectinload() for one-to-many and many-to-many relationships
3. Use subqueryload() when you need to apply additional filtering
4. Use load_only() to limit columns when you don't need all fields
5. Always use .unique() when using joinedload with collections
6. Consider using lazy='selectin' on the model relationship for automatic optimization
"""