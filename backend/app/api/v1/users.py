from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.models import User, Progress
from backend.app.schemas.schemas import SettingsUpdate, User as UserSchema
from typing import List

router = APIRouter()

@router.get("/me", response_model=UserSchema)
async def read_users_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Update Streak Logic
    now = datetime.now()
    today = now.date()
    
    if current_user.last_active_date:
        last_active = current_user.last_active_date.date()
        diff = (today - last_active).days
        
        if diff == 1:
            current_user.daily_streak += 1
            current_user.last_active_date = now
        elif diff > 1:
            current_user.daily_streak = 1
            current_user.last_active_date = now
        # If diff == 0, streak remains same, but update time? No need.
    else:
        current_user.daily_streak = 1
        current_user.last_active_date = now
    
    db.commit()
    db.refresh(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/me/progress")
def get_user_progress(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    progress_records = db.query(Progress).filter(Progress.user_id == current_user.id).all()
    # Return as a dictionary {page_number: status}
    return {p.page_number: p.status for p in progress_records}

@router.post("/me/progress")
async def update_user_progress(
    data: dict, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    page = data.get("page")
    status = data.get("status")
    if page is None or status is None:
        raise HTTPException(status_code=400, detail="Missing page or status")
    
    record = db.query(Progress).filter(
        Progress.user_id == current_user.id,
        Progress.page_number == page
    ).first()
    
    if record:
        record.status = status
        record.last_updated = datetime.utcnow()
    else:
        record = Progress(user_id=current_user.id, page_number=page, status=status)
        db.add(record)
    
    db.commit()
    return {"status": "saved"}

@router.put("/me/settings")
async def update_settings(settings: SettingsUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.mushaf_type = settings.mushaf_type
    current_user.difficulty_level = settings.difficulty_level
    db.commit()
    return {"status": "updated", "mushaf_type": current_user.mushaf_type, "difficulty_level": current_user.difficulty_level}

@router.delete("/me")
async def delete_user(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Delete progress first
    db.query(Progress).filter(Progress.user_id == current_user.id).delete()
    # Delete user
    db.delete(current_user)
    db.commit()
    return {"status": "user deleted"}

@router.get("/all")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": u.id, "username": u.username} for u in users]

@router.delete("/admin/{user_id}")
def admin_delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.query(Progress).filter(Progress.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    return {"status": "user deleted"}
