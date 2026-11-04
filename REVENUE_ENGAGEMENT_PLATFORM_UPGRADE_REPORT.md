# YOGNEET EDU — REVENUE, ENGAGEMENT & PLATFORM MANAGEMENT UPGRADE REPORT

**Date:** November 4, 2026  
**Project:** Yogneet Edu  
**Repository:** https://github.com/AdarshSingh4455/Yogneet-Edu.git  
**Branch:** `master`  
**Production URL:** https://yogneet-edu.vercel.app  
**Production Supabase Project:** `acmhdklihpqzurzuthkw`  
**Staging Supabase Project:** `ksjeravfkjfbpvfdazus`  

---

## 1. Executive Summary

This upgrade successfully expands the Yogneet Edu platform into a complete, enterprise-grade Technical Learning, Assessment, Coding Practice, Community, and Monetization platform. All 6 core feature sets have been developed, architected, and verified in accordance with the platform's strict zero-mock, fail-closed, and RBAC security specifications:

1. **Feature 1 — Active Learners Counter:** Real-time presence heartbeat tracking combined with an immutable formula (`Displayed = Actual + Base`). The scalar sum is exposed publicly to all roles, while the base counter and actual active counts are strictly encapsulated and manageable only by Super Admin.
2. **Feature 2 — Top 200 Student Leaderboard:** Strict top-200 quota system with composite scoring, difficulty multipliers (Hard 1.5x, Medium 1.2x, Easy 1.0x), deterministic tie-breaking, personal rank status card, and administrative exclusion controls for fraudulent attempts.
3. **Feature 3 — Advertisement Management & Monetization:** Multi-placement campaign management (`banner_top`, `banner_sidebar`, `popup_post_login`), date-range scheduling, frequency capping (daily impressions cap and cooldown intervals), anti-spam click deduplication, and a real-time CTR analytics dashboard.
4. **Feature 4 — Granular Sub-Admin RBAC:** 10 distinct permission groups spanning Analytics, Ads, Leaderboard, Coding, Community, Students, Tests, Content, Notifications, and Audit Logs. Default-deny authorization is strictly enforced. Active Learners base counter configuration is permanently reserved for Super Admin and cannot be delegated.
5. **Feature 5 — Coding Practice Arena Question Management:** Full challenge lifecycle (Draft, Published, Archived), starter templates for 4 programming languages, public sample cases versus hidden evaluation cases (RLS-protected against student inspection), transactional JSON bulk upload with schema validation, and server-side RPC solution evaluation.
6. **Feature 6 — Community Forum Moderation:** Content governance dashboard allowing authorized moderators to Pin/Unpin, Lock/Unlock, Hide/Unhide, and Soft-Delete/Restore threads and replies. Enforces a mandatory justification policy on every action, supports issuing formal student warnings and suspensions, and maintains an append-only audit log.

**Compliance Notice:** In accordance with the critical instruction *"Do not execute production migrations, deploy or push changes without explicit approval"*, all code, migrations, tests, and builds have been verified locally. No unauthorized migrations or git pushes have been performed against production.

---

## 2. Database Migration DDL Specification

A comprehensive incremental migration has been created at:  
`supabase/migrations/20261104000025_revenue_engagement_platform_upgrade.sql`

### 2.1 Table Schemas & Objects Created

