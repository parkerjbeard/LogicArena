"""
User progress tracking utilities
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from datetime import datetime, date
import logging

from app.models import (
    User, UserPuzzleProgress, UserTutorialProgress, 
    UserDailyStats
)

logger = logging.getLogger(__name__)


class ProgressTracker:
    """Handles user progress tracking and experience point calculations"""
    
    # Experience point rewards
    XP_PUZZLE_FIRST_SOLVE = 50
    XP_PUZZLE_REPEAT_SOLVE = 10
    XP_PUZZLE_DIFFICULTY_MULTIPLIER = 5  # difficulty * 5 bonus XP
    XP_PERFECT_SOLUTION = 25  # Matching or beating best_len
    XP_TUTORIAL_COMPLETE = 100
    XP_DAILY_STREAK_BONUS = 20
    
    @staticmethod
    async def track_puzzle_submission(
        db: AsyncSession, 
        user_id: int, 
        puzzle_id: int, 
        proof: str,
        verdict: bool,
        processing_time: int,
        hints_used: int = 0
    ) -> int:
        """
        Track a puzzle submission and return experience points earned
        """
        if user_id == 1:  # Skip anonymous users
            return 0
            
        # Get user
        user_result = await db.execute(select(User).filter(User.id == user_id))
        user = user_result.scalars().first()
        if not user:
            return 0
            
        # Get or create puzzle progress
        progress_result = await db.execute(
            select(UserPuzzleProgress).filter(
                and_(
                    UserPuzzleProgress.user_id == user_id,
                    UserPuzzleProgress.puzzle_id == puzzle_id
                )
            )
        )
        progress = progress_result.scalars().first()
        
        if not progress:
            progress = UserPuzzleProgress(
                user_id=user_id,
                puzzle_id=puzzle_id,
                total_attempts=0,
                successful_attempts=0,
                hints_used=0
            )
            db.add(progress)
        
        # Update attempt counts
        progress.total_attempts += 1
        progress.last_attempted_at = datetime.utcnow()
        
        xp_earned = 0
        
        if verdict:
            progress.successful_attempts += 1
            
            # First completion
            if progress.first_completed_at is None:
                progress.first_completed_at = datetime.utcnow()
                xp_earned += ProgressTracker.XP_PUZZLE_FIRST_SOLVE
                
                # Get puzzle difficulty for bonus
                from app.models import Puzzle
                puzzle_result = await db.execute(
                    select(Puzzle).filter(Puzzle.id == puzzle_id)
                )
                puzzle = puzzle_result.scalars().first()
                if puzzle:
                    xp_earned += puzzle.difficulty * ProgressTracker.XP_PUZZLE_DIFFICULTY_MULTIPLIER
                    
                    # Check for perfect solution
                    proof_lines = len([line for line in proof.strip().split('\n') if line.strip()])
                    if proof_lines <= puzzle.best_len:
                        xp_earned += ProgressTracker.XP_PERFECT_SOLUTION
                        progress.best_solution_length = proof_lines
                        progress.best_solution_proof = proof
            else:
                # Repeat solve
                xp_earned += ProgressTracker.XP_PUZZLE_REPEAT_SOLVE
                
                # Update best solution if better
                proof_lines = len([line for line in proof.strip().split('\n') if line.strip()])
                if progress.best_solution_length is None or proof_lines < progress.best_solution_length:
                    progress.best_solution_length = proof_lines
                    progress.best_solution_proof = proof
        
        # Update hints used
        progress.hints_used += hints_used
        
        # Update average time
        if progress.successful_attempts > 0:
            if progress.average_time_seconds is None:
                progress.average_time_seconds = processing_time // 1000
            else:
                # Running average
                total_time = progress.average_time_seconds * (progress.successful_attempts - 1)
                progress.average_time_seconds = (total_time + processing_time // 1000) // progress.successful_attempts
        
        # Update user XP and level
        if xp_earned > 0:
            user.experience_points += xp_earned
            user.last_active = datetime.utcnow()
            
            # Check for level up
            new_level = ProgressTracker.calculate_level_from_xp(user.experience_points)
            if new_level > user.level:
                user.level = new_level
                # Could trigger level up achievement here
        
        # Update daily stats
        await ProgressTracker.update_daily_stats(
            db, user_id, 
            puzzles_attempted=1,
            puzzles_solved=1 if verdict else 0,
            experience_gained=xp_earned,
            practice_time_seconds=processing_time // 1000
        )
        
        # Check and update streak
        await ProgressTracker.update_streak(db, user)
        
        return xp_earned
    
    @staticmethod
    async def track_tutorial_completion(
        db: AsyncSession,
        user_id: int,
        tutorial_id: str,
        progress_data: dict = None
    ) -> int:
        """Track tutorial completion and return XP earned"""
        if user_id == 1:  # Skip anonymous users
            return 0
            
        # Get or create tutorial progress
        progress_result = await db.execute(
            select(UserTutorialProgress).filter(
                and_(
                    UserTutorialProgress.user_id == user_id,
                    UserTutorialProgress.tutorial_id == tutorial_id
                )
            )
        )
        progress = progress_result.scalars().first()
        
        xp_earned = 0
        
        if not progress:
            progress = UserTutorialProgress(
                user_id=user_id,
                tutorial_id=tutorial_id,
                started_at=datetime.utcnow()
            )
            db.add(progress)
        
        # Mark as completed if not already
        if not progress.completed:
            progress.completed = True
            progress.completed_at = datetime.utcnow()
            xp_earned = ProgressTracker.XP_TUTORIAL_COMPLETE
            
            # Update user XP
            user_result = await db.execute(select(User).filter(User.id == user_id))
            user = user_result.scalars().first()
            if user:
                user.experience_points += xp_earned
                user.last_active = datetime.utcnow()
                
                # Check for level up
                new_level = ProgressTracker.calculate_level_from_xp(user.experience_points)
                if new_level > user.level:
                    user.level = new_level
            
            # Update daily stats
            await ProgressTracker.update_daily_stats(
                db, user_id,
                experience_gained=xp_earned
            )
        
        # Update progress data if provided
        if progress_data:
            progress.progress_data = progress_data
        
        return xp_earned
    
    @staticmethod
    async def update_daily_stats(
        db: AsyncSession,
        user_id: int,
        puzzles_attempted: int = 0,
        puzzles_solved: int = 0,
        practice_time_seconds: int = 0,
        experience_gained: int = 0,
        games_played: int = 0,
        games_won: int = 0
    ):
        """Update or create daily stats for a user"""
        today = date.today()
        
        # Get or create today's stats
        stats_result = await db.execute(
            select(UserDailyStats).filter(
                and_(
                    UserDailyStats.user_id == user_id,
                    UserDailyStats.date == today
                )
            )
        )
        stats = stats_result.scalars().first()
        
        if not stats:
            stats = UserDailyStats(
                user_id=user_id,
                date=today,
                puzzles_attempted=0,
                puzzles_solved=0,
                practice_time_seconds=0,
                experience_gained=0,
                games_played=0,
                games_won=0
            )
            db.add(stats)
        
        # Update stats
        stats.puzzles_attempted += puzzles_attempted
        stats.puzzles_solved += puzzles_solved
        stats.practice_time_seconds += practice_time_seconds
        stats.experience_gained += experience_gained
        stats.games_played += games_played
        stats.games_won += games_won
    
    @staticmethod
    async def update_streak(db: AsyncSession, user: User):
        """Update user's streak information"""
        today = date.today()
        
        if user.last_streak_date is None:
            # First activity
            user.streak_days = 1
            user.last_streak_date = today
        elif user.last_streak_date == today:
            # Already active today
            pass
        elif (today - user.last_streak_date).days == 1:
            # Consecutive day
            user.streak_days += 1
            user.last_streak_date = today
        else:
            # Streak broken
            user.streak_days = 1
            user.last_streak_date = today
    
    @staticmethod
    def calculate_level_from_xp(xp: int) -> int:
        """Calculate level from experience points"""
        # XP required for each level: 100 * level^2
        # So level = floor(sqrt(xp / 100))
        # But we need to handle boundaries correctly
        level = 1
        while True:
            xp_for_next_level = 100 * ((level + 1) ** 2)
            if xp < xp_for_next_level:
                return level
            level += 1
    
    @staticmethod
    async def check_and_award_achievements(
        db: AsyncSession,
        user_id: int,
        achievement_checks: dict
    ):
        """Check and award achievements based on current progress"""
        # This would check various achievement conditions
        # For now, just a placeholder
        pass