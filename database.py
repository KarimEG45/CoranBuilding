from sqlalchemy import create_engine, Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

import os
import sys

# Get Base Directory for DB relative to executable or script
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# SQLite Database URL with absolute path
db_path = os.path.join(BASE_DIR, "quran_app.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"

# Create Engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

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
    details = Column(String, nullable=True)    # JSON string for detailed errors

    user = relationship("User", back_populates="recordings")

def init_db():
    Base.metadata.create_all(bind=engine)
