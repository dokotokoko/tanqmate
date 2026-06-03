# services/legacy_auth_service.py - legacy account verification for migration only

from typing import Any, Dict, Optional
import re

import bcrypt
from fastapi import HTTPException, status

from .base import CacheableService


class LegacyAuthService(CacheableService):
    """Verify legacy username/password pairs without issuing application tokens."""

    def __init__(self, supabase_client, user_id: Optional[str] = None):
        super().__init__(supabase_client, user_id)
        self.username_pattern = re.compile(r"^[a-zA-Z0-9_-]{3,50}$")

    def get_service_name(self) -> str:
        return "LegacyAuthService"

    async def verify_legacy_credentials(self, username: str, password: str) -> Dict[str, Any]:
        if not self.username_pattern.fullmatch(username or ""):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid legacy credentials")
        if not password:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid legacy credentials")

        result = (
            self.supabase.table("users")
            .select("id, username, password")
            .eq("username", username)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid legacy credentials")

        user = result.data[0]
        stored = user.get("password")
        if not stored:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid legacy credentials")

        is_bcrypt = isinstance(stored, str) and stored.startswith(("$2a$", "$2b$", "$2y$"))
        password_ok = (
            bcrypt.checkpw(password.encode("utf-8"), stored.encode("utf-8"))
            if is_bcrypt
            else stored == password
        )

        if not password_ok:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid legacy credentials")

        return {
            "id": user["id"],
            "username": user["username"],
        }
