"""Test the checked-in baseline without resetting the developer's Supabase data.

Requires a running local Supabase stack, Docker, and Python 3. Only an empty
scratch database is created/dropped. No Auth user data is copied.
"""
import pathlib
import re
import subprocess
import sys
import uuid

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTAINER = "supabase_db_clipsx-web"


def sql(database, source):
    result = subprocess.run(
        ["docker", "exec", "-i", CONTAINER, "psql", "-X", "-U", "postgres",
         "-v", "ON_ERROR_STOP=1", "-d", database],
        input=source, text=True, capture_output=True, check=True,
    )
    return result.stdout + result.stderr


def main():
    database = "clipsx_test_" + uuid.uuid4().hex
    sql("postgres", f"CREATE DATABASE {database} TEMPLATE template0;")
    try:
        auth = subprocess.check_output(
            ["docker", "exec", CONTAINER, "pg_dump", "-U", "postgres", "-d", "postgres",
             "--schema-only", "--schema=auth", "--no-owner", "--no-privileges"], text=True,
        )
        auth = re.sub(r"CREATE TRIGGER create_personal_billing_account_after_auth_user_insert[^;]+;", "", auth)
        sql(database, "CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions; "
            "CREATE EXTENSION pgtap WITH SCHEMA extensions; "
            "GRANT USAGE ON SCHEMA public,extensions TO anon,authenticated,service_role; "
            f"ALTER DATABASE {database} SET search_path TO public,extensions; " + auth)
        for path in sorted((ROOT / "supabase/migrations").glob("*.sql")):
            sql(database, "BEGIN;" + path.read_text(encoding="utf-8-sig") + "COMMIT;")
            print("Applied", path.name, flush=True)
        for path in sorted((ROOT / "supabase/tests").glob("*.sql")):
            output = sql(database, path.read_text(encoding="utf-8-sig"))
            if re.search(r"not ok|Looks like you", output):
                raise RuntimeError(path.name + "\n" + output)
            print("PASS", path.name, flush=True)
        if "--generate-types" in sys.argv:
            generated = subprocess.run(
                ["node", str(ROOT / "node_modules/supabase/dist/supabase.js"), "gen", "types", "typescript",
                 "--db-url", f"postgresql://postgres:postgres@127.0.0.1:54322/{database}",
                 "--schema", "public,private"], text=True, capture_output=True, check=True,
            )
            (ROOT / "src/types/supabase.ts").write_text(generated.stdout, encoding="utf-8")
        # Check schema export; this does not substitute for a production restore drill.
        dump = subprocess.check_output(
            ["docker", "exec", CONTAINER, "pg_dump", "-U", "postgres", "-d", database,
             "--schema-only", "--no-owner"], text=True,
        )
        if "CREATE TABLE public.sync_records" not in dump:
            raise RuntimeError("Baseline schema dump is incomplete")
    finally:
        sql("postgres", f"DROP DATABASE {database};")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        print(error.stderr)
        raise
