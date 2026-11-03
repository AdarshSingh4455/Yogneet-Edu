# YOGNEET EDU — PHASE 5: PRODUCTION RELEASE CHECKLIST & RUNBOOK

**Target Production Branch:** `master`  
**Source Remediation Branch:** `security/phase-3b-remediation`  
**Production Supabase Ref:** `acmhdklihpqzurzuthkw` (`https://acmhdklihpqzurzuthkw.supabase.co`)  
**Production Vercel Canonical:** `https://yogneet-edu-yogneetedu-4013.vercel.app`  

---

## 1. PRE-RELEASE GATES & REQUIRED AUTHORIZATIONS

Before executing any command below, confirm that the user has provided explicit, written authorization for each release phase:

- [ ] **Gate 1:** Preflight Audit Report (`PHASE_5_PREFLIGHT_REPORT.md`) reviewed and accepted.
- [ ] **Gate 2:** User explicit authorization granted for Git commit and push.
- [ ] **Gate 3:** User explicit authorization granted for PR merge into `master`.
- [ ] **Gate 4:** User explicit authorization granted for applying database migrations 00022–00024 on production Supabase.
- [ ] **Gate 5:** User explicit authorization granted for Vercel production promotion.

---

## 2. STEP-BY-STEP RELEASE PROTOCOL (WITH EXACT COMMANDS)

### PHASE 1: PRE-RELEASE BACKUP & SAFETY SNAPSHOTS
*Objective: Capture full immutable point-in-time snapshots of production database, auth records, and Vercel environment before touching production.*

```bash
# 1.1 Logical Dump of Production Public Schema & Domain Data
pg_dump -h db.acmhdklihpqzurzuthkw.supabase.co -U postgres -d postgres -n public -F c -b -v -f "yogneet_prod_public_$(date +%Y%m%d_%H%M%S).dump"

# 1.2 Export Production Auth Records (Users & Identities)
pg_dump -h db.acmhdklihpqzurzuthkw.supabase.co -U postgres -d postgres -n auth -F c -b -v -f "yogneet_prod_auth_$(date +%Y%m%d_%H%M%S).dump"

# 1.3 Sync Production Storage Assets
aws s3 sync s3://yogneet-public ./storage_backup/prod_yogneet-public --endpoint-url https://acmhdklihpqzurzuthkw.supabase.co/storage/v1/s3
aws s3 sync s3://yogneet-private ./storage_backup/prod_yogneet-private --endpoint-url https://acmhdklihpqzurzuthkw.supabase.co/storage/v1/s3

# 1.4 Backup Production Vercel Environment Variables
npx vercel env pull .env.production.backup --environment=production
```

---

### PHASE 2: GIT COMMIT, PUSH & PULL REQUEST MERGE
*Objective: Consolidate all verified Phase 4 and audit remediations into git version control and merge into master.*

```bash
# 2.1 Verify current branch
git branch --show-current
# Expected output: security/phase-3b-remediation

# 2.2 Stage all verified code changes, deleted dead code, test scripts, migrations, and audit reports
git add -A

# 2.3 Verify staged files
git status --short

# 2.4 Create signed/annotated commit
git commit -m "feat(release): phase 4 completion, security hardening, fail-closed auditing, and dead code cleanup

- Remediate audit logging anti-spoofing across student, subadmin, and superadmin roles (migration 00024)
- Restore internal_auth_sync check for staff invitation acceptance (migration 00023)
- Restore missing log_audit_event function (migration 00022)
- Disable mock fallback in production/staging and implement genuine empty/error states
- Permanently delete dead components (RoleSwitcherBar.tsx, Phase1NoticeBadge.tsx)
- Reconcile storage bucket documentation to canonical yogneet-public
- Consolidate all 315 regression tests across 67 suites with 100% pass rate"

# 2.5 Push branch to remote
git push origin security/phase-3b-remediation

# 2.6 Create Pull Request to master (via GitHub CLI or web UI)
gh pr create --base master --head security/phase-3b-remediation --title "Release: Phase 4 & Phase 5 Production Hardening" --body "Comprehensive security remediation, fail-closed audit logging, dead code removal, and production readiness certification."

# 2.7 Merge Pull Request into master
gh pr merge --squash --delete-branch=false
```

---

### PHASE 3: PRODUCTION DATABASE MIGRATION DEPLOYMENT
*Objective: Apply the 3 pending database migrations (00022, 00023, 00024) to the production Supabase database.*

> [!WARNING]
> Ensure Phase 1 backups have completed before executing migrations against `acmhdklihpqzurzuthkw`.

```bash
# 3.1 Verify migration delta against production before applying
npx supabase migration list --remote=acmhdklihpqzurzuthkw

# 3.2 Push pending migrations to production
npx supabase db push --remote=acmhdklihpqzurzuthkw

# 3.3 Verify migration parity after push
npx supabase migration list --remote=acmhdklihpqzurzuthkw
# Expected: All 24 migrations marked applied on production remote
```

---

### PHASE 4: VERCEL PRODUCTION DEPLOYMENT & PROMOTION
*Objective: Build and deploy the master branch bundle to Vercel production infrastructure.*

```bash
# 4.1 Switch to master branch and pull latest merged commit
git checkout master
git pull origin master

# 4.2 Verify clean production build locally
npx tsc --noEmit
npm run build

# 4.3 Trigger Vercel Production Deployment
npx vercel --prod
```

---

### PHASE 5: POST-DEPLOYMENT SMOKE VERIFICATION
*Objective: Validate production routing, auth flows, and API communication in production mode.*

1. **Production Health Check:**
   - Navigate to `https://yogneet-edu-yogneetedu-4013.vercel.app`
   - Verify zero console errors, zero prototype shortcuts, zero "Phase" notice badges.
2. **Fail-Closed Verification:**
   - Confirm unconfigured modules show loading spinners or informative error alerts with retry buttons. Confirm zero fabricated mock data is rendered.
3. **Authentication & Session:**
   - Perform test login on `/login` and `/portal-login`.
   - Verify JWT issuance and profile retrieval from production Supabase (`acmhdklihpqzurzuthkw`).
4. **Audit Trail Verification:**
   - Query `public.audit_logs` in Supabase Dashboard to confirm login and access events are recorded.
