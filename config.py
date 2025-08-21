import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL")
    POSTGRES_USER = os.getenv("POSTGRES_USER")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
    POSTGRES_DB = os.getenv("POSTGRES_DB")
    POSTGRES_HOST = os.getenv("POSTGRES_HOST")
    POSTGRES_PORT = os.getenv("POSTGRES_PORT")

    # Redis
    REDIS_URL = os.getenv("REDIS_URL")
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
    REDIS_SSL = os.getenv("REDIS_SSL") == 'true'
    REDIS_DB = int(os.getenv("REDIS_DB", 0))

    # Security
    SECRET_KEY = os.getenv("SECRET_KEY")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    ALGORITHM = os.getenv("ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

    # App
    ENVIRONMENT = os.getenv("ENVIRONMENT")
    DEBUG = os.getenv("DEBUG") == 'true'
    LOG_LEVEL = os.getenv("LOG_LEVEL")
    API_VERSION = os.getenv("API_VERSION")

    # Performance
    API_RATE_LIMIT = int(os.getenv("API_RATE_LIMIT", 100))
    API_RATE_WINDOW = int(os.getenv("API_RATE_WINDOW", 3600))
    MAX_CONCURRENT_ANALYSES = int(os.getenv("MAX_CONCURRENT_ANALYSES", 10))

    # CORS
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(',')

    # Tracking
    ENABLE_REAL_TRACKING = os.getenv("ENABLE_REAL_TRACKING") == 'true'
    TRACKING_API_ENDPOINT = os.getenv("TRACKING_API_ENDPOINT")
    TRACKING_SCRIPT_VERSION = os.getenv("TRACKING_SCRIPT_VERSION")
    GEOIP_PATH = os.getenv("GEOIP_PATH")

    # LLM
    CLAUDE_MODEL = os.getenv("CLAUDE_MODEL")
    GPT_MODEL = os.getenv("GPT_MODEL")
    MAX_TOKENS = int(os.getenv("MAX_TOKENS", 1000))
    TEMPERATURE = float(os.getenv("TEMPERATURE", 0.3))
    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", 30))

    # Cache
    CACHE_TTL = int(os.getenv("CACHE_TTL", 3600))
    CACHE_MAX_SIZE = int(os.getenv("CACHE_MAX_SIZE", 1000))

    # Upload
    MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", 104857600))
    ALLOWED_LOG_FORMATS = os.getenv("ALLOWED_LOG_FORMATS", "").split(',')
    TEMP_UPLOAD_PATH = os.getenv("TEMP_UPLOAD_PATH")

    # Analysis
    ANALYSIS_TIMEOUT = int(os.getenv("ANALYSIS_TIMEOUT", 300))
    MAX_QUERIES_PER_ANALYSIS = int(os.getenv("MAX_QUERIES_PER_ANALYSIS", 50))
    MAX_CONTENT_CHUNKS = int(os.getenv("MAX_CONTENT_CHUNKS", 1000))

    # Monitoring
    ENABLE_METRICS = os.getenv("ENABLE_METRICS") == 'true'
    METRICS_PORT = int(os.getenv("METRICS_PORT", 9090))
    HEALTH_CHECK_INTERVAL = int(os.getenv("HEALTH_CHECK_INTERVAL", 30))

    # Email
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    SMTP_TLS = os.getenv("SMTP_TLS") == 'true'
    NOTIFICATION_FROM_EMAIL = os.getenv("NOTIFICATION_FROM_EMAIL")

    # Dev Tools
    PGADMIN_EMAIL = os.getenv("PGADMIN_EMAIL")
    PGADMIN_PASSWORD = os.getenv("PGADMIN_PASSWORD")
    REDIS_COMMANDER_PORT = int(os.getenv("REDIS_COMMANDER_PORT", 8081))
    PGADMIN_PORT = int(os.getenv("PGADMIN_PORT", 5050))

    # Monitoring Tools
    PROMETHEUS_PORT = int(os.getenv("PROMETHEUS_PORT", 9090))
    GRAFANA_PORT = int(os.getenv("GRAFANA_PORT", 3001))
    GRAFANA_USER = os.getenv("GRAFANA_USER")
    GRAFANA_PASSWORD = os.getenv("GRAFANA_PASSWORD")
    LOKI_PORT = int(os.getenv("LOKI_PORT", 3100))

    # Production
    NGINX_PORT = int(os.getenv("NGINX_PORT", 80))
    NGINX_SSL_PORT = int(os.getenv("NGINX_SSL_PORT", 443))


settings = Settings()
