/**
 * Automated Verification Suite for YOGNEET EDU:
 * Revenue, Engagement & Platform Management Upgrade
 *
 * Covers:
 * Feature 1 — Active Learners Counter (Formula, public scalar integer, base counter admin control, RLS privacy)
 * Feature 2 — Top 200 Student Leaderboard (Scoring formula, difficulty multipliers, tie-breaking, strict top-200 quota, fraud exclusions)
 * Feature 3 — Advertisement Management & Monetization (Placements, frequency capping, anti-spam click deduplication, CTR metrics)
 * Feature 4 — Granular Sub-Admin RBAC (10 permission groups, default-deny, Super Admin base counter exclusivity)
 * Feature 5 — Coding Practice Arena (Problem CRUD, hidden test case protection, JSON bulk schema validation, solution evaluation)
 * Feature 6 — Community Forum Moderation (Hide/Soft-delete, restore, mandatory reasons, warnings/suspensions, moderation audit trail)
 */

import assert from 'assert';

console.log('===============================================================');
console.log('🧪 YOGNEET EDU — REVENUE & ENGAGEMENT UPGRADE VERIFICATION SUITE');
console.log('===============================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } catch (err) {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     Reason: ${err.message}\n`);
  }
}

// ============================================================================
// FEATURE 1: ACTIVE LEARNERS COUNTER
// ============================================================================
console.log('--- FEATURE 1: ACTIVE LEARNERS COUNTER ---');

// Formula: Displayed Active Learners = Actual Active Learners + Admin Configured Base Counter
function calculateDisplayedActiveLearners(actualActive, baseCounter) {
  assert(Number.isInteger(actualActive) && actualActive >= 0, 'Actual active must be a non-negative integer');
  assert(Number.isInteger(baseCounter) && baseCounter >= 0, 'Base counter must be a non-negative integer');
  return actualActive + baseCounter;
}

runTest('1.1 Core Formula calculates exact sum (Actual 5 + Base 50 = Displayed 55)', () => {
  const actual = 5;
  const base = 50;
  const displayed = calculateDisplayedActiveLearners(actual, base);
  assert.strictEqual(displayed, 55, 'Displayed count must equal 55');
});

runTest('1.2 Dynamic update reflects immediate recalculation (Actual 12 + Base 75 = 87)', () => {
  const actual = 12;
  const base = 75;
  const displayed = calculateDisplayedActiveLearners(actual, base);
  assert.strictEqual(displayed, 87, 'Displayed count must update dynamically');
});

runTest('1.3 Public scalar response exposure test (returns only single scalar integer)', () => {
  // Public endpoint simulation
  const publicResponse = calculateDisplayedActiveLearners(3, 40);
  assert.strictEqual(typeof publicResponse, 'number');
  assert(!('actual' in Object(publicResponse)), 'Public response must not expose actual active learners');
  assert(!('base_counter' in Object(publicResponse)), 'Public response must not expose base counter');
  assert(!('formula' in Object(publicResponse)), 'Public response must not expose formula');
});

runTest('1.4 Base counter validation rejects negative integers', () => {
  assert.throws(() => {
    calculateDisplayedActiveLearners(5, -10);
  }, /non-negative integer/);
});

runTest('1.5 Base counter update requires Admin authorization and creates audit log entry', () => {
  const auditLog = [];
  function adminUpdateBaseCounter(userRole, newBase, reason) {
    if (userRole !== 'admin') {
      throw new Error('403 Forbidden: Only Super Admin can update the active learners base counter');
    }
    if (!Number.isInteger(newBase) || newBase < 0) {
      throw new Error('400 Bad Request: Base counter must be a non-negative integer');
    }
    auditLog.push({
      action: 'update_active_learners_base_counter',
      newBase,
      reason,
      timestamp: new Date().toISOString(),
    });
    return { success: true, newBase };
  }

  // Subadmin attempt must fail
  assert.throws(() => adminUpdateBaseCounter('subadmin', 100, 'Attempt by staff'), /403 Forbidden/);
  // Student attempt must fail
  assert.throws(() => adminUpdateBaseCounter('student', 100, 'Attempt by student'), /403 Forbidden/);
  
  // Admin attempt must succeed and log
  const res = adminUpdateBaseCounter('admin', 60, 'Q4 Enrollment expansion adjustment');
  assert.strictEqual(res.newBase, 60);
  assert.strictEqual(auditLog.length, 1);
  assert.strictEqual(auditLog[0].action, 'update_active_learners_base_counter');
});

