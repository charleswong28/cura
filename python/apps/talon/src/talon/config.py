from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Service
    host: str = "0.0.0.0"
    port: int = 8001
    log_level: str = "info"

    # CRM API
    crm_api_url: str = "http://localhost:8000"
    runner_token: str  # Bearer token with runner-scope

    # AWS
    aws_region: str = "ap-southeast-2"
    s3_sessions_bucket: str = "cura-talon-sessions"
    secrets_manager_prefix: str = "talon"

    # Browser
    site_backends: dict[str, str] = {"default": "browser-use"}
    headless: bool = True


settings = Settings()
