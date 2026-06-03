# services/admin_service.py - 管理機能・メトリクス管理サービス

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import os
import json
import logging
import re
import secrets
from fastapi import HTTPException, status
from .base import BaseService
from .supabase_auth_service import SupabaseAuthService

logger = logging.getLogger(__name__)

SCHOOL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
PASSWORD_LOWER = "abcdefghjkmnpqrstuvwxyz"
PASSWORD_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"
PASSWORD_DIGITS = "23456789"
PASSWORD_SYMBOLS = "!@#$%*-_"
LOGIN_ID_PATTERN = re.compile(r"^[a-z0-9._-]{3,50}$")
SCHOOL_STATUS_VALUES = {"active", "paused", "archived"}
SUPPORT_CATEGORY_VALUES = {"bug", "support", "request"}
SUPPORT_SEVERITY_VALUES = {"low", "medium", "high", "critical"}
SUPPORT_STATUS_VALUES = {"open", "investigating", "resolved"}

class AdminService(BaseService):
    """管理機能・システム監視を担当するサービスクラス"""
    
    def __init__(self, supabase_client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
    
    def get_service_name(self) -> str:
        return "AdminService"

    def _generate_school_code(self, length: int = 10) -> str:
        return "".join(secrets.choice(SCHOOL_CODE_ALPHABET) for _ in range(length))

    def _generate_temporary_password(self, length: int = 16) -> str:
        if length < 12:
            raise ValueError("Temporary password length must be at least 12")

        chars = [
            secrets.choice(PASSWORD_LOWER),
            secrets.choice(PASSWORD_UPPER),
            secrets.choice(PASSWORD_DIGITS),
            secrets.choice(PASSWORD_SYMBOLS),
        ]
        pool = PASSWORD_LOWER + PASSWORD_UPPER + PASSWORD_DIGITS + PASSWORD_SYMBOLS

        while len(chars) < length:
            chars.append(secrets.choice(pool))

        secrets.SystemRandom().shuffle(chars)
        return "".join(chars)

    def _normalize_login_id(self, login_id: str) -> str:
        normalized = login_id.strip().lower()
        if not LOGIN_ID_PATTERN.fullmatch(normalized):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="login_id must be 3-50 chars of lowercase letters, numbers, ., _, -",
            )
        return normalized

    def _normalize_school_status(self, school_status: str) -> str:
        normalized = school_status.strip().lower()
        if normalized not in SCHOOL_STATUS_VALUES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"school status must be one of: {', '.join(sorted(SCHOOL_STATUS_VALUES))}",
            )
        return normalized

    def _normalize_support_value(self, value: str, allowed: set[str], field_name: str) -> str:
        normalized = value.strip().lower()
        if normalized not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{field_name} must be one of: {', '.join(sorted(allowed))}",
            )
        return normalized

    def _fetch_school_rows(self, limit: int) -> tuple[List[Dict[str, Any]], bool]:
        try:
            result = (
                self.supabase.table("schools")
                .select("id, name, school_code, created_at, updated_at, status, operator_notes")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            schools = result.data or []
            for school in schools:
                school.setdefault("status", "active")
                school.setdefault("operator_notes", "")
            return schools, True
        except Exception:
            result = (
                self.supabase.table("schools")
                .select("id, name, school_code, created_at")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            schools = result.data or []
            for school in schools:
                school["status"] = "active"
                school["operator_notes"] = ""
                school["updated_at"] = school.get("created_at")
            return schools, False

    def _get_school_by_id(self, school_id: str) -> Dict[str, Any]:
        try:
            result = (
                self.supabase.table("schools")
                .select("id, name, school_code, created_at, updated_at, status, operator_notes")
                .eq("id", school_id)
                .execute()
            )
        except Exception:
            result = (
                self.supabase.table("schools")
                .select("id, name, school_code, created_at")
                .eq("id", school_id)
                .execute()
            )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found",
            )

        school = result.data[0]
        school.setdefault("status", "active")
        school.setdefault("operator_notes", "")
        school.setdefault("updated_at", school.get("created_at"))
        return school

    def _find_school_by_code(self, school_code: str) -> Optional[Dict[str, Any]]:
        result = (
            self.supabase.table("schools")
            .select("id, name, school_code, created_at")
            .eq("school_code", school_code)
            .execute()
        )
        return result.data[0] if result.data else None

    def _find_school_by_name(self, school_name: str) -> Optional[Dict[str, Any]]:
        result = (
            self.supabase.table("schools")
            .select("id, name, school_code, created_at")
            .eq("name", school_name)
            .execute()
        )
        return result.data[0] if result.data else None

    def _get_or_create_school(
        self,
        school_name: str,
        school_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        normalized_name = school_name.strip()
        if not normalized_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="school_name is required",
            )

        normalized_code = school_code.strip().upper() if school_code else None
        if normalized_code:
            existing_school = self._find_school_by_code(normalized_code)
            if existing_school:
                if existing_school.get("name") != normalized_name:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="school_code is already assigned to another school",
                    )
                return existing_school

            existing_by_name = self._find_school_by_name(normalized_name)
            if existing_by_name:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="school_name already exists with a different school_code",
                )

            result = (
                self.supabase.table("schools")
                .insert(
                    {
                        "name": normalized_name,
                        "school_code": normalized_code,
                    }
                )
                .execute()
            )
            if result.data:
                return result.data[0]
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create school",
            )

        existing_by_name = self._find_school_by_name(normalized_name)
        if existing_by_name:
            return existing_by_name

        for _ in range(10):
            generated_code = self._generate_school_code()
            if self._find_school_by_code(generated_code):
                continue

            result = (
                self.supabase.table("schools")
                .insert(
                    {
                        "name": normalized_name,
                        "school_code": generated_code,
                    }
                )
                .execute()
            )
            if result.data:
                return result.data[0]

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to issue unique school code",
        )

    def _upsert_teacher_profile(
        self,
        user_id: str,
        school_id: str,
        email: str,
        login_id: str,
        name: str,
    ) -> None:
        profile_payload = {
            "id": user_id,
            "email": email,
            "username": login_id,
            "name": name,
            "role": "teacher",
            "school_id": school_id,
            "school_code_locked": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        result = self.supabase.table("profiles").upsert(profile_payload).execute()
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update teacher profile",
            )

    async def _issue_teacher_credentials(
        self,
        school: Dict[str, Any],
        teacher: Dict[str, str],
        auth_service: SupabaseAuthService,
    ) -> Dict[str, Any]:
        name = (teacher.get("name") or "").strip()
        email = (teacher.get("email") or "").strip().lower()
        login_id = self._normalize_login_id(teacher.get("login_id") or "")

        if not name or not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Teacher name, email, and login_id are required",
            )

        login_profile_result = (
            self.supabase.table("profiles")
            .select("id, email, username, school_id")
            .eq("username", login_id)
            .eq("school_id", school["id"])
            .execute()
        )
        if login_profile_result.data:
            existing_login_profile = login_profile_result.data[0]
            if existing_login_profile.get("email") != email:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"login_id already exists in this school: {login_id}",
                )

        existing_profile_result = (
            self.supabase.table("profiles")
            .select("id, email, username, role, school_id, name")
            .eq("email", email)
            .execute()
        )
        existing_profile = (
            existing_profile_result.data[0] if existing_profile_result.data else None
        )

        temporary_password = self._generate_temporary_password()

        if existing_profile:
            existing_school_id = existing_profile.get("school_id")
            existing_role = existing_profile.get("role")
            if existing_school_id and existing_school_id != school["id"]:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Teacher email already belongs to another school: {email}",
                )
            if existing_role not in (None, "teacher"):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Existing account is not a teacher account: {email}",
                )

            existing_user = await auth_service.get_user_by_id(existing_profile["id"])
            user_metadata = (existing_user or {}).get("user_metadata") or {}
            user_metadata.update(
                {
                    "name": name,
                    "username": login_id,
                    "role": "teacher",
                }
            )
            await auth_service.update_user(
                existing_profile["id"],
                password=temporary_password,
                user_metadata=user_metadata,
            )
            self._upsert_teacher_profile(
                existing_profile["id"],
                school["id"],
                email,
                login_id,
                name,
            )
            return {
                "status": "password_reset",
                "teacher_id": existing_profile["id"],
                "name": name,
                "email": email,
                "login_id": login_id,
                "temporary_password": temporary_password,
            }

        created_user = await auth_service.create_user(
            email=email,
            password=temporary_password,
            user_metadata={
                "name": name,
                "username": login_id,
                "role": "teacher",
            },
        )
        if not created_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create teacher account: {email}",
            )

        self._upsert_teacher_profile(
            created_user["id"],
            school["id"],
            email,
            login_id,
            name,
        )
        return {
            "status": "created",
            "teacher_id": created_user["id"],
            "name": name,
            "email": email,
            "login_id": login_id,
            "temporary_password": temporary_password,
        }

    async def issue_school_credentials(
        self,
        school_name: str,
        teachers: List[Dict[str, str]],
        school_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not teachers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one teacher is required",
            )

        school = self._get_or_create_school(school_name, school_code)
        auth_service = SupabaseAuthService(self.supabase)
        issued_teachers = []

        for teacher in teachers:
            issued_teachers.append(
                await self._issue_teacher_credentials(school, teacher, auth_service)
            )

        return {
            "school": {
                "id": school["id"],
                "name": school["name"],
                "school_code": school["school_code"],
            },
            "teachers": issued_teachers,
            "issued_at": datetime.now(timezone.utc).isoformat(),
        }

    async def add_teachers_to_school(
        self,
        school_id: str,
        teachers: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        if not teachers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one teacher is required",
            )

        school = self._get_school_by_id(school_id)
        auth_service = SupabaseAuthService(self.supabase)
        issued_teachers = []

        for teacher in teachers:
            issued_teachers.append(
                await self._issue_teacher_credentials(school, teacher, auth_service)
            )

        return {
            "school": {
                "id": school["id"],
                "name": school["name"],
                "school_code": school["school_code"],
            },
            "teachers": issued_teachers,
            "issued_at": datetime.now(timezone.utc).isoformat(),
        }

    async def reset_teacher_password(
        self,
        teacher_id: str,
    ) -> Dict[str, Any]:
        teacher_result = (
            self.supabase.table("profiles")
            .select("id, email, name, username, role, school_id")
            .eq("id", teacher_id)
            .execute()
        )
        if not teacher_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher not found",
            )

        teacher = teacher_result.data[0]
        if teacher.get("role") != "teacher":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target account is not a teacher",
            )
        if not teacher.get("email"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Teacher email is not configured",
            )

        school = self._get_school_by_id(teacher["school_id"])
        temporary_password = self._generate_temporary_password()
        auth_service = SupabaseAuthService(self.supabase)
        existing_user = await auth_service.get_user_by_id(teacher_id)
        user_metadata = (existing_user or {}).get("user_metadata") or {}
        user_metadata.update(
            {
                "name": teacher.get("name"),
                "username": teacher.get("username"),
                "role": "teacher",
            }
        )
        await auth_service.update_user(
            teacher_id,
            password=temporary_password,
            user_metadata=user_metadata,
        )

        return {
            "school": {
                "id": school["id"],
                "name": school["name"],
                "school_code": school["school_code"],
            },
            "teachers": [
                {
                    "status": "password_reset",
                    "teacher_id": teacher["id"],
                    "name": teacher.get("name"),
                    "email": teacher.get("email"),
                    "login_id": teacher.get("username"),
                    "temporary_password": temporary_password,
                }
            ],
            "issued_at": datetime.now(timezone.utc).isoformat(),
        }

    async def update_school(
        self,
        school_id: str,
        school_status: Optional[str] = None,
        operator_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        self._get_school_by_id(school_id)
        update_payload: Dict[str, Any] = {
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        if school_status is not None:
            update_payload["status"] = self._normalize_school_status(school_status)
        if operator_notes is not None:
            update_payload["operator_notes"] = operator_notes.strip()

        if len(update_payload) == 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No school fields to update",
            )

        try:
            result = (
                self.supabase.table("schools")
                .update(update_payload)
                .eq("id", school_id)
                .execute()
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="School management columns are unavailable. Apply admin_school_management_schema.sql first.",
            ) from exc

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update school",
            )

        school = result.data[0]
        school.setdefault("status", "active")
        school.setdefault("operator_notes", "")
        return school

    async def delete_school(
        self,
        school_id: str,
    ) -> Dict[str, Any]:
        school = self._get_school_by_id(school_id)

        linked_profiles = (
            self.supabase.table("profiles")
            .select("id", count="exact")
            .eq("school_id", school_id)
            .execute()
            .count
            or 0
        )
        if linked_profiles > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="School has linked teacher or student accounts and cannot be deleted",
            )

        try:
            ticket_count = (
                self.supabase.table("school_support_tickets")
                .select("id", count="exact")
                .eq("school_id", school_id)
                .execute()
                .count
                or 0
            )
        except Exception:
            ticket_count = 0

        if ticket_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="School has support tickets and cannot be deleted",
            )

        result = (
            self.supabase.table("schools")
            .delete()
            .eq("id", school_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete school",
            )

        return {
            "success": True,
            "message": f"Deleted school {school['name']}",
            "school_id": school_id,
        }

    def _fetch_support_tickets(
        self,
        limit: int = 50,
        status_filter: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            query = (
                self.supabase.table("school_support_tickets")
                .select(
                    "id, school_id, category, severity, status, title, description, source, admin_note, created_at, updated_at, resolved_at"
                )
                .order("created_at", desc=True)
                .limit(limit)
            )
            if status_filter:
                query = query.eq("status", status_filter)

            result = query.execute()
            tickets = result.data or []
        except Exception:
            return {
                "schema_available": False,
                "tickets": [],
                "open_count": 0,
            }

        try:
            open_count_query = (
                self.supabase.table("school_support_tickets")
                .select("id", count="exact")
            )
            if status_filter:
                open_count_query = open_count_query.eq("status", status_filter)
            else:
                open_count_query = open_count_query.neq("status", "resolved")
            open_count = open_count_query.execute().count or 0
        except Exception:
            open_count = sum(1 for ticket in tickets if ticket.get("status") != "resolved")

        school_ids = list({ticket["school_id"] for ticket in tickets if ticket.get("school_id")})
        school_map: Dict[str, Dict[str, Any]] = {}
        if school_ids:
            schools_result = (
                self.supabase.table("schools")
                .select("id, name, school_code")
                .in_("id", school_ids)
                .execute()
            )
            school_map = {
                school["id"]: school
                for school in (schools_result.data or [])
            }

        for ticket in tickets:
            school = school_map.get(ticket.get("school_id"))
            ticket["school_name"] = school.get("name") if school else None
            ticket["school_code"] = school.get("school_code") if school else None
        return {
            "schema_available": True,
            "tickets": tickets,
            "open_count": open_count,
        }

    async def create_support_ticket(
        self,
        school_id: str,
        category: str,
        severity: str,
        title: str,
        description: str,
        source: str = "manual",
    ) -> Dict[str, Any]:
        self._get_school_by_id(school_id)

        normalized_category = self._normalize_support_value(
            category, SUPPORT_CATEGORY_VALUES, "category"
        )
        normalized_severity = self._normalize_support_value(
            severity, SUPPORT_SEVERITY_VALUES, "severity"
        )

        if not title.strip() or not description.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="title and description are required",
            )

        payload = {
            "school_id": school_id,
            "category": normalized_category,
            "severity": normalized_severity,
            "status": "open",
            "title": title.strip(),
            "description": description.strip(),
            "source": source.strip() or "manual",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            result = self.supabase.table("school_support_tickets").insert(payload).execute()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Support ticket table is unavailable. Apply admin_school_management_schema.sql first.",
            ) from exc

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create support ticket",
            )

        return result.data[0]

    async def update_support_ticket(
        self,
        ticket_id: str,
        ticket_status: Optional[str] = None,
        severity: Optional[str] = None,
        admin_note: Optional[str] = None,
    ) -> Dict[str, Any]:
        update_payload: Dict[str, Any] = {
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if ticket_status is not None:
            normalized_status = self._normalize_support_value(
                ticket_status, SUPPORT_STATUS_VALUES, "status"
            )
            update_payload["status"] = normalized_status
            update_payload["resolved_at"] = (
                datetime.now(timezone.utc).isoformat()
                if normalized_status == "resolved"
                else None
            )
        if severity is not None:
            update_payload["severity"] = self._normalize_support_value(
                severity, SUPPORT_SEVERITY_VALUES, "severity"
            )
        if admin_note is not None:
            update_payload["admin_note"] = admin_note.strip()

        if len(update_payload) == 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No support ticket fields to update",
            )

        try:
            result = (
                self.supabase.table("school_support_tickets")
                .update(update_payload)
                .eq("id", ticket_id)
                .execute()
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Support ticket table is unavailable. Apply admin_school_management_schema.sql first.",
            ) from exc

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Support ticket not found",
            )

        return result.data[0]

    async def get_school_dashboard(self, limit: int = 25) -> Dict[str, Any]:
        normalized_limit = max(1, min(limit, 100))
        schools, school_management_schema_available = self._fetch_school_rows(normalized_limit)
        school_ids = [school["id"] for school in schools]

        schools_total = (
            self.supabase.table("schools")
            .select("id", count="exact")
            .execute()
            .count
            or 0
        )
        teachers_total = (
            self.supabase.table("profiles")
            .select("id", count="exact")
            .eq("role", "teacher")
            .execute()
            .count
            or 0
        )
        students_total = (
            self.supabase.table("profiles")
            .select("id", count="exact")
            .eq("role", "student")
            .execute()
            .count
            or 0
        )

        if not school_ids:
            return {
                "summary": {
                    "schools_total": schools_total,
                    "teachers_total": teachers_total,
                    "students_total": students_total,
                    "open_support_tickets": 0,
                },
                "schools": [],
                "support_tickets": [],
                "schema": {
                    "school_management": school_management_schema_available,
                    "support_tickets": False,
                },
                "generated_at": datetime.now(timezone.utc).isoformat(),
            }

        profiles_result = (
            self.supabase.table("profiles")
            .select("id, name, email, username, role, school_id, created_at, updated_at")
            .in_("school_id", school_ids)
            .execute()
        )
        profiles = profiles_result.data or []

        by_school: Dict[str, Dict[str, Any]] = {}
        for school in schools:
            by_school[school["id"]] = {
                **school,
                "teacher_count": 0,
                "student_count": 0,
                "support_ticket_count": 0,
                "can_delete": True,
                "teacher_accounts": [],
            }

        for profile in profiles:
            school_bucket = by_school.get(profile.get("school_id"))
            if not school_bucket:
                continue

            if profile.get("role") == "teacher":
                school_bucket["teacher_count"] += 1
                school_bucket["teacher_accounts"].append(
                    {
                        "id": profile.get("id"),
                        "name": profile.get("name"),
                        "email": profile.get("email"),
                        "login_id": profile.get("username"),
                        "updated_at": profile.get("updated_at"),
                    }
                )
            elif profile.get("role") == "student":
                school_bucket["student_count"] += 1
                school_bucket["can_delete"] = False

        for school in by_school.values():
            if school["teacher_count"] > 0:
                school["can_delete"] = False

        support_ticket_data = self._fetch_support_tickets(limit=20)
        for ticket in support_ticket_data["tickets"]:
            school_bucket = by_school.get(ticket.get("school_id"))
            if school_bucket:
                school_bucket["support_ticket_count"] += 1
                school_bucket["can_delete"] = False

        return {
            "summary": {
                "schools_total": schools_total,
                "teachers_total": teachers_total,
                "students_total": students_total,
                "open_support_tickets": support_ticket_data["open_count"],
            },
            "schools": list(by_school.values()),
            "support_tickets": support_ticket_data["tickets"],
            "schema": {
                "school_management": school_management_schema_available,
                "support_tickets": support_ticket_data["schema_available"],
            },
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    
    async def create_test_user(self, username: str, password: str) -> Dict[str, Any]:
        """負荷テスト用ユーザー作成"""
        try:
            # セキュリティ: loadtest_user_* パターンのみ許可
            if not username.startswith("loadtest_user_"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="テストユーザー名は 'loadtest_user_' で始まる必要があります"
                )
            
            # 既存ユーザーチェック
            existing_user = self.supabase.table("users")\
                .select("id")\
                .eq("username", username)\
                .execute()
                
            if existing_user.data:
                return {
                    "message": f"ユーザー {username} は既に存在します",
                    "id": existing_user.data[0]["id"],
                    "status": "already_exists"
                }
            
            # ユーザー作成
            result = self.supabase.table("users").insert({
                "username": username,
                "password": password,  # 本来はハッシュ化すべき
                "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
            
            if result.data and len(result.data) > 0:
                user = result.data[0]
                return {
                    "message": f"テストユーザー {username} を作成しました",
                    "id": user["id"],
                    "status": "created"
                }
            else:
                raise HTTPException(status_code=500, detail="ユーザー作成に失敗しました")
                
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Create test user")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    async def cleanup_test_users(self) -> Dict[str, Any]:
        """テストユーザーの一括削除"""
        try:
            # loadtest_user_* パターンのユーザーを削除
            result = self.supabase.table("users")\
                .delete()\
                .like("username", "loadtest_user_%")\
                .execute()
            
            deleted_count = len(result.data) if result.data else 0
            
            # 関連データのクリーンアップ（必要に応じて）
            if deleted_count > 0:
                self.logger.info(f"Cleaned up {deleted_count} test users")
            
            return {
                "message": f"{deleted_count}人のテストユーザーを削除しました",
                "deleted_count": deleted_count,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            error_result = self.handle_error(e, "Cleanup test users")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    def get_llm_system_metrics(self) -> Dict[str, Any]:
        """LLMシステムのメトリクス取得（refactored版: module.llm_api中心）"""
        try:
            metrics_data = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "async_llm": {}
            }

            # module.llm_api の非同期クライアントメトリクス
            try:
                from module.llm_api import get_async_llm_client
                pool_size = int(os.environ.get("LLM_POOL_SIZE", "5"))
                client = get_async_llm_client(pool_size=pool_size)
                metrics_data["async_llm"] = {
                    "status": "active",
                    "pool_size": pool_size,
                    "metrics": client.get_metrics()
                }
            except Exception as e:
                metrics_data["async_llm"] = {"status": "error", "error": str(e)}
            
            return metrics_data
            
        except Exception as e:
            error_result = self.handle_error(e, "Get LLM system metrics")
            return {
                "error": error_result["error"],
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    
    def get_debug_info(self) -> Dict[str, Any]:
        """システムデバッグ情報取得"""
        try:
            debug_info = {
                "environment_variables": {
                    "LLM_POOL_SIZE": os.environ.get("LLM_POOL_SIZE", "5"),
                },
                "system_status": {
                    "current_time": datetime.now(timezone.utc).isoformat()
                }
            }
            
            # module.llm_api の非同期LLM状態
            try:
                from module.llm_api import get_async_llm_client
                pool_size = int(os.environ.get("LLM_POOL_SIZE", "5"))
                client = get_async_llm_client(pool_size=pool_size)
                debug_info["system_status"]["async_llm_available"] = client is not None
                debug_info["system_status"]["async_llm_pool_size"] = pool_size
                debug_info["system_status"]["async_llm_metrics"] = client.get_metrics()
            except Exception as e:
                debug_info["system_status"]["async_llm_error"] = str(e)
            
            return debug_info
            
        except Exception as e:
            error_result = self.handle_error(e, "Get debug info")
            return {"error": error_result["error"]}
    
    def log_system_status_to_logger(self) -> Dict[str, Any]:
        """LLMシステムの状態をログに出力"""
        try:
            from module.llm_api import get_async_llm_client
            pool_size = int(os.environ.get("LLM_POOL_SIZE", "5"))
            client = get_async_llm_client(pool_size=pool_size)
            metrics = client.get_metrics()
            self.logger.info(f"📊 LLMシステム状態: async_llm active (LLM_POOL_SIZE={pool_size}) metrics={metrics}")
            return {
                "message": "LLMシステム状態をログに出力しました",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "success",
                "metrics": metrics
            }
                
        except Exception as e:
            error_result = self.handle_error(e, "Log system status")
            return {
                "error": error_result["error"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "error"
            }
    
    def get_system_stats(self) -> Dict[str, Any]:
        """システム全体の統計情報取得"""
        try:
            stats = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "database_stats": {},
                "user_stats": {},
                "content_stats": {}
            }
            
            # ユーザー統計
            try:
                user_count = self.supabase.table("users")\
                    .select("id", count="exact")\
                    .execute().count or 0
                    
                test_user_count = self.supabase.table("users")\
                    .select("id", count="exact")\
                    .like("username", "loadtest_user_%")\
                    .execute().count or 0
                    
                stats["user_stats"] = {
                    "total_users": user_count,
                    "test_users": test_user_count,
                    "regular_users": user_count - test_user_count
                }
            except Exception as e:
                stats["user_stats"]["error"] = str(e)
            
            # コンテンツ統計
            try:
                memo_count = self.supabase.table("memos")\
                    .select("id", count="exact")\
                    .execute().count or 0
                    
                project_count = self.supabase.table("projects")\
                    .select("id", count="exact")\
                    .execute().count or 0
                    
                chat_count = self.supabase.table("chat_logs")\
                    .select("id", count="exact")\
                    .execute().count or 0
                    
                stats["content_stats"] = {
                    "memos": memo_count,
                    "projects": project_count,
                    "chat_logs": chat_count
                }
            except Exception as e:
                stats["content_stats"]["error"] = str(e)
            
            # クエスト統計
            try:
                quest_count = self.supabase.table("quests")\
                    .select("id", count="exact")\
                    .eq("is_active", True)\
                    .execute().count or 0
                    
                user_quest_count = self.supabase.table("user_quests")\
                    .select("id", count="exact")\
                    .execute().count or 0
                    
                stats["content_stats"]["quests"] = quest_count
                stats["content_stats"]["user_quests"] = user_quest_count
            except Exception as e:
                stats["content_stats"]["quest_error"] = str(e)
            
            return stats
            
        except Exception as e:
            error_result = self.handle_error(e, "Get system stats")
            return {
                "error": error_result["error"],
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    
    def check_system_health(self) -> Dict[str, Any]:
        """システム健全性チェック"""
        try:
            health_status = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "overall_status": "healthy",
                "components": {}
            }
            
            issues = []
            
            # データベース接続チェック
            try:
                self.supabase.table("users").select("id").limit(1).execute()
                health_status["components"]["database"] = "healthy"
            except Exception as e:
                health_status["components"]["database"] = f"unhealthy: {str(e)}"
                issues.append("database_connection")
            
            # LLMシステムチェック
            try:
                from module.llm_api import get_async_llm_client
                pool_size = int(os.environ.get("LLM_POOL_SIZE", "5"))
                client = get_async_llm_client(pool_size=pool_size)
                health_status["components"]["async_llm"] = "healthy" if client else "not_available"
                
            except Exception as e:
                health_status["components"]["llm_systems"] = f"check_failed: {str(e)}"
                issues.append("llm_system_check")
            
            # 全体ステータス判定
            if issues:
                health_status["overall_status"] = "degraded" if len(issues) == 1 else "unhealthy"
                health_status["issues"] = issues
            
            return health_status
            
        except Exception as e:
            return {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "overall_status": "error",
                "error": str(e)
            }
    
    async def get_llm_system_metrics_async(self) -> Dict[str, Any]:
        """LLMシステムのメトリクス取得（非同期版）"""
        try:
            metrics = self.get_llm_system_metrics()
            
            # フォーマットを統一
            llm_metrics = metrics.get("async_llm", {}).get("metrics", {}) or {}
            return {
                "status": "active" if metrics.get("async_llm", {}).get("status") == "active" else "degraded",
                "active_clients": 1 if metrics.get("async_llm", {}).get("status") == "active" else 0,
                "last_request": None,  # 実装されていない
                "error_rate": 0.0,  # 現状、OpenAI SDK側のエラー率は集計していない
                "total_requests": int(llm_metrics.get("total_requests", 0)),
                "avg_response_time": float(llm_metrics.get("average_response_time", 0.0)),
                "detailed_metrics": metrics
            }
        except Exception as e:
            error_result = self.handle_error(e, "Get LLM system metrics async")
            return {
                "status": "error",
                "active_clients": 0,
                "last_request": None,
                "error_rate": 1.0,
                "total_requests": 0,
                "avg_response_time": 0.0,
                "error": error_result["error"]
            }
    
    async def get_llm_system_debug(self) -> Dict[str, Any]:
        """LLMシステムのデバッグ情報取得（非同期版）"""
        try:
            return self.get_debug_info()
        except Exception as e:
            error_result = self.handle_error(e, "Get LLM system debug async")
            return {"error": error_result["error"]}
    
    def check_quest_tables(self) -> Dict[str, Any]:
        """クエスト関連テーブルの存在確認"""
        try:
            table_status = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "tables": {}
            }
            
            # 確認するテーブルのリスト
            quest_tables = [
                "quests",
                "user_quests", 
                "quest_submissions",
                "quest_categories"
            ]
            
            all_exist = True
            
            for table_name in quest_tables:
                try:
                    # テーブルの存在確認（1行だけ取得を試行）
                    result = self.supabase.table(table_name)\
                        .select("*")\
                        .limit(1)\
                        .execute()
                    
                    table_status["tables"][table_name] = {
                        "exists": True,
                        "row_count": len(result.data) if result.data else 0
                    }
                    
                except Exception as e:
                    table_status["tables"][table_name] = {
                        "exists": False,
                        "error": str(e)
                    }
                    all_exist = False
            
            table_status["all_tables_exist"] = all_exist
            table_status["status"] = "healthy" if all_exist else "missing_tables"
            
            return table_status
            
        except Exception as e:
            error_result = self.handle_error(e, "Check quest tables")
            return {
                "error": error_result["error"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "error"
            }
    
    async def log_llm_system_status(
        self,
        timestamp: str,
        status: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """LLMシステム状態をログ記録"""
        try:
            # ログエントリを作成
            log_entry = {
                "timestamp": timestamp,
                "status": status,
                "message": message,
                "metadata": metadata or {},
                "recorded_at": datetime.now(timezone.utc).isoformat()
            }
            
            # ログをファイルまたはデータベースに記録
            self.logger.info(f"LLM System Status: {status} - {message}")
            
            if metadata:
                self.logger.debug(f"LLM System Metadata: {metadata}")
            
            # 必要に応じてデータベースにも記録
            try:
                # システムログテーブルに保存（存在する場合）
                result = self.supabase.table("system_logs").insert({
                    "service": "llm_system",
                    "level": status,
                    "message": message,
                    "metadata": json.dumps(metadata) if metadata else None,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }).execute()
                
                log_id = result.data[0]["id"] if result.data else None
                
            except Exception as db_error:
                # テーブルが存在しない場合はログのみ
                self.logger.debug(f"System logs table not available: {db_error}")
                log_id = None
            
            return {
                "message": "LLMシステム状態をログ記録しました",
                "log_id": log_id,
                "timestamp": timestamp
            }
            
        except Exception as e:
            error_result = self.handle_error(e, "Log LLM system status")
            raise Exception(error_result["error"])
