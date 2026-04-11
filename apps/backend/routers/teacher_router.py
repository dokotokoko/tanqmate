from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from services.teacher_service import TeacherService

router = APIRouter(prefix="/api/teacher", tags=["teacher"])

class StudentSummary(BaseModel):
    student_id: str
    student_name: str
    student_number: int
    latest_emotion: Optional[str] = None
    latest_diary_preview: Optional[str] = None
    last_updated: Optional[datetime] = None
    total_entries: int = 0
    
class ClassroomOverview(BaseModel):
    class_id: str
    class_name: str
    total_students: int
    active_today: int
    students: List[StudentSummary]

class StudentDetail(BaseModel):
    student_id: str
    student_name: str
    student_number: int
    emotion_history: List[dict]
    diary_entries: List[dict]
    
@router.get("/classroom/{class_id}/overview", response_model=ClassroomOverview)
async def get_classroom_overview(
    class_id: str,
    teacher_id: str = Query(...),
    service: TeacherService = Depends(lambda: TeacherService())
):
    """教師用ダッシュボード：クラス全体の概要取得"""
    try:
        overview = await service.get_classroom_overview(class_id, teacher_id)
        return overview
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/student/{student_id}/detail", response_model=StudentDetail)
async def get_student_detail(
    student_id: str,
    teacher_id: str = Query(...),
    days: int = Query(30, description="取得する日数"),
    service: TeacherService = Depends(lambda: TeacherService())
):
    """生徒個人の詳細情報取得"""
    try:
        detail = await service.get_student_detail(student_id, teacher_id, days)
        return detail
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/classroom/{class_id}/emotions/summary")
async def get_emotions_summary(
    class_id: str,
    teacher_id: str = Query(...),
    service: TeacherService = Depends(lambda: TeacherService())
):
    """クラス全体の感情分布サマリー取得"""
    try:
        summary = await service.get_emotions_summary(class_id, teacher_id)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))