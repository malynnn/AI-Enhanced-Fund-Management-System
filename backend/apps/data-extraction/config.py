import os

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

# Helper function to generate connection strings
def get_connection_string(user, password):
    return f"postgresql://{user}:{password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
