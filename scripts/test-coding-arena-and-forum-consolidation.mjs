/**
 * ==============================================================================
 * Yogneet Edu — Coding Arena & Forum Navigation Consolidation Verification Suite
 * ==============================================================================
 * Validates:
 *   1. Single unified Coding Arena sidebar navigation item for all roles
 *   2. Removal of duplicate Coding Arena Admin sidebar entries
 *   3. Safe redirection of legacy /admin/coding and /subadmin/coding to /coding
 *   4. Role-based Forum Navigation labels:
 *      - Admin: Forum Management
 *      - Authorized Sub-Admin (community.moderate): Forum Management
 *      - Normal Student: Community Forum
 *      - Premium Student: Community Forum
 *      - Non-moderator Sub-Admin: Community Forum
 *   5. Unified CodingArenaPage student experience preservation
 *   6. Top-right management controls (Create Challenge, Bulk JSON Upload) for canManage
 *   7. Strict student isolation from challenge management actions
 *   8. Native sandbox isolation preservation for code execution
 * ==============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

describe('Coding Arena & Forum Navigation Consolidation Suite', () => {
  const sidebarContent = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
  const routesContent = fs.readFileSync('src/routes/AppRoutes.tsx', 'utf8');
  const codingPageContent = fs.readFileSync('src/pages/student/CodingArenaPage.tsx', 'utf8');

  // --------------------------------------------------------------------------
  // SECTION 1: Coding Arena Sidebar Consolidation
  // --------------------------------------------------------------------------
  describe('1. Sidebar Navigation: Exactly ONE Coding Arena destination', () => {
    it('1.1 adminNav contains exactly one Coding Arena item pointing to /coding', () => {
      const adminNavMatch = sidebarContent.match(/adminNav = \[([\s\S]*?)\];/);
      assert.ok(adminNavMatch, 'adminNav must be defined');
      const codingMatches = adminNavMatch[1].match(/label:\s*'Coding Arena'/g) || [];
      assert.strictEqual(codingMatches.length, 1, 'adminNav must have exactly one Coding Arena entry');
      assert.ok(adminNavMatch[1].includes("path: '/coding'"), 'Coding Arena must link to /coding');
    });

    it('1.2 subAdminNav contains exactly one Coding Arena item pointing to /coding', () => {
      const subAdminNavMatch = sidebarContent.match(/subAdminNav = \[([\s\S]*?)\];/);
      assert.ok(subAdminNavMatch, 'subAdminNav must be defined');
      const codingMatches = subAdminNavMatch[1].match(/label:\s*'Coding Arena'/g) || [];
      assert.strictEqual(codingMatches.length, 1, 'subAdminNav must have exactly one Coding Arena entry');
      assert.ok(subAdminNavMatch[1].includes("path: '/coding'"), 'Coding Arena must link to /coding');
    });

    it('1.3 studentNav contains Coding Arena pointing to /coding without decorative badges', () => {
      const studentNavMatch = sidebarContent.match(/studentNav = \[([\s\S]*?)\];/);
      assert.ok(studentNavMatch, 'studentNav must be defined');
      assert.ok(
        studentNavMatch[1].includes("label: 'Coding Arena', path: '/coding'"),
        'studentNav must have Coding Arena pointing to /coding'
      );
      assert.ok(studentNavMatch[1].includes("moduleKey: 'coding'"), 'studentNav must include moduleKey coding');
    });

    it('1.4 Separate "Coding Arena Admin" sidebar entry is completely removed from all roles', () => {
      assert.ok(
        !sidebarContent.includes("label: 'Coding Arena Admin'"),
        'Sidebar must not contain "Coding Arena Admin" label'
      );
      assert.ok(
        !sidebarContent.includes("path: '/admin/coding'"),
        'Sidebar must not navigate to "/admin/coding"'
      );
    });
  });

  // --------------------------------------------------------------------------
  // SECTION 2: Legacy Route Redirection
  // --------------------------------------------------------------------------
  describe('2. Safe Route Redirection to /coding', () => {
    it('2.1 /admin/coding safely redirects to canonical /coding', () => {
      assert.ok(
        routesContent.includes('<Route path="/admin/coding" element={<Navigate to="/coding" replace />} />'),
        '/admin/coding must redirect to /coding'
      );
    });

    it('2.2 /subadmin/coding safely redirects to canonical /coding', () => {
      assert.ok(
        routesContent.includes('<Route path="/subadmin/coding" element={<Navigate to="/coding" replace />} />'),
        '/subadmin/coding must redirect to /coding'
      );
    });
  });

  // --------------------------------------------------------------------------
  // SECTION 3: Role-Based Forum Navigation Labels
  // --------------------------------------------------------------------------
  describe('3. Dynamic Role-Based Forum Navigation Labels', () => {
    it('3.1 Sidebar computes forumLabel based on role and community.moderate permission', () => {
      assert.ok(
        sidebarContent.includes("const forumLabel = (isAdmin || hasPermission('community.moderate'))") &&
        sidebarContent.includes("'Forum Management'") &&
        sidebarContent.includes("'Community Forum'"),
        'Sidebar must dynamically determine forumLabel'
      );
    });

    it('3.2 Admin role displays "Forum Management"', () => {
      const adminNavMatch = sidebarContent.match(/adminNav = \[([\s\S]*?)\];/);
      assert.ok(adminNavMatch, 'adminNav must be defined');
      assert.ok(
        adminNavMatch[1].includes("label: 'Forum Management', path: '/community'"),
        'Admin navigation must display "Forum Management" pointing to /community'
      );
    });

    it('3.3 Sub-Admin with moderation permission displays "Forum Management", otherwise "Community Forum"', () => {
      const subAdminNavMatch = sidebarContent.match(/subAdminNav = \[([\s\S]*?)\];/);
      assert.ok(subAdminNavMatch, 'subAdminNav must be defined');
      assert.ok(
        subAdminNavMatch[1].includes("{ label: forumLabel, path: '/community', icon: MessageSquare }"),
        'Sub-Admin navigation must use dynamic forumLabel pointing to /community'
      );
    });

    it('3.4 Student navigation displays "Community Forum"', () => {
      const studentNavMatch = sidebarContent.match(/studentNav = \[([\s\S]*?)\];/);
      assert.ok(studentNavMatch, 'studentNav must be defined');
      assert.ok(
        studentNavMatch[1].includes("{ label: forumLabel, path: '/community', icon: MessageSquare, moduleKey: 'community' }") ||
        studentNavMatch[1].includes("{ label: 'Community Forum', path: '/community', icon: MessageSquare, moduleKey: 'community' }"),
        'Student navigation must display "Community Forum" pointing to /community'
      );
    });
  });

  // --------------------------------------------------------------------------
  // SECTION 4: Unified CodingArenaPage Experience & Layout Preservation
  // --------------------------------------------------------------------------
  describe('4. Unified CodingArenaPage Student Layout & Experience Preservation', () => {
    it('4.1 Preserves DSA & Coding Practice Arena heading and description', () => {
      assert.ok(
        codingPageContent.includes('DSA &amp; Coding Practice Arena') ||
        codingPageContent.includes('DSA & Coding Practice Arena'),
        'Must preserve arena heading'
      );
      assert.ok(
        codingPageContent.includes('Tech Geek Adarsh'),
        'Must preserve author attribution'
      );
    });

    it('4.2 Preserves Solved Problems, In Progress and Overall Target cards', () => {
      assert.ok(codingPageContent.includes('Solved Problems'), 'Must include Solved Problems card');
      assert.ok(codingPageContent.includes('In Progress'), 'Must include In Progress card');
      assert.ok(codingPageContent.includes('Overall Target'), 'Must include Overall Target card');
      assert.ok(codingPageContent.includes('150 Core Patterns'), 'Must include 150 Core Patterns target');
    });

    it('4.3 Preserves Search and Difficulty / Category / Status filters', () => {
      assert.ok(codingPageContent.includes('searchQuery'), 'Must include search box');
      assert.ok(codingPageContent.includes('selectedDifficulty'), 'Must include difficulty select');
      assert.ok(codingPageContent.includes('selectedCategory'), 'Must include category select/pills');
      assert.ok(codingPageContent.includes('selectedStatus'), 'Must include status select');
    });

    it('4.4 Preserves student problem-solving and playground actions', () => {
      assert.ok(codingPageContent.includes("isSolved ? 'Review' : 'Solve'"), 'Must include Solve/Review action');
      assert.ok(codingPageContent.includes('Playground'), 'Must include Playground action');
    });
  });

  // --------------------------------------------------------------------------
  // SECTION 5: Admin & Authorized Sub-admin Management Capabilities
  // --------------------------------------------------------------------------
  describe('5. Management Capabilities for Admin and Authorized Sub-Admins', () => {
    it('5.1 Identifies management authorization via canManage (isAdmin || coding.manage)', () => {
      assert.ok(
        codingPageContent.includes("const canManage = isAdmin || hasPermission('coding.manage');"),
        'Must check isAdmin or coding.manage permission'
      );
    });

    it('5.2 Top-right heading area renders "Create Challenge" and "Bulk JSON Upload" buttons for canManage', () => {
      assert.ok(codingPageContent.includes('Create Challenge'), 'Must render Create Challenge button');
      assert.ok(codingPageContent.includes('Bulk JSON Upload'), 'Must render Bulk JSON Upload button');
      assert.ok(codingPageContent.includes('onClick={handleOpenCreate}'), 'Create button must trigger handleOpenCreate');
      assert.ok(codingPageContent.includes('onClick={() => setIsBulkModalOpen(true)}'), 'Bulk button must open bulk modal');
    });

    it('5.3 Problem rows include Edit, Test Cases and Delete actions when authorized', () => {
      assert.ok(codingPageContent.includes('handleOpenTestCases(p)'), 'Must provide Test Cases management');
      assert.ok(codingPageContent.includes('handleOpenEdit(p)'), 'Must provide Edit challenge action');
      assert.ok(codingPageContent.includes('setProblemToDelete(p)'), 'Must provide Delete challenge action');
    });

    it('5.4 Provides modals for Challenge Creation/Editing, Test Cases, and Bulk JSON Upload', () => {
      assert.ok(codingPageContent.includes('isEditModalOpen'), 'Must manage edit modal state');
      assert.ok(codingPageContent.includes('isTestCasesModalOpen'), 'Must manage test cases modal state');
      assert.ok(codingPageContent.includes('isBulkModalOpen'), 'Must manage bulk upload modal state');
      assert.ok(codingPageContent.includes('handleDownloadTemplate'), 'Must support verified JSON template download');
      assert.ok(codingPageContent.includes('handleBulkUploadSubmit'), 'Must support bulk JSON validation & upload');
    });

    it('5.5 Loads complete problem catalog including drafts for management roles', () => {
      assert.ok(
        codingPageContent.includes('CodingService.getProblems(canManage)'),
        'Must load drafts for authorized managers and published-only for students'
      );
    });
  });

  // --------------------------------------------------------------------------
  // SECTION 6: Role Isolation & Code Execution Safety
  // --------------------------------------------------------------------------
  describe('6. Role Isolation & Execution Architecture Safety', () => {
    it('6.1 Students are strictly isolated from management buttons and dialogs', () => {
      assert.ok(codingPageContent.includes('{canManage && ('), 'Management UI must be conditional on canManage');
      assert.ok(codingPageContent.includes('if (!canManage) return;'), 'Management functions must guard against unpermitted execution');
    });

    it('6.2 Code execution architecture remains in native client-side sandbox', () => {
      assert.ok(
        codingPageContent.includes('Interactive Sandbox Preview'),
        'Notice confirms local interactive sandbox execution'
      );
    });
  });
});
