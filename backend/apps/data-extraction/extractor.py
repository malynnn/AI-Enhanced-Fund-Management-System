import pandas as pd
import db_connection

def extract_from_db():
    """
    Retrieves funds and fund transactions tables from the database using SQL queries,
    and returns them as Pandas DataFrames.
    """
    conn = None
    try:
        conn = db_connection.get_readonly_connection()
        
        # SQL queries to retrieve records
        funds_query = "SELECT * FROM public.funds"
        tx_query = "SELECT * FROM public.fund_transactions"
        
        # Load directly into Pandas DataFrames
        funds_df = pd.read_sql_query(funds_query, conn)
        tx_df = pd.read_sql_query(tx_query, conn)
        
        return funds_df, tx_df
    finally:
        if conn:
            conn.close()

def extract_from_csv(funds_path, tx_path):
    """
    Loads funds and fund transactions from CSV file paths into Pandas DataFrames.
    """
    funds_df = pd.read_csv(funds_path)
    tx_df = pd.read_csv(tx_path)
    return funds_df, tx_df
