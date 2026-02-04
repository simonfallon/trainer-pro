"""
Trainer-Pro Backend Configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


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
    dev_trainer_id: str | None = None
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