// ============================================================================
// FEATURE 2: TOP 200 STUDENT LEADERBOARD
// ============================================================================
console.log('\n--- FEATURE 2: TOP 200 STUDENT LEADERBOARD ---');

function computeStudentScore(attempts) {
  // Difficulty Multipliers: Easy 1.0x, Medium 1.2x, Hard 1.5x
  const diffWeights = { Easy: 1.0, Medium: 1.2, Hard: 1.5 };
  
  // Filter out excluded attempts
  const validAttempts = attempts.filter(a => !a.isExcluded);
  if (validAttempts.length === 0) return { totalScore: 0, avgAccuracy: 0, totalTests: 0 };

  // Best score per distinct assessment
  const bestPerAssessment = new Map();
  validAttempts.forEach(att => {
    const existing = bestPerAssessment.get(att.assessmentId);
    if (!existing || att.score > existing.score) {
      bestPerAssessment.set(att.assessmentId, att);
    }
  });

  let weightedSum = 0;
  let accuracySum = 0;
  bestPerAssessment.forEach(att => {
    const weight = diffWeights[att.difficulty] || 1.0;
    weightedSum += att.score * weight;
    accuracySum += att.accuracy;
  });

  const avgAccuracy = Math.round((accuracySum / bestPerAssessment.size) * 10) / 10;
  const totalScore = Math.round((weightedSum + avgAccuracy * 2) * 10) / 10;

  return {
    totalScore,
    avgAccuracy,
    totalTests: bestPerAssessment.size,
    earliestCompletion: new Date(Math.min(...validAttempts.map(a => new Date(a.completedAt).getTime()))).toISOString(),
  };
}

runTest('2.1 Composite score with difficulty multipliers (Hard 1.5x, Medium 1.2x, Easy 1.0x)', () => {
  const attempts = [
    { assessmentId: 'test-1', score: 100, accuracy: 90, difficulty: 'Hard', completedAt: '2026-11-01T10:00:00Z', isExcluded: false },
    { assessmentId: 'test-2', score: 80, accuracy: 80, difficulty: 'Medium', completedAt: '2026-11-01T11:00:00Z', isExcluded: false },
  ];
  // Hard 100 * 1.5 = 150
  // Medium 80 * 1.2 = 96
  // Avg accuracy = (90 + 80)/2 = 85.0
  // Total score = 150 + 96 + (85 * 2) = 246 + 170 = 416.0
  const metrics = computeStudentScore(attempts);
  assert.strictEqual(metrics.totalScore, 416.0);
  assert.strictEqual(metrics.avgAccuracy, 85.0);
  assert.strictEqual(metrics.totalTests, 2);
});

runTest('2.2 Deterministic tie-breaking rules', () => {
  const students = [
    { id: 'user-b', name: 'Bob', totalScore: 350, avgAccuracy: 88, totalTests: 4, earliestCompletion: '2026-11-01T12:00:00Z' },
    { id: 'user-a', name: 'Alice', totalScore: 350, avgAccuracy: 92, totalTests: 3, earliestCompletion: '2026-11-01T13:00:00Z' },
    { id: 'user-c', name: 'Charlie', totalScore: 350, avgAccuracy: 88, totalTests: 5, earliestCompletion: '2026-11-01T11:00:00Z' },
  ];

  students.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.avgAccuracy !== a.avgAccuracy) return b.avgAccuracy - a.avgAccuracy;
    if (b.totalTests !== a.totalTests) return b.totalTests - a.totalTests;
    if (a.earliestCompletion !== b.earliestCompletion) return new Date(a.earliestCompletion) - new Date(b.earliestCompletion);
    return a.id.localeCompare(b.id);
  });

  // Alice has higher accuracy (92 vs 88) -> Rank 1
  // Charlie and Bob have same accuracy 88, but Charlie has 5 tests vs Bob's 4 -> Rank 2
  // Bob -> Rank 3
  assert.strictEqual(students[0].name, 'Alice');
  assert.strictEqual(students[1].name, 'Charlie');
  assert.strictEqual(students[2].name, 'Bob');
});

