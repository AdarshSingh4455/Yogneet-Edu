# YOGNEET EDU — ENVIRONMENT VARIABLE AND SECRETS AUDIT REPORT

**Date:** November 3, 2026  
**Auditor:** Senior Security Auditor & DevOps Engineer  
**Repository:** `https://github.com/AdarshSingh4455/Yogneet-Edu.git`  
**Current Branch:** `security/phase-3b-remediation`  

---

## 1. AUTHORITATIVE DOMAINS AND VERCEL CONFIGURATION

### **Domain Mapping & Verification Status**

| Environment | Authoritative Hosting URL | Status & Source of Truth |
| :--- | :--- | :--- |
| **Staging Preview Deployment** | `https://yogneet-edu-git-security-phase-3b-remediation-yogneetedu-4013.vercel.app` | **VERIFIED ACTIVE** (Live Vercel Preview Deployment) |
| **Default Vercel Production Deployment** | `https://yogneet-edu-yogneetedu-4013.vercel.app`<br>*(also `https://yogneet-edu.vercel.app`)* | **VERIFIED TARGET** (Standard Vercel Production canonical URL for team `yogneetedu-4013` and project `yogneet-edu`) |
| **Custom Production Domain** | `https://yogneetedu.com` | **PENDING DNS / ALIAS BINDING**<br>*(Requires DNS CNAME / A record configuration in Vercel Project Settings → Domains)* |

> [!NOTE]
> Previous documentation drafts listed `https://yogneetedu.com` as the active production endpoint. This has been updated to reflect that `https://yogneetedu.com` is a proposed custom vanity domain. The authoritative deployment URLs provided by Vercel infrastructure are the `*.vercel.app` domains listed above.

---

## 2. ENVIRONMENT ISOLATION MATRIX

| Parameter | Staging Environment | Production Environment |
| :--- | :--- | :--- |
| **Supabase Project Reference** | `ksjeravfkjfbpvfdazus` | `acmhdklihpqzurzuthkw` |
| **Supabase Host Region** | `eu-west-1` (Ireland) | `ap-northeast-1` (Tokyo) |
| **PostgreSQL Database Host** | `db.ksjeravfkjfbpvfdazus.supabase.co` | `db.acmhdklihpqzurzuthkw.supabase.co` |
| **Engine Version** | PostgreSQL 17 (`17.11.0.003`) | PostgreSQL 17 (`17.11.0.003`) |
| **Database Status** | `ACTIVE_HEALTHY` | `ACTIVE_HEALTHY` |
| **Environment Variable File** | `.env.local` (Strictly gitignored) | `.env` (Strictly gitignored) |
| **Vercel Scope** | **Preview** Environment | **Production** Environment |

---

## 3. ENVIRONMENT VARIABLE SCOPES (WITHOUT VALUE EXPOSURE)

| Variable Identifier | Runtime Target | Sensitivity Scope | Mandatory in Client Bundle? |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Browser Client & Node Test Runners | Public Configuration | **YES** (Embedded in client assets) |
| `VITE_SUPABASE_ANON_KEY` | Browser Client & Node Test Runners | Public Anon JWT Key (Gated by RLS) | **YES** (Embedded in client assets) |
| `VITE_ENVIRONMENT` | Browser Client & Test Runners | Public Deployment Mode Indicator | **YES** (`'production'`, `'staging'`, or `'development'`) |
| `VITE_ALLOW_MOCK_AUTH` | Local Development Test Fixtures | Non-production feature flag | **NO** (Must be omitted or `'false'` in production) |
| `SUPABASE_SERVICE_ROLE_KEY` | Node Admin Scripts & CI Runners ONLY | **HIGHLY SENSITIVE / RESTRICTED** | **STRICTLY FORBIDDEN IN CLIENT BUNDLE** |

---

## 4. SECRETS SCAN & CLIENT BUNDLE VERIFICATION

The production client bundle output in `dist/` was scanned for credential leakage:
- **`dist/assets/*.js`:**
  - `SUPABASE_SERVICE_ROLE_KEY`: **0 occurrences found** (PASS)
  - `service_role`: **0 occurrences found** (PASS)
  - Raw database passwords / connection strings: **0 occurrences found** (PASS)
- **`.gitignore` Compliance:**
  - All `.env`, `.env.local`, `.env.production`, and `.env.staging` files are strictly excluded from git tracking.
  - No secret keys have been staged or committed.
