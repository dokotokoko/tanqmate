"""Authentication helpers used by the Supabase-authenticated application."""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


class AuthUtils:
    """Utility methods kept for legacy ID mapping during the Supabase migration."""

    @classmethod
    def convert_legacy_to_supabase_id(cls, legacy_user_id: int, supabase_client) -> Optional[str]:
        """Return the mapped Supabase UID for a legacy integer user ID."""
        try:
            result = (
                supabase_client.table("user_id_mapping")
                .select("supabase_uid")
                .eq("legacy_user_id", legacy_user_id)
                .execute()
            )

            if result.data:
                return result.data[0]["supabase_uid"]

            return None
        except Exception as exc:
            logger.error("Error converting legacy ID to Supabase UID: %s", exc)
            return None

    @classmethod
    def convert_supabase_to_legacy_id(cls, supabase_uid: str, supabase_client) -> Optional[int]:
        """Return the mapped legacy integer user ID for a Supabase UID."""
        try:
            result = (
                supabase_client.table("user_id_mapping")
                .select("legacy_user_id")
                .eq("supabase_uid", supabase_uid)
                .execute()
            )

            if result.data:
                return result.data[0]["legacy_user_id"]

            return None
        except Exception as exc:
            logger.error("Error converting Supabase UID to legacy ID: %s", exc)
            return None
