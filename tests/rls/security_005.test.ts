// RLS tests for supabase/migrations/005_security_fixes.sql.
// Run: npm run test:rls
// Without the fix (each "refused" test should then fail):
//   RLS_EXCLUDE=005_security_fixes.sql npm run test:rls

import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import type { PGliteInterface } from "@electric-sql/pglite";
import { DOUBT_TITLE, anon, as, assertRefused, createBaseDb, ids, serviceRole, user } from "./setup.ts";

let base: PGliteInterface;
let db: PGliteInterface;

before(async () => {
  base = await createBaseDb();
});
after(async () => {
  await base.close();
});
beforeEach(async () => {
  db = await base.clone();
});
afterEach(async () => {
  await db.close();
});

// Reads as the database owner (RLS does not apply), to check what really changed.
async function profile(id: string) {
  const { rows } = await db.query<{ name: string; role: string; university_id: string; reputation: number }>(
    "SELECT name, role, university_id, reputation FROM public.profiles WHERE id = $1",
    [id],
  );
  return rows[0];
}

describe("profiles", () => {
  test("a student can edit their own name", async () => {
    await as(db, user(ids.studentA), (tx) =>
      tx.query("UPDATE public.profiles SET name = 'New Name' WHERE id = $1", [ids.studentA]),
    );
    assert.equal((await profile(ids.studentA)).name, "New Name");
  });

  test("a student cannot make themselves ADMIN", async () => {
    await assertRefused(
      as(db, user(ids.studentA), (tx) =>
        tx.query("UPDATE public.profiles SET role = 'ADMIN' WHERE id = $1", [ids.studentA]),
      ),
    );
    assert.equal((await profile(ids.studentA)).role, "STUDENT");
  });

  test("a student cannot move themselves to another university", async () => {
    // No WHERE clause on purpose: with one, the SELECT policy is checked against the new row and
    // refuses the move even without 005; without one, only the UPDATE policy applies (own row).
    await assertRefused(
      as(db, user(ids.studentA), (tx) => tx.query("UPDATE public.profiles SET university_id = $1", [ids.uniB])),
    );
    assert.equal((await profile(ids.studentA)).university_id, ids.uniA);
  });

  test("a student cannot set their own reputation", async () => {
    await assertRefused(
      as(db, user(ids.studentA), (tx) =>
        tx.query("UPDATE public.profiles SET reputation = 99999 WHERE id = $1", [ids.studentA]),
      ),
    );
    assert.equal((await profile(ids.studentA)).reputation, 0);
  });

  test("a student cannot edit another student's profile", async () => {
    const result = await as(db, user(ids.studentA), (tx) =>
      tx.query("UPDATE public.profiles SET name = 'Hacked' WHERE id = $1", [ids.studentA2]),
    );
    assert.equal(result.affectedRows, 0);
    assert.notEqual((await profile(ids.studentA2)).name, "Hacked");
  });
});

describe("search_similar_doubts", () => {
  const search = (tx: { query: PGliteInterface["query"] }) =>
    tx.query<{ id: string }>("SELECT id FROM public.search_similar_doubts($1)", ["Dijkstra shortest path"]);

  test("a student finds doubts from their own university only", async () => {
    const { rows } = await as(db, user(ids.studentA), search);
    assert.deepEqual(rows.map((r) => r.id), [ids.doubtA]);
  });

  test("an anonymous caller cannot run the search", async () => {
    await assertRefused(as(db, anon, search));
  });

  test("a signed-in user without a profile finds nothing", async () => {
    const { rows } = await as(db, user(ids.noProfile), search);
    assert.equal(rows.length, 0);
  });
});

describe("doubts", () => {
  test("a student can post a doubt in their own university's board", async () => {
    const { rows } = await as(db, user(ids.studentA), (tx) =>
      tx.query<{ status: string; bounty_amount: number }>(
        `INSERT INTO public.doubts (university_id, community_id, author_id, title, body)
         VALUES ($1, $2, $3, 'Fake title', 'Fake body') RETURNING status, bounty_amount`,
        [ids.uniA, ids.communityA, ids.studentA],
      ),
    );
    assert.deepEqual(rows[0], { status: "OPEN", bounty_amount: 0 });
  });

  test("a student cannot post into another university's board", async () => {
    await assertRefused(
      as(db, user(ids.studentA), (tx) =>
        tx.query(
          `INSERT INTO public.doubts (university_id, community_id, author_id, title, body)
           VALUES ($1, $2, $3, 'Fake title', 'Fake body')`,
          [ids.uniA, ids.communityB, ids.studentA],
        ),
      ),
    );
  });

  test("an author can edit their own doubt's title", async () => {
    const result = await as(db, user(ids.studentA), (tx) =>
      tx.query("UPDATE public.doubts SET title = 'Edited title' WHERE id = $1", [ids.doubtA]),
    );
    assert.equal(result.affectedRows, 1);
  });

  test("an author cannot mark their own doubt RESOLVED", async () => {
    await assertRefused(
      as(db, user(ids.studentA), (tx) =>
        tx.query("UPDATE public.doubts SET status = 'RESOLVED' WHERE id = $1", [ids.doubtA]),
      ),
    );
  });

  test("an author cannot give their doubt a bounty for free", async () => {
    await assertRefused(
      as(db, user(ids.studentA), (tx) =>
        tx.query("UPDATE public.doubts SET bounty_amount = 500 WHERE id = $1", [ids.doubtA]),
      ),
    );
  });

  test("a student cannot edit someone else's doubt", async () => {
    const result = await as(db, user(ids.studentA2), (tx) =>
      tx.query("UPDATE public.doubts SET title = 'Hacked' WHERE id = $1", [ids.doubtA]),
    );
    assert.equal(result.affectedRows, 0);
  });
});

