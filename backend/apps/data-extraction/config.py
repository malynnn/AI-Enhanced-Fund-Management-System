import os

# Load .env file if available
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(dotenv_path):
    try:
        with open(dotenv_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip())
    except Exception:
        pass

# Database Configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "finance_db")

# Database Credentials
DB_ADMIN_USER = os.getenv("DB_ADMIN_USER", "postgres")
DB_ADMIN_PASSWORD = os.getenv("DB_ADMIN_PASSWORD", "capstone")

# Secure Read-Only Connection Credentials
DB_RO_USER = os.getenv("DB_RO_USER", "readonly_user")
DB_RO_PASSWORD = os.getenv("DB_RO_PASSWORD", "readonly_pass")

# Analytics SQLite Database path (AFMS-006)
ANALYTICS_DB_PATH = os.getenv("ANALYTICS_DB_PATH", "analytics.db")

# Extraction Log path (AFMS-008)
EXTRACTION_LOG_PATH = os.getenv("EXTRACTION_LOG_PATH", "extraction_log.json")

# Analytics Report path (AFMS-015)
ANALYTICS_REPORT_PATH = os.getenv("ANALYTICS_REPORT_PATH", "analytics_report.json")

# Groq AI Configuration (Sprint 4)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Helper function to generate connection strings
def get_connection_string(user, password):
    return f"postgresql://{user}:{password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
