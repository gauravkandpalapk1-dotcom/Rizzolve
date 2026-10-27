-- ==============================================================================
-- Migration: 005_security_fixes.sql
-- Description: Closes the access-control holes found in 001-004.
-- Why:
--   Supabase grants anon and authenticated ALL rights on every public table by
--   default, and RLS only limits which ROWS a user touches, never which COLUMNS.
--   So a student could update their own role/university_id, forge vote arrays,
--   self-endorse, or mark their own doubt RESOLVED.
-- Enforces:
--   1. Default deny: revoke all table rights from anon/authenticated, then grant
--      back only the columns clients may write.
--   2. search_similar_doubts runs as the caller (normal RLS applies); anon cannot call it.
--   3. A doubt's community and an answer's doubt must be in the caller's university.
--   4. Only FACULTY/ADMIN can create communities.
-- Not covered here:
--   Votes, accepting, endorsing and bounties are server-side only (service_role)
--   until dedicated RPCs exist. The 004 triggers still work (SECURITY DEFINER).
--   Private communities / join_code visibility need a membership table (later).
-- Rule for future migrations: every new table needs the same revoke-then-grant
-- step, because Supabase's default grants apply to it too.
-- ==============================================================================

-- ==============================================================================
-- 1. TABLE PRIVILEGES (default deny, then column-level grants)
-- ==============================================================================

REVOKE ALL ON public.universities, public.profiles, public.communities, public.doubts, public.answers
  FROM anon, authenticated;

-- Reads stay limited to the caller's university by the RLS policies in 001.
GRANT SELECT ON public.universities, public.profiles, public.communities, public.doubts, public.answers
  TO authenticated;

-- Profiles: role, university_id, email, reputation and badges are server-managed.
GRANT UPDATE (name, avatar_url) ON public.profiles TO authenticated;

-- Communities: moderators and join_code are server-managed.
GRANT INSERT (university_id, name, description, is_private, created_by) ON public.communities TO authenticated;

-- Doubts: status, bounty_amount, votes, net_score and resolved_answer_id are server-managed.
GRANT INSERT (university_id, community_id, author_id, title, body) ON public.doubts TO authenticated;
GRANT UPDATE (title, body) ON public.doubts TO authenticated;

-- Answers: is_accepted, is_instructor_endorsed, votes and net_score are server-managed.
GRANT INSERT (university_id, doubt_id, author_id, body) ON public.answers TO authenticated;
GRANT UPDATE (body) ON public.answers TO authenticated;

-- ==============================================================================
-- 2. INSERT POLICIES: same-university references and who may create communities
-- ==============================================================================

-- Only faculty and admins create communities (role comes from the profile, not the client).
ALTER POLICY "communities_insert_same_university"
  ON public.communities
  WITH CHECK (
    university_id = public.get_auth_university_id()
    AND (created_by IS NULL OR created_by = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('FACULTY', 'ADMIN')
    )
  );

-- A doubt can only be posted into a community of the caller's university.
ALTER POLICY "doubts_insert_same_university"
  ON public.doubts
  WITH CHECK (
    university_id = public.get_auth_university_id()
    AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = doubts.community_id
        AND c.university_id = public.get_auth_university_id()
    )
  );

-- An answer can only be posted to a doubt of the caller's university.
ALTER POLICY "answers_insert_same_university"
  ON public.answers
  WITH CHECK (
    university_id = public.get_auth_university_id()
    AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.doubts d
      WHERE d.id = answers.doubt_id
        AND d.university_id = public.get_auth_university_id()
    )
  );

-- ==============================================================================
-- 3. SEARCH RPC: run as the caller, no "no university = everything" branch
-- ==============================================================================

-- SECURITY INVOKER: the doubts SELECT policy applies, so results stay in the caller's
-- university. A caller without a profile (or service_role) gets no rows.
-- Plain SQL: the plpgsql variable for the university id is no longer needed.
CREATE OR REPLACE FUNCTION public.search_similar_doubts(
  search_query TEXT,
  similarity_threshold REAL DEFAULT 0.2,
  match_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  university_id UUID,
  community_id UUID,
  author_id UUID,
  title TEXT,
  body TEXT,
  status public.doubt_status,
  bounty_amount INTEGER,
  net_score INTEGER,
  created_at TIMESTAMPTZ,
  similarity REAL
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT
    d.id,
    d.university_id,
    d.community_id,
    d.author_id,
    d.title,
    d.body,
    d.status,
    d.bounty_amount,
    d.net_score,
    d.created_at,
    similarity(d.title, search_query)::REAL AS similarity
  FROM public.doubts d
  WHERE
    d.university_id = public.get_auth_university_id()
    AND similarity(d.title, search_query) >= similarity_threshold
  ORDER BY
    similarity DESC,
    d.net_score DESC,
    d.created_at DESC
  LIMIT match_limit;
$$;

-- Functions are executable by PUBLIC (and anon, via Supabase defaults) unless revoked.
REVOKE EXECUTE ON FUNCTION public.search_similar_doubts(TEXT, REAL, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_similar_doubts(TEXT, REAL, INTEGER) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_auth_university_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_university_id() TO authenticated, service_role;