describe("answers", () => {
  test("a student can answer a doubt in their own university", async () => {
    const result = await as(db, user(ids.studentA2), (tx) =>
      tx.query(
        "INSERT INTO public.answers (university_id, doubt_id, author_id, body) VALUES ($1, $2, $3, 'Fake answer')",
        [ids.uniA, ids.doubtA, ids.studentA2],
      ),
    );
    assert.equal(result.affectedRows, 1);
  });

  test("a student cannot answer another university's doubt", async () => {
    await assertRefused(
      as(db, user(ids.studentA), (tx) =>
        tx.query(
          "INSERT INTO public.answers (university_id, doubt_id, author_id, body) VALUES ($1, $2, $3, 'Fake answer')",
          [ids.uniA, ids.doubtB, ids.studentA],
        ),
      ),
    );
  });

  test("a student cannot post an answer with forged upvotes", async () => {
    await assertRefused(
      as(db, user(ids.studentA), (tx) =>
        tx.query(
          `INSERT INTO public.answers (university_id, doubt_id, author_id, body, upvoted_by)
           VALUES ($1, $2, $3, 'Fake answer', (SELECT array_agg(gen_random_uuid()) FROM generate_series(1, 100)))`,
          [ids.uniA, ids.doubtA, ids.studentA],
        ),
      ),
    );
    assert.equal((await profile(ids.studentA)).reputation, 0);
  });

  test("an author cannot add upvotes to their own answer", async () => {
    await assertRefused(
      as(db, user(ids.studentA2), (tx) =>
        tx.query("UPDATE public.answers SET upvoted_by = ARRAY[gen_random_uuid()] WHERE id = $1", [ids.answerA]),
      ),
    );
    assert.equal((await profile(ids.studentA2)).reputation, 0);
  });

  test("an author cannot endorse their own answer", async () => {
    await assertRefused(
      as(db, user(ids.studentA2), (tx) =>
        tx.query("UPDATE public.answers SET is_instructor_endorsed = true WHERE id = $1", [ids.answerA]),
      ),
    );
  });

  test("a student cannot edit someone else's answer", async () => {
    const result = await as(db, user(ids.studentA), (tx) =>
      tx.query("UPDATE public.answers SET body = 'Hacked' WHERE id = $1", [ids.answerA]),
    );
    assert.equal(result.affectedRows, 0);
  });
});

describe("communities", () => {
  const createBoard = (uid: string) =>
    as(db, user(uid), (tx) =>
      tx.query("INSERT INTO public.communities (university_id, name, created_by) VALUES ($1, 'Fake board', $2)", [
        ids.uniA,
        uid,
      ]),
    );

  test("faculty can create a board", async () => {
    const result = await createBoard(ids.facultyA);
    assert.equal(result.affectedRows, 1);
  });

  test("a student cannot create a board", async () => {
    await assertRefused(createBoard(ids.studentA));
  });

  test("faculty cannot set moderators when creating a board", async () => {
    await assertRefused(
      as(db, user(ids.facultyA), (tx) =>
        tx.query("INSERT INTO public.communities (university_id, name, moderators) VALUES ($1, 'Fake board', $2)", [
          ids.uniA,
          [ids.studentA],
        ]),
      ),
    );
  });
});

describe("server-side actions still work", () => {
  test("service_role can accept an answer: the doubt resolves and the author gets 15 points", async () => {
    await as(db, serviceRole, (tx) =>
      tx.query("UPDATE public.answers SET is_accepted = true WHERE id = $1", [ids.answerA]),
    );
    const { rows } = await db.query<{ status: string; resolved_answer_id: string }>(
      "SELECT status, resolved_answer_id FROM public.doubts WHERE id = $1",
      [ids.doubtA],
    );
    assert.deepEqual(rows[0], { status: "RESOLVED", resolved_answer_id: ids.answerA });
    assert.equal((await profile(ids.studentA2)).reputation, 15);
  });

  test("service_role can record an upvote and the author gets 10 points", async () => {
    await as(db, serviceRole, (tx) =>
      tx.query("UPDATE public.answers SET upvoted_by = ARRAY[$1::uuid] WHERE id = $2", [ids.studentA, ids.answerA]),
    );
    assert.equal((await profile(ids.studentA2)).reputation, 10);
  });

  test("search still works for doubt titles with the same wording", async () => {
    const { rows } = await as(db, user(ids.studentB), (tx) =>
      tx.query<{ id: string }>("SELECT id FROM public.search_similar_doubts($1)", [DOUBT_TITLE]),
    );
    assert.deepEqual(rows.map((r) => r.id), [ids.doubtB]);
  });
});
