# routers/diary_router.py - 日誌関連ルーター

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date as DateType, datetime
from services.diary_service import DiaryService
from services.base import ServiceManager
from routers.auth_router import get_current_user, get_supabase_client

# ルーター初期化
router = APIRouter(prefix="/diary", tags=["diary"])

# サービスマネージャー
service_manager = ServiceManager(get_supabase_client())

# Pydanticモデル
class ObservationRequest(BaseModel):
    """AI観察メモ生成リクエスト"""
    content: str = Field(..., description="日誌の内容")
    
class ObservationResponse(BaseModel):
    """AI観察メモレスポンス"""
    observation: str = Field(..., description="AIの観察メモ")
    todaysQuestion: str = Field(..., description="今日の問い")

class DiaryDraftRequest(BaseModel):
    """日誌下書き生成リクエスト"""
    date: Optional[DateType] = Field(None, description="日誌の日付（省略時は今日）")
    conversation_id: Optional[str] = Field(None, description="会話ID（特定の会話に基づく場合）")

class DiaryDraft(BaseModel):
    """AIが生成した日誌下書き"""
    draft_body: str = Field(..., description="下書き本文（100-150字）")
    quote: str = Field(..., description="ユーザー発話の原文引用")
    quote_context: str = Field(..., description="引用の文脈（10字以内）")
    closing_question: str = Field(..., description="ユーザーへの問いかけ")
    suggested_tags: List[str] = Field(..., description="テーマタグ（2-3個）")
    turning_point_detected: bool = Field(False, description="転換点の有無")
    turning_point_note: Optional[str] = Field(None, description="転換点の説明")

class EmotionEvaluation(BaseModel):
    """感情・手ごたえの評価"""
    effort_score: int = Field(..., ge=1, le=5, description="手ごたえ（1-5）")
    mood_tags: List[str] = Field(..., description="気分タグ")
    free_text: Optional[str] = Field(None, description="自由記述")

class DiarySubmitRequest(BaseModel):
    """日誌送信リクエスト"""
    published_body: str = Field(..., description="編集後の本文")
    published_quote: str = Field(..., description="選択した引用")
    published_tags: List[str] = Field(..., description="最終版タグ")
    emotion: EmotionEvaluation = Field(..., description="感情評価")
    ai_draft: DiaryDraft = Field(..., description="元のAI下書き")
    date: Optional[DateType] = Field(None, description="日誌の日付")

class DiaryResponse(BaseModel):
    """日誌レスポンス"""
    id: str
    student_id: str
    date: DateType
    published_body: Optional[str]
    published_quote: Optional[str]
    published_tags: List[str]
    emotion: Optional[Dict[str, Any]]
    turning_point: bool
    submitted_at: Optional[datetime]
    status: str  # "draft" or "submitted"

class TeacherDiaryView(BaseModel):
    """先生用日誌ビュー"""
    id: str
    student_id: str
    student_name: str
    student_email: str
    date: DateType
    published_body: str
    published_quote: str
    published_tags: List[str]
    emotion: Dict[str, Any]
    turning_point: bool
    submitted_at: datetime
    follow_up_flag: Optional[str]

# 依存関数
def get_diary_service(current_user_id: str = Depends(get_current_user)) -> DiaryService:
    """日誌サービス取得"""
    return service_manager.get_service(DiaryService, current_user_id)

# エンドポイント

@router.post("/generate-observation", response_model=ObservationResponse)
async def generate_observation(
    request: ObservationRequest,
    current_user_id: str = Depends(get_current_user),
    diary_service: DiaryService = Depends(get_diary_service)
):
    """AI観察メモと今日の問いを生成"""
    try:
        result = await diary_service.generate_observation(
            user_id=current_user_id,
            content=request.content
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI観察生成エラー: {str(e)}")

@router.post("/generate-draft", response_model=DiaryDraft)
async def generate_diary_draft(
    request: DiaryDraftRequest,
    current_user_id: str = Depends(get_current_user),
    diary_service: DiaryService = Depends(get_diary_service)
):
    """日誌の下書きを生成"""
    try:
        draft = await diary_service.generate_draft(
            user_id=current_user_id,
            target_date=request.date,
            conversation_id=request.conversation_id
        )
        return draft
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"日誌生成エラー: {str(e)}")

