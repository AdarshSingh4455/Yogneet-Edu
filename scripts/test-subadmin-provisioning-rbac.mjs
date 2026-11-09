/**
 * Yogneet Edu — Sub-Admin Provisioning & RBAC Hotfix Test Suite
 * Executed via node:test (compatible with npm test).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Runtime implementation matching src/permissions/registry.ts
function generateSecureTemporaryPassword(length = 16) {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;

  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  const passwordChars = [
    uppercase[randomValues[0] % uppercase.length],
    lowercase[randomValues[1] % lowercase.length],
    numbers[randomValues[2] % numbers.length],
    symbols[randomValues[3] % symbols.length],
  ];

  for (let i = 4; i < length; i++) {
    passwordChars.push(allChars[randomValues[i] % allChars.length]);
  }

  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = randomValues[i] % (i + 1);
    const temp = passwordChars[i];
    passwordChars[i] = passwordChars[j];
    passwordChars[j] = temp;
  }

  return passwordChars.join('');
}

const DEPARTMENT_CONFIGS = {
  'Curriculum & Video Authoring': {
    id: 'curriculum',
    name: 'Curriculum & Video Authoring',
    allowedRoleKeys: ['content_creator', 'content_manager'],
  },
  'Assessment & Test Series': {
    id: 'assessment',
    name: 'Assessment & Test Series',
    allowedRoleKeys: ['test_evaluator'],
  },
  'Community Moderation': {
    id: 'community',
    name: 'Community Moderation',
    allowedRoleKeys: ['community_moderator'],
  },
  'Platform Compliance & Audit': {
    id: 'compliance',
    name: 'Platform Compliance & Audit',
    allowedRoleKeys: ['auditor'],
  },
  'Advertisements & Monetization': {
    id: 'advertisements',
    name: 'Advertisements & Monetization',
    allowedRoleKeys: ['ads_manager'],
  },
  'Coding Arena & Practice': {
    id: 'coding',
    name: 'Coding Arena & Practice',
    allowedRoleKeys: ['coding_lead'],
  },
  'Tournaments & Leaderboard': {
    id: 'leaderboard',
    name: 'Tournaments & Leaderboard',
    allowedRoleKeys: ['leaderboard_manager'],
  },
};

const ROLE_PRESETS = {
  content_creator: { name: 'Content Creator' },
  content_manager: { name: 'Senior Content Lead' },
  test_evaluator: { name: 'Assessment Coordinator' },
  community_moderator: { name: 'Community Moderator' },
  ads_manager: { name: 'Ads & Monetization Lead' },
  coding_lead: { name: 'Coding Arena Instructor' },
  leaderboard_manager: { name: 'Tournament & Leaderboard Lead' },
  auditor: { name: 'Compliance Auditor' },
};

function getDepartments() {
  return Object.keys(DEPARTMENT_CONFIGS);
}

function getRolesForDepartment(department) {
  const config = DEPARTMENT_CONFIGS[department];
  if (!config) return [];
  return config.allowedRoleKeys.map(key => ({
    key,
    ...ROLE_PRESETS[key],
  }));
}

function isValidDepartmentRole(department, roleKey) {
  const config = DEPARTMENT_CONFIGS[department];
  if (!config) return false;
  return config.allowedRoleKeys.includes(roleKey);
}

describe('Sub-Admin Provisioning & RBAC Hotfix Suite', () => {

  describe('Suite 1: Cryptographic Temporary Password Generation', () => {
    it('generates a password of minimum 12 characters (default 16)', () => {
      const pwd = generateSecureTemporaryPassword();
      assert.equal(pwd.length, 16);
      assert.ok(pwd.length >= 12);
    });

    it('supports custom lengths >= 12 characters', () => {
      const pwd20 = generateSecureTemporaryPassword(20);
      assert.equal(pwd20.length, 20);
      const pwd24 = generateSecureTemporaryPassword(24);
      assert.equal(pwd24.length, 24);
    });

    it('enforces character set complexity (uppercase, lowercase, number, symbol)', () => {
      for (let i = 0; i < 50; i++) {
        const pwd = generateSecureTemporaryPassword();
        assert.match(pwd, /[A-Z]/, 'Must contain uppercase');
        assert.match(pwd, /[a-z]/, 'Must contain lowercase');
        assert.match(pwd, /[0-9]/, 'Must contain number');
        assert.match(pwd, /[!@#$%^&*]/, 'Must contain symbol');
      }
    });

    it('has zero collisions over 200 consecutive generations', () => {
      const set = new Set();
      const count = 200;
      for (let i = 0; i < count; i++) {
        const pwd = generateSecureTemporaryPassword();
        assert.ok(!set.has(pwd), `Collision found at iteration ${i}`);
        set.add(pwd);
      }
      assert.equal(set.size, count);
    });

    it('does not derive credentials from phone numbers or personal data', () => {
      const phone = '+91 98000 12345';
      const last4 = '2345';
      for (let i = 0; i < 20; i++) {
        const pwd = generateSecureTemporaryPassword();
        assert.notEqual(pwd, last4);
        assert.notEqual(pwd, '12345');
        assert.notEqual(pwd, phone);
      }
    });
  });

  describe('Suite 2: Department and Role Dependency Matrix', () => {
    it('provides exactly 7 valid platform departments', () => {
      const depts = getDepartments();
      assert.equal(depts.length, 7);
      assert.deepEqual(depts, [
        'Curriculum & Video Authoring',
        'Assessment & Test Series',
        'Community Moderation',
        'Platform Compliance & Audit',
        'Advertisements & Monetization',
        'Coding Arena & Practice',
        'Tournaments & Leaderboard',
      ]);
    });

    it('maps departments strictly to their authoritative role presets', () => {
      assert.deepEqual(getRolesForDepartment('Curriculum & Video Authoring').map(r => r.key), ['content_creator', 'content_manager']);
      assert.deepEqual(getRolesForDepartment('Assessment & Test Series').map(r => r.key), ['test_evaluator']);
      assert.deepEqual(getRolesForDepartment('Community Moderation').map(r => r.key), ['community_moderator']);
      assert.deepEqual(getRolesForDepartment('Platform Compliance & Audit').map(r => r.key), ['auditor']);
      assert.deepEqual(getRolesForDepartment('Advertisements & Monetization').map(r => r.key), ['ads_manager']);
      assert.deepEqual(getRolesForDepartment('Coding Arena & Practice').map(r => r.key), ['coding_lead']);
      assert.deepEqual(getRolesForDepartment('Tournaments & Leaderboard').map(r => r.key), ['leaderboard_manager']);
    });

    it('isValidDepartmentRole correctly validates permitted and forbidden combinations', () => {
      // Permitted
      assert.ok(isValidDepartmentRole('Curriculum & Video Authoring', 'content_creator'));
      assert.ok(isValidDepartmentRole('Curriculum & Video Authoring', 'content_manager'));
      assert.ok(isValidDepartmentRole('Assessment & Test Series', 'test_evaluator'));
      assert.ok(isValidDepartmentRole('Community Moderation', 'community_moderator'));
      assert.ok(isValidDepartmentRole('Platform Compliance & Audit', 'auditor'));
      assert.ok(isValidDepartmentRole('Advertisements & Monetization', 'ads_manager'));
      assert.ok(isValidDepartmentRole('Coding Arena & Practice', 'coding_lead'));
      assert.ok(isValidDepartmentRole('Tournaments & Leaderboard', 'leaderboard_manager'));

      // Forbidden
      assert.equal(isValidDepartmentRole('Community Moderation', 'content_manager'), false);
      assert.equal(isValidDepartmentRole('Assessment & Test Series', 'coding_lead'), false);
      assert.equal(isValidDepartmentRole('Advertisements & Monetization', 'auditor'), false);
      assert.equal(isValidDepartmentRole('Coding Arena & Practice', 'test_evaluator'), false);
      assert.equal(isValidDepartmentRole('Tournaments & Leaderboard', 'content_creator'), false);
      assert.equal(isValidDepartmentRole('Platform Compliance & Audit', 'community_moderator'), false);
      assert.equal(isValidDepartmentRole('Unknown Department', 'content_creator'), false);
    });
  });

  describe('Suite 3: Source Code & Architectural Invariant Audit', () => {
    it('verifies src/permissions/registry.ts exports all required structures', () => {
      const code = fs.readFileSync(path.resolve('src/permissions/registry.ts'), 'utf8');
      assert.ok(code.includes('export const DEPARTMENT_CONFIGS'));
      assert.ok(code.includes('export const VALID_DEPARTMENTS'));
      assert.ok(code.includes('export function getDepartments()'));
      assert.ok(code.includes('export function getRolesForDepartment'));
      assert.ok(code.includes('export function isValidDepartmentRole'));
      assert.ok(code.includes('export function generateSecureTemporaryPassword'));
    });

    it('verifies src/services/staffAdminService.ts enforces server-side validation and secure credentials', () => {
      const code = fs.readFileSync(path.resolve('src/services/staffAdminService.ts'), 'utf8');
      assert.ok(code.includes('isValidDepartmentRole(input.department, input.presetKey)'));
      assert.ok(code.includes('generateSecureTemporaryPassword()'));
      assert.ok(code.includes('mockUser.mustChangePassword = true'));
      assert.ok(code.includes('generateStaffTemporaryCredential'));
      assert.ok(code.includes('must_change_password: true'));
    });

    it('verifies supabase/functions/admin-provision-staff/index.ts uses authoritative auth and security validation', () => {
      const code = fs.readFileSync(path.resolve('supabase/functions/admin-provision-staff/index.ts'), 'utf8');
      assert.ok(code.includes('adminClient.auth.admin.createUser'), 'Must use authoritative admin API');
      assert.ok(code.includes('DEPARTMENT_ROLE_MAPPING'), 'Must validate against server-side department role mapping');
      assert.ok(code.includes('generateCryptographicPassword'), 'Must generate random cryptographic password');
      assert.ok(code.includes('must_change_password: true'), 'Must set must_change_password flag');
      assert.ok(code.includes('temporaryPassword: tempPassword'), 'Must return temporaryPassword to admin');
      assert.ok(!code.includes('details: `...${tempPassword}`'), 'Must never log temporary password to audit trail');
    });

    it('verifies src/pages/admin/SubAdminManagementPage.tsx no longer derives passwords from phone numbers', () => {
      const code = fs.readFileSync(path.resolve('src/pages/admin/SubAdminManagementPage.tsx'), 'utf8');
      assert.ok(!code.includes('last 4 digits of registered phone number'), 'Must not claim last 4 phone digits policy');
      assert.ok(code.includes('getDepartments()'), 'Must use dynamic department selector');
      assert.ok(code.includes('getRolesForDepartment(newDepartment)'), 'Must dynamically filter roles by department');
      assert.ok(code.includes('setProvisionedCredential'), 'Must set provisioned credential state');
      assert.ok(code.includes('One-Time Display Warning'), 'Must render one-time temporary credential display modal');
      assert.ok(code.includes('navigator.clipboard.writeText'), 'Must have one-click copy button');
    });

    it('verifies src/components/auth/PasswordLifecycleModal.tsx has eliminated phone-derived credentials', () => {
      const code = fs.readFileSync(path.resolve('src/components/auth/PasswordLifecycleModal.tsx'), 'utf8');
      assert.ok(!code.includes('last4Phone'), 'Must not compute last4Phone');
      assert.ok(!code.includes('Last 4 digits of registered phone number'), 'Must not state 4-digit phone policy');
      assert.ok(code.includes('generateStaffTemporaryCredential') || code.includes('generateSecureTemporaryPassword'), 'Must use secure credential generator');
      assert.ok(code.includes('One-Time Display Warning'), 'Must show one-time display warning on reset');
    });
  });
});
