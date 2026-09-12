"""Test the checked-in baseline without resetting the developer's Supabase data.

Requires a running local Supabase stack, Docker, and Python 3. Only an empty
scratch database is created/dropped. No Auth user data is copied.
"""
import pathlib
import re
import subprocess
import sys
import uuid
import time
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTAINER = "supabase_db_clipsx-web"


def sql(database, source):
    result = subprocess.run(
        ["docker", "exec", "-i", CONTAINER, "psql", "-X", "-U", "postgres",
         "-v", "ON_ERROR_STOP=1", "-d", database],
        input=source, text=True, capture_output=True, check=True,
    )
    return result.stdout + result.stderr


def wait_until(check, description, timeout=12):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if check():
            return
        time.sleep(0.1)
    raise RuntimeError("Timed out: " + description)


def test_worker_overlap(database):
    claim = "select private.claim_stripe_webhook_event(false,'evt_overlap','product.updated','product','prod_overlap',now(),'{worker}',5);"
    sql(database, claim.format(worker="original"))
    blocker = subprocess.Popen(
        ["docker", "exec", "-i", CONTAINER, "psql", "-X", "-U", "postgres", "-d", database,
         "-v", "ON_ERROR_STOP=1"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        blocker.stdin.write("begin; lock private.billing_products in access exclusive mode;\n\\echo locked\n")
        blocker.stdin.flush()
        while blocker.stdout.readline().strip() != "locked":
            if blocker.poll() is not None:
                raise RuntimeError("Could not acquire overlap test lock")
        with ThreadPoolExecutor(max_workers=2) as pool:
            original = pool.submit(sql, database, "set application_name='clipsx_original'; select private.apply_stripe_webhook_projection(false,'evt_overlap','original',now(),'{\"products\":[{\"id\":\"prod_overlap\",\"name\":\"Projected\",\"active\":true}]}');")
            try:
                wait_until(lambda: bool(re.search(r"\n\s*1\s*\n", sql(database, "select count(*) from pg_stat_activity where application_name='clipsx_original' and wait_event_type='Lock';"))), "original worker blocked")
                wait_until(lambda: bool(re.search(r"\n\s*1\s*\n", sql(database, "select count(*) from private.billing_webhook_events where stripe_event_id='evt_overlap' and lease_expires_at<clock_timestamp();"))), "lease expiry")
                replacement = pool.submit(sql, database, "set application_name='clipsx_replacement'; " + claim.format(worker="replacement"))
                wait_until(lambda: bool(re.search(r"\n\s*1\s*\n", sql(database, "select count(*) from pg_stat_activity where application_name='clipsx_replacement' and wait_event_type='Lock';"))), "replacement fenced by inbox lock")
            finally:
                blocker.stdin.write("commit;\n\\q\n")
                blocker.stdin.flush()
            if not re.search(r"\n\s*t\s*\n", original.result(timeout=15)):
                raise RuntimeError("Original projection did not complete")
            if "processed" not in replacement.result(timeout=15):
                raise RuntimeError("Replacement did not observe atomic completion")
        print("PASS overlapping webhook workers across lease expiry", flush=True)
    finally:
        if blocker.poll() is None:
            blocker.communicate("rollback;\n\\q\n", timeout=15)


def test_restore(database):
    # Synthetic persisted data proves a populated dump, not just DDL, restores.
    sql(database, "insert into auth.users(id) values('16000000-0000-0000-0000-000000000001');")
    restored = "clipsx_restore_" + uuid.uuid4().hex
    dump = subprocess.check_output(["docker", "exec", CONTAINER, "pg_dump", "-U", "postgres", "-d", database, "--no-owner"], text=True)
    sql("postgres", f"CREATE DATABASE {restored} TEMPLATE template0;")
    try:
        sql(restored, dump)
        for query in [
            "select id from auth.users order by id;",
            "select billing_account_id,livemode,status from private.account_entitlements order by billing_account_id,livemode;",
            "select stripe_event_id,processing_state,attempts from private.billing_webhook_events order by stripe_event_id;",
            "select stripe_product_id,name from private.billing_products order by stripe_product_id;",
            "select schemaname,tablename,policyname,roles,qual from pg_policies order by schemaname,tablename,policyname;",
        ]:
            if sql(database, query) != sql(restored, query):
                raise RuntimeError("Restore verification differs: " + query)
        print("PASS populated backup/restore and RLS preservation", flush=True)
    finally:
        sql("postgres", f"DROP DATABASE {restored};")


def test_capacity_race(database):
    account = "19000000-0000-0000-0000-000000000001"
    sql(database, f"insert into auth.users(id) values('{account}');")
    insert = f"insert into private.vault_device_registration_challenges(account_id,device_encryption_public_key,challenge_hash,expires_at) select '{account}',decode(repeat('11',32),'hex'),decode(repeat('22',32),'hex'),now()+interval '1 hour'"
    sql(database, insert + " from generate_series(1,63);")
    with ThreadPoolExecutor(max_workers=2) as pool:
        attempts = [pool.submit(sql, database, insert + ";") for _ in range(2)]
        accepted = 0
        for attempt in attempts:
            try:
                attempt.result(timeout=15)
                accepted += 1
            except subprocess.CalledProcessError as error:
                if "vault_record_limit" not in error.stderr:
                    raise
    if accepted != 1:
        raise RuntimeError("Concurrent challenge quota did not admit exactly one writer")
    result = sql(database, f"select count(*)=64 and sum(octet_length(to_jsonb(c)::text))=(select retained_bytes from private.vault_storage_usage where scope_kind='account' and scope_id='{account}') as correct from private.vault_device_registration_challenges c where account_id='{account}';")
    if not re.search(r"\n\s*t\s*\n", result):
        raise RuntimeError("Concurrent quota accounting differs from retained rows")
    print("PASS concurrent capacity admission and exact rollback accounting", flush=True)


def main():
    database = "clipsx_test_" + uuid.uuid4().hex
    sql("postgres", f"CREATE DATABASE {database} TEMPLATE template0;")
    try:
        auth = subprocess.check_output(
            ["docker", "exec", CONTAINER, "pg_dump", "-U", "postgres", "-d", "postgres",
             "--schema-only", "--schema=auth", "--no-owner", "--no-privileges"], text=True,
        )
        auth = re.sub(r"CREATE TRIGGER (?:create_personal_billing_account_after_auth_user_insert|a_create_account_principal)[^;]+;", "", auth)
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
        test_worker_overlap(database)
        test_capacity_race(database)
        test_restore(database)
        if "--advisors" in sys.argv:
            result = subprocess.run(
                ["node", str(ROOT / "node_modules/supabase/dist/supabase.js"), "db", "advisors",
                 "--db-url", f"postgresql://postgres:postgres@127.0.0.1:54322/{database}",
                 "--type", "security", "--level", "warn", "--fail-on", "error"],
                text=True, capture_output=True, check=True,
            )
            print(result.stdout, flush=True)
            print("PASS security advisors (no errors)", flush=True)
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
