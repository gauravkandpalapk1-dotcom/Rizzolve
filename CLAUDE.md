# Project: Rizzolve — a SaaS doubt board for colleges, built by team Rizz and Deploy
Tagline: "Every doubt, caught in the web."
Students post doubts (text, photo or voice) in subject boards. Peers, seniors, alumni and faculty answer. The asker marks the best answer resolved. Verified answers become a searchable FAQ.

## Problems we solve
1. Students can't tell when AI is wrong → AI answers are drafts that peers vote on and seniors/faculty verify.
2. Chatbot knowledge never accumulates → every resolved doubt becomes a shared, searchable record, and faculty see which topics confuse the class.
3. Nobody answers (90-9-1 participation) → small section-level boards, routing doubts to likely helpers, low-effort ways to contribute, and quality-based incentives.

## Tenancy and visibility
- Each college is a tenant. Every row that belongs to a college carries college_id.
- Doubt visibility: 'class' (default), 'institution' (whole college), 'global' (read-only library, verified content only).
- Roles: platform_admin, college_admin, faculty, student, alumni. Verifier rights are granted per subject (seniors, alumni, faculty).

## Stack
- Supabase: Postgres with row-level security, Storage, Auth (Microsoft, Google, email code).
- Backend: FastAPI (Python), in spidyy-ai/backend/. Holds all secret keys; does AI calls, background processing and admin actions.
- Frontend: React (Vite), in spidyy-ai/frontend/. Uses only the Supabase publishable key.
- AI: one askAI() wrapper. Primary: Gemini Flash (Google AI Studio). Fallback: Groq. Voice transcription: Groq Whisper. Embeddings: a Hugging Face sentence-transformers multilingual model (384 dimensions) run inside the backend.

## Non-negotiable rules
- Access control lives in Postgres RLS and backend checks, never only in the UI.
- Never trust college_id or role sent by the client; derive them from the signed-in user's membership.
- Secret keys (Supabase secret key, AI keys) live only in the backend .env. Never in frontend code, logs or commits.
- Schema changes go in numbered SQL files in db/migrations/ (e.g. 007_votes.sql). Never edit a migration that has already been applied.
- AI answers always store author_type='ai' and model_name, and never count as verified without a human verifier.
- Development uses fake data only. No real student data.
- All UI uses the Rizzolve tokens and components defined in docs/DESIGN.md. No new colours, fonts or one-off styles outside it.

## How to work
- For every task, first show a short plan (files to change, schema changes, risks) and wait for my approval.
- Keep changes small and focused. Don't refactor unrelated code.
- Add tests for every feature, including at least one "wrong user is refused" test.
- When finished, list what changed and how I can check it manually.
