# Yogneet Edu — Technical Learning & Assessment Web Platform

[![Built for Tech Geek Adarsh](https://img.shields.io/badge/Brand-Tech%20Geek%20Adarsh-blue.svg)](https://youtube.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Yogneet Edu** is a full-featured, dark-first educational and coding practice web platform associated with the brand **Tech Geek Adarsh**. The platform seamlessly unifies YouTube video learning, handwritten study notes and downloadable PDFs, timed examination series, algorithmic coding practice arenas, student community discussion boards, and an enterprise-grade administration console with fine-grained Role-Based Access Control (RBAC) and security audit logs.

---

## 🌟 Key Product Features

### 1. Student Dashboard & Embedded Video Learning
- **Personalized Learning Hub**: Welcome hero banner with study streak tracking, active course continuation cards, and recent lecture progress.
- **Privacy-Enhanced Embedded Video Player**: Clean, responsive 16:9 YouTube video player (`youtube-nocookie.com`) with distraction-minimized parameters.
- **Interactive Playlist & Lessons**: Order navigation, next/previous lesson controls, and real-time completion checkmarks.
- **Lesson Tabbed Workspace**:
  - **Overview**: Lesson syllabus and bulleted takeaways.
  - **Resources**: Downloadable handwritten notes, source code zip files, and official documentation links.
  - **Discussion**: Interactive comment section to ask lecture doubts.
  - **Up Next**: Next curriculum module preview.
- **Upcoming Competitions & Hackathons**: Interactive contest cards with countdowns, prize pools, and registration confirmation modals.

### 2. Timed Assessment & Test Series Engine
- **Test Catalog**: Structured by subject (Python, Data Structures, SQL, Web Dev) and difficulty (Easy, Medium, Hard).
- **Distraction-Free Assessment Screen**:
  - Real-time countdown timer with warning colors when under 3 minutes and auto-submission on timeout.
  - Question statement with formatted syntax-highlighted code snippets.
  - Multiple-choice option selection with instantaneous state preservation.
  - "Mark for Review" capability.
  - **Question Palette**: Grid indicator with color codes:
    - 🟢 Green: Answered
    - ⚪ Slate: Unanswered
    - 🟡 Amber: Marked for Review
    - 🟣 Purple: Answered & Marked for Review
    - 🔵 Blue Ring: Active Question
  - Submission confirmation dialog displaying answered vs unanswered counts.
- **Instant Result & Scorecard Breakdown**:
  - Score obtained, percentage, pass/fail status, accuracy, and time spent.
  - Question-by-question review with your answer vs correct answer and in-depth conceptual explanations.

### 3. Study Notes & Reference PDFs
- **Curated Notes Repository**: Handwritten guides covering Python 3.13 internals, AVL trees, B+ tree SQL indexing, and Dynamic Programming patterns.
- **Search & Filters**: Multi-subject filter pills, search by keyword, and sorting (Recently Updated, Most Downloaded, Title).
- **Grid vs List Toggle**: Switch between responsive card grid and compact table view.
- **Interactive Markdown Reader**: In-app modal viewer with rendered markdown and code snippets.
- **PDF Download Action**: Interactive file download simulation that tracks download metrics, with disabled states when files are under preparation.

### 4. Coding Practice Arena
- **LeetCode & GeeksforGeeks Style Directory**: Searchable algorithmic problem directory with topic filters (Arrays, Strings, Two Pointers, Dynamic Programming, Stack) and difficulty filters.
- **Native Coding Playground**:
  - Split-view interface with problem statement, examples, and constraints on the left.
  - Multi-language code editor (Python 3, JavaScript, C++ 20, Java 17).
  - Test Execution Console with sample test runner ("Run Tests") and full submission evaluation ("Submit Solution").
- **Attribution to Official Sources**: External problem links cleanly attributed to LeetCode and GeeksforGeeks without unauthorized scraping.

### 5. Student Community Forum
- **Peer & Mentor Discussion**: Searchable threads categorized by DSA, Python Internals, Web Dev, and Interview Prep.
- **Interactive Upvoting & Answering**: Upvote helpful questions and post answers with code blocks.
- **Discussion Creation Modal**: Fast thread authoring with tags and category assignment.
- **Community Guidelines & Mentorship**: Sidebar highlighting community guidelines and educators from Tech Geek Adarsh.

### 6. Fine-Grained Permissions (RBAC) Management
- **Structured Permission Registry**: 24 explicit module-action combinations:
  - `videos.*` (`view`, `create`, `edit`, `delete`, `publish`)
  - `notes.*` (`view`, `create`, `edit`, `delete`, `publish`)
  - `tests.*` (`view`, `create`, `edit`, `publish`, `schedule`, `view_results`)
  - `students.*` (`view`, `suspend`)
  - `community.*` (`moderate`)
  - `subadmins.*` (`manage`)
  - `permissions.*` (`assign`)
  - `audit_logs.*` (`view`)
  - `analytics.*` (`view`)
  - `content.*` (`export`)
- **Granular Permission Editor Modal**:
  - Grouped by module with Select All / Clear All controls.
  - Unsaved-changes tracker (dirty state indicator).
  - Sensitive privilege confirmation dialog when granting dangerous administrative privileges.
  - Predefined role preset templates: *Content Creator*, *Senior Content Lead*, *Assessment Coordinator*, *Community Moderator*, *Compliance Auditor*.
- **Enforced Security Rules**:
  - Super Admin permissions cannot be modified by a sub-admin.
  - Suspended accounts have all action rights paused.
  - Deny access by default when a permission is missing.

### 7. Administrative Audit Logs
- **Tamper-Evident Format**: Records Timestamp, Actor (avatar, name, email), Role badge, Action key, Target Resource, Details, and Outcome (`SUCCESS`, `DENIED`, `FAILED`).
- **State Mutation Diffs**: Expandable rows displaying before and after JSON diffs for permission mutations.
- **Live CSV Export**: Downloadable CSV file generated directly in the browser.

### 8. Day-1 Dual-Theme System
- **Three Theme Modes**: **Dark Mode** (default developer theme), **Light Mode** (crisp high-contrast), and **System Default** (matches OS setting).
- **Persistent Choice**: Automatically saved in `localStorage` (`yogneet_theme_mode`).
- **Semantic Color Tokens**: Zero hardcoded conflicting colors across all cards, tables, modals, sidebars, and assessment screens.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | React 18.3 with Vite 5.4 |
| **Language** | TypeScript 5.6 (Strict Type Checking) |
| **Styling** | Tailwind CSS 3.4 with custom semantic color tokens |
| **Routing** | React Router DOM 6.28 |
| **Icons** | Lucide React |
| **Testing** | Node.js Built-in Test Runner (`node:test` & `node:assert`) |
| **Architecture** | Centralized Service Layer (`ApiService`, `AuditService`) with `localStorage` persistence |

---

## 📂 Architecture and Code Organization

```
src/
├── app/
├── components/
│   ├── admin/
│   │   └── PermissionEditorModal.tsx     # Granular RBAC toggle matrix & presets
│   ├── common/
│   │   ├── Badge.tsx                     # Semantic pill badges
│   │   ├── Button.tsx                    # Accessible button with states & loaders
│   │   ├── Card.tsx                      # Semantic card container
│   │   ├── ConfirmDialog.tsx             # Modal confirmation for destructive operations
│   │   ├── EmptyState.tsx                # Empty state view with actions
│   │   ├── Input.tsx                     # Form inputs with error states & icons
│   │   ├── Modal.tsx                     # Accessible dialog with ESC closing & backdrop
│   │   └── Skeleton.tsx                  # Shimmering loading placeholders
│   └── layout/
│       ├── AppLayout.tsx                 # Main layout shell with sidebar & navbar
│       ├── Navbar.tsx                    # Brand header, search, theme dropdown, notifications
│       ├── RoleSwitcherBar.tsx           # Sticky developer persona simulator bar
│       └── Sidebar.tsx                   # Dynamic RBAC-driven responsive sidebar
├── context/
│   ├── AuthContext.tsx                   # User state, persona switcher, permission helpers
│   ├── ThemeContext.tsx                  # Light / Dark / System mode theme provider
│   └── ToastContext.tsx                  # Notification toast queue
├── pages/
│   ├── admin/
│   │   ├── AdminDashboard.tsx            # Super Admin command console
│   │   ├── AnalyticsPage.tsx             # Student retention & percentile charts
│   │   ├── AuditLogsPage.tsx             # Append-only security audit trail & CSV export
│   │   ├── StudentManagementPage.tsx     # Student directory with suspension controls
│   │   └── SubAdminManagementPage.tsx    # Staff table, status controls, RBAC editor
│   ├── shared/
│   │   └── NotFoundPage.tsx              # 404 handler
│   ├── student/
│   │   ├── AssessmentPage.tsx            # Distraction-free test session & timer
│   │   ├── AssessmentResultPage.tsx      # Test review with score and explanations
│   │   ├── CodingArenaPage.tsx           # LeetCode/GFG style problem catalog
│   │   ├── CodingProblemPage.tsx         # In-browser IDE playground & test console
│   │   ├── CommunityForumPage.tsx        # Discussion boards & question modal
│   │   ├── CommunityThreadPage.tsx       # Thread view with answers & replies
│   │   ├── MyProgressPage.tsx            # Milestones, stats, and attempt history
│   │   ├── NotesDirectoryPage.tsx        # Revision notes library & PDF download
│   │   ├── StudentDashboard.tsx          # Learning hub with YouTube video resume
│   │   ├── StudentProfilePage.tsx        # Profile, permissions view, theme settings
│   │   └── TestSeriesPage.tsx            # Assessment catalog by subject & difficulty
│   └── subadmin/
│       ├── ContentWorkspacePage.tsx      # Content authoring with action permissions
│       └── SubAdminDashboard.tsx         # Sub-Admin duties & granted rights
├── permissions/
│   ├── guards.tsx                        # Route guards (AdminRoute, PermissionRoute)
│   └── registry.ts                       # Permission definitions, modules, presets
├── routes/
│   └── AppRoutes.tsx                     # Declarative React Router route table
├── services/
│   ├── api.ts                            # Centralized mock API & state persistence
│   ├── auditService.ts                   # Append-only audit logger & CSV generator
│   └── mockData.ts                       # Comprehensive initial seed data
├── types/
│   └── index.ts                          # Full TypeScript interfaces & types
├── App.tsx                               # App wrapper with providers
├── index.css                             # Tailwind directives & CSS variables
└── main.tsx                              # React DOM mount point
```

---

## 🔐 The Permission & RBAC Model

Yogneet Edu enforces strict role-based authorization using explicit module-action definitions:

```
[module].[action]
```

### Permission Matrix

| Module | Actions | Description |
|---|---|---|
| `videos` | `view`, `create`, `edit`, `delete`, `publish` | Video lectures and course outlines |
| `notes` | `view`, `create`, `edit`, `delete`, `publish` | Study notes and PDF attachments |
| `tests` | `view`, `create`, `edit`, `publish`, `schedule`, `view_results` | Question banks, test release windows, grading |
| `students` | `view`, `suspend` | Student records and suspension |
| `community` | `moderate` | Thread pinning, locking, deletion |
| `subadmins` | `manage` | Staff provisioning and status toggling |
| `permissions`| `assign` | Granular permission assignment |
| `audit_logs` | `view` | Compliance audit inspection |
| `analytics` | `view` | Aggregated platform metrics |
| `content` | `export` | Bulk export of platform data |

### Persona Simulation Bar
A sticky simulator bar at the top of the interface allows instant persona toggling for development and presentation:
1. **👑 Adarsh (Super Admin)**: Complete platform authority across all routes and actions.
2. **🛡️ Priyanshi Verma (Curriculum Lead)**: Can author and publish notes and videos; cannot manage staff or view audit logs.
3. **🛡️ Rohan Sharma (Assessment Lead)**: Can create tests, question pools, and inspect grading.
4. **🛡️ Ananya Patel (Community Moderator)**: Can moderate forums and inspect student questions.
5. **🛡️ Vikram Singh (Suspended Staff)**: Temporarily suspended account demonstrating default-deny security behavior.
6. **🎓 Alex Rivera (Student)**: Standard learner experience with course progress, coding arena, and assessments.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher (v22 recommended)
- **npm**: v9.0.0 or higher

### Installation

1. Clone or navigate to the repository directory:
   ```bash
   cd "C:\Users\adars\OneDrive\Desktop\Yogneet Edu"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

---

## 📜 Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts Vite development server with Hot Module Replacement |
| `npm run build` | Runs TypeScript typecheck (`tsc -b`) and produces production bundle in `dist/` |
| `npm run lint` | Runs TypeScript type validation without emitting files (`tsc --noEmit`) |
| `npm test` | Executes the built-in Node.js RBAC and Scoring test suite (`scripts/test-permissions.mjs`) |
| `npm run preview` | Previews the production build locally |

---

## 🧪 Automated Test Results

The automated unit test suite validates authorization, default-deny policies, and deterministic scoring:

```
TAP version 13
# Subtest: Yogneet Edu RBAC Engine Test Suite
    ok 1 - Super Admin has unrestricted permissions automatically
    ok 2 - Sub-Admin has only assigned permissions and is denied publishing/deletion
    ok 3 - Suspended user is denied all actions regardless of permissions array
    ok 4 - hasAnyPermission correctly verifies permission subsets
    ok 5 - hasAllPermissions strictly enforces full set matching
    ok 6 - Deterministic scoring engine calculates marks and negative marks accurately
1..6
# tests 6
# suites 1
# pass 6
# fail 0
```

---

## 🔮 Future Backend Integration Roadmap

In this initial phase, the frontend provides an interactive experience backed by a centralized mock API and `localStorage` persistence layer.

When connecting to the production backend:
1. **Authentication**: Replace local persona selection with OAuth 2.0 / JWT tokens (Auth0, Supabase Auth, or Firebase Auth).
2. **Server-Side Authorization**: Mirror the frontend `registry.ts` RBAC model in backend middleware (e.g. Express, NestJS, or FastAPI guards) to enforce server-side validation.
3. **Database Integration**: Replace `mockData.ts` with PostgreSQL / Prisma ORM tables for users, lessons, questions, and test attempts.
4. **Tamper-Proof Audit Logging**: Pipe audit events to write-once append-only storage (e.g. CloudWatch Logs, Datadog, or Postgres audit tables with append-only triggers).
5. **Real Code Execution**: Connect the Coding Arena playground to an isolated code evaluation sandbox (e.g. Judge0 or custom Docker workers).
6. **Object Storage**: Store notes PDFs and course materials on AWS S3 or Cloudflare R2 with signed URLs.

---

## 📄 License and Credits

- **Platform Brand**: [Tech Geek Adarsh](https://youtube.com)
- **Author**: Adarsh & the Yogneet Edu Engineering Team
- **License**: MIT
