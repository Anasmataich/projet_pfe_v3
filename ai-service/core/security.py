"""
security.py — Sécurité du microservice IA.

Fournit la dépendance ``verify_api_key`` utilisée pour protéger
les endpoints sensibles via le header ``X-API-Key``.
"""

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader

from core.config import settings

# ── Schéma d'authentification par clé API ─────
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(
    api_key: str | None = Security(_api_key_header),
) -> str:
    """
    Valide la clé API transmise dans le header ``X-API-Key``.

    Returns:
        La clé validée (utile pour le logging).

    Raises:
        HTTPException 401: si la clé est absente.
        HTTPException 403: si la clé ne correspond pas.
    """
    if not settings.API_KEY:
        # Pas de clé configurée → mode développement, on laisse passer
        return "dev-no-key"

    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Clé API manquante. Ajoutez le header X-API-Key.",
        )

    if api_key != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clé API invalide.",
        )

    return api_key
