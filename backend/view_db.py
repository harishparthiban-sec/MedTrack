import sqlite3

def view_database():
    conn = sqlite3.connect('medtrack.db')
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [t[0] for t in cursor.fetchall()]
    
    print("=" * 60)
    print("      MEDTRACK SQLITE DATABASE CONTENTS (medtrack.db)      ")
    print("=" * 60)
    
    for table in tables:
        print(f"\n--- TABLE: {table.upper()} ---")
        cursor.execute(f"SELECT * FROM {table}")
        rows = cursor.fetchall()
        
        # Get column names
        cursor.execute(f"PRAGMA table_info({table});")
        columns = [col[1] for col in cursor.fetchall()]
        print("COLUMNS:", " | ".join(columns))
        
        if not rows:
            print("(No records found in this table yet)")
        else:
            for idx, row in enumerate(rows, 1):
                print(f"Row {idx}: {row}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    view_database()
