import os
from typing import Optional

from supabase import Client, create_client


SERVICE_KEY_ENV_NAMES = (
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
)


def _clean_env(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def get_supabase_url() -> Optional[str]:
    return _clean_env(os.environ.get("SUPABASE_URL"))


def get_supabase_service_key() -> Optional[str]:
    for env_name in SERVICE_KEY_ENV_NAMES:
        value = _clean_env(os.environ.get(env_name))
        if value:
            return value
    return None


def create_supabase_admin_client() -> Optional[Client]:
    supabase_url = get_supabase_url()
    service_key = get_supabase_service_key()

    if not supabase_url or not service_key:
        return None

    return create_client(supabase_url, service_key)
