/**
 * ==============================================================================
 * Yogneet Edu — UI Consolidation & UX Refinement Regression Test Suite
 * ==============================================================================
 * Validates the 6 mandatory UI and navigation consolidation changes:
 *   1. Change 1: Unified Forum Management (merged Community Forum & Moderation)
 *   2. Change 2: Optional Winner Gift in Leaderboard Management & Student Announcement
 *   3. Change 3: Unified Staff & Permissions (merged Sub-Admins & RBAC)
 *   4. Change 4: Clean Admin Dashboard Hero (shortcut buttons removed)
 *   5. Change 5: Simplified Admin Hero Title (exactly "YOGNEET EDU")
 *   6. Change 6: Direct 1-Click Day / Night Theme Toggle in Header
 * ==============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('UI Consolidation & UX Refinement Regression Suite', () => {

  // --------------------------------------------------------------------------
  // CHANGE 1: Merge Community Forum and Forum Moderation
  // --------------------------------------------------------------------------
  describe('Change 1 — Merge Community Forum and Forum Moderation', () => {
    const sidebarContent = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
    const routesContent = fs.readFileSync('src/routes/AppRoutes.tsx', 'utf8');
    const forumPageContent = fs.readFileSync('src/pages/student/CommunityForumPage.tsx', 'utf8');
    const threadPageContent = fs.readFileSync('src/pages/student/CommunityThreadPage.tsx', 'utf8');
    const commServiceContent = fs.readFileSync('src/services/communityService.ts', 'utf8');

    it('1.1 Sidebar contains exactly one Forum Management destination and removes separate Forum Moderation', () => {
      // Must contain Forum Management
      assert.ok(sidebarContent.includes("label: 'Forum Management', path: '/community'"), 'Sidebar must have Forum Management pointing to /community');
      
      // Must NOT contain separate "Forum Moderation" or "Community Forum" sidebar labels
      assert.ok(!sidebarContent.includes("label: 'Forum Moderation'"), 'Sidebar must not contain separate Forum Moderation');
      // Role-Based Forum Navigation: students and non-moderators see 'Community Forum'
      assert.ok(sidebarContent.includes("'Community Forum'"), 'Sidebar must support Community Forum label for students');
      
      // Exactly one Forum Management in adminNav
      const adminNavMatch = sidebarContent.match(/adminNav = \[([\s\S]*?)\];/);
      assert.ok(adminNavMatch, 'adminNav must be defined');
      const adminNavStr = adminNavMatch[1];
      const forumMatches = adminNavStr.match(/label:\s*'Forum Management'/g) || [];
      assert.strictEqual(forumMatches.length, 1, 'adminNav must have exactly one Forum Management entry');
    });

    it('1.2 Route /admin/community-moderation safely redirects to /community', () => {
      assert.ok(
        routesContent.includes('<Route path="/admin/community-moderation" element={<Navigate to="/community" replace />} />'),
        'Old /admin/community-moderation must redirect to /community'
      );
      assert.ok(
        routesContent.includes('<Route path="/subadmin/community-moderation" element={<Navigate to="/community" replace />} />'),
        'Old /subadmin/community-moderation must redirect to /community'
      );
    });

    it('1.3 CommunityForumPage preserves primary forum layout elements', () => {
      assert.ok(forumPageContent.includes('filteredThreads.map'), 'Must render discussion cards');
      assert.ok(forumPageContent.includes('Search'), 'Must include Search functionality');
      assert.ok(forumPageContent.includes('selectedCategory'), 'Must include category filters');
      assert.ok(forumPageContent.includes('New Discussion'), 'Must include New Discussion capability');
      assert.ok(forumPageContent.includes('Community Code of Conduct'), 'Must preserve Community Code of Conduct');
      assert.ok(forumPageContent.includes('Community Leads & Mentors'), 'Must preserve Community Leads & Mentors');
    });

    it('1.4 CommunityForumPage integrates moderation capabilities for authorized users', () => {
      assert.ok(forumPageContent.includes('canModerate'), 'Must check moderator authorization');
      assert.ok(forumPageContent.includes('Moderation Governance Controls') || forumPageContent.includes('Moderator Console'), 'Must provide moderator toolbar');
      assert.ok(forumPageContent.includes('Audit History'), 'Must allow viewing moderation audit history');
      assert.ok(forumPageContent.includes('handleExecuteModeration'), 'Must execute moderation actions');
      assert.ok(forumPageContent.includes('moderationReason'), 'Must enforce mandatory moderation reasons');
    });

    it('1.5 CommunityThreadPage integrates thread and reply moderation with locked thread protection', () => {
      assert.ok(threadPageContent.includes('Discussion Moderation Controls') || threadPageContent.includes('handleOpenThreadAction'), 'Must have thread moderation controls');
      assert.ok(threadPageContent.includes('handleOpenReplyAction') || threadPageContent.includes('Delete Reply'), 'Must have reply moderation controls');
      assert.ok(threadPageContent.includes('thread.isLocked'), 'Must respect locked thread status');
      assert.ok(threadPageContent.includes('isReasonModalOpen'), 'Must require mandatory moderation justification');
    });

    it('1.6 CommunityService supports reply moderation and audit trail logging', () => {
      assert.ok(commServiceContent.includes('moderateReply'), 'CommunityService must export moderateReply');
      assert.ok(commServiceContent.includes('moderateThread'), 'CommunityService must export moderateThread');
      assert.ok(commServiceContent.includes('moderateUser'), 'CommunityService must export moderateUser');
      assert.ok(commServiceContent.includes('getModerationLogs'), 'CommunityService must export getModerationLogs');
    });
  });

  // --------------------------------------------------------------------------
  // CHANGE 2: Optional Winner Gift in Leaderboard Management
  // --------------------------------------------------------------------------
  describe('Change 2 — Optional Winner Gift Field in Leaderboard Management', () => {
    const typesContent = fs.readFileSync('src/types/index.ts', 'utf8');
    const lbServiceContent = fs.readFileSync('src/services/leaderboardService.ts', 'utf8');
    const lbAdminPageContent = fs.readFileSync('src/pages/admin/LeaderboardManagementPage.tsx', 'utf8');
    const lbStudentPageContent = fs.readFileSync('src/pages/student/LeaderboardPage.tsx', 'utf8');

    it('2.1 LeaderboardConfig type includes optional winnerGift field', () => {
      assert.ok(typesContent.includes('winnerGift?: string;'), 'LeaderboardConfig must declare optional winnerGift');
    });

    it('2.2 LeaderboardService loads and persists winnerGift configuration via Supabase', () => {
      assert.ok(lbServiceContent.includes('winnerGift:'), 'LeaderboardService must handle winnerGift');
      assert.ok(lbServiceContent.includes('payload.winner_gift'), 'Must support database column winner_gift');
      assert.ok(!lbServiceContent.includes('localStorage.setItem'), 'Must not use localStorage as primary persistence');
    });

    it('2.3 LeaderboardManagementPage provides Winner Gift (Optional) input with length validation', () => {
      assert.ok(lbAdminPageContent.includes('Winner Gift (Optional)'), 'Must contain Winner Gift (Optional) field label');
      assert.ok(lbAdminPageContent.includes('maxLength={120}') || lbAdminPageContent.includes('maxLength'), 'Must validate input length');
      assert.ok(lbAdminPageContent.includes('winnerGift: e.target.value'), 'Must bind state to winnerGift');
      assert.ok(lbAdminPageContent.includes('Clear'), 'Must allow clearing/removing the winner gift description');
    });

    it('2.4 LeaderboardPage displays reward announcement when configured, and nothing when empty', () => {
      assert.ok(lbStudentPageContent.includes('config?.winnerGift'), 'Must check config.winnerGift');
      assert.ok(
        lbStudentPageContent.includes('config.winnerGift.trim().length > 0'),
        'Must only render reward announcement when non-empty'
      );
      assert.ok(lbStudentPageContent.includes('Cycle Reward Announcement') || lbStudentPageContent.includes('Grand Prize') || lbStudentPageContent.includes('Reward Announcement'), 'Must display styled reward announcement');
    });

    it('2.5 Top 200 deterministic scoring and tie-breaking rules are preserved', () => {
      assert.ok(lbAdminPageContent.includes('Deterministic Tie-Breaking Rules:'), 'Must preserve tie-breaking rules description');
      assert.ok(lbAdminPageContent.includes('Hard: 1.5x, Medium: 1.2x, Easy: 1.0x'), 'Must preserve difficulty multipliers');
    });
  });

  // --------------------------------------------------------------------------
  // CHANGE 3: Merge RBAC and Staff Management Sidebar Tabs
  // --------------------------------------------------------------------------
  describe('Change 3 — Merge RBAC and Staff Management Sidebar Tabs', () => {
    const sidebarContent = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
    const routesContent = fs.readFileSync('src/routes/AppRoutes.tsx', 'utf8');
    const staffPageContent = fs.readFileSync('src/pages/admin/SubAdminManagementPage.tsx', 'utf8');

    it('3.1 Sidebar contains unified Staff & Permissions and removes duplicate entries', () => {
      assert.ok(
        sidebarContent.includes("{ label: 'Staff & Permissions', path: '/admin/subadmins'"),
        'Sidebar must contain Staff & Permissions pointing to /admin/subadmins'
      );
      assert.ok(!sidebarContent.includes("label: 'Sub-Admins & Staff'"), 'Must not have separate Sub-Admins & Staff label');
      assert.ok(!sidebarContent.includes("label: 'RBAC & Permissions'"), 'Must not have separate RBAC & Permissions label');
    });

    it('3.2 Route /admin/permissions safely redirects to canonical /admin/subadmins', () => {
      assert.ok(
        routesContent.includes('<Route path="/admin/permissions" element={<Navigate to="/admin/subadmins" replace />} />'),
        'Old /admin/permissions route must redirect to /admin/subadmins'
      );
    });

    it('3.3 Unified Staff & Permissions page retains complete directory, RBAC editor, presets, and delegation', () => {
      assert.ok(staffPageContent.includes('Staff & Permissions'), 'Page title must reflect Staff & Permissions');
      assert.ok(staffPageContent.includes('PermissionEditorModal'), 'Must retain PermissionEditorModal');
      assert.ok(staffPageContent.includes('ROLE_PRESETS'), 'Must retain ROLE_PRESETS');
      assert.ok(staffPageContent.includes('toggleStaffStatus') || staffPageContent.includes('handleToggleStatusConfirm'), 'Must retain suspension/reactivation');
      assert.ok(staffPageContent.includes('Add Sub-Admin'), 'Must retain Add Sub-Admin workflow');
      assert.ok(staffPageContent.includes('useSearchParams'), 'Must support URL user selection param');
    });
  });

  // --------------------------------------------------------------------------
  // CHANGE 4: Clean Admin Dashboard Hero Section
  // --------------------------------------------------------------------------
  describe('Change 4 — Clean Admin Dashboard Hero Section', () => {
    const adminDashContent = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');

    it('4.1 Admin hero section removes redundant shortcut buttons', () => {
      // The hero section must NOT contain the shortcut button group
      const heroMatch = adminDashContent.match(/\{\/\* Authority Hero Banner \*\/\}[\s\S]*?\{\/\* Dedicated Hero Phoenix Emblem \*\/\}/);
      assert.ok(heroMatch, 'Authority Hero Banner must exist');
      const heroStr = heroMatch[0];

      assert.ok(!heroStr.includes('Student Tab Access'), 'Hero must not contain Student Tab Access button');
      assert.ok(!heroStr.includes('Top 200 Leaderboard'), 'Hero must not contain Top 200 Leaderboard button');
      assert.ok(!heroStr.includes('Ad Campaigns'), 'Hero must not contain Ad Campaigns button');
      assert.ok(!heroStr.includes('Coding Questions'), 'Hero must not contain Coding Questions button');
      assert.ok(!heroStr.includes('Forum Moderation'), 'Hero must not contain Forum Moderation button');
      assert.ok(!heroStr.includes('Feedback Management'), 'Hero must not contain Feedback Management button');
      assert.ok(!heroStr.includes('RBAC Permissions'), 'Hero must not contain RBAC Permissions button');
      assert.ok(!heroStr.includes('Manage Staff'), 'Hero must not contain Manage Staff button');
    });

    it('4.2 Hero section maintains Phoenix emblem and authority badge', () => {
      assert.ok(adminDashContent.includes('Super Admin Authority'), 'Hero must retain authority badge');
      assert.ok(adminDashContent.includes('Dedicated Hero Phoenix Emblem'), 'Hero must retain Phoenix emblem');
    });
  });

  // --------------------------------------------------------------------------
  // CHANGE 5: Simplify Admin Hero Title
  // --------------------------------------------------------------------------
  describe('Change 5 — Simplify Admin Hero Title', () => {
    const adminDashContent = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');

    it('5.1 Hero title is strictly "YOGNEET EDU" without "Administration" or "Portal"', () => {
      const titleMatch = adminDashContent.match(/<h1[\s\S]*?>([\s\S]*?)<\/h1>/);
      assert.ok(titleMatch, 'h1 must be present in AdminDashboard');
      const titleText = titleMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

      assert.strictEqual(titleText, 'YOGNEET EDU', 'Hero title must be exactly "YOGNEET EDU"');
      assert.ok(!titleText.includes('Administration'), 'Hero title must not contain "Administration"');
      assert.ok(!titleText.includes('Portal'), 'Hero title must not contain "Portal"');
    });

    it('5.2 Brand Phoenix styling is preserved on the title', () => {
      assert.ok(
        adminDashContent.includes('YOGNEET <span className="text-yogneet-cyan">EDU</span>'),
        'Hero title must preserve brand color highlight on EDU'
      );
    });
  });

  // --------------------------------------------------------------------------
  // CHANGE 6: Simplify Day / Night Theme Toggle
  // --------------------------------------------------------------------------
  describe('Change 6 — Simplify Day / Night Theme Toggle', () => {
    const navbarContent = fs.readFileSync('src/components/layout/Navbar.tsx', 'utf8');
    const themeContextContent = fs.readFileSync('src/context/ThemeContext.tsx', 'utf8');

    it('6.1 Header theme toggle is a direct 1-click button with no popup/dropdown', () => {
      assert.ok(navbarContent.includes('Direct 1-Click Day / Night Theme Toggle'), 'Must have 1-click theme toggle');
      assert.ok(navbarContent.includes('onClick={toggleTheme}'), 'Must invoke toggleTheme directly on button click');
      assert.ok(!navbarContent.includes("toggleMenu('theme')"), 'Must not open a theme menu popup');
      assert.ok(!navbarContent.includes("activeMenu === 'theme'"), 'Theme must not be in activeMenu popover state');
    });

    it('6.2 Shows Moon icon in Day Mode and Sun icon in Night Mode with accessible labels', () => {
      assert.ok(navbarContent.includes("resolvedTheme === 'dark' ? ("), 'Must branch on resolvedTheme');
      assert.ok(navbarContent.includes('<Sun className="w-4 h-4 text-amber-400" />'), 'Must show Sun icon in dark mode');
      assert.ok(navbarContent.includes('<Moon className="w-4 h-4 text-slate-700" />'), 'Must show Moon icon in light mode');
      assert.ok(
        navbarContent.includes("resolvedTheme === 'dark' ? 'Switch to Day Mode' : 'Switch to Night Mode'"),
        'Must provide accessible tooltip and aria-label'
      );
    });

    it('6.3 ThemeContext persists explicit choice to storage and respects System Default compatibility', () => {
      assert.ok(themeContextContent.includes('toggleTheme'), 'ThemeContext must export toggleTheme');
      assert.ok(themeContextContent.includes('setMode(resolvedTheme === \'dark\' ? \'light\' : \'dark\')'), 'toggleTheme must switch to opposite of resolved theme');
      assert.ok(themeContextContent.includes('localStorage.setItem(THEME_STORAGE_KEY'), 'Must persist explicit selection to localStorage');
    });
  });
});
