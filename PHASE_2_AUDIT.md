# Yogneet Edu — Phase 2: Architecture & Migration Audit

**Project:** Yogneet Edu (Branded: Tech Geek Adarsh)
**Date:** 2026-10-26
**Auditor:** Antigravity AI
**Baseline Git Commit:** `83c4d59c3dcdfc1936f52f8a4dd0d9530eb2d68b`
**Active Branch:** `master` (synchronized with `origin/master`)

---

## 1. Verified Architecture Baseline

The existing Yogneet Edu platform is an interactive, responsive frontend application built on:
- **Framework:** React 18.3.1 with TypeScript 5.6.3 and Vite 5.4.11
- **Styling & UI:** Tailwind CSS 3.4.15 with custom color tokens (Light, Dark, System modes)
- **Routing:** React Router DOM 6.28.0 ([src/routes/AppRoutes.tsx](file:///c:/Users/adars/OneDrive/Desktop/Yogneet%20Edu/src/routes/AppRoutes.tsx))
- **Icons & Primitives:** Lucide React 0.460.0
- **Quality Gates Baseline:**
  - Automated Tests: 18 tests passing across 6 suites ([scripts/test-permissions.mjs](file:///c:/Users/adars/OneDrive/Desktop/Yogneet%20Edu/scripts/test-permissions.mjs))
  - TypeScript Typecheck (`tsc --noEmit`): 0 errors
  - Production Build (`tsc -b && vite build`): Succeeded (1621 modules transformed, 492 kB JS bundle, 63 kB CSS)

---

## 2. Existing Mock-Data Dependencies

Currently, the application relies on an in-memory state synchronized with `localStorage` via [src/services/api.ts](file:///c:/Users/adars/OneDrive/Desktop/Yogneet%20Edu/src/services/api.ts) seeded from [src/services/mockData.ts](file:///c:/Users/adars/OneDrive/Desktop/Yogneet%20Edu/src/services/mockData.ts):
- **User Personas:** 6 initial profiles (3 Students, 2 Sub-Admins with distinct departmental scopes, 1 Super Admin).
- **Core Entities:**
  - `VideoLesson`: Course metadata, embedded YouTube IDs, lesson resources.
  - `StudyNote`: Notes with Markdown content, LaTeX math formulas, tags, downloadable PDF metadata.
  - `TestSeriesItem` & `AssessmentQuestion`: Timed mock tests, practice quizzes with negative marking.
  - `TestAttemptResult`: Scored assessment outcomes.
  - `CodingProblem`: Multi-language programming problems with test cases and starter templates.
  - `DiscussionThread` & `DiscussionReply`: Community forum posts, nested replies, upvotes, and accepted solutions.
  - `UpcomingEvent`: Hackathons and webinars.
  - `AuditLogEntry`: Append-only audit events logged via [src/services/auditService.ts](file:///c:/Users/adars/OneDrive/Desktop/Yogneet%20Edu/src/services/auditService.ts).

---

## 3. Existing Authentication & Authorization Implementation

- **Current Mechanism:** [src/context/AuthContext.tsx](file:///c:/Users/adars/OneDrive/Desktop/Yogneet%20Edu/src/context/AuthContext.tsx) retrieves the active user ID from `localStorage.getItem('yogneet_active_user_id')`, defaulting to `usr_student_1`.
- **Role Model:** Defined in [src/types/index.ts](file:///c:/Users/adars/OneDrive/Desktop/Yogneet%20Edu/src/types/index.ts) as `'admin' | 'subadmin' | 'student'`. Account status is `'active' | 'suspended'`.
- **RBAC Model:** 24 fine-grained permission keys registered in [src/permissions/registry.ts](file:///c:/Users/adars/OneDrive/Desktop/Yogneet%20Edu/src/permissions/registry.ts).
- **Route Protection:** Enforced on the client via `<AdminRoute>` and `<PermissionRoute>` in [src/permissions/guards.tsx](file:///c:/Users/adars/OneDrive/Desktop/Yogneet%20Edu/src/permissions/guards.tsx).
- **Security Limitation:** The current authorization model exists entirely in client code. Anyone can tamper with `localStorage` or component state to elevate privileges.

---

## 4. Recommended Migration Path (Dual-Mode Architecture)

To maintain complete backward compatibility and preserve demo usability while establishing an enterprise-grade backend:

1. **Dual-Mode Adapter Layer:**
   - **`local-mock` Mode (Default):** If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are unset, the app runs in demo/prototype mode using the existing mock data and sticky role switcher.
   - **`supabase` Mode:** When credentials are present, authentication delegates to Supabase Auth (`supabase.auth.*`), queries run against PostgreSQL with strict Row-Level Security (RLS), and files use Supabase Storage.
2. **Database & Schema Design:**
   - **`public.profiles`**: Auth-linked profile table (`id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`).
   - **`public.user_permissions`**: Granular permissions mapping (`user_id UUID`, `permission_key TEXT`).
   - **Database Triggers:**
     - Automatic profile creation on `auth.users` insertion.
     - Role elevation defense: PostgreSQL trigger strictly prevents non-admins from changing `role` or modifying `status`.
3. **Representative End-to-End Vertical Slice:**
   - Implement **User Profile Retrieval & Updates** as the first live vertical slice connecting the UI ([src/pages/student/StudentProfilePage.tsx](file:///c:/Users/adars/OneDrive/Desktop/Yogneet%20Edu/src/pages/student/StudentProfilePage.tsx)) through a typed service ([src/services/profileService.ts](file:///c:/Users/adars/OneDrive/Desktop/Yogneet%20Edu/src/services/profileService.ts)) to Supabase with RLS policies.

---

## 5. Security Risks & Mitigations

| Risk | Description | Mitigation Strategy |
|:---|:---|:---|
| **Credential Leakage** | Service-role keys or database passwords bundled in frontend code or Git. | Never use or store service-role keys in the client. Rely exclusively on `VITE_SUPABASE_ANON_KEY`. Enforce `.env*` exclusion in `.gitignore`. |
| **Client Privilege Escalation** | Malicious users modifying their role or granting permissions in the browser. | Database-level RLS policies and BEFORE UPDATE triggers preventing `role` and `permissions` modification by non-admins. |
| **Unauthenticated Data Access** | Publicly accessible private student submissions or test attempts. | Enable RLS on all tables with explicit deny-by-default rules. Require authenticated sessions matching `auth.uid() = user_id`. |
| **Silent Mock Fallback in Production** | App silently masking backend failures with fabricated mock data. | Explicit configuration: when `VITE_SUPABASE_URL` is set, API failures raise genuine errors rather than silently fabricating mock results. |
| **Git Commit Size Violations** | Commits exceeding the mandatory 5-file limit. | Strict batching into 2-5 file commits, each independently verified with tests and builds before committing. |

---

## 6. Implementation Batches (Max 5 Files Per Batch)

- **Batch 1: Audit & Migration Documentation**
  - `PHASE_2_AUDIT.md` (1 file)
- **Batch 2: Supabase SDK & Configuration Handling**
  - `package.json`
  - `package-lock.json`
  - `.env.example`
  - `src/config/env.ts`
  - `src/services/supabaseClient.ts` (5 files)
- **Batch 3: Database Migrations & Typed Schema**
  - `supabase/migrations/20261026000001_initial_schema.sql`
  - `supabase/migrations/20261026000002_rls_policies.sql`
  - `src/types/database.types.ts` (3 files)
- **Batch 4: Auth & Data Service Vertical Slice**
  - `src/services/profileService.ts`
  - `src/services/api.ts`
  - `src/context/AuthContext.tsx`
  - `src/pages/student/StudentProfilePage.tsx` (4 files)
- **Batch 5: Quality Gates, Tests & Documentation**
  - `scripts/test-permissions.mjs`
  - `scripts/test-supabase-schema.mjs`
  - `README.md` (3 files)

---

## 7. Items Requiring User Decisions

1. **Live Supabase Credentials:**
   - Does the user wish to supply a live Supabase project URL and anon key (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) for live connection testing, or proceed with verified reproducible migrations, offline SQL validation, and local dual-mode tests?
   - *Recommendation:* Proceed with offline code, reproducible migrations, dual-mode client adapter, and automated tests first.
2. **Authentication Flow UX:**
   - In live mode, should email confirmation be required or auto-confirmed for development/testing?
   - *Recommendation:* Support standard Supabase Auth with clear feedback while preserving the sticky persona switcher for rapid demo evaluation.
