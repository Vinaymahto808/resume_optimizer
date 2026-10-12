"""Make the bcrypt hash for the admin console password.

Usage (from resume_optimizer/backend):
    .venv\\Scripts\\python -m app.career.admin_password

It asks for the new password twice (nothing is shown while typing) and prints the hash. Put the hash in the
deployment's ADMIN_PASSWORD_HASH (for Vercel: `npx vercel@latest env rm ADMIN_PASSWORD_HASH production`,
then `npx vercel@latest env add ADMIN_PASSWORD_HASH production` and paste it), then redeploy.
Changing the hash signs out every open admin session.
"""
import getpass
import sys

from app.career.admin_auth import hash_password

MIN_LENGTH = 12


def main() -> int:
    password = getpass.getpass("New admin password: ")
    if len(password) < MIN_LENGTH:
        print(f"Use at least {MIN_LENGTH} characters.")
        return 1
    if getpass.getpass("Type it again: ") != password:
        print("The two passwords don't match.")
        return 1
    print("\nADMIN_PASSWORD_HASH value:\n" + hash_password(password))
    return 0


if __name__ == "__main__":
    sys.exit(main())
