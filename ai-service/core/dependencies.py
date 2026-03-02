"""
dependencies.py — Dépendances partagées injectées dans les routes FastAPI.

Centralise les clients S3 pour éviter toute ré-initialisation
superflue à chaque requête.
"""

from functools import lru_cache
from typing import Any

import boto3
from botocore.config import Config as BotoConfig
from loguru import logger

from core.config import settings


@lru_cache
def get_s3_client() -> Any:
    """
    Retourne un client boto3 S3 avec pool de connexions.

    Le client est mis en cache pour la durée de vie du processus.
    """
    logger.info(f"[S3] Connexion au endpoint {settings.S3_ENDPOINT}")
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
        config=BotoConfig(
            max_pool_connections=25,
            connect_timeout=10,
            read_timeout=60,
            retries={"max_attempts": 3, "mode": "adaptive"},
        ),
    )


def download_file_from_s3(storage_key: str) -> bytes:
    """
    Télécharge un fichier depuis le bucket S3 / MinIO.

    Raises:
        botocore.exceptions.ClientError: Si le téléchargement échoue.
    """
    client = get_s3_client()
    response = client.get_object(Bucket=settings.S3_BUCKET, Key=storage_key)
    return response["Body"].read()
