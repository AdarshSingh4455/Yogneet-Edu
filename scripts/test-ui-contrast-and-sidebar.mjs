/**
 * ==============================================================================
 * Yogneet Edu — UI Contrast Regression & Resizable Sidebar Test Suite
 * ==============================================================================
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('UI Contrast Regression & Resizable Sidebar Suite', () => {
  const sidebarContent = fs.readFileSync(path.resolve('src/components/layout/Sidebar.tsx'), 'utf8');
  const accessPageContent = fs.readFileSync(path.resolve('src/pages/admin/StudentAccessManagementPage.tsx'), 'utf8');
  const analyticsPageContent = fs.readFileSync(path.resolve('src/pages/admin/AnalyticsPage.tsx'), 'utf8');
  const subjectSelectionContent = fs.readFileSync(path.resolve('src/components/subjects/SubjectSelectionView.tsx'), 'utf8');
  const tailwindContent = fs.readFileSync(path.resolve('tailwind.config.js'), 'utf8');

  // ---------------------------------------------------------------------------
  // 1. PHASE 1 & 2: Contrast Regressions Fix & Theme Tokens
  // ---------------------------------------------------------------------------
  describe('1. Dark Mode Contrast Regressions & Theme Tokens', () => {
    it('1.1 tailwind.config.js defines brand-950 as brand navy (#0E1B3D)', () => {
      assert.ok(tailwindContent.includes("950: '#0E1B3D'"), 'tailwind.config.js must define brand.950');
    });

    it('1.2 Student Access Management info banner uses high-contrast light/dark theme classes', () => {
      assert.ok(
        !accessPageContent.includes('dark:bg-brand-950/40'),
        'Must not use undefined dark:bg-brand-950/40'
      );
      assert.ok(
        accessPageContent.includes('bg-blue-50/90') && accessPageContent.includes('dark:bg-dark-card'),
        'Info banner must use legible dark:bg-dark-card or semantic dark surface'
      );
      assert.ok(
        accessPageContent.includes('text-slate-900 dark:text-slate-100'),
        'Banner title must have high-contrast text'
      );
      assert.ok(
        accessPageContent.includes('text-slate-700 dark:text-slate-300'),
        'Banner description must have high-contrast text'
      );
    });

    it('1.3 Student Access Management disabled state text satisfies WCAG contrast', () => {
      assert.ok(
        accessPageContent.includes('text-slate-600 dark:text-slate-400'),
        'Disabled button text must use slate-600 in light mode for readability'
      );
    });

    it('1.4 Platform Analytics Telemetry cards use high-contrast dark theme classes', () => {
      assert.ok(
        analyticsPageContent.includes('Watch Hours Telemetry') &&
        analyticsPageContent.includes('PDF Download Telemetry'),
        'Must retain telemetry indicators'
      );
      assert.ok(
        !analyticsPageContent.includes('dark:bg-brand-950/20'),
        'Data Integrity Assurance banner must not use undefined dark:bg-brand-950/20'
      );
      assert.ok(
        analyticsPageContent.includes('Data Integrity Assurance:'),
        'Must preserve Data Integrity Assurance banner'
      );
      assert.ok(
        analyticsPageContent.includes('dark:bg-dark-card') || analyticsPageContent.includes('dark:bg-slate-900'),
        'Assurance banner must use theme-aware surface'
      );
    });

    it('1.5 Subject Learning Pages Hero Label uses high-contrast colors in both Light and Dark mode', () => {
      assert.ok(
        subjectSelectionContent.includes('Subject-Wise Learning Pathway'),
        'Hero must retain Subject-Wise Learning Pathway label'
      );
      assert.ok(
        !subjectSelectionContent.includes('dark:bg-brand-950/60'),
        'Must not use undefined dark:bg-brand-950/60'
      );
      assert.ok(
        subjectSelectionContent.includes('bg-blue-100') &&
        subjectSelectionContent.includes('dark:bg-blue-950/80') &&
        subjectSelectionContent.includes('text-blue-800') &&
        subjectSelectionContent.includes('dark:text-cyan-300'),
        'Subject-Wise badge must use dark:bg-blue-950/80 and dark:text-cyan-300 for WCAG AAA contrast'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 2. PHASE 3: Resizable Desktop Sidebar
  // ---------------------------------------------------------------------------
  describe('2. Horizontally Resizable Sidebar Architecture', () => {
    it('2.1 Defines min, default, and max dimensions (220px to 420px)', () => {
      assert.ok(sidebarContent.includes('MIN_SIDEBAR_WIDTH = 220'), 'Min width must be 220px');
      assert.ok(sidebarContent.includes('DEFAULT_SIDEBAR_WIDTH = 296'), 'Default width must be 296px');
      assert.ok(sidebarContent.includes('MAX_SIDEBAR_WIDTH = 420'), 'Max width must be 420px');
    });

    it('2.2 Uses localStorage persistence under key yogneet_sidebar_width', () => {
      assert.ok(sidebarContent.includes('SIDEBAR_STORAGE_KEY = \'yogneet_sidebar_width\''), 'Must use yogneet_sidebar_width key');
      assert.ok(sidebarContent.includes('localStorage.getItem(SIDEBAR_STORAGE_KEY)'), 'Must load from storage');
      assert.ok(sidebarContent.includes('localStorage.setItem(SIDEBAR_STORAGE_KEY'), 'Must save to storage');
    });

    it('2.3 Renders dedicated resize handle on desktop with role="separator" and col-resize cursor', () => {
      assert.ok(sidebarContent.includes('role="separator"'), 'Resize handle must have separator role');
      assert.ok(sidebarContent.includes('cursor-col-resize'), 'Must specify col-resize cursor');
      assert.ok(sidebarContent.includes('aria-orientation="vertical"'), 'Must have vertical orientation aria');
      assert.ok(sidebarContent.includes('hidden lg:block'), 'Handle must be desktop-only');
    });

    it('2.4 Supports keyboard accessibility (ArrowLeft, ArrowRight, Home, End)', () => {
      assert.ok(sidebarContent.includes("e.key === 'ArrowLeft'"), 'Must handle ArrowLeft');
      assert.ok(sidebarContent.includes("e.key === 'ArrowRight'"), 'Must handle ArrowRight');
      assert.ok(sidebarContent.includes("e.key === 'Home'"), 'Must handle Home key');
      assert.ok(sidebarContent.includes("e.key === 'End'"), 'Must handle End key');
    });

    it('2.5 Double-click on handle resets to default width (296px)', () => {
      assert.ok(sidebarContent.includes('handleDoubleClickReset'), 'Must provide double-click reset');
      assert.ok(sidebarContent.includes('setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)'), 'Must reset to default width');
    });

    it('2.6 Pointer event cleanup on pointerup and pointercancel to prevent stuck dragging', () => {
      assert.ok(sidebarContent.includes('pointermove'), 'Must attach pointermove');
      assert.ok(sidebarContent.includes('pointerup'), 'Must attach pointerup');
      assert.ok(sidebarContent.includes('pointercancel'), 'Must attach pointercancel');
      assert.ok(sidebarContent.includes('removeEventListener'), 'Must remove listeners on cleanup');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. PHASE 4: Remove Decorative Navigation Badges
  // ---------------------------------------------------------------------------
  describe('3. Removal of Decorative Navigation Badges', () => {
    it('3.1 adminNav contains 0 decorative badges (NEW, Rank, Shorts, Hot, Pro, Ads, RBAC, Access, Assets, Support)', () => {
      const adminNavMatch = sidebarContent.match(/adminNav = \[([\s\S]*?)\];/);
      assert.ok(adminNavMatch, 'adminNav must exist');
      assert.ok(!adminNavMatch[1].includes("badge: 'Access'"), 'Access badge must be removed');
      assert.ok(!adminNavMatch[1].includes("badge: 'Support'"), 'Support badge must be removed');
      assert.ok(!adminNavMatch[1].includes("badge: 'Shorts'"), 'Shorts badge must be removed');
      assert.ok(!adminNavMatch[1].includes("badge: 'Assets'"), 'Assets badge must be removed');
      assert.ok(!adminNavMatch[1].includes("badge: 'Pro'"), 'Pro badge must be removed');
      assert.ok(!adminNavMatch[1].includes("badge: 'RBAC'"), 'RBAC badge must be removed');
      assert.ok(!adminNavMatch[1].includes("badge: 'Rank'"), 'Rank badge must be removed');
      assert.ok(!adminNavMatch[1].includes("badge: 'Ads'"), 'Ads badge must be removed');
    });

    it('3.2 subAdminNav contains 0 decorative badges', () => {
      const subAdminNavMatch = sidebarContent.match(/subAdminNav = \[([\s\S]*?)\];/);
      assert.ok(subAdminNavMatch, 'subAdminNav must exist');
      assert.ok(!subAdminNavMatch[1].includes("badge: 'Shorts'"), 'Shorts badge must be removed from subadmin');
      assert.ok(!subAdminNavMatch[1].includes("badge: 'Pro'"), 'Pro badge must be removed from subadmin');
      assert.ok(!subAdminNavMatch[1].includes("badge: 'Rank'"), 'Rank badge must be removed from subadmin');
    });

    it('3.3 studentNav contains 0 decorative badges', () => {
      const studentNavMatch = sidebarContent.match(/studentNav = \[([\s\S]*?)\];/);
      assert.ok(studentNavMatch, 'studentNav must exist');
      assert.ok(!studentNavMatch[1].includes("badge: 'New'"), 'New badge must be removed from student');
      assert.ok(!studentNavMatch[1].includes("badge: 'Rank'"), 'Rank badge must be removed from student');
      assert.ok(!studentNavMatch[1].includes("badge: 'Shorts'"), 'Shorts badge must be removed from student');
      assert.ok(!studentNavMatch[1].includes("badge: 'Hot'"), 'Hot badge must be removed from student');
    });

    it('3.4 Navigation items render clean icon and label with truncation and tooltips', () => {
      assert.ok(!sidebarContent.includes('{item.badge &&'), 'Badge rendering span must be removed from navigation items');
      assert.ok(sidebarContent.includes('title={item.label}'), 'Items must have title attribute for tooltips');
      assert.ok(sidebarContent.includes('span className="truncate"'), 'Labels must have truncate class');
    });
  });
});
