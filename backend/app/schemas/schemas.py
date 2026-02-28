from pydantic import BaseModel
from typing import Optional, Union, List
from datetime import datetime

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str
    mushaf_type: str = "madani"
    difficulty_level: int = 1

class User(UserBase):
    id: int
    mushaf_type: str
    difficulty_level: int
    daily_streak: int
    last_active_date: Optional[datetime]
    
    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class SettingsUpdate(BaseModel):
    mushaf_type: str
    difficulty_level: int

class RecordingBase(BaseModel):
    page_number: int
    file_path: str
    score: Optional[int]
    feedback: Optional[str]

class Recording(RecordingBase):
    id: int
    user_id: int
    timestamp: datetime

    class Config:
        orm_mode = True

class AnalysisResponse(BaseModel):
    valid: bool
    feedback: str
    audio_url: str
    score: Optional[int] = None