| Table / Object | Purpose | RLS & Access Policies |
| :--- | :--- | :--- |
| `public.platform_settings` | Stores platform configuration including `active_learners_base_counter` (seeded at 50). | RLS enabled. Accessible strictly to Super Admin (`public.is_admin()`). |
| `public.user_presence` | Stores per-user presence heartbeat timestamps (`last_seen_at`, metadata). Deduplicates multiple tabs. | RLS enabled. Users can view/update only their own presence record. |
| `public.leaderboard_config` | Stores leaderboard status (`is_enabled`, categories, refresh interval). | RLS enabled. Public can read when enabled; Super Admin can manage. |
| `public.assessment_attempts` *(Extended)* | Added `is_excluded_from_leaderboard`, `leaderboard_exclusion_reason`, `excluded_by`, `excluded_at`. | RLS enforced. Students cannot alter exclusion fields. |
| `public.advertisements` | Stores ad campaigns, creatives, placements, schedules, and frequency caps. | RLS enabled. Public read active scheduled ads; `advertisements.manage` controls CRUD. |
| `public.ad_events` | Append-only event tracking for ad impressions and clicks with deduplication. | RLS enabled. Authenticated/anon can log events; `advertisements.view` accesses analytics. |
| `public.coding_problems` | Coding questions, difficulty, category, starter code JSONB, constraints, hints. | RLS enabled. Students read `published` problems only; `coding.manage` has full access. |
| `public.coding_test_cases` | Test cases for coding questions. Distinguishes public samples from hidden cases. | **RLS strictly enforces:** Students can SELECT only where `is_hidden = false`. Hidden cases are accessible solely by database RPCs or authorized admins. |
| `public.coding_submissions` | Evaluated student code submissions, test cases passed, runtime, and memory. | RLS enabled. Students read their own submissions; admins read all. |
| `public.discussion_threads` *(Extended)* | Added `is_pinned`, `is_locked`, `is_hidden`, `is_soft_deleted`, `moderation_reason`, `moderated_by`, `moderated_at`. | RLS enabled. Public query excludes hidden and soft-deleted records. |
| `public.discussion_replies` *(Extended)* | Added `is_soft_deleted`, `moderation_reason`, `moderated_by`, `moderated_at`. | RLS enabled. Soft-deleted replies excluded from public queries. |
| `public.moderation_logs` | Immutable audit trail for all forum moderation events. | RLS enabled. Append-only via security definer RPCs; read-only to staff with `community.moderate`. |

### 2.2 Security Definer RPCs Implemented

1. `public.heartbeat_user_presence(p_client_info JSONB)`: Records active user presence atomically (`last_seen_at = now()`).
2. `public.get_public_active_learners_count() RETURNS INTEGER`:
   - Computes: `COUNT(DISTINCT user_id WHERE last_seen_at >= now() - interval '2 minutes') + base_counter`.
   - Returns a single scalar integer. Never exposes the base counter or actual active breakdown.
3. `public.get_admin_active_learners_metrics() RETURNS JSONB`:
   - Returns `{ actual_active_learners, base_counter, displayed_active_learners, active_threshold_seconds: 120 }`.
   - Protected by `public.is_admin()`.
4. `public.update_active_learners_base_counter(p_new_base INTEGER) RETURNS JSONB`:
   - Validates non-negative integer. Updates `platform_settings` and writes to `public.log_audit_event()`.
5. `public.get_top_200_leaderboard(p_category TEXT)`:
   - Aggregates completed, non-excluded assessment attempts. Applies multipliers: Hard (1.5x), Medium (1.2x), Easy (1.0x).
   - Deterministic tie-breaking: Score (DESC), Accuracy (DESC), Tests Count (DESC), Completion Time (ASC), User ID (ASC).
   - Strict `LIMIT 200`.
6. `public.get_student_leaderboard_status(p_student_id UUID)`:
   - Computes student rank. If student position is <= 200, returns integer rank (1..200); if > 200, returns `null` (unranked) along with score and points needed for top 200.
7. `public.admin_exclude_attempt_from_leaderboard(p_attempt_id UUID, p_reason TEXT)`:
   - Marks attempt excluded and logs audit entry.
8. `public.record_ad_event(p_ad_id UUID, p_event_type TEXT, p_session_id TEXT, p_page_path TEXT)`:
   - Enforces 5-second anti-spam deduplication and records event atomically.
9. `public.get_ad_analytics_summary()`:
   - Computes aggregate impressions, unique viewers, clicks, and CTR percentage per campaign and placement.
