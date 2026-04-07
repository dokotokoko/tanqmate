"""
Supabase auth middleware and dependency helpers.

This module provides middleware and dependency helpers for the Supabase auth
router and migration endpoints while delegating token verification to the
existing utility implementation.
"""

from __future__ import annotations

from typing import Any, Dict, Iterable, Optional

from fastapi import Depends, HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from utils.supabase_auth import auth, get_current_user as _get_current_user


class SupabaseAuthMiddleware(BaseHTTPMiddleware):
    """Attach auth info to request state when a bearer token is present."""

    def __init__(
        self,
        app,
        service_manager=None,
        excluded_paths: Optional[Iterable[str]] = None,
        rate_limit_per_minute: int = 60,
        cache_ttl: int = 1800,
    ) -> None:
        super().__init__(app)
        self.service_manager = service_manager
        self.excluded_paths = set(excluded_paths or [])
        self.rate_limit_per_minute = rate_limit_per_minute
        self.cache_ttl = cache_ttl

    async def dispatch(self, request: Request, call_next) -> Response:
        request.state.auth = None

        if request.url.path not in self.excluded_paths:
            try:
                authorization = request.headers.get("Authorization", "")
                if authorization.startswith("Bearer "):
                    token = authorization[7:].strip()
                    if token:
                        request.state.auth = auth.get_user_from_token(token)
            except Exception:
                request.state.auth = None

        return await call_next(request)


async def require_supabase_auth(
    request: Request,
    user: Dict[str, Any] = Depends(_get_current_user),
) -> Dict[str, Any]:
    """Return normalized auth info for migration endpoints."""
    auth_info = {
        "user_id": user.get("id"),
        "email": user.get("email"),
        "role": user.get("role", "authenticated"),
        "user": user,
    }
    request.state.auth = auth_info
    return auth_info


def get_auth_info(request: Request) -> Dict[str, Any]:
    """Read auth info populated by middleware or dependencies."""
    auth_info = getattr(request.state, "auth", None)
    if auth_info is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return auth_info
