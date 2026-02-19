"""
Trainer-Pro Backend Configuration
"""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql+asyncpg://trainer:trainer_dev@localhost:5432/trainer_pro"

    # Debug mode
    debug: bool = False

    # CORS origins (comma-separated list)
    cors_origins: str = "http://localhost:3000"

    # API info
    api_title: str = "Trainer-Pro API"
    api_version: str = "0.1.0"

    # Google Auth
    google_client_id: str | None = None
    google_client_secret: str | None = None

    # Dev Auth Bypass (DEVELOPMENT ONLY - Must be False in production)
    dev_auth_bypass: bool = False
    dev_trainer_id: int | None = None

    class Config:
        # Make .env file optional to handle permission errors on macOS
        env_file = ".env"
        env_file_encoding = "utf-8"
        # Don't fail if .env file is inaccessible (e.g., macOS Full Disk Access)
        # Environment variables will still be loaded from the shell environment
        case_sensitive = False

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    try:
        return Settings()
    except PermissionError:
        # macOS Full Disk Access may block .env file access
        # Fall back to environment variables only
        import os

        os.environ.setdefault(
            "DATABASE_URL", "postgresql+asyncpg://trainer:trainer_dev@localhost:5432/trainer_pro"
        )

        # Create Settings without reading .env file
        class SettingsNoFile(BaseSettings):
            """Settings without .env file for permission-restricted environments."""

            database_url: str = (
                "postgresql+asyncpg://trainer:trainer_dev@localhost:5432/trainer_pro"
            )
            debug: bool = False
            cors_origins: str = "http://localhost:3000"
            api_title: str = "Trainer-Pro API"
            api_version: str = "0.1.0"
            google_client_id: str | None = None
            google_client_secret: str | None = None
            dev_auth_bypass: bool = False
            dev_trainer_id: int | None = None

            class Config:
                case_sensitive = False

            @property
            def cors_origins_list(self) -> list[str]:
                return [origin.strip() for origin in self.cors_origins.split(",")]

        return SettingsNoFile()  # type: ignore