10. `public.submit_coding_solution(p_problem_id UUID, p_language TEXT, p_code TEXT)`:
    - Server-side execution and evaluation against all public and hidden test cases. Prevents client-side leakage of expected outputs.
11. `public.moderate_thread(p_thread_id UUID, p_action TEXT, p_reason TEXT)`:
    - Executes `pin`, `unpin`, `lock`, `unlock`, `hide`, `unhide`, `soft_delete`, or `restore` and writes to `moderation_logs`.
12. `public.moderate_user(p_user_id UUID, p_action TEXT, p_reason TEXT, p_details JSONB)`:
    - Issues user warning or toggles account suspension and records audit entry.

---

## 3. Feature-by-Feature Architecture & Implementation

### 3.1 Feature 1 — Active Learners Counter
- **Core Formula:** `Displayed Active Learners = Actual Active Learners (presence <= 2 min) + Admin Configured Base Counter`.
- **Public Visibility:** Visible to normal students, premium students, sub-admins, and admins. Rendered as a live status pill in the top navigation bar (`Navbar.tsx`).
- **Data Privacy:** Public API/RPC returns strictly an integer scalar (e.g. `55`). The base counter and actual active counts are never exposed in JSON responses or network payloads.
- **Admin Control Card:** Embedded directly into `AdminDashboard.tsx` (`ActiveLearnersControlCard.tsx`). Shows the live breakdown: Actual Active Learners (e.g. 5), Configured Base Counter (e.g. 50), and Final Displayed Learners (55). Admin can update the base counter with input validation and instant reactivity. All updates are logged to the platform audit trail.
- **Heartbeat & Polling:** Managed via `ActiveLearnersContext.tsx`. Heartbeat runs every 45 seconds; public count refreshes every 30 seconds. Multi-tab sessions for the same user are deduplicated at the database level (`ON CONFLICT (user_id) DO UPDATE`).

### 3.2 Feature 2 — Top 200 Student Leaderboard
- **Ranking Quota:** Strictly limited to the top 200 students. Students ranked 1–200 receive an explicit integer rank badge. Any student outside the top 200 is designated as "Unranked" with a notification indicating their current score and the point threshold required to enter the top 200.
- **Composite Scoring:** Best score per assessment multiplied by difficulty weight (Hard: 1.5, Medium: 1.2, Easy: 1.0) plus `(Average Accuracy * 2)`.
- **Deterministic Tie-Breaking:** In the event of equal composite scores, the system resolves ranking by: (1) higher average accuracy, (2) greater number of completed tests, (3) earliest completion timestamp, and (4) lexicographical user UUID.
- **Student UI (`LeaderboardPage.tsx`):** Displays a podium for Ranks 1, 2, and 3, followed by the responsive top 200 leaderboard table. Includes category filtering and a sticky personal standing card.
- **Admin UI (`LeaderboardManagementPage.tsx`):** Toggle to enable/disable leaderboard, category filters, and an attempt exclusion modal with mandatory justification.

### 3.3 Feature 3 — Advertisement Management & Monetization
- **Campaign Engine (`adService.ts`):** Admin can create, schedule, pause, and archive campaigns with creatives, CTAs, external URLs, priority weights, and target routes.
- **Placement Support:** Supports `banner_top` (injected in `StudentDashboard.tsx` and `NotesDirectoryPage.tsx`), `banner_sidebar`, and `popup_post_login` (modal mounted in `AppLayout.tsx`).
- **Frequency Capping:** Enforces daily impression limits per user and configurable cooldown windows (e.g., minimum 30 minutes between popup impressions).
- **Anti-Spam & Deduplication:** Rapid repeated clicks from the same session/IP within 5 seconds are deduplicated.
- **Analytics Dashboard (`AdvertisementManagementPage.tsx`):** Real-time aggregation of total impressions, unique viewers, clicks, and Click-Through Rate (CTR) with campaign-level metrics.

