import psycopg2
from psycopg2 import sql
import config

def setup_readonly_user():
    """
    Connects using admin credentials to create the read-only user and 
    grant read-only privileges on the funds and fund_transactions tables.
    """
    try:
        # Connect with admin privileges
        admin_dsn = config.get_connection_string(config.DB_ADMIN_USER, config.DB_ADMIN_PASSWORD)
        conn = psycopg2.connect(admin_dsn)
        conn.autocommit = True
        cur = conn.cursor()

        # DDL commands to create readonly_user role and grant SELECT permissions
        setup_queries = [
            # Check and create the role
            f"""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '{config.DB_RO_USER}') THEN
                    CREATE ROLE {config.DB_RO_USER} WITH LOGIN PASSWORD '{config.DB_RO_PASSWORD}';
                END IF;
            END
            $$;
            """,
            # Grant database connection
            f"GRANT CONNECT ON DATABASE {config.DB_NAME} TO {config.DB_RO_USER};",
            # Grant schema usage
            f"GRANT USAGE ON SCHEMA public TO {config.DB_RO_USER};",
            # Grant select privileges on specific tables
            f"GRANT SELECT ON public.funds TO {config.DB_RO_USER};",
            f"GRANT SELECT ON public.fund_transactions TO {config.DB_RO_USER};",
        ]

        for q in setup_queries:
            cur.execute(q)

        cur.close()
        conn.close()
        return True, "Secure read-only role configured successfully."
    except Exception as e:
        return False, f"Failed to setup secure read-only role: {str(e)}"

def get_readonly_connection():
    """
    Establishes and returns a database connection using the read-only credentials.
    """
    ro_dsn = config.get_connection_string(config.DB_RO_USER, config.DB_RO_PASSWORD)
    return psycopg2.connect(ro_dsn)

def verify_readonly_security(conn=None):
    """
    Attempts to perform a write operation to verify that the connection 
    does not allow database modifications.
    Returns (is_secure, message).
    """
    close_connection_later = False
    if conn is None:
        try:
            conn = get_readonly_connection()
            close_connection_later = True
        except Exception as e:
            return False, f"Failed to connect using read-only credentials: {str(e)}"
    
    try:
        cur = conn.cursor()
        # Attempt to insert a dummy record into funds (should fail)
        cur.execute("INSERT INTO public.funds (id, name, code, balance) VALUES ('RO_TEST', 'RO Test', 'RO_TEST', 0.0)")
        conn.commit()
        # If we reach here, the insert succeeded! That means the connection is NOT read-only!
        cur.execute("DELETE FROM public.funds WHERE id = 'RO_TEST'")
        conn.commit()
        cur.close()
        if close_connection_later:
            conn.close()
        return False, "Insecure: Write operation (INSERT) was permitted on read-only connection!"
    except psycopg2.errors.InsufficientPrivilege:
        # This is the expected result! Insufficient privilege error means it is read-only.
        conn.rollback() # clear transaction
        cur.close()
        if close_connection_later:
            conn.close()
        return True, "Secure: Write operations successfully blocked by database permissions."
    except Exception as e:
        # Any other error
        conn.rollback()
        cur.close()
        if close_connection_later:
            conn.close()
        return False, f"Error verifying database permissions: {str(e)}"
