import factory
from factory import LazyAttribute, SubFactory, Sequence, Faker
from datetime import datetime, timezone
from app.models import User, Puzzle, Game, Round, Submission


class UserFactory(factory.Factory):
    class Meta:
        model = User
    
    id = Sequence(lambda n: n)
    handle = Sequence(lambda n: f"user{n}")
    email = Sequence(lambda n: f"user{n}@example.com")
    rating = 1000
    is_active = True
    created = LazyAttribute(lambda o: datetime.now(timezone.utc).replace(tzinfo=None))


class PuzzleFactory(factory.Factory):
    class Meta:
        model = Puzzle
    
    id = Sequence(lambda n: n)
    gamma = "P"  # Simple premise
    phi = "P"    # Simple conclusion
    difficulty = 1
    best_len = 1
    machine_proof = '{"steps": [{"line": 1, "formula": "P", "rule": "Premise"}]}'
    created = LazyAttribute(lambda o: datetime.now(timezone.utc).replace(tzinfo=None))


class GameFactory(factory.Factory):
    class Meta:
        model = Game
    
    id = Sequence(lambda n: n)
    player_a = SubFactory(UserFactory)
    player_b = SubFactory(UserFactory)
    rounds = 3
    winner = None
    started = LazyAttribute(lambda o: datetime.now(timezone.utc).replace(tzinfo=None))
    ended = None
    player_a_rating_change = None
    player_b_rating_change = None


class RoundFactory(factory.Factory):
    class Meta:
        model = Round
    
    id = Sequence(lambda n: n)
    game_id = SubFactory(GameFactory)
    puzzle_id = SubFactory(PuzzleFactory)
    round_number = 1
    winner = None
    started = LazyAttribute(lambda o: datetime.now(timezone.utc).replace(tzinfo=None))
    ended = None


class SubmissionFactory(factory.Factory):
    class Meta:
        model = Submission
    
    id = Sequence(lambda n: n)
    user_id = SubFactory(UserFactory)
    puzzle_id = SubFactory(PuzzleFactory)
    game_id = SubFactory(GameFactory)
    round_id = SubFactory(RoundFactory)
    payload = '{"steps": [{"line": 1, "formula": "P", "rule": "Premise"}]}'
    verdict = True
    error_message = None
    processing_time = 100
    created = LazyAttribute(lambda o: datetime.now(timezone.utc).replace(tzinfo=None))


# Complex test data generators
class TestDataGenerator:
    @staticmethod
    def create_valid_proof():
        """Create a valid proof structure"""
        return {
            "premises": ["P", "P → Q"],
            "conclusion": "Q",
            "steps": [
                {"line": 1, "formula": "P", "rule": "Premise"},
                {"line": 2, "formula": "P → Q", "rule": "Premise"},
                {"line": 3, "formula": "Q", "rule": "MP", "deps": [1, 2]}
            ]
        }
    
    @staticmethod
    def create_invalid_proof():
        """Create an invalid proof structure"""
        return {
            "premises": ["P"],
            "conclusion": "Q",
            "steps": [
                {"line": 1, "formula": "P", "rule": "Premise"},
                {"line": 2, "formula": "Q", "rule": "Invalid"}
            ]
        }
    
    @staticmethod
    def create_complex_proof():
        """Create a complex proof with multiple steps"""
        return {
            "premises": ["P → Q", "Q → R", "P"],
            "conclusion": "R",
            "steps": [
                {"line": 1, "formula": "P → Q", "rule": "Premise"},
                {"line": 2, "formula": "Q → R", "rule": "Premise"},
                {"line": 3, "formula": "P", "rule": "Premise"},
                {"line": 4, "formula": "Q", "rule": "MP", "deps": [1, 3]},
                {"line": 5, "formula": "R", "rule": "MP", "deps": [2, 4]}
            ]
        }
    
    @staticmethod
    def create_user_with_stats(games_won=5, games_lost=3, rating=1200):
        """Create a user with specific stats"""
        return {
            "id": 1,
            "handle": "testuser",
            "email": "test@example.com",
            "rating": rating,
            "games_won": games_won,
            "games_lost": games_lost,
            "created": datetime.now(timezone.utc).replace(tzinfo=None)
        }
    
    @staticmethod
    def create_game_state(status="active", current_round=1, total_rounds=3):
        """Create a game state for testing"""
        return {
            "id": 1,
            "player_a": 1,
            "player_b": 2,
            "status": status,
            "current_round": current_round,
            "total_rounds": total_rounds,
            "started": datetime.now(timezone.utc).replace(tzinfo=None)
        }
    
    @staticmethod
    def create_websocket_messages():
        """Create various WebSocket message types for testing"""
        return {
            "ping": {"type": "ping", "timestamp": 1640995200.0},
            "pong": {"type": "pong", "timestamp": 1640995200.0},
            "proof_submission": {
                "type": "proof_submission",
                "user_id": 1,
                "game_id": 1,
                "data": {
                    "proof": TestDataGenerator.create_valid_proof()
                }
            },
            "time_update": {
                "type": "time_update",
                "user_id": 1,
                "game_id": 1,
                "data": {"time_left": 150}
            },
            "chat_message": {
                "type": "chat_message",
                "user_id": 1,
                "game_id": 1,
                "data": {"message": "Good luck!"}
            },
            "surrender": {
                "type": "surrender",
                "user_id": 1,
                "game_id": 1
            },
            "invalid_message": {
                "type": "invalid_type",
                "user_id": 1,
                "game_id": 1
            }
        }
    
    @staticmethod
    def create_leaderboard_entries(count=10):
        """Create leaderboard entries for testing"""
        entries = []
        for i in range(count):
            entries.append({
                "id": i + 1,
                "handle": f"player{i + 1}",
                "rating": 1200 - (i * 50),
                "games_won": 10 - i,
                "games_played": 15 - i
            })
        return entries
    
    @staticmethod
    def create_puzzle_with_difficulty(difficulty=1):
        """Create a puzzle with specific difficulty"""
        difficulties = {
            1: {
                "gamma": "P",
                "phi": "P",
                "best_len": 1,
                "machine_proof": '{"steps": [{"line": 1, "formula": "P", "rule": "Premise"}]}'
            },
            2: {
                "gamma": "P, P → Q",
                "phi": "Q",
                "best_len": 3,
                "machine_proof": '{"steps": [{"line": 1, "formula": "P", "rule": "Premise"}, {"line": 2, "formula": "P → Q", "rule": "Premise"}, {"line": 3, "formula": "Q", "rule": "MP", "deps": [1, 2]}]}'
            },
            3: {
                "gamma": "P → Q, Q → R, P",
                "phi": "R",
                "best_len": 5,
                "machine_proof": '{"steps": [{"line": 1, "formula": "P → Q", "rule": "Premise"}, {"line": 2, "formula": "Q → R", "rule": "Premise"}, {"line": 3, "formula": "P", "rule": "Premise"}, {"line": 4, "formula": "Q", "rule": "MP", "deps": [1, 3]}, {"line": 5, "formula": "R", "rule": "MP", "deps": [2, 4]}]}'
            }
        }
        return difficulties.get(difficulty, difficulties[1])