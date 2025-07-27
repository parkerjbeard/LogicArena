import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # API settings
    APP_NAME: str = "LogicArena API Gateway"
    API_PREFIX: str = "/api"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "20"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "10"))
    DB_POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    DB_POOL_RECYCLE: int = int(os.getenv("DB_POOL_RECYCLE", "3600"))
    DB_POOL_PRE_PING: bool = os.getenv("DB_POOL_PRE_PING", "True").lower() == "true"
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    
    # Services
    PROOF_CHECKER_URL: str = os.getenv("PROOF_CHECKER_URL", "http://proof-checker:3000")
    
    # API Rate Limits
    RATE_LIMIT_PROOF_SUBMISSIONS: int = int(os.getenv("RATE_LIMIT_PROOF_SUBMISSIONS", "100"))
    RATE_LIMIT_ACCOUNT_CREATION: int = int(os.getenv("RATE_LIMIT_ACCOUNT_CREATION", "5"))
    
    # Game Settings
    DUEL_MATCH_TIMEOUT: int = int(os.getenv("DUEL_MATCH_TIMEOUT", "60"))
    DUEL_ROUND_COUNT: int = int(os.getenv("DUEL_ROUND_COUNT", "3"))
    DUEL_TIME_LIMIT: int = int(os.getenv("DUEL_TIME_LIMIT", "180"))
    DUEL_PENALTY_SECONDS: int = int(os.getenv("DUEL_PENALTY_SECONDS", "15"))
    
    # Rating System
    ELO_K_FACTOR: int = int(os.getenv("ELO_K_FACTOR", "40"))
    ELO_INITIAL: int = int(os.getenv("ELO_INITIAL", "1000"))
    
    # Frontend
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    API_URL: str = os.getenv("API_URL", "http://localhost:8000")
    
    # Puzzle Verification
    VERIFICATION_CACHE_ENABLED: bool = os.getenv("VERIFICATION_CACHE_ENABLED", "True").lower() == "true"
    VERIFICATION_CACHE_TTL: int = int(os.getenv("VERIFICATION_CACHE_TTL", "3600"))  # 1 hour
    VERIFICATION_MAX_WORKERS: int = int(os.getenv("VERIFICATION_MAX_WORKERS", "10"))
    VERIFICATION_BATCH_SIZE: int = int(os.getenv("VERIFICATION_BATCH_SIZE", "20"))
    VERIFICATION_INTERVAL: int = int(os.getenv("VERIFICATION_INTERVAL", "300"))  # 5 minutes
    VERIFY_PUZZLES_ON_SEED: bool = os.getenv("VERIFY_PUZZLES_ON_SEED", "True").lower() == "true"
    CONTINUOUS_VERIFICATION_ENABLED: bool = os.getenv("CONTINUOUS_VERIFICATION_ENABLED", "True").lower() == "true"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields from .env

settings = Settings()