@router.post("/submit", response_model=DiaryResponse)
async def submit_diary(
    request: DiarySubmitRequest,
    current_user_id: str = Depends(get_current_user),
    diary_service: DiaryService = Depends(get_diary_service)
):
    """日誌を送信"""
    try:
        diary = await diary_service.submit_diary(
            user_id=current_user_id,
            target_date=request.date,
            published_body=request.published_body,
            published_quote=request.published_quote,
            published_tags=request.published_tags,
            emotion=request.emotion.model_dump(),
            ai_draft=request.ai_draft.model_dump()
        )
        return DiaryResponse(**diary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"日誌送信エラー: {str(e)}")

@router.get("/my-diaries", response_model=List[DiaryResponse])
async def get_my_diaries(
    limit: int = Query(10, ge=1, le=100, description="取得件数"),
    offset: int = Query(0, ge=0, description="オフセット"),
    current_user_id: str = Depends(get_current_user),
    diary_service: DiaryService = Depends(get_diary_service)
):
    """自分の日誌一覧を取得"""
    diaries = await diary_service.get_user_diaries(
        user_id=current_user_id,
        limit=limit,
        offset=offset
    )
    return [DiaryResponse(**diary) for diary in diaries]

@router.get("/today", response_model=Optional[DiaryResponse])
async def get_today_diary(
    current_user_id: str = Depends(get_current_user),
    diary_service: DiaryService = Depends(get_diary_service)
):
    """今日の日誌を取得"""
    diary = await diary_service.get_diary_by_date(
        user_id=current_user_id,
        target_date=DateType.today()
    )
    return DiaryResponse(**diary) if diary else None

# 先生用エンドポイント

@router.get("/teacher/dashboard", response_model=List[TeacherDiaryView])
async def get_teacher_dashboard(
    class_id: Optional[int] = Query(None, description="クラスID"),
    date_from: Optional[DateType] = Query(None, description="開始日"),
    date_to: Optional[DateType] = Query(None, description="終了日"),
    follow_up_only: bool = Query(False, description="要フォローのみ"),
    limit: int = Query(50, ge=1, le=200),
    current_user_id: str = Depends(get_current_user),
    diary_service: DiaryService = Depends(get_diary_service)
):
    """先生用ダッシュボードデータ取得"""
    # TODO: 先生権限チェック
    diaries = await diary_service.get_teacher_dashboard(
        teacher_id=current_user_id,
        class_id=class_id,
        date_from=date_from,
        date_to=date_to,
        follow_up_only=follow_up_only,
        limit=limit
    )
    return [TeacherDiaryView(**diary) for diary in diaries]

@router.get("/teacher/student/{student_id}", response_model=List[DiaryResponse])
async def get_student_diaries(
    student_id: str,
    limit: int = Query(20, ge=1, le=100),
    current_user_id: str = Depends(get_current_user),
    diary_service: DiaryService = Depends(get_diary_service)
):
    """特定生徒の日誌履歴を取得（先生用）"""
    # TODO: 先生権限チェック
    diaries = await diary_service.get_student_diaries(
        teacher_id=current_user_id,
        student_id=student_id,
        limit=limit
    )
    return [DiaryResponse(**diary) for diary in diaries]

@router.get("/stats")
async def get_diary_stats(
    current_user_id: str = Depends(get_current_user),
    diary_service: DiaryService = Depends(get_diary_service)
):
    """日誌統計情報を取得"""
    stats = await diary_service.get_user_stats(user_id=current_user_id)
    return stats