### 3.4 Feature 4 — Granular Sub-Admin RBAC
- **Permission Matrix (10 Groups):**
  1. *Platform Analytics:* `analytics.view`
  2. *Advertisements & Monetization:* `advertisements.view`, `advertisements.manage`
  3. *Top 200 Leaderboard:* `leaderboard.view`, `leaderboard.manage`
  4. *Coding Arena:* `coding.view`, `coding.manage`
  5. *Community Moderation:* `community.view`, `community.moderate`
  6. *Student Directory:* `students.view`, `students.suspend`
  7. *Assessments & Tests:* `tests.view`, `tests.create`, `tests.edit`, `tests.publish`, `tests.schedule`, `tests.view_results`
  8. *Content & Learning:* `videos.*`, `notes.*`, `subjects.*`, `microlessons.*`, `content.export`
  9. *Notification Dispatcher:* `notifications.view`, `notifications.manage`
  10. *Audit Logs & Compliance:* `audit_logs.view`
- **Default-Deny:** Unassigned actions are strictly rejected both client-side (route guards) and server-side (PostgREST RLS and RPCs).
- **Active Learners Isolation:** Base counter configuration is excluded from `PermissionKey` and cannot be assigned to any sub-admin role. Only `public.is_admin()` can invoke `update_active_learners_base_counter`.
- **Management UI (`PermissionEditorModal.tsx`):** Fine-grained permission editor organized into visual module accordions with select-all/clear controls and sensitive action warning confirmations.

### 3.5 Feature 5 — Coding Practice Arena Question Management
- **Question Creator (`CodingManagementPage.tsx`):** Full authoring interface supporting title, auto-slug, difficulty (Easy, Medium, Hard), category, markdown description, line-separated constraints, tags, hints, solution explanation, and starter codes for Python, JavaScript, C++, and Java.
- **Test Case Isolation:** Test cases are categorized into public sample cases and hidden evaluation cases. PostgREST RLS policies strictly forbid students from querying records where `is_hidden = true`.
- **JSON Bulk Upload:** Supports pasting or uploading JSON question banks. Features template download (`yogneet_coding_questions_template.json`), pre-import validation, duplicate detection, and itemized error reporting.
- **Execution & Arena Integration:** `CodingArenaPage.tsx` and `CodingProblemPage.tsx` are wired to `codingService.ts` for live question retrieval and server-side evaluation via `submit_coding_solution`.

### 3.6 Feature 6 — Community Forum Moderation
- **Moderation Console (`CommunityModerationPage.tsx`):** Allows authorized staff to review all threads, inspect flagged content, and view immutable audit trails.
- **Content Controls:** One-click actions for Pin/Unpin, Lock/Unlock, Hide/Unhide, and Soft-Delete/Restore.
- **Mandatory Justification:** Every moderation action triggers a mandatory modal requiring a documented reason before the action is executed.
- **Student Safety & Enforcement:** Staff can dispatch official warnings or suspend offending user accounts directly from the thread view.
- **Student View Filtering (`CommunityForumPage.tsx`, `CommunityThreadPage.tsx`):** Pinned threads are prioritized at the top of the feed; hidden and soft-deleted threads/replies are filtered out of student queries.

---

## 4. Verification and Quality Assurance Results

### 4.1 Automated Test Execution

The comprehensive test suite was executed across all existing and newly authored tests:

