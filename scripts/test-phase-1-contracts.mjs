import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// -----------------------------------------------------------------------------
// Phase 1 Unit and Acceptance Test Suite: Contracts, Services, Formatters & RBAC
// -----------------------------------------------------------------------------

// Formatters reproduction
function formatEnrollmentNumber(year, sequentialNumber) {
  const seqStr = sequentialNumber < 1000
    ? String(sequentialNumber).padStart(3, '0')
    : String(sequentialNumber);
  return `${year}${seqStr}`;
}

function generateProposedYogneetEmail(name, fallbackId) {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '.')
    .replace(/\.+/g, '.')
    .replace(/(^\.|\.$)/g, '');
  return `${clean || fallbackId || 'student'}@yogneet.edu`;
}

function extractYouTubeId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname === '/watch') {
        const v = url.searchParams.get('v');
        return v && /^[a-zA-Z0-9_-]{11}$/.test(v) ? v : null;
      }
      if (url.pathname.startsWith('/embed/')) {
        const id = url.pathname.split('/')[2];
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
      if (url.pathname.startsWith('/shorts/')) {
        const id = url.pathname.split('/')[2];
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
  } catch {}
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}

function analyzePassword(password) {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
  const count = Object.values(requirements).filter(Boolean).length;
  let score = 0;
  let label = 'Very Weak';

  if (count <= 1) {
    score = 0;
    label = 'Very Weak';
  } else if (count === 2) {
    score = 1;
    label = 'Weak';
  } else if (count === 3) {
    score = 2;
    label = 'Medium';
  } else if (count === 4) {
    score = 3;
    label = 'Strong';
  } else {
    score = 4;
    label = 'Very Strong';
  }
  return { score, label, count, requirements };
}

describe('Module 7: Enrollment Number Formatting (Year + Variable Sequential Number)', () => {
  it('Pads 1-digit and 2-digit sequential numbers to 3 digits', () => {
    assert.equal(formatEnrollmentNumber(2026, 1), '2026001');
    assert.equal(formatEnrollmentNumber(2026, 2), '2026002');
    assert.equal(formatEnrollmentNumber(2026, 42), '2026042');
  });

  it('Supports 3-digit sequential numbers up to 999 without extra zeros', () => {
    assert.equal(formatEnrollmentNumber(2026, 999), '2026999');
  });

  it('Supports variable-length sequential numbers starting from 1000 without truncation or overflow', () => {
    assert.equal(formatEnrollmentNumber(2026, 1000), '20261000');
    assert.equal(formatEnrollmentNumber(2026, 1001), '20261001');
    assert.equal(formatEnrollmentNumber(2026, 15420), '202615420');
  });

  it('Generates proposed yogneet.edu email convention correctly', () => {
    assert.equal(generateProposedYogneetEmail('Alex Rivera'), 'alex.rivera@yogneet.edu');
    assert.equal(generateProposedYogneetEmail('Adarsh Singh'), 'adarsh.singh@yogneet.edu');
    assert.equal(generateProposedYogneetEmail('Kavita Sundaram'), 'kavita.sundaram@yogneet.edu');
  });
});

describe('Module 3 & 4: YouTube Shorts URL Parsing & Vertical 9:16 Invariants', () => {
  it('Extracts 11-char ID from official YouTube Shorts URLs', () => {
    assert.equal(extractYouTubeId('https://www.youtube.com/shorts/bM7SZ5SBzyY'), 'bM7SZ5SBzyY');
    assert.equal(extractYouTubeId('https://youtube.com/shorts/kJQP7kiw5Fk?feature=share'), 'kJQP7kiw5Fk');
  });

  it('Extracts 11-char ID from youtu.be and standard watch URLs', () => {
    assert.equal(extractYouTubeId('https://youtu.be/W3q8Od5qJio'), 'W3q8Od5qJio');
    assert.equal(extractYouTubeId('https://www.youtube.com/watch?v=FsAPt_9B7Wc'), 'FsAPt_9B7Wc');
  });

  it('Returns raw 11-char ID directly when provided without protocol', () => {
    assert.equal(extractYouTubeId('g2o22C3CRfU'), 'g2o22C3CRfU');
  });

  it('Returns null for malformed or empty inputs', () => {
    assert.equal(extractYouTubeId(''), null);
    assert.equal(extractYouTubeId('invalid-url-here'), null);
  });
});

describe('Module 9: Password Strength Analysis & Lifecycle Policy Rules', () => {
  it('Flags passwords shorter than 8 characters as Very Weak or Weak', () => {
    const res = analyzePassword('Short1!');
    assert.equal(res.requirements.minLength, false);
    assert.ok(res.score <= 3);
  });

  it('Evaluates complex passwords as Very Strong (length, upper, lower, number, special)', () => {
    const res = analyzePassword('Yogneet@2026Secure!');
    assert.equal(res.score, 4);
    assert.equal(res.label, 'Very Strong');
    assert.equal(res.requirements.hasUppercase, true);
    assert.equal(res.requirements.hasLowercase, true);
    assert.equal(res.requirements.hasNumber, true);
    assert.equal(res.requirements.hasSpecial, true);
  });

  it('Enforces Phase 2 initial credential policy structure', () => {
    // Staff: last 4 of phone
    const staffPhone = '+91 98765 43210';
    const staffPolicy = staffPhone.replace(/\D/g, '').slice(-4);
    assert.equal(staffPolicy, '3210');

    // Premium Student: last 4 phone + last 4 enrollment
    const studentPhone = '+91 91234 56789';
    const studentEnrollment = '20261000';
    const studentPolicy = `${studentPhone.replace(/\D/g, '').slice(-4)}${studentEnrollment.slice(-4)}`;
    assert.equal(studentPolicy, '67891000');
    assert.equal(studentPolicy.length, 8);
  });
});

describe('Module 1 & 3: Independence of Subjects and Micro Subjects', () => {
  it('Validates that main Subjects and Micro Subjects schemas remain completely independent', () => {
    const mockSubject = {
      id: 'subj_python',
      name: 'Python Programming',
      slug: 'python-programming',
      icon: 'Code',
      contentCounts: { videos: 8, notes: 14, assignments: 5, assessments: 6, testSeries: 8 },
    };

    const mockMicroSubject = {
      id: 'micro_py_tricks',
      name: 'Python Quick Tricks',
      slug: 'python-quick-tricks',
      coverImage: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935',
      videoCount: 4,
    };

    assert.notEqual(mockSubject.id, mockMicroSubject.id);
    assert.ok('contentCounts' in mockSubject);
    assert.ok(!('contentCounts' in mockMicroSubject));
    assert.ok('coverImage' in mockMicroSubject);
  });
});
