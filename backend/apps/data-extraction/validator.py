import pandas as pd
import numpy as np

def validate_funds(df):
    """
    Validates and cleans the funds DataFrame.
    Required columns: id, name, code, balance
    """
    required_cols = ['id', 'name', 'code', 'balance']
    
    # Check if columns exist
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column in funds data: {col}")
            
    initial_count = len(df)
    drop_reasons = {
        'missing_id_code': 0,
        'invalid_balance': 0
    }
    
    # Copy to avoid side-effects
    df_clean = df.copy()
    
    # 1. Drop rows with null id or code
    null_id_code_mask = df_clean['id'].isna() | (df_clean['id'].astype(str).str.strip() == '') | \
                        df_clean['code'].isna() | (df_clean['code'].astype(str).str.strip() == '')
    drop_reasons['missing_id_code'] = int(null_id_code_mask.sum())
    df_clean = df_clean[~null_id_code_mask]
    
    # 2. Validate and convert balance to numeric float
    df_clean['balance'] = pd.to_numeric(df_clean['balance'], errors='coerce')
    null_balance_mask = df_clean['balance'].isna()
    drop_reasons['invalid_balance'] = int(null_balance_mask.sum())
    df_clean = df_clean[~null_balance_mask]
    
    # Format and clean types
    df_clean['id'] = df_clean['id'].astype(str).str.strip()
    df_clean['name'] = df_clean['name'].astype(str).str.strip()
    df_clean['code'] = df_clean['code'].astype(str).str.strip()
    df_clean['balance'] = df_clean['balance'].astype(float)
    
    final_count = len(df_clean)
    total_dropped = initial_count - final_count
    
    stats = {
        'initial_count': initial_count,
        'final_count': final_count,
        'total_dropped': total_dropped,
        'drop_reasons': drop_reasons
    }
    
    return df_clean, stats

def validate_transactions(df):
    """
    Validates and cleans the fund transactions DataFrame.
    Required columns: id, fund_id, amount, type, timestamp
    """
    required_cols = ['id', 'fund_id', 'amount', 'type', 'timestamp']
    
    # Check if columns exist
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column in transactions data: {col}")
            
    initial_count = len(df)
    drop_reasons = {
        'missing_required_fields': 0,
        'invalid_amount': 0,
        'invalid_type': 0,
        'invalid_timestamp': 0
    }
    
    # Copy to avoid side-effects
    df_clean = df.copy()
    
    # 1. Drop rows with null id or fund_id or type
    null_mask = df_clean['id'].isna() | (df_clean['id'].astype(str).str.strip() == '') | \
                df_clean['fund_id'].isna() | (df_clean['fund_id'].astype(str).str.strip() == '') | \
                df_clean['type'].isna() | (df_clean['type'].astype(str).str.strip() == '')
    drop_reasons['missing_required_fields'] = int(null_mask.sum())
    df_clean = df_clean[~null_mask]
    
    # 2. Validate and convert amount to numeric float
    df_clean['amount'] = pd.to_numeric(df_clean['amount'], errors='coerce')
    invalid_amount_mask = df_clean['amount'].isna() | (df_clean['amount'] < 0)
    drop_reasons['invalid_amount'] = int(invalid_amount_mask.sum())
    df_clean = df_clean[~invalid_amount_mask]
    
    # 3. Validate transaction type (enum check)
    valid_types = {'DEPOSIT', 'WITHDRAWAL', 'LOAN_DISBURSEMENT', 'CORRECTING_ENTRY'}
    df_clean['type'] = df_clean['type'].astype(str).str.strip().str.upper()
    invalid_type_mask = ~df_clean['type'].isin(valid_types)
    drop_reasons['invalid_type'] = int(invalid_type_mask.sum())
    df_clean = df_clean[~invalid_type_mask]
    
    # 4. Validate and parse timestamp
    df_clean['timestamp'] = pd.to_datetime(df_clean['timestamp'], errors='coerce')
    invalid_time_mask = df_clean['timestamp'].isna()
    drop_reasons['invalid_timestamp'] = int(invalid_time_mask.sum())
    df_clean = df_clean[~invalid_time_mask]
    
    # Format and clean types
    df_clean['id'] = df_clean['id'].astype(str).str.strip()
    df_clean['fund_id'] = df_clean['fund_id'].astype(str).str.strip()
    df_clean['amount'] = df_clean['amount'].astype(float)
    df_clean['description'] = df_clean['description'].fillna('').astype(str).str.strip() if 'description' in df_clean.columns else ''
    df_clean['reference_id'] = df_clean['reference_id'].fillna('').astype(str).str.strip() if 'reference_id' in df_clean.columns else ''
    
    # Convert timestamps to ISO string format for easy serialization
    df_clean['timestamp_str'] = df_clean['timestamp'].dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    
    final_count = len(df_clean)
    total_dropped = initial_count - final_count
    
    stats = {
        'initial_count': initial_count,
        'final_count': final_count,
        'total_dropped': total_dropped,
        'drop_reasons': drop_reasons
    }
    
    return df_clean, stats
