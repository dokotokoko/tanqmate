"""Helpers for dual user-id management during the Supabase UUID migration."""

from typing import Any, Dict, Optional, Tuple


def resolve_legacy_user_id(supabase_client, supabase_user_id: str) -> Optional[int]:
    """Best-effort lookup for a legacy bigint user id."""
    try:
        mapping_result = (
            supabase_client.table("user_id_mapping")
            .select("legacy_user_id")
            .eq("supabase_uid", supabase_user_id)
            .execute()
        )
        if mapping_result.data and mapping_result.data[0].get("legacy_user_id") is not None:
            return int(mapping_result.data[0]["legacy_user_id"])
    except Exception:
        pass

    return None


def get_user_identifiers(supabase_client, supabase_user_id: str) -> Tuple[str, Optional[int]]:
    """Return the canonical Supabase UUID and optional legacy user id."""
    return supabase_user_id, resolve_legacy_user_id(supabase_client, supabase_user_id)


def attach_user_identity(
    payload: Dict[str, Any],
    supabase_client,
    supabase_user_id: str,
    *,
    legacy_column: str = "user_id",
    supabase_column: str = "supabase_user_id",
) -> Dict[str, Any]:
    """Attach dual user-id fields for inserts/updates during migration."""
    _, legacy_user_id = get_user_identifiers(supabase_client, supabase_user_id)
    payload[supabase_column] = supabase_user_id
    payload[legacy_column] = legacy_user_id
    return payload


def apply_user_scope(
    query,
    supabase_client,
    supabase_user_id: str,
    *,
    legacy_column: str = "user_id",
    supabase_column: str = "supabase_user_id",
):
    """Apply a user filter that prefers UUID and also matches legacy records when present."""
    _, legacy_user_id = get_user_identifiers(supabase_client, supabase_user_id)
    if legacy_user_id is None:
        return query.eq(supabase_column, supabase_user_id)

    return query.or_(
        f"{supabase_column}.eq.{supabase_user_id},{legacy_column}.eq.{legacy_user_id}"
    )
