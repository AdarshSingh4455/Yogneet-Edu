import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Test the core RBAC Permission logic
function hasPermission(user, permission) {
  if (!user) return false;
  if (user.status === 'suspended') return false;
  if (user.role === 'admin') return true;
  return user.permissions.includes(permission);
}

function hasAnyPermission(user, permissions) {
  if (!user) return false;
  if (user.status === 'suspended') return false;
  if (user.role === 'admin') return true;
  return permissions.some(perm => user.permissions.includes(perm));
}

function hasAllPermissions(user, permissions) {
  if (!user) return false;
  if (user.status === 'suspended') return false;
  if (user.role === 'admin') return true;
  return permissions.every(perm => user.permissions.includes(perm));
}

describe('Yogneet Edu RBAC Engine Test Suite', () => {
  const mockAdmin = {
    id: 'admin_1',
    name: 'Adarsh',
    role: 'admin',
    status: 'active',
    permissions: [],
  };

  const mockSubAdmin = {
    id: 'sub_1',
    name: 'Priyanshi',
    role: 'subadmin',
    status: 'active',
    permissions: ['notes.view', 'notes.create', 'notes.edit'],
  };

  const mockSuspendedUser = {
    id: 'sub_suspended',
    name: 'Suspended Staff',
    role: 'subadmin',
    status: 'suspended',
    permissions: ['notes.view', 'videos.view', 'audit_logs.view'],
  };

  it('Super Admin has unrestricted permissions automatically', () => {
    assert.equal(hasPermission(mockAdmin, 'notes.publish'), true);
    assert.equal(hasPermission(mockAdmin, 'subadmins.manage'), true);
    assert.equal(hasPermission(mockAdmin, 'permissions.assign'), true);
  });

  it('Sub-Admin has only assigned permissions and is denied publishing/deletion', () => {
    assert.equal(hasPermission(mockSubAdmin, 'notes.view'), true);
    assert.equal(hasPermission(mockSubAdmin, 'notes.create'), true);
    assert.equal(hasPermission(mockSubAdmin, 'notes.edit'), true);

    // Forbidden actions
    assert.equal(hasPermission(mockSubAdmin, 'notes.publish'), false);
    assert.equal(hasPermission(mockSubAdmin, 'notes.delete'), false);
    assert.equal(hasPermission(mockSubAdmin, 'subadmins.manage'), false);
  });

  it('Suspended user is denied all actions regardless of permissions array', () => {
    assert.equal(hasPermission(mockSuspendedUser, 'notes.view'), false);
    assert.equal(hasPermission(mockSuspendedUser, 'videos.view'), false);
    assert.equal(hasAnyPermission(mockSuspendedUser, ['notes.view']), false);
  });

  it('hasAnyPermission correctly verifies permission subsets', () => {
    assert.equal(hasAnyPermission(mockSubAdmin, ['notes.delete', 'notes.create']), true);
    assert.equal(hasAnyPermission(mockSubAdmin, ['videos.delete', 'subadmins.manage']), false);
  });

  it('hasAllPermissions strictly enforces full set matching', () => {
    assert.equal(hasAllPermissions(mockSubAdmin, ['notes.view', 'notes.create']), true);
    assert.equal(hasAllPermissions(mockSubAdmin, ['notes.view', 'notes.publish']), false);
  });

  it('Deterministic scoring engine calculates marks and negative marks accurately', () => {
    const questions = [
      { id: 'q1', marks: 4, negativeMarks: 1, correctAnswerId: 'opt_2' },
      { id: 'q2', marks: 4, negativeMarks: 1, correctAnswerId: 'opt_1' },
      { id: 'q3', marks: 4, negativeMarks: 1, correctAnswerId: 'opt_3' },
    ];
    const userAnswers = {
      q1: 'opt_2', // Correct (+4)
      q2: 'opt_4', // Wrong (-1)
      // q3: Unanswered (0)
    };

    let score = 0;
    let maxScore = 0;
    let correct = 0;
    let incorrect = 0;

    questions.forEach(q => {
      maxScore += q.marks;
      if (userAnswers[q.id]) {
        if (userAnswers[q.id] === q.correctAnswerId) {
          score += q.marks;
          correct++;
        } else {
          score -= q.negativeMarks;
          incorrect++;
        }
      }
    });

    assert.equal(score, 3); // 4 - 1 = 3
    assert.equal(maxScore, 12);
    assert.equal(correct, 1);
    assert.equal(incorrect, 1);
  });
});
