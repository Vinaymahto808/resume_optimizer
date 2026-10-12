"""Promote (or demote) an existing user to admin.

Usage (from resume_optimizer/backend):
    uv run python -m app.career.make_admin you@example.com
    uv run python -m app.career.make_admin you@example.com --remove
"""
import sys


def main(argv: list[str]) -> int:
    args = [a for a in argv if not a.startswith("--")]
    if len(args) != 1:
        print(__doc__)
        return 2
    from app.career.migrations import ensure_columns
    from app.database import Base, SessionLocal, engine
    from app.models import User
    from sqlalchemy import func

    Base.metadata.create_all(bind=engine)
    ensure_columns(engine)
    db = SessionLocal()
    try:
        user = db.query(User).filter(func.lower(User.email) == args[0].strip().lower()).first()
        if user is None:
            print(f"No user with email {args[0]}. Sign up in the app first.")
            return 1
        user.is_admin = "--remove" not in argv
        db.commit()
        print(f"{user.email} is {'now an admin' if user.is_admin else 'no longer an admin'}.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
