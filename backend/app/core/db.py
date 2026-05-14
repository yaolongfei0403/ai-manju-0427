# Database connection and operations for backend

import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from app.core.config import settings


@contextmanager
def get_db_connection():
    """Get a database connection from the pool"""
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def get_db_cursor(cursor_factory=RealDictCursor):
    """Get a database cursor with automatic commit/rollback"""
    with get_db_connection() as conn:
        cursor = conn.cursor(cursor_factory=cursor_factory)
        try:
            yield cursor
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()


def init_db():
    """Initialize database tables for split results"""
    with get_db_cursor() as cursor:
        # Create split_results table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS split_results (
                task_id VARCHAR(64) PRIMARY KEY,
                file_id VARCHAR(128) NOT NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'processing',
                episodes JSONB,
                total_episodes INTEGER DEFAULT 0,
                strategy VARCHAR(32) DEFAULT 'balanced',
                generated_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Create index on file_id for faster lookups
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_split_results_file_id ON split_results(file_id)
        """)
