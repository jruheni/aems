import os
import psycopg2
from psycopg2.extras import RealDictCursor
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Supabase connection details
SUPABASE_HOST = "huomcpulnpatjyvrnlju.supabase.co"
SUPABASE_PORT = "5432"
SUPABASE_USER = "postgres"
SUPABASE_PASSWORD = "Burgeoisie20"
SUPABASE_DATABASE = "postgres"
SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1b21jcHVsbnBhdGp5dnJubGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTcyOTUsImV4cCI6MjA1ODgzMzI5NX0.u-2TyALnnmw1PCBe0gUh9iUXYnhwxWE242sN1rktKNE"

def get_db_connection():
    """Create and return a database connection"""
    try:
        # Try direct connection parameters
        logger.info(f"Connecting to PostgreSQL database at {SUPABASE_HOST}")
        conn = psycopg2.connect(
            host=SUPABASE_HOST,
            port=SUPABASE_PORT,
            user=SUPABASE_USER,
            password=SUPABASE_PASSWORD,
            dbname=SUPABASE_DATABASE,
            cursor_factory=RealDictCursor
        )
        logger.info("Successfully connected to PostgreSQL database")
        return conn
    except Exception as e:
        logger.error(f"PostgreSQL connection error: {e}")
        raise

def init_db():
    """Initialize the database with required tables"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Create users table
        cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Create exams table
        cur.execute('''
        CREATE TABLE IF NOT EXISTS exams (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Create rubrics table
        cur.execute('''
        CREATE TABLE IF NOT EXISTS rubrics (
            id SERIAL PRIMARY KEY,
            exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
            file_name VARCHAR(255) NOT NULL,
            file_type VARCHAR(100) NOT NULL,
            file_size INTEGER NOT NULL,
            preview TEXT,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Create submissions table
        cur.execute('''
        CREATE TABLE IF NOT EXISTS submissions (
            id SERIAL PRIMARY KEY,
            exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
            student_name VARCHAR(255) NOT NULL,
            script_file_name VARCHAR(255) NOT NULL,
            score NUMERIC(5,2),
            feedback TEXT,
            total_points INTEGER DEFAULT 10,
            extracted_text_script TEXT,
            extracted_text_rubric TEXT,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        conn.commit()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        raise
    finally:
        if 'cur' in locals() and cur:
            cur.close()
        if 'conn' in locals() and conn:
            conn.close()

# Run this function when the module is imported
if __name__ == "__main__":
    init_db()
