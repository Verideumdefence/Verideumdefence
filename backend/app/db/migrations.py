from sqlalchemy import Engine, inspect, text


def _make_sqlite_client_user_optional(engine: Engine) -> None:
    """Rebuild legacy SQLite client tables without dropping any client rows."""
    with engine.connect() as connection:
        inspector = inspect(connection)
        if not inspector.has_table("clients"):
            return
        columns = {column["name"]: column for column in inspector.get_columns("clients")}
        user_id = columns.get("user_id")
        if user_id is None or user_id["nullable"]:
            return

        # SQLite cannot change nullability in place. Disable FK checks outside the
        # transaction while swapping the table, then restore them on this connection.
        connection.exec_driver_sql("PRAGMA foreign_keys=OFF")
        connection.commit()
        try:
            with connection.begin():
                connection.execute(text("DROP TABLE IF EXISTS clients_new"))
                connection.execute(text("""
                    CREATE TABLE clients_new (
                        id INTEGER NOT NULL PRIMARY KEY,
                        user_id INTEGER,
                        name VARCHAR(255) NOT NULL,
                        email VARCHAR(255) NOT NULL,
                        company VARCHAR(255) NOT NULL,
                        services TEXT NOT NULL,
                        status VARCHAR(9) NOT NULL,
                        contact_info TEXT,
                        created_at DATETIME NOT NULL,
                        FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
                        UNIQUE(user_id)
                    )
                """))
                connection.execute(text("""
                    INSERT INTO clients_new
                        (id, user_id, name, email, company, services, status, contact_info, created_at)
                    SELECT id, user_id, name, email, company, services, status, contact_info, created_at
                    FROM clients
                """))
                connection.execute(text("DROP TABLE clients"))
                connection.execute(text("ALTER TABLE clients_new RENAME TO clients"))
                connection.execute(text("CREATE INDEX ix_clients_user_id ON clients (user_id)"))
        finally:
            connection.exec_driver_sql("PRAGMA foreign_keys=ON")
            connection.commit()


def apply_schema_updates(engine: Engine) -> None:
    """Apply idempotent upgrades needed by databases created by older releases."""
    if engine.dialect.name == "sqlite":
        _make_sqlite_client_user_optional(engine)

    with engine.begin() as connection:
        inspector = inspect(connection)
        if not inspector.has_table("users"):
            return

        existing_columns = {column["name"] for column in inspector.get_columns("users")}
        if "totp_secret" not in existing_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN totp_secret VARCHAR(255)"))
        if "totp_enabled" not in existing_columns:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT FALSE")
            )

        if inspector.has_table("scans"):
            scan_columns = {column["name"] for column in inspector.get_columns("scans")}
            if "is_scheduled" not in scan_columns:
                connection.execute(
                    text("ALTER TABLE scans ADD COLUMN is_scheduled BOOLEAN NOT NULL DEFAULT FALSE")
                )
            if "schedule_cron" not in scan_columns:
                connection.execute(text("ALTER TABLE scans ADD COLUMN schedule_cron VARCHAR(128)"))

        if inspector.has_table("clients"):
            client_columns = {column["name"]: column for column in inspector.get_columns("clients")}
            user_id = client_columns.get("user_id")
            if user_id is not None and not user_id["nullable"]:
                if connection.dialect.name == "postgresql":
                    connection.execute(text("ALTER TABLE clients ALTER COLUMN user_id DROP NOT NULL"))