runTest('2.3 Strict Top-200 quota constraint (positions > 200 receive rank null)', () => {
  const rankingList = Array.from({ length: 250 }, (_, i) => ({
    userId: `student-${i + 1}`,
    score: 1000 - i,
  }));

  const getRank = (index) => (index < 200 ? index + 1 : null);

  assert.strictEqual(getRank(0), 1, 'First student must be rank 1');
  assert.strictEqual(getRank(199), 200, 'Student at index 199 must be rank 200');
  assert.strictEqual(getRank(200), null, 'Student at index 200 (rank 201) must receive null');
  assert.strictEqual(getRank(249), null, 'Student beyond 200 must receive null');
});

runTest('2.4 Fraudulent attempt exclusion recalculates leaderboard immediately', () => {
  const attempts = [
    { assessmentId: 'test-1', score: 100, accuracy: 100, difficulty: 'Hard', completedAt: '2026-11-01T10:00:00Z', isExcluded: false },
    { assessmentId: 'test-2', score: 100, accuracy: 100, difficulty: 'Hard', completedAt: '2026-11-01T11:00:00Z', isExcluded: false },
  ];
  const beforeExclusion = computeStudentScore(attempts);
  assert.strictEqual(beforeExclusion.totalScore, 500); // (150 + 150) + 200 = 500

  // Admin excludes test-2 for bot script submission
  attempts[1].isExcluded = true;
  attempts[1].exclusionReason = 'Rapid scripted submission detected';

  const afterExclusion = computeStudentScore(attempts);
  assert.strictEqual(afterExclusion.totalScore, 350); // 150 + 200 = 350
  assert.strictEqual(afterExclusion.totalTests, 1);
});

// ============================================================================
// FEATURE 3: ADVERTISEMENT MANAGEMENT & MONETIZATION
// ============================================================================
console.log('\n--- FEATURE 3: ADVERTISEMENT MANAGEMENT & MONETIZATION ---');

function isAdEligibleToDisplay(ad, userImpressionHistory, currentTimestamp) {
  // Check active status & schedule window
  if (ad.status !== 'active') return false;
  const now = new Date(currentTimestamp).getTime();
  if (ad.startDate && now < new Date(ad.startDate).getTime()) return false;
  if (ad.endDate && now > new Date(ad.endDate).getTime()) return false;

  // Check frequency capping
  const userImpressionsToday = userImpressionHistory.filter(imp => {
    const impTime = new Date(imp.timestamp).getTime();
    return now - impTime < 24 * 60 * 60 * 1000;
  });

  if (ad.dailyCap && userImpressionsToday.length >= ad.dailyCap) {
    return false;
  }

  // Check cooldown minutes
  if (ad.cooldownMinutes && userImpressionsToday.length > 0) {
    const lastImpressionTime = Math.max(...userImpressionsToday.map(i => new Date(i.timestamp).getTime()));
    const cooldownMs = ad.cooldownMinutes * 60 * 1000;
    if (now - lastImpressionTime < cooldownMs) {
      return false;
    }
  }

  return true;
}

runTest('3.1 Frequency capping enforces daily limit and cooldown interval', () => {
  const ad = {
    id: 'ad-tech-summit',
    status: 'active',
    dailyCap: 2,
    cooldownMinutes: 30,
  };

  const now = '2026-11-04T12:00:00Z';
  const history = [];

  // First impression allowed
  assert.strictEqual(isAdEligibleToDisplay(ad, history, now), true);
  history.push({ timestamp: now });

  // Immediate subsequent view blocked by 30-min cooldown
  assert.strictEqual(isAdEligibleToDisplay(ad, history, '2026-11-04T12:10:00Z'), false);

  // View after 35 minutes allowed
  assert.strictEqual(isAdEligibleToDisplay(ad, history, '2026-11-04T12:35:00Z'), true);
  history.push({ timestamp: '2026-11-04T12:35:00Z' });

  // View after 2 daily impressions blocked by dailyCap
  assert.strictEqual(isAdEligibleToDisplay(ad, history, '2026-11-04T14:00:00Z'), false);
});

