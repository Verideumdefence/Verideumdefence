from functools import lru_cache
import json
from pathlib import Path

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_database_url() -> str:
    # Continue using an existing local database file after the brand rename.
    if Path("ciphera.db").is_file() and not Path("verideumdefence.db").exists():
        return "sqlite:///./ciphera.db"
    return "sqlite:///./verideumdefence.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    project_name: str = Field(
        default="VerideumDefence API",
        validation_alias=AliasChoices("VERIDEUMDEFENCE_PROJECT_NAME", "CIPHERA_PROJECT_NAME"),
    )
    environment: str = Field(
        default="development",
        validation_alias=AliasChoices("VERIDEUMDEFENCE_ENVIRONMENT", "CIPHERA_ENVIRONMENT"),
    )
    api_v1_prefix: str = Field(
        default="/api/v1",
        validation_alias=AliasChoices("VERIDEUMDEFENCE_API_V1_PREFIX", "CIPHERA_API_V1_PREFIX"),
    )
    secret_key: str = Field(
        default="dev-secret-change-me",
        validation_alias=AliasChoices("VERIDEUMDEFENCE_SECRET_KEY", "CIPHERA_SECRET_KEY"),
    )
    algorithm: str = Field(
        default="HS256",
        validation_alias=AliasChoices("VERIDEUMDEFENCE_ALGORITHM", "CIPHERA_ALGORITHM"),
    )
    access_token_expire_minutes: int = Field(
        default=60,
        validation_alias=AliasChoices(
            "VERIDEUMDEFENCE_ACCESS_TOKEN_EXPIRE_MINUTES", "CIPHERA_ACCESS_TOKEN_EXPIRE_MINUTES"
        ),
    )
    database_url: str = Field(
        default_factory=_default_database_url,
        validation_alias=AliasChoices("VERIDEUMDEFENCE_DATABASE_URL", "CIPHERA_DATABASE_URL"),
    )
    cors_origins_str: str = Field(
        default='["http://localhost:5173", "http://localhost:3000"]',
        validation_alias=AliasChoices("VERIDEUMDEFENCE_CORS_ORIGINS", "CIPHERA_CORS_ORIGINS"),
    )
    contact_email: str = Field(
        default="Veridiumdefence@gmail.com",
        validation_alias=AliasChoices(
            "VERIDIUMDEFENCE_CONTACT_EMAIL",
            "VERIDEUMDEFENCE_CONTACT_EMAIL",
            "CIPHERA_CONTACT_EMAIL",
        ),
    )
    smtp_host: str = Field(
        default="",
        validation_alias=AliasChoices(
            "VERIDIUMDEFENCE_SMTP_HOST",
            "VERIDEUMDEFENCE_SMTP_HOST",
            "CIPHERA_SMTP_HOST",
        ),
    )
    smtp_port: int = Field(
        default=587,
        validation_alias=AliasChoices(
            "VERIDIUMDEFENCE_SMTP_PORT",
            "VERIDEUMDEFENCE_SMTP_PORT",
            "CIPHERA_SMTP_PORT",
        ),
    )
    smtp_username: str = Field(
        default="",
        validation_alias=AliasChoices(
            "VERIDIUMDEFENCE_SMTP_USERNAME",
            "VERIDEUMDEFENCE_SMTP_USERNAME",
            "CIPHERA_SMTP_USERNAME",
        ),
    )
    smtp_password: str = Field(
        default="",
        validation_alias=AliasChoices(
            "VERIDIUMDEFENCE_SMTP_PASSWORD",
            "VERIDEUMDEFENCE_SMTP_PASSWORD",
            "CIPHERA_SMTP_PASSWORD",
        ),
    )
    smtp_use_tls: bool = Field(
        default=True,
        validation_alias=AliasChoices(
            "VERIDIUMDEFENCE_SMTP_USE_TLS",
            "VERIDEUMDEFENCE_SMTP_USE_TLS",
            "CIPHERA_SMTP_USE_TLS",
        ),
    )
    smtp_from_email: str = Field(
        default="",
        validation_alias=AliasChoices(
            "VERIDIUMDEFENCE_SMTP_FROM_EMAIL",
            "VERIDEUMDEFENCE_SMTP_FROM_EMAIL",
            "CIPHERA_SMTP_FROM_EMAIL",
        ),
    )
    zap_api_url: str = Field(
        default="http://zap:8080",
        validation_alias=AliasChoices("VERIDEUMDEFENCE_ZAP_API_URL", "CIPHERA_ZAP_API_URL"),
    )
    zap_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("VERIDEUMDEFENCE_ZAP_API_KEY", "CIPHERA_ZAP_API_KEY"),
    )

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.environment.lower() == "production":
            known_dev_secrets = {
                "dev-secret-change-me",
                "local-development-secret-change-before-deployment",
                "verideumdefence-local-zap-key",
            }
            if self.secret_key in known_dev_secrets or len(self.secret_key) < 32:
                raise ValueError("Production requires a unique secret key of at least 32 characters")
            if any(not origin.startswith("https://") for origin in self.cors_origins):
                raise ValueError("Production CORS origins must use HTTPS")
        return self

    @property
    def cors_origins(self) -> list[str]:
        try:
            return json.loads(self.cors_origins_str)
        except (json.JSONDecodeError, TypeError):
            return ["http://localhost:5173", "http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