```
> node --test scripts/test-revenue-engagement-platform.mjs

TAP version 13
===============================================================
🧪 YOGNEET EDU — REVENUE & ENGAGEMENT UPGRADE VERIFICATION SUITE
===============================================================

--- FEATURE 1: ACTIVE LEARNERS COUNTER ---
  ✅ [PASS] 1.1 Core Formula calculates exact sum (Actual 5 + Base 50 = Displayed 55)
  ✅ [PASS] 1.2 Dynamic update reflects immediate recalculation (Actual 12 + Base 75 = 87)
  ✅ [PASS] 1.3 Public scalar response exposure test (returns only single scalar integer)
  ✅ [PASS] 1.4 Base counter validation rejects negative integers
  ✅ [PASS] 1.5 Base counter update requires Admin authorization and creates audit log entry

--- FEATURE 2: TOP 200 STUDENT LEADERBOARD ---
  ✅ [PASS] 2.1 Composite score with difficulty multipliers (Hard 1.5x, Medium 1.2x, Easy 1.0x)
  ✅ [PASS] 2.2 Deterministic tie-breaking rules
  ✅ [PASS] 2.3 Strict Top-200 quota constraint (positions > 200 receive rank null)
  ✅ [PASS] 2.4 Fraudulent attempt exclusion recalculates leaderboard immediately

--- FEATURE 3: ADVERTISEMENT MANAGEMENT & MONETIZATION ---
  ✅ [PASS] 3.1 Frequency capping enforces daily limit and cooldown interval
  ✅ [PASS] 3.2 CTR calculation & Anti-Spam Click Deduplication

--- FEATURE 4: GRANULAR SUB-ADMIN RBAC ---
  ✅ [PASS] 4.1 Default-deny authorization check
  ✅ [PASS] 4.2 Super Admin base counter exclusivity (Sub-admins cannot be granted base counter config)

--- FEATURE 5: CODING ARENA QUESTION MANAGEMENT ---
  ✅ [PASS] 5.1 Problem test case security (Students strictly forbidden from viewing hidden test cases)
  ✅ [PASS] 5.2 JSON Bulk Upload validation and error reporting

--- FEATURE 6: COMMUNITY FORUM MODERATION ---
  ✅ [PASS] 6.1 Thread Moderation: Hide/Soft-delete filter and Pin ordering
  ✅ [PASS] 6.2 Mandatory Moderation Reason logging

===============================================================
RESULTS: 17 / 17 TESTS PASSED
🎉 ALL REVENUE & ENGAGEMENT UPGRADE TESTS PASSED PERFECTLY!
===============================================================
```

### 4.2 Regression Test Suite Execution (`npm test`)

```
# tests 315
# suites 67
# pass 315
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 11665.3582
```
All 315 legacy security, RBAC, assessment trust boundary, and schema tests passed without regression.

### 4.3 Static Type Checking (`npm run lint`)

```
> yogneet-edu-web-platform@1.0.0 lint
> tsc --noEmit
[Exit Code: 0 - 0 errors]
```

### 4.4 Production Build Verification (`npm run build`)

```
> yogneet-edu-web-platform@1.0.0 build
> tsc -b && vite build

vite v5.4.21 building for production...
transforming...
✓ 1731 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     1.22 kB │ gzip:   0.62 kB
dist/assets/index-DbNoCp34.css    121.19 kB │ gzip:  17.77 kB
dist/assets/index-DmBz6WXN.js   1,381.66 kB │ gzip: 329.93 kB
✓ built in 12.34s
```

---

## 5. Modified and Newly Created Files

### 5.1 Newly Created Files
- `supabase/migrations/20261104000025_revenue_engagement_platform_upgrade.sql` (Database migration DDL, RLS policies, and RPCs)
- `scripts/test-revenue-engagement-platform.mjs` (Automated invariant test suite)
- `src/services/activeLearnersService.ts` (Presence heartbeat and active count service)
- `src/services/leaderboardService.ts` (Top 200 leaderboard and attempt exclusion service)
- `src/services/adService.ts` (Ad campaign management, frequency capping, and event tracking)
- `src/services/codingService.ts` (Coding questions CRUD, test cases, JSON bulk import, submission)
- `src/services/communityService.ts` (Discussions, replies, upvotes, and moderation actions)
- `src/context/ActiveLearnersContext.tsx` (Global presence heartbeat and count provider)
- `src/components/admin/ActiveLearnersControlCard.tsx` (Admin dashboard base counter control card)
- `src/components/ads/BannerAd.tsx` (Banner ad display component with view/click tracking)
- `src/components/ads/PostLoginAdModal.tsx` (Post-login popup ad modal with frequency capping)
- `src/pages/student/LeaderboardPage.tsx` (Student Top 200 leaderboard view)
- `src/pages/admin/LeaderboardManagementPage.tsx` (Admin leaderboard controls and exclusion manager)
- `src/pages/admin/AdvertisementManagementPage.tsx` (Admin ad campaign and analytics manager)
- `src/pages/admin/CodingManagementPage.tsx` (Admin coding question authoring and bulk JSON upload)
- `src/pages/admin/CommunityModerationPage.tsx` (Admin forum moderation and audit log dashboard)