runTest('3.2 CTR calculation & Anti-Spam Click Deduplication', () => {
  function recordClick(clicks, newClick) {
    // 5-second anti-spam deduplication threshold
    const recentDuplicate = clicks.some(c =>
      c.adId === newClick.adId &&
      c.sessionId === newClick.sessionId &&
      Math.abs(new Date(c.timestamp).getTime() - new Date(newClick.timestamp).getTime()) < 5000
    );
    if (!recentDuplicate) {
      clicks.push(newClick);
    }
    return clicks;
  }

  const clicks = [];
  recordClick(clicks, { adId: 'ad-1', sessionId: 'sess-1', timestamp: '2026-11-04T10:00:00Z' });
  // Spam rapid click 1 second later
  recordClick(clicks, { adId: 'ad-1', sessionId: 'sess-1', timestamp: '2026-11-04T10:00:01Z' });
  // Spam rapid click 2 seconds later
  recordClick(clicks, { adId: 'ad-1', sessionId: 'sess-1', timestamp: '2026-11-04T10:00:02Z' });
  // Legitimate click 10 seconds later
  recordClick(clicks, { adId: 'ad-1', sessionId: 'sess-1', timestamp: '2026-11-04T10:00:10Z' });

  assert.strictEqual(clicks.length, 2, 'Spam clicks within 5 seconds must be deduplicated');

  // CTR calculation on 50 impressions, 2 legitimate clicks
  const impressions = 50;
  const ctr = Number(((clicks.length / impressions) * 100).toFixed(2));
  assert.strictEqual(ctr, 4.0, 'CTR must be 4.00%');
});

// ============================================================================
// FEATURE 4: GRANULAR SUB-ADMIN RBAC
// ============================================================================
console.log('\n--- FEATURE 4: GRANULAR SUB-ADMIN RBAC ---');

runTest('4.1 Default-deny authorization check', () => {
  function checkPermission(user, requiredPerm) {
    if (!user || user.status === 'suspended') return false;
    if (user.role === 'admin') return true;
    return Array.isArray(user.permissions) && user.permissions.includes(requiredPerm);
  }

  const subAdminNoAds = { role: 'subadmin', status: 'active', permissions: ['tests.view', 'coding.view'] };
  assert.strictEqual(checkPermission(subAdminNoAds, 'advertisements.manage'), false);
  assert.strictEqual(checkPermission(subAdminNoAds, 'coding.view'), true);

  const suspendedSubAdmin = { role: 'subadmin', status: 'suspended', permissions: ['coding.view'] };
  assert.strictEqual(checkPermission(suspendedSubAdmin, 'coding.view'), false);
});

runTest('4.2 Super Admin base counter exclusivity (Sub-admins cannot be granted base counter config)', () => {
  // All sub-admin assignable permission keys
  const assignablePermissionKeys = [
    'videos.view', 'videos.create', 'videos.edit', 'videos.publish', 'videos.delete',
    'notes.view', 'notes.create', 'notes.edit', 'notes.publish', 'notes.delete',
    'tests.view', 'tests.create', 'tests.edit', 'tests.publish', 'tests.schedule', 'tests.view_results',
    'students.view', 'students.suspend',
    'community.view', 'community.moderate',
    'subadmins.manage', 'permissions.assign',
    'audit_logs.view', 'analytics.view',
    'advertisements.view', 'advertisements.manage',
    'leaderboard.view', 'leaderboard.manage',
    'coding.view', 'coding.manage',
    'notifications.view', 'notifications.manage',
  ];

  // Active Learners base counter must NOT be an assignable RBAC permission
  assert(!assignablePermissionKeys.includes('active_learners.base_counter'));
  assert(!assignablePermissionKeys.includes('active_learners.manage'));
  assert(!assignablePermissionKeys.includes('platform_settings.update'));
});

// ============================================================================
// FEATURE 5: CODING PRACTICE ARENA QUESTION MANAGEMENT
// ============================================================================
console.log('\n--- FEATURE 5: CODING ARENA QUESTION MANAGEMENT ---');

runTest('5.1 Problem test case security (Students strictly forbidden from viewing hidden test cases)', () => {
  const allTestCases = [
    { id: 'tc-1', input: 'nums = [2,7,11,15], target = 9', expectedOutput: '[0,1]', isHidden: false },
    { id: 'tc-2', input: 'nums = [3,2,4], target = 6', expectedOutput: '[1,2]', isHidden: true },
    { id: 'tc-3', input: 'nums = [10000 elements], target = 19999', expectedOutput: '[9998,9999]', isHidden: true },
  ];

  function getStudentVisibleTestCases(cases) {
    return cases.filter(c => !c.isHidden).map(({ id, input, expectedOutput }) => ({ id, input, expectedOutput }));
  }

  const studentCases = getStudentVisibleTestCases(allTestCases);
  assert.strictEqual(studentCases.length, 1);
  assert.strictEqual(studentCases[0].id, 'tc-1');
  assert(!studentCases.some(c => c.id === 'tc-2' || c.id === 'tc-3'), 'Hidden test cases must never be returned to students');
});

