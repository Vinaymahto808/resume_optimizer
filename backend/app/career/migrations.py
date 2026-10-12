"""Additive column migrations for existing databases.

``Base.metadata.create_all`` creates missing tables but never adds columns to tables that already exist,
so columns added to old tables are added here. Safe to run on every start (SQLite and PostgreSQL)."""
import logging

from sqlalchemy import inspect, text

logger = logging.getLogger(__name__)

# (table, column, SQL type, default for SQLite, default for PostgreSQL)
_COLUMNS = [
    ("users", "is_admin", "BOOLEAN NOT NULL", "0", "FALSE"),
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
        default = pg_default if engine.dialect.name == "postgresql" else sqlite_default
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {sql_type} DEFAULT {default}"))
        added.append(f"{table}.{column}")
        logger.info("Added column %s.%s", table, column)
    return added
