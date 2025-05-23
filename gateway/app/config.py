import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # API settings
    APP_NAME: str = "LogicArena API Gateway"
    API_PREFIX: str = "/api"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev_secret_key_change_in_production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_MINUTES: int = int(os.getenv("JWT_EXPIRATION_MINUTES", "60"))
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "another_dev_secret_change_me") # Used for session/state signing
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://logicuser:logicpass@postgres:5432/logicarena")
    
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
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

settings = Settings() 