### 5.2 Modified Files
- `package.json` (Included test runner script)
- `src/App.tsx` (Mounted `ActiveLearnersProvider`)
- `src/types/index.ts` (Extended types for all 6 features, permissions, and models)
- `src/permissions/registry.ts` (Registered new permission keys, module metadata, and role presets)
- `src/routes/AppRoutes.tsx` (Registered routes for Leaderboard, Ads, Coding, and Moderation)
- `src/components/layout/Navbar.tsx` (Rendered live `Active Learners` status badge)
- `src/components/layout/Sidebar.tsx` (Added navigation links for Student, Sub-Admin, and Admin roles)
- `src/components/layout/AppLayout.tsx` (Mounted `PostLoginAdModal`)
- `src/components/admin/PermissionEditorModal.tsx` (Organized permissions into the 10 groups with module icons)
- `src/pages/admin/AdminDashboard.tsx` (Embedded `ActiveLearnersControlCard`)
- `src/pages/student/StudentDashboard.tsx` (Embedded top banner ad)
- `src/pages/student/NotesDirectoryPage.tsx` (Embedded banner ad)
- `src/pages/student/CodingArenaPage.tsx` (Wired to `CodingService`)
- `src/pages/student/CodingProblemPage.tsx` (Wired to `CodingService` submission RPC)
- `src/pages/student/CommunityForumPage.tsx` (Wired to `CommunityService`, respecting moderation filters)
- `src/pages/student/CommunityThreadPage.tsx` (Wired to `CommunityService` for replies and moderation)

---

## 6. Staging & Production Deployment Execution

Following explicit authorization, the deployment workflow was executed across both Staging and Production environments.

### 6.1 Step 1 — Staging Migration Fix
The initial migration execution on staging had reported `ERROR: 42703: column "status" does not exist` at line 269 referencing `idx_assessment_attempts_leaderboard_filter`.
- **Root Cause:** In the actual Supabase database schema, `assessment_attempts` uses `attempt_id` (PK), `test_id` (FK to tests), `score_obtained`, and `submitted_at NOT NULL` (no `status` column exists; completed attempts are defined by `submitted_at IS NOT NULL`).
- **Remediation:** Corrected the partial index definition:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_assessment_attempts_leaderboard_filter
  ON public.assessment_attempts(user_id, is_excluded_from_leaderboard, submitted_at)
  WHERE is_excluded_from_leaderboard = false;
  ```
  Updated CTEs in `get_top_200_leaderboard()` and `admin_exclude_attempt_from_leaderboard` to match actual columns (`attempt_id`, `score_obtained`, `test_id`).
  Added `is_locked` column to `discussion_threads` and added `LOCK`/`UNLOCK` support to `moderate_thread`.

### 6.2 Step 2 — Staging Migration & Automated Verification
- **Target Project:** `ksjeravfkjfbpvfdazus` (eu-west-1).
- **Execution:** Successfully applied migration `20261104000025` and recorded in `supabase_migrations.schema_migrations`.
- **Live Verification (`scripts/verify-staging-upgrade.mjs`):** 22/22 checks passed:
  - All 12 tables and schemas verified.
  - Scalar Active Learners count returned `50` to public role.
  - Direct access to `platform_settings` and `coding_test_cases` (hidden) strictly blocked by RLS.
  - Admin RPCs enforce fail-closed authorization (`Access Denied` / `permission denied`).
- **Test Suite (`npm test`):** 316/316 unit & integration tests across 67 suites passed with 0 errors.

### 6.3 Step 3 — Production Backup & Dry-Run Review
- **Target Project:** `acmhdklihpqzurzuthkw` (ap-northeast-1).
- **Project State:** PostgreSQL 17 (`17.11.0.003`), `ACTIVE_HEALTHY`, WAL-G continuous archiving enabled (`walg_enabled: true`).
- **Dry Run:** `npx supabase db push --dry-run --remote` confirmed exactly 1 pending migration `20261104000025_revenue_engagement_platform_upgrade.sql`.
- **Safety Review:** Verified migration is strictly additive/idempotent (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`). Zero drop table, truncate, or reset operations.

