import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// -----------------------------------------------------------------------------
// Pure logic reproductions of Phase 4A Assessment JSON Validator & Template
// matching src/services/assessmentAdminService.ts
// -----------------------------------------------------------------------------

function validateAssessmentJson(input) {
  const errors = [];
  let parsed;

  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      return { isValid: false, errors: ['JSON Syntax Error: Input is not valid JSON.'] };
    }
  } else {
    parsed = input;
  }

  if (!parsed || typeof parsed !== 'object') {
    return { isValid: false, errors: ['Root JSON must be an object.'] };
  }

  if (parsed.schemaVersion !== 1) {
    errors.push(`Unsupported or missing "schemaVersion" (expected 1, received: ${parsed.schemaVersion}).`);
  }

  const asm = parsed.assessment;
  if (!asm || typeof asm !== 'object') {
    errors.push('Missing "assessment" root object.');
  } else {
    if (!asm.title || typeof asm.title !== 'string' || !asm.title.trim()) {
      errors.push('Assessment "title" is required.');
    }
    if (!asm.subject || typeof asm.subject !== 'string' || !asm.subject.trim()) {
      errors.push('Assessment "subject" is required.');
    }
    if (asm.duration_minutes !== undefined && (typeof asm.duration_minutes !== 'number' || asm.duration_minutes <= 0)) {
      errors.push('Assessment "duration_minutes" must be a positive integer.');
    }
    if (asm.pass_percentage !== undefined && (typeof asm.pass_percentage !== 'number' || asm.pass_percentage < 0 || asm.pass_percentage > 100)) {
      errors.push('Assessment "pass_percentage" must be between 0 and 100.');
    }
  }

  const questions = parsed.questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    errors.push('Missing or empty "questions" array. At least one question is required.');
  } else {
    questions.forEach((q, idx) => {
      const qNum = idx + 1;
      if (!q.question_text || typeof q.question_text !== 'string' || !q.question_text.trim()) {
        errors.push(`Question #${qNum}: "question_text" is required.`);
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`Question #${qNum}: "options" must contain at least 2 choices.`);
      } else {
        if (typeof q.correctOption !== 'number' || q.correctOption < 0 || q.correctOption >= q.options.length) {
          errors.push(`Question #${qNum}: "correctOption" must be an index between 0 and ${q.options.length - 1}.`);
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function getSampleJsonTemplate() {
  return JSON.stringify(
    {
      schemaVersion: 1,
      assessment: {
        title: 'Advanced React Architecture Quiz',
        subject: 'React',
        module: 'State Management & Hooks',
        duration_minutes: 20,
        pass_percentage: 70,
        difficulty: 'Medium',
        type: 'Practice Quiz',
        description: 'Comprehensive test covering React hooks, state lifting, and component optimization.',
      },
      questions: [
        {
          question_text: 'What is the primary purpose of the useMemo hook?',
          options: [
            'To execute side-effects after render',
            'To memoize the result of an expensive calculation',
            'To persist mutable references across renders',
            'To handle DOM measurements directly',
          ],
          correctOption: 1,
          explanation: 'useMemo caches the result of a calculation between renders until dependencies change.',
          points: 10,
        },
        {
          question_text: 'Which hook should be used for imperative animations and direct DOM measurements prior to browser paint?',
          options: [
            'useEffect',
            'useInsertionEffect',
            'useLayoutEffect',
            'useDeferredValue',
          ],
          correctOption: 2,
          explanation: 'useLayoutEffect fires synchronously after all DOM mutations but before the browser paints.',
          points: 10,
        },
      ],
    },
    null,
    2
  );
}

// -----------------------------------------------------------------------------
// Test Suites
// -----------------------------------------------------------------------------

describe('Phase 4A: Dual-Portal Authentication UI & Invariants', () => {
  const studentLoginPath = path.resolve('src/pages/auth/StudentLoginPage.tsx');
  const studentSignupPath = path.resolve('src/pages/auth/StudentSignupPage.tsx');
  const platformLoginPath = path.resolve('src/pages/auth/PlatformLoginPage.tsx');
  const portalSelectionPath = path.resolve('src/pages/auth/PortalSelectionPage.tsx');
  const authLayoutPath = path.resolve('src/components/layout/AuthLayout.tsx');

  it('Student login page exists and strictly forbids role selectors', () => {
    assert.ok(fs.existsSync(studentLoginPath), 'StudentLoginPage.tsx must exist');
    const content = fs.readFileSync(studentLoginPath, 'utf8');

    // Invariant: Student login must NEVER have a role selection dropdown
    assert.ok(!content.includes('<select'), 'Student login must not include role dropdown');
    assert.ok(!content.includes('roleSelect'), 'Student login must not have role selector state');
    assert.ok(!content.includes("value=\"admin\""), 'Student login must not offer admin role');
    assert.ok(!content.includes("value=\"faculty\""), 'Student login must not offer faculty role');

    // Invariant: Must support show/hide password
    assert.ok(content.includes('showPassword'), 'Must support password visibility toggle');
    assert.ok(content.includes('Eye') && content.includes('EyeOff'), 'Must render eye icons');

    // Invariant: Must offer link to forgot password and signup
    assert.ok(content.includes('/forgot-password'), 'Must link to forgot password');
    assert.ok(content.includes('/signup'), 'Must link to student signup');

    // Invariant: Google OAuth button present with non-misleading modal
    assert.ok(content.includes('GoogleIcon') || content.includes('Google'), 'Must include Google login button');
    assert.ok(content.includes('isGoogleModalOpen') || content.includes('Google OAuth'), 'Must provide OAuth modal/notice');
  });

  it('Student signup page exists, isolates student role, and enforces validation', () => {
    assert.ok(fs.existsSync(studentSignupPath), 'StudentSignupPage.tsx must exist');
    const content = fs.readFileSync(studentSignupPath, 'utf8');

    // Invariant: Student signup must NOT have any role selector or admin escalation
    assert.ok(!content.includes('<select'), 'Student signup must not include role dropdown');
    assert.ok(!content.includes('roleSelect'), 'Student signup must not have role selector');
    assert.ok(!content.includes("value=\"admin\""), 'Student signup must not allow choosing admin');
    assert.ok(!content.includes("value=\"faculty\""), 'Student signup must not allow choosing faculty');

    // Invariant: Password confirmation and validation checks
    assert.ok(content.includes('password') && content.includes('confirmPassword'), 'Must require password confirmation');
    assert.ok(content.includes('agreeTerms'), 'Must require terms acceptance checkbox');
    assert.ok(content.includes('showPassword'), 'Must support password toggle');
  });

  it('Platform login page exists, enforces staff/admin isolation with zero role dropdowns', () => {
    assert.ok(fs.existsSync(platformLoginPath), 'PlatformLoginPage.tsx must exist');
    const content = fs.readFileSync(platformLoginPath, 'utf8');

    // Invariant: Platform login must NOT allow role dropdown (assigned via backend JWT in 4B)
    assert.ok(!content.includes('<select'), 'Platform login must not include role dropdown');
    assert.ok(!content.includes('roleSelect'), 'Platform login must not have role selector');

    // Invariant: Platform login must NOT allow self-registration/signup
    assert.ok(!content.includes('Create an account'), 'Platform login must not have public account creation');
    assert.ok(!content.includes('to="/signup"'), 'Platform login must not link to public signup');

    // Invariant: Security warning / faculty badge
    assert.ok(content.includes('Internal Staff') || content.includes('Platform Portal'), 'Must identify internal platform portal');
    assert.ok(content.includes('showPassword'), 'Must support password visibility toggle');
  });

  it('Portal Selection Gateway provides clear branching between Student and Platform', () => {
    assert.ok(fs.existsSync(portalSelectionPath), 'PortalSelectionPage.tsx must exist');
    const content = fs.readFileSync(portalSelectionPath, 'utf8');

    assert.ok(content.includes('/login') || content.includes('/auth/student/login'), 'Must route to student login');
    assert.ok(content.includes('/platform/login') || content.includes('/auth/platform/login'), 'Must route to platform login');
    assert.ok(content.includes('Student Portal'), 'Must clearly label Student Portal');
    assert.ok(content.includes('Platform Portal') || content.includes('Staff & Administration'), 'Must clearly label Platform Portal');
  });

  it('AuthLayout provides unified branding and theme awareness', () => {
    assert.ok(fs.existsSync(authLayoutPath), 'AuthLayout.tsx must exist');
    const content = fs.readFileSync(authLayoutPath, 'utf8');

    assert.ok(content.includes('YOGNEET EDU') || content.includes('YOGNEET'), 'Must contain YOGNEET branding');
    assert.ok(content.includes('Phoenix') || content.includes('svg') || content.includes('Flame'), 'Must render Phoenix emblem');
    assert.ok(content.includes('toggleTheme') || content.includes('Theme'), 'Must support theme toggle');
  });
});

describe('Phase 4A: 4-Stage Learning Journey Architecture', () => {
  it('Student Dashboard displays 4-Stage Learning Path banner and direct actions', () => {
    const dashboardPath = path.resolve('src/pages/student/StudentDashboard.tsx');
    assert.ok(fs.existsSync(dashboardPath), 'StudentDashboard.tsx must exist');
    const content = fs.readFileSync(dashboardPath, 'utf8');

    assert.ok(content.includes('4-Stage Technical Curriculum') || content.includes('Learning Path') || content.includes('Curriculum'), 'Must feature 4-stage banner');
    assert.ok(content.includes('/videos'), 'Must link to Stage 1: Video Lessons');
    assert.ok(content.includes('/notes'), 'Must link to Stage 2: Study Notes');
    assert.ok(content.includes('/practical'), 'Must link to Stage 3: Practical Assignments');
    assert.ok(content.includes('/tests'), 'Must link to Stage 4: Test Series');
  });

  it('VideoPlayerPage provides next-step progression links', () => {
    const videoPagePath = path.resolve('src/pages/student/VideoPlayerPage.tsx');
    assert.ok(fs.existsSync(videoPagePath), 'VideoPlayerPage.tsx must exist');
    const content = fs.readFileSync(videoPagePath, 'utf8');

    assert.ok(content.includes('/notes'), 'Must link to Study Notes progression');
    assert.ok(content.includes('/practical'), 'Must link to Practical Projects progression');
    assert.ok(content.includes('/tests'), 'Must link to Test Series progression');
  });

  it('NotesDirectoryPage reinforces the 4-stage learning progression', () => {
    const notesPagePath = path.resolve('src/pages/student/NotesDirectoryPage.tsx');
    assert.ok(fs.existsSync(notesPagePath), 'NotesDirectoryPage.tsx must exist');
    const content = fs.readFileSync(notesPagePath, 'utf8');

    assert.ok(content.includes('/practical'), 'Must direct students towards practical exercises');
    assert.ok(content.includes('/tests'), 'Must direct students towards test series');
  });

  it('PracticalAssignmentsPage exists and provides rubrics, problem statement, and PDF export', () => {
    const practicalPath = path.resolve('src/pages/student/PracticalAssignmentsPage.tsx');
    assert.ok(fs.existsSync(practicalPath), 'PracticalAssignmentsPage.tsx must exist');
    const content = fs.readFileSync(practicalPath, 'utf8');

    assert.ok(content.includes('Practical') || content.includes('Assignment'), 'Must reference practical assignments');
    assert.ok(content.includes('Rubric') || content.includes('Evaluation Criteria'), 'Must display evaluation rubrics');
    assert.ok(content.includes('Download PDF') || content.includes('window.print') || content.includes('pdf'), 'Must provide PDF export');
    assert.ok(content.includes('/tests'), 'Must link to Stage 4 Test Series');
  });

  it('ContentWorkspace removes test tab and redirects tests management to dedicated admin tests page', () => {
    const workspacePath = path.resolve('src/pages/subadmin/ContentWorkspacePage.tsx');
    assert.ok(fs.existsSync(workspacePath), 'ContentWorkspacePage.tsx must exist');
    const content = fs.readFileSync(workspacePath, 'utf8');

    // Invariant: ContentWorkspace is strictly for Notes, Videos, and Practical Assignments
    assert.ok(content.includes('/admin/tests'), 'Must route or link to /admin/tests for tests');
    assert.ok(!content.includes("value: 'tests'") && !content.includes("id: 'tests'"), 'ContentWorkspace tab bar must not host tests tab');
  });

  it('TestCatalogManagerPage is dedicated to comprehensive test catalog authoring', () => {
    const testAdminPath = path.resolve('src/pages/admin/TestCatalogManagerPage.tsx');
    assert.ok(fs.existsSync(testAdminPath), 'TestCatalogManagerPage.tsx must exist');
    const content = fs.readFileSync(testAdminPath, 'utf8');

    assert.ok(content.includes('Test Catalog Manager') || content.includes('Assessment Management'), 'Must declare title');
    assert.ok(content.includes('JSON') || content.includes('jsonImport'), 'Must feature JSON bulk import');
    assert.ok(content.includes('status') || content.includes('updateAssessmentStatus'), 'Must support status toggles');
    assert.ok(content.includes('deleteAssessment'), 'Must support assessment deletion');
  });

  it('Sidebar navigation maps the 4 stages for students and dedicated test admin for staff', () => {
    const sidebarPath = path.resolve('src/components/layout/Sidebar.tsx');
    assert.ok(fs.existsSync(sidebarPath), 'Sidebar.tsx must exist');
    const content = fs.readFileSync(sidebarPath, 'utf8');

    assert.ok(content.includes('/videos'), 'Student menu must contain /videos');
    assert.ok(content.includes('/notes'), 'Student menu must contain /notes');
    assert.ok(content.includes('/practical'), 'Student menu must contain /practical');
    assert.ok(content.includes('/tests'), 'Student menu must contain /tests');
    assert.ok(content.includes('/admin/tests'), 'Staff/Admin menu must contain /admin/tests');
  });

  it('AppRoutes registers all Phase 4A routes and security invariants', () => {
    const routesPath = path.resolve('src/routes/AppRoutes.tsx');
    assert.ok(fs.existsSync(routesPath), 'AppRoutes.tsx must exist');
    const content = fs.readFileSync(routesPath, 'utf8');

    assert.ok(content.includes('path="/portal"'), 'Must register /portal');
    assert.ok(content.includes('path="/login"'), 'Must register /login');
    assert.ok(content.includes('path="/signup"'), 'Must register /signup');
    assert.ok(content.includes('path="/forgot-password"'), 'Must register /forgot-password');
    assert.ok(content.includes('path="/reset-password"'), 'Must register /reset-password');
    assert.ok(content.includes('path="/platform/login"'), 'Must register /platform/login');
    assert.ok(content.includes('path="/practical"'), 'Must register /practical');
    assert.ok(content.includes('path="/admin/tests"'), 'Must register /admin/tests');
  });
});

describe('Phase 4A: Assessment JSON Import Validator (v1)', () => {
  it('Validates a correctly formatted schemaVersion 1 JSON template', () => {
    const templateStr = getSampleJsonTemplate();
    const result = validateAssessmentJson(templateStr);
    assert.strictEqual(result.isValid, true, 'Sample template should validate cleanly');
    assert.strictEqual(result.errors.length, 0);
  });

  it('Rejects invalid JSON syntax', () => {
    const invalidJson = '{ schemaVersion: 1, broken: ';
    const result = validateAssessmentJson(invalidJson);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors[0].includes('JSON Syntax Error'));
  });

  it('Rejects JSON with missing or invalid schemaVersion', () => {
    const noVersion = {
      assessment: { title: 'Test', subject: 'Python' },
      questions: [{ question_text: 'Q1?', options: ['A', 'B'], correctOption: 0 }],
    };
    const result = validateAssessmentJson(noVersion);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes('schemaVersion')));

    const wrongVersion = { ...noVersion, schemaVersion: 2 };
    const result2 = validateAssessmentJson(wrongVersion);
    assert.strictEqual(result2.isValid, false);
    assert.ok(result2.errors.some(e => e.includes('schemaVersion')));
  });

  it('Rejects questions with fewer than 2 options', () => {
    const badOptions = {
      schemaVersion: 1,
      assessment: { title: 'Test', subject: 'Python' },
      questions: [{ question_text: 'Q1?', options: ['Solo Option'], correctOption: 0 }],
    };
    const result = validateAssessmentJson(badOptions);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes('at least 2 choices')));
  });

  it('Rejects out-of-bounds correctOption indices', () => {
    const outOfBounds = {
      schemaVersion: 1,
      assessment: { title: 'Test', subject: 'Python' },
      questions: [{ question_text: 'Q1?', options: ['A', 'B'], correctOption: 5 }],
    };
    const result = validateAssessmentJson(outOfBounds);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes('correctOption')));

    const negativeIdx = {
      schemaVersion: 1,
      assessment: { title: 'Test', subject: 'Python' },
      questions: [{ question_text: 'Q1?', options: ['A', 'B'], correctOption: -1 }],
    };
    const result2 = validateAssessmentJson(negativeIdx);
    assert.strictEqual(result2.isValid, false);
    assert.ok(result2.errors.some(e => e.includes('correctOption')));
  });

  it('Rejects missing assessment title or subject', () => {
    const missingMetadata = {
      schemaVersion: 1,
      assessment: { title: '   ', subject: '' },
      questions: [{ question_text: 'Q1?', options: ['A', 'B'], correctOption: 0 }],
    };
    const result = validateAssessmentJson(missingMetadata);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes('"title" is required')));
    assert.ok(result.errors.some(e => e.includes('"subject" is required')));
  });
});
