// Test database for RLS tests: an in-process Postgres (PGlite) set up like Supabase.
// It has Supabase's API roles, a stand-in auth.uid(), Supabase's default grants on the
// public schema, then every file in supabase/migrations in order, plus fake seed data.
//
// RLS_EXCLUDE=005_security_fixes.sql skips that migration, to check that the tests
// really fail without the fix.
//
// Limits: auth.users is a minimal stand-in and logins are simulated by setting the
// role and the JWT "sub" claim, so a final check against a real Supabase project is
// still needed.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import type { PGliteInterface, Transaction } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../supabase/migrations");

const SUPABASE_STUB = `
  CREATE ROLE anon NOLOGIN NOINHERIT;
  CREATE ROLE authenticated NOLOGIN NOINHERIT;
  CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;

  CREATE SCHEMA auth;
  CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    raw_user_meta_data JSONB NOT NULL DEFAULT '{}'
  );
  -- Like Supabase's auth.uid(): the "sub" claim of the request's JWT, NULL when logged out.
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

  -- Supabase's default grants on the public schema (the reason 005 exists).
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
`;

// Fixed ids so tests can refer to the seed rows. All data is fake.
export const ids = {
  uniA: "aaaaaaaa-0000-0000-0000-000000000000",
  uniB: "bbbbbbbb-0000-0000-0000-000000000000",
  studentA: "aaaaaaaa-0000-0000-0000-000000000001",
  studentA2: "aaaaaaaa-0000-0000-0000-000000000002",
  facultyA: "aaaaaaaa-0000-0000-0000-000000000003",
  studentB: "bbbbbbbb-0000-0000-0000-000000000001",
  noProfile: "cccccccc-0000-0000-0000-000000000001",
  communityA: "aaaaaaaa-0000-0000-0001-000000000001",
  communityB: "bbbbbbbb-0000-0000-0001-000000000001",
  doubtA: "aaaaaaaa-0000-0000-0002-000000000001",
  doubtB: "bbbbbbbb-0000-0000-0002-000000000001",
  answerA: "aaaaaaaa-0000-0000-0003-000000000001",
};

export const DOUBT_TITLE = "How does Dijkstra's shortest path algorithm work?";

// Two universities with one board, one doubt each (same title, to test search isolation),
// and one answer in university A (by studentA2 on studentA's doubt).
const SEED = `
  INSERT INTO public.universities (id, name, allowed_domains) VALUES
    ('${ids.uniA}', 'Demo College A', ARRAY['college-a.test']),
    ('${ids.uniB}', 'Demo College B', ARRAY['college-b.test']);

  -- The 003 trigger creates a STUDENT profile for each user.
  INSERT INTO auth.users (id, email) VALUES
    ('${ids.studentA}', 'student.one@college-a.test'),
    ('${ids.studentA2}', 'student.two@college-a.test'),
    ('${ids.facultyA}', 'faculty.one@college-a.test'),
    ('${ids.studentB}', 'student.one@college-b.test'),
    ('${ids.noProfile}', 'no.profile@college-a.test');
  UPDATE public.profiles SET role = 'FACULTY' WHERE id = '${ids.facultyA}';
  DELETE FROM public.profiles WHERE id = '${ids.noProfile}';

  INSERT INTO public.communities (id, university_id, name, created_by) VALUES
    ('${ids.communityA}', '${ids.uniA}', 'CS-301 Algorithms', '${ids.facultyA}'),
    ('${ids.communityB}', '${ids.uniB}', 'CS-301 Algorithms', NULL);

  INSERT INTO public.doubts (id, university_id, community_id, author_id, title, body) VALUES
    ('${ids.doubtA}', '${ids.uniA}', '${ids.communityA}', '${ids.studentA}', '${DOUBT_TITLE.replace("'", "''")}', 'Fake doubt A'),
    ('${ids.doubtB}', '${ids.uniB}', '${ids.communityB}', '${ids.studentB}', '${DOUBT_TITLE.replace("'", "''")}', 'Fake doubt B');

  INSERT INTO public.answers (id, university_id, doubt_id, author_id, body) VALUES
    ('${ids.answerA}', '${ids.uniA}', '${ids.doubtA}', '${ids.studentA2}', 'Fake answer A');
`;

// Builds the database once; tests use base.clone() so each starts from the same state.
export async function createBaseDb(): Promise<PGliteInterface> {
  const db = await PGlite.create({ extensions: { pg_trgm, uuid_ossp } });
  await db.exec(SUPABASE_STUB);
  const excluded = (process.env.RLS_EXCLUDE ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (excluded.includes(file)) continue;
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  await db.exec(SEED);
  return db;
}

export type Who =
  | { role: "anon" }
  | { role: "authenticated"; uid: string }
  | { role: "service_role" };

export const anon: Who = { role: "anon" };
export const serviceRole: Who = { role: "service_role" };
export const user = (uid: string): Who => ({ role: "authenticated", uid });

// Runs fn as a Supabase API request would: with the request's role and JWT "sub" claim.
// The transaction rolls back if fn throws, so a refused write changes nothing.
export function as<T>(db: PGliteInterface, who: Who, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`SET LOCAL ROLE ${who.role}`);
    await tx.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [
      who.role === "authenticated" ? who.uid : "",
    ]);
    return fn(tx);
  });
}

// "permission denied" (missing grant) and "violates row-level security policy" both use 42501.
export async function assertRefused(action: Promise<unknown>): Promise<void> {
  await assert.rejects(action, (err: { code?: string; message?: string }) => {
    assert.equal(err.code, "42501", `expected a 42501 refusal, got ${err.code}: ${err.message}`);
    return true;
  });
}