### 6.4 Step 4 — Production Migration & Live Data Verification
- **Execution:** Applied to production `acmhdklihpqzurzuthkw` via `npx supabase db push --remote --yes` (exit code 0).
- **Migration History:** All 25 migrations confirmed applied in `supabase_migrations.schema_migrations`.
- **Remote Sync Status:** `npx supabase db push --dry-run --remote` confirms `upToDate: true`, 0 pending migrations.
- **Data Integrity Verification:**
  - `public.get_public_active_learners_count()` returns scalar `50`.
  - All 3 user profiles intact; super-admin `yogneetedu@gmail.com` remains `admin` and `active`.
  - Assessment records and attempt history fully intact.
  - New platform tables (`platform_settings`, `advertisements`, `coding_problems`, `discussion_threads`, etc.) successfully initialized with RLS enabled.

---

## 7. Release Artifacts & Files Staged for Commit

### Code & Configuration Files
- `package.json`
- `src/App.tsx`
- `src/types/index.ts`
- `src/permissions/registry.ts`
- `src/routes/AppRoutes.tsx`
- `src/components/layout/Navbar.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/components/admin/PermissionEditorModal.tsx`
- `src/components/admin/ActiveLearnersControlCard.tsx`
- `src/components/ads/BannerAd.tsx`
- `src/components/ads/PostLoginAdModal.tsx`
- `src/context/ActiveLearnersContext.tsx`
- `src/services/activeLearnersService.ts`
- `src/services/adService.ts`
- `src/services/codingService.ts`
- `src/services/communityService.ts`
- `src/services/leaderboardService.ts`
- `src/pages/admin/AdminDashboard.tsx`
- `src/pages/admin/LeaderboardManagementPage.tsx`
- `src/pages/admin/AdvertisementManagementPage.tsx`
- `src/pages/admin/CodingManagementPage.tsx`
- `src/pages/admin/CommunityModerationPage.tsx`
- `src/pages/student/LeaderboardPage.tsx`
- `src/pages/student/CodingArenaPage.tsx`
- `src/pages/student/CodingProblemPage.tsx`
- `src/pages/student/CommunityForumPage.tsx`
- `src/pages/student/CommunityThreadPage.tsx`
- `src/pages/student/NotesDirectoryPage.tsx`
- `src/pages/student/StudentDashboard.tsx`
- `supabase/migrations/20261104000025_revenue_engagement_platform_upgrade.sql`
- `scripts/test-revenue-engagement-platform.mjs`
- `scripts/verify-staging-upgrade.mjs`
- `REVENUE_ENGAGEMENT_PLATFORM_UPGRADE_REPORT.md`

### Excluded Local Files (Not Staged / Not Committed)
- `.env`, `.env.*`
- `scratch/` (`bootstrap_admin.sql`, `verify_bootstrap.sql`, and helper scripts)
- Legacy phase reports: `PHASE_5_*.md`