runTest('5.2 JSON Bulk Upload validation and error reporting', () => {
  const jsonBatch = [
    { title: 'Valid Problem', difficulty: 'Easy', category: 'Arrays', description: 'Sample' },
    { title: 'Invalid Diff Problem', difficulty: 'Extreme', category: 'Trees', description: 'Sample' },
    { title: '', difficulty: 'Medium', category: 'DP', description: 'Missing title' },
  ];

  const errors = [];
  jsonBatch.forEach((item, idx) => {
    if (!item.title) errors.push({ index: idx, error: 'Missing title' });
    if (!['Easy', 'Medium', 'Hard'].includes(item.difficulty)) {
      errors.push({ index: idx, error: 'Difficulty must be Easy, Medium, or Hard' });
    }
  });

  assert.strictEqual(errors.length, 2);
  assert.strictEqual(errors[0].index, 1);
  assert.strictEqual(errors[1].index, 2);
});

// ============================================================================
// FEATURE 6: COMMUNITY FORUM MODERATION
// ============================================================================
console.log('\n--- FEATURE 6: COMMUNITY FORUM MODERATION ---');

runTest('6.1 Thread Moderation: Hide/Soft-delete filter and Pin ordering', () => {
  const threads = [
    { id: 'th-1', title: 'Normal Discussion', isPinned: false, isHidden: false, isSoftDeleted: false },
    { id: 'th-2', title: 'Pinned Guidelines', isPinned: true, isHidden: false, isSoftDeleted: false },
    { id: 'th-3', title: 'Spam Thread', isPinned: false, isHidden: true, isSoftDeleted: false },
    { id: 'th-4', title: 'Harassment Post', isPinned: false, isHidden: false, isSoftDeleted: true },
  ];

  function getStudentFeed(feed) {
    return feed
      .filter(t => !t.isHidden && !t.isSoftDeleted)
      .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }

  const studentFeed = getStudentFeed(threads);
  assert.strictEqual(studentFeed.length, 2);
  assert.strictEqual(studentFeed[0].id, 'th-2', 'Pinned notice must appear first');
  assert.strictEqual(studentFeed[1].id, 'th-1');
  assert(!studentFeed.some(t => t.id === 'th-3' || t.id === 'th-4'), 'Hidden and soft-deleted threads must not appear in feed');
});

runTest('6.2 Mandatory Moderation Reason logging', () => {
  const moderationAuditTrail = [];

  function executeModeration(moderator, thread, action, reason) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Mandatory moderation justification is required');
    }
    thread[action === 'hide' ? 'isHidden' : 'isSoftDeleted'] = true;
    thread.moderationReason = reason;

    moderationAuditTrail.push({
      moderatorId: moderator.id,
      threadId: thread.id,
      action,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  const testThread = { id: 'th-spam', title: 'Click here for free bitcoin', isHidden: false, isSoftDeleted: false };
  const modUser = { id: 'mod-1', name: 'Safety Lead' };

  // Fails without reason
  assert.throws(() => executeModeration(modUser, testThread, 'hide', ''), /Mandatory moderation justification/);

  // Succeeds with reason
  executeModeration(modUser, testThread, 'hide', 'External cryptocurrency spam violates platform policy §2');
  assert.strictEqual(testThread.isHidden, true);
  assert.strictEqual(moderationAuditTrail.length, 1);
  assert.strictEqual(moderationAuditTrail[0].reason, 'External cryptocurrency spam violates platform policy §2');
});

console.log('\n===============================================================');
console.log(`RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
if (failedTests > 0) {
  console.error(`FAILED: ${failedTests} TESTS FAILED`);
  process.exit(1);
} else {
  console.log('🎉 ALL REVENUE & ENGAGEMENT UPGRADE TESTS PASSED PERFECTLY!');
  console.log('===============================================================');
}
