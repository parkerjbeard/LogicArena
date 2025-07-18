from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
import re

class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: Optional[int] = None

class TokenData(BaseModel):
    user_id: Optional[int] = None

class UserBase(BaseModel):
    handle: str = Field(..., min_length=3, max_length=30)
    email: EmailStr

    @validator('handle')
    def handle_alphanumeric(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Handle must be alphanumeric with optional underscores and hyphens')
        return v

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

from datetime import datetime

class UserResponse(UserBase):
    id: int
    rating: int
    created: datetime
    is_admin: Optional[bool] = False
    is_instructor: Optional[bool] = False
    
    class Config:
        from_attributes = True

class CompleteProfileRequest(BaseModel):
    token: str
    handle: str = Field(..., min_length=3, max_length=30)

    @validator('handle')
    def handle_alphanumeric(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Handle must be alphanumeric with optional underscores and hyphens')
        return v

class RefreshTokenRequest(BaseModel):
    refresh_token: str 