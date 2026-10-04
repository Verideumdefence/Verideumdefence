from sqlalchemy import create_engine, inspect, text

from app.db.migrations import apply_schema_updates


def test_adds_missing_totp_columns_to_existing_users_table() -> None:
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY)"))

    apply_schema_updates(engine)
    columns = {column["name"]: column for column in inspect(engine).get_columns("users")}

    assert "totp_secret" in columns
    assert "totp_enabled" in columns
    assert columns["totp_enabled"]["default"] in ("0", "false", "FALSE")
    engine.dispose()
