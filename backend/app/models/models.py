from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    mushaf_type = Column(String, default="madani") # "madani" or "tajweed"
    difficulty_level = Column(Integer, default=1) # 1: Beginner, 2: Intermediate, 3: Expert
    daily_streak = Column(Integer, default=0)
    last_active_date = Column(DateTime, nullable=True)
    
    progress = relationship("Progress", back_populates="user")
    recordings = relationship("Recording", back_populates="user")

class Progress(Base):
    __tablename__ = "progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    page_number = Column(Integer, index=True)
    status = Column(String)  # "mastered", "revise", "locked", "started"
    last_updated = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="progress")

class Recording(Base):
    __tablename__ = "recordings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    page_number = Column(Integer)
    file_path = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    score = Column(Integer, nullable=True)     # New field
    feedback = Column(String, nullable=True)   # New field

    user = relationship("User", back_populates="recordings")
