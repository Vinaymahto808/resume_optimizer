"""Additive column migrations for existing databases.

``Base.metadata.create_all`` creates missing tables but never adds columns to tables that already exist,
so columns added to old tables are added here. Safe to run on every start (SQLite and PostgreSQL)."""
import logging

from sqlalchemy import inspect, text

logger = logging.getLogger(__name__)

# (table, column, SQL type, default for SQLite, default for PostgreSQL). The SQL type may be a
# (SQLite type, PostgreSQL type) pair when the two databases spell it differently.
_COLUMNS = [
    ("users", "is_admin", "BOOLEAN NOT NULL", "0", "FALSE"),
    ("platform_payment_requests", "screenshot_data", ("BLOB", "BYTEA"), "NULL", "NULL"),
]


def ensure_columns(engine) -> list[str]:
    added = []
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    for table, column, sql_type, sqlite_default, pg_default in _COLUMNS:
        if table not in tables:
            continue
        if column in {c["name"] for c in inspector.get_columns(table)}:
            continue
        pg = engine.dialect.name == "postgresql"
        default = pg_default if pg else sqlite_default
        if isinstance(sql_type, tuple):
            sql_type = sql_type[1] if pg else sql_type[0]
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {sql_type} DEFAULT {default}"))
        added.append(f"{table}.{column}")
        logger.info("Added column %s.%s", table, column)
    return added
