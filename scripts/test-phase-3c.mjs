import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// -----------------------------------------------------------------------------
// Pure logic reproductions of Phase 3C service validators and utilities
// to test them in a standalone Node environment without DOM or network dependencies.
// -----------------------------------------------------------------------------

// --- 1. Storage & File Validation ---
function validatePdfFile(file) {
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
  const ALLOWED_MIME_TYPES = ['application/pdf'];

  if (!file) {
    return { isValid: false, error: 'No file provided.' };
  }
  if (file.size === 0) {
    return { isValid: false, error: 'The selected file is empty (0 bytes).' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: 'File size exceeds the 25 MB limit.' };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { isValid: false, error: 'Only PDF documents (.pdf) are permitted.' };
  }
  return { isValid: true };
}

function generateStoragePath(prefix, originalFilename) {
  const sanitized = originalFilename
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-');
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  return `${prefix}/${timestamp}-${randomSuffix}-${sanitized}`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// --- 2. Assessment Import JSON Validator (v1) ---
function validateJsonImport(input) {
  const errors = [];
  let parsed;

  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      return { isValid: false, errors: ['JSON Syntax Error: Invalid JSON document.'] };
    }
  } else {
    parsed = input;
  }

  if (!parsed || typeof parsed !== 'object') {
    return { isValid: false, errors: ['Root JSON must be an object.'] };
  }

  if (parsed.schemaVersion !== 1) {
    errors.push(`Unsupported or missing "schemaVersion" (expected 1, received ${parsed.schemaVersion}).`);
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
    if (asm.difficulty && !['Easy', 'Medium', 'Hard'].includes(asm.difficulty)) {
      errors.push(`Invalid difficulty "${asm.difficulty}". Must be "Easy", "Medium", or "Hard".`);
    }
    if (asm.type && !['Practice Quiz', 'Mock Exam', 'Module Test'].includes(asm.type)) {
      errors.push(`Invalid type "${asm.type}". Must be "Practice Quiz", "Mock Exam", or "Module Test".`);
    }
  }

  const qs = parsed.questions;
  if (!Array.isArray(qs) || qs.length === 0) {
    errors.push('The "questions" array must contain at least 1 question.');
  } else {
    qs.forEach((q, idx) => {
      const qNum = idx + 1;
      const text = q.text || q.question_text;
      if (!text || typeof text !== 'string' || !text.trim()) {
        errors.push(`Question ${qNum}: Question text is required.`);
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`Question ${qNum}: Must provide at least 2 options.`);
      } else {
        const optIds = new Set();
        q.options.forEach((opt, oIdx) => {
          if (!opt.id || typeof opt.id !== 'string') {
            errors.push(`Question ${qNum}, Option ${oIdx + 1}: Option "id" is required.`);
          } else if (optIds.has(opt.id)) {
            errors.push(`Question ${qNum}, Option ${oIdx + 1}: Duplicate option ID "${opt.id}".`);
          } else {
            optIds.add(opt.id);
          }
          if (!opt.text || typeof opt.text !== 'string' || !opt.text.trim()) {
            errors.push(`Question ${qNum}, Option ${oIdx + 1}: Option "text" cannot be empty.`);
          }
        });

        if (!q.correct_answer_id || !optIds.has(q.correct_answer_id)) {
          errors.push(`Question ${qNum}: "correct_answer_id" ("${q.correct_answer_id}") does not match any provided option ID.`);
        }
      }
    });
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    payload: parsed,
    questionCount: qs.length,
  };
}

// --- 3. Student Batch Import Validator ---
function validateStudentJsonImport(input) {
  const errors = [];
  let parsed;

  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      return { isValid: false, errors: ['JSON Syntax Error: Invalid JSON document.'], validCount: 0 };
    }
  } else {
    parsed = input;
  }

  const rows = Array.isArray(parsed) ? parsed : parsed?.students;

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      isValid: false,
      errors: ['Root JSON must be an array of student objects, or an object with a "students" array.'],
      validCount: 0,
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const seenEmails = new Set();
  const validRows = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;
    if (!row || typeof row !== 'object') {
      errors.push(`Row ${rowNum}: Invalid student record format.`);
      return;
    }

    const name = (row.full_name || row.name || '').trim();
    const email = (row.email || '').trim().toLowerCase();

    if (!name) {
      errors.push(`Row ${rowNum}: "full_name" is required.`);
    }

    if (!email) {
      errors.push(`Row ${rowNum}: "email" is required.`);
    } else if (!emailRegex.test(email)) {
      errors.push(`Row ${rowNum}: Invalid email format "${email}".`);
    } else if (seenEmails.has(email)) {
      errors.push(`Row ${rowNum}: Duplicate email "${email}" found in this import batch.`);
    } else {
      seenEmails.add(email);
    }

    if (name && email && emailRegex.test(email)) {
      validRows.push({
        full_name: name,
        email,
        department: (row.department || 'General Engineering').trim(),
        institution: (row.institution || 'Yogneet Institute of Technology').trim(),
        access_category: row.access_category === 'pro' ? 'pro' : 'standard',
        notes: row.notes || undefined,
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    validRows,
    validCount: validRows.length,
  };
}

// --- 4. YouTube URL Parser ---
function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Pattern 1: youtu.be/<id>
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // Pattern 2: youtube.com/watch?v=<id>
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // Pattern 3: youtube.com/embed/<id>
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  // Pattern 4: youtube.com/shorts/<id>
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];

  // Pattern 5: Direct 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

// --- 5. Pure PDF Binary Builder ---
function escapePdfText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function buildAssignmentPdfBytes(assignment) {
  const lines = [];
  const objects = [];

  const addObj = (content) => {
    objects.push(content);
    return objects.length;
  };

  const fontObj = addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);
  const boldFontObj = addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`);

  const streamLines = [
    'BT',
    `/F2 20 Tf 50 780 Td (${escapePdfText('YOGNEET EDU — PRACTICAL ASSESSMENT')}) Tj`,
    `/F1 10 Tf 0 -22 Td (${escapePdfText(`Subject: ${assignment.subject}  |  Module: ${assignment.module}  |  Total Marks: ${assignment.totalMarks}`)}) Tj`,
    `/F2 14 Tf 0 -35 Td (${escapePdfText(assignment.title)}) Tj`,
    `/F2 11 Tf 0 -30 Td (${escapePdfText('1. PROBLEM STATEMENT')}) Tj`,
    `/F1 10 Tf 0 -18 Td (${escapePdfText(assignment.problemStatement)}) Tj`,
    'ET',
  ];

  const streamContent = streamLines.join('\n');
  const streamLength = Buffer.byteLength(streamContent, 'utf-8');
  const contentObj = addObj(`<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream`);

  const pageObj = addObj(
    `<< /Type /Page /Parent 5 0 R /MediaBox [0 0 595 842] /Contents ${contentObj} 0 R /Resources << /Font << /F1 ${fontObj} 0 R /F2 ${boldFontObj} 0 R >> >> >>`
  );

  const pagesObj = addObj(`<< /Type /Pages /Kids [${pageObj} 0 R] /Count 1 >>`);
  const catalogObj = addObj(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);

  // Assemble full PDF
  let pdf = `%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`;
  const offsets = [];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, 'utf-8'));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf-8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += `0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObj} 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf-8');
}

// --- 6. Analytics Date Filtering Helper ---
function filterByDateRange(items, range, dateField = 'created_at') {
  if (range === 'all') return items;
  const now = Date.now();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return items.filter(item => {
    const itemDate = new Date(item[dateField]).getTime();
    return !isNaN(itemDate) && itemDate >= cutoff;
  });
}

// -----------------------------------------------------------------------------
// Test Suite 1: Phase 3C Database Migration & Schema Integrity
// -----------------------------------------------------------------------------
describe('Suite 1: Phase 3C Database Migration & Schema Integrity', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase',
    'migrations',
    '20261029000005_phase_3c_content_management.sql'
  );

  it('Migration file exists and is readable', () => {
    assert.ok(fs.existsSync(migrationPath), 'Migration 20261029000005 must exist');
    const content = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(content.length > 500, 'Migration must contain substantial DDL statements');
  });

  it('Alters video_lessons with status column, check constraint, and updated RLS', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(sql.toLowerCase().includes('add column if not exists status text'), 'Must add status column to video_lessons');
    assert.ok(sql.includes("status IN ('draft', 'published', 'archived')"), 'Must add status check constraint');
    assert.ok(sql.includes('video_lessons_select_active'), 'Must update select policy');
    assert.ok(sql.includes("status = 'published'"), 'Students can only select published videos');
  });

  it('Creates practical_assignments table with comprehensive schema and RLS', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.practical_assignments'), 'Must create practical_assignments table');
    assert.ok(sql.toLowerCase().includes('problem_statement text not null'), 'Must declare problem_statement');
    assert.ok(sql.toLowerCase().includes('rubric jsonb'), 'Must declare rubric jsonb');
    assert.ok(sql.includes('ALTER TABLE public.practical_assignments ENABLE ROW LEVEL SECURITY'), 'Must enable RLS');
    assert.ok(sql.includes('practical_assignments_select'), 'Must have select policy');
    assert.ok(sql.includes('practical_assignments_manage_staff'), 'Must have staff management policy');
  });

  it('Creates student_directory table with access categories and staff-only RLS', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.student_directory'), 'Must create student_directory table');
    assert.ok(sql.toLowerCase().includes('access_category text not null default'), 'Must declare access_category');
    assert.ok(sql.includes('ALTER TABLE public.student_directory ENABLE ROW LEVEL SECURITY'), 'Must enable RLS');
    assert.ok(sql.includes('student_directory_select_staff'), 'Must restrict select to staff');
    assert.ok(sql.includes('student_directory_insert_staff'), 'Must restrict insert to staff');
  });

  it('Defines atomic create_assessment_with_questions RPC with security definer and rollback', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.create_assessment_with_questions'), 'Must create RPC');
    assert.ok(sql.includes('SECURITY DEFINER'), 'Must declare SECURITY DEFINER');
    assert.ok(sql.includes('SET search_path = public, auth, pg_temp'), 'Must set secure search path');
    assert.ok(sql.includes('RAISE EXCEPTION'), 'Must roll back on error');
    assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.create_assessment_with_questions'), 'Must grant execute to authenticated');
  });
});

// -----------------------------------------------------------------------------
// Test Suite 2: Storage Service & PDF File Security Validation
// -----------------------------------------------------------------------------
describe('Suite 2: Storage Service & PDF File Security Validation', () => {
  it('Accepts valid PDF file within size limit', () => {
    const validFile = { name: 'python-algorithms.pdf', size: 1024 * 1024, type: 'application/pdf' };
    const res = validatePdfFile(validFile);
    assert.equal(res.isValid, true);
    assert.equal(res.error, undefined);
  });

  it('Rejects file exceeding 25 MB size limit', () => {
    const largeFile = { name: 'huge-file.pdf', size: 26 * 1024 * 1024, type: 'application/pdf' };
    const res = validatePdfFile(largeFile);
    assert.equal(res.isValid, false);
    assert.match(res.error, /exceeds the 25 MB limit/);
  });

  it('Rejects empty 0-byte file', () => {
    const emptyFile = { name: 'empty.pdf', size: 0, type: 'application/pdf' };
    const res = validatePdfFile(emptyFile);
    assert.equal(res.isValid, false);
    assert.match(res.error, /empty \(0 bytes\)/);
  });

  it('Rejects dangerous and non-PDF MIME types', () => {
    const maliciousTypes = [
      'application/javascript',
      'text/html',
      'image/png',
      'application/x-sh',
      'application/octet-stream',
    ];
    for (const type of maliciousTypes) {
      const res = validatePdfFile({ name: 'test.ext', size: 5000, type });
      assert.equal(res.isValid, false, `Must reject MIME type: ${type}`);
      assert.match(res.error, /Only PDF documents \(\.pdf\) are permitted/);
    }
  });

  it('Generates collision-resistant, sanitized storage paths', () => {
    const path1 = generateStoragePath('notes', 'My Notes & Summary (2026).pdf');
    const path2 = generateStoragePath('notes', 'My Notes & Summary (2026).pdf');

    assert.ok(path1.startsWith('notes/'), 'Must prefix with bucket subfolder');
    assert.match(path1, /my-notes-summary-2026-\.pdf$/, 'Must sanitize spaces and special characters');
    assert.notEqual(path1, path2, 'Must generate unique paths for identical filenames');
  });

  it('Formats bytes cleanly across magnitude ranges', () => {
    assert.equal(formatBytes(0), '0 Bytes');
    assert.equal(formatBytes(1024), '1 KB');
    assert.equal(formatBytes(1.5 * 1024 * 1024), '1.5 MB');
    assert.equal(formatBytes(25 * 1024 * 1024), '25 MB');
  });
});

// -----------------------------------------------------------------------------
// Test Suite 3: Assessment Authoring & JSON Bulk Import Validator (v1)
// -----------------------------------------------------------------------------
describe('Suite 3: Assessment Authoring & JSON Bulk Import Validator (v1)', () => {
  const validPayload = {
    schemaVersion: 1,
    assessment: {
      title: 'Operating Systems & Concurrency',
      description: 'Threads, mutexes, condition variables, and deadlock detection.',
      subject: 'Computer Science',
      module: 'Systems',
      duration_minutes: 30,
      difficulty: 'Medium',
      type: 'Practice Quiz',
      status: 'available',
      pass_percentage: 50,
    },
    questions: [
      {
        question_text: 'Which condition is NOT required for a deadlock to occur?',
        options: [
          { id: 'opt_a', text: 'Mutual exclusion' },
          { id: 'opt_b', text: 'Hold and wait' },
          { id: 'opt_c', text: 'Preemption allowed' },
          { id: 'opt_d', text: 'Circular wait' },
        ],
        correct_answer_id: 'opt_c',
        explanation: 'Deadlock requires NO preemption; allowing preemption prevents deadlocks.',
        marks: 4,
        negative_marks: 1,
      },
      {
        question_text: 'What primitive is used to coordinate thread execution using signal and wait?',
        options: [
          { id: 's1', text: 'Semaphore' },
          { id: 's2', text: 'Spinlock' },
        ],
        correct_answer_id: 's1',
        explanation: 'Semaphores use wait and signal primitives.',
      },
    ],
  };

  it('Validates a compliant v1 JSON payload successfully', () => {
    const res = validateJsonImport(JSON.stringify(validPayload));
    assert.equal(res.isValid, true);
    assert.equal(res.errors.length, 0);
    assert.equal(res.questionCount, 2);
    assert.equal(res.payload.assessment.title, 'Operating Systems & Concurrency');
  });

  it('Rejects invalid JSON syntax', () => {
    const res = validateJsonImport('{ schemaVersion: 1, broken json }');
    assert.equal(res.isValid, false);
    assert.match(res.errors[0], /JSON Syntax Error/);
  });

  it('Rejects missing or unsupported schemaVersion', () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    payload.schemaVersion = 2;
    const res = validateJsonImport(payload);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.includes('Unsupported or missing "schemaVersion"')));
  });

  it('Rejects missing assessment metadata or title', () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    delete payload.assessment.title;
    const res = validateJsonImport(payload);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.includes('Assessment "title" is required.')));
  });

  it('Rejects empty questions list', () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    payload.questions = [];
    const res = validateJsonImport(payload);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.includes('at least 1 question')));
  });

  it('Rejects questions with fewer than 2 options', () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    payload.questions[0].options = [{ id: 'opt_a', text: 'Only one option' }];
    const res = validateJsonImport(payload);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.includes('Must provide at least 2 options')));
  });

  it('Rejects duplicate option IDs within a question', () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    payload.questions[0].options = [
      { id: 'dup_id', text: 'Option 1' },
      { id: 'dup_id', text: 'Option 2' },
    ];
    payload.questions[0].correct_answer_id = 'dup_id';
    const res = validateJsonImport(payload);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.includes('Duplicate option ID "dup_id"')));
  });

  it('Rejects question where correct_answer_id does not match any option ID', () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    payload.questions[0].correct_answer_id = 'non_existent_opt';
    const res = validateJsonImport(payload);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.includes('does not match any provided option ID')));
  });
});

// -----------------------------------------------------------------------------
// Test Suite 4: Student Directory & Batch Import Validator
// -----------------------------------------------------------------------------
describe('Suite 4: Student Directory & Batch Import Validator', () => {
  const validBatch = [
    { full_name: 'Aarav Sharma', email: 'aarav@campus.edu', department: 'Computer Science', access_category: 'standard' },
    { full_name: 'Diya Patel', email: 'diya@campus.edu', department: 'Electrical Engineering', access_category: 'pro' },
  ];

  it('Accepts valid array of student records', () => {
    const res = validateStudentJsonImport(validBatch);
    assert.equal(res.isValid, true);
    assert.equal(res.validCount, 2);
    assert.equal(res.errors.length, 0);
    assert.equal(res.validRows[0].email, 'aarav@campus.edu');
  });

  it('Accepts wrapper object with { students: [...] }', () => {
    const res = validateStudentJsonImport({ students: validBatch });
    assert.equal(res.isValid, true);
    assert.equal(res.validCount, 2);
  });

  it('Normalizes and trims names and emails', () => {
    const batch = [{ full_name: '  Karan Mehta  ', email: '  KARAN@CAMPUS.EDU  ' }];
    const res = validateStudentJsonImport(batch);
    assert.equal(res.isValid, true);
    assert.equal(res.validRows[0].full_name, 'Karan Mehta');
    assert.equal(res.validRows[0].email, 'karan@campus.edu');
  });

  it('Rejects duplicate emails in the import payload', () => {
    const batch = [
      { full_name: 'Student One', email: 'dup@campus.edu' },
      { full_name: 'Student Two', email: 'dup@campus.edu' },
    ];
    const res = validateStudentJsonImport(batch);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.includes('Duplicate email "dup@campus.edu"')));
  });

  it('Flags missing names and malformed email addresses', () => {
    const batch = [
      { full_name: '', email: 'valid@campus.edu' },
      { full_name: 'Valid Name', email: 'not-an-email' },
    ];
    const res = validateStudentJsonImport(batch);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.includes('"full_name" is required')));
    assert.ok(res.errors.some(e => e.includes('Invalid email format')));
  });
});

// -----------------------------------------------------------------------------
// Test Suite 5: YouTube URL Parser & Embed Validator
// -----------------------------------------------------------------------------
describe('Suite 5: YouTube URL Parser & Embed Validator', () => {
  const expectedId = 'dQw4w9WgXcQ';

  it('Extracts ID from standard watch URL', () => {
    assert.equal(extractYouTubeId(`https://www.youtube.com/watch?v=${expectedId}`), expectedId);
    assert.equal(extractYouTubeId(`https://www.youtube.com/watch?v=${expectedId}&t=42s`), expectedId);
  });

  it('Extracts ID from short URL (youtu.be)', () => {
    assert.equal(extractYouTubeId(`https://youtu.be/${expectedId}`), expectedId);
    assert.equal(extractYouTubeId(`https://youtu.be/${expectedId}?t=10`), expectedId);
  });

  it('Extracts ID from embed URL', () => {
    assert.equal(extractYouTubeId(`https://www.youtube.com/embed/${expectedId}`), expectedId);
  });

  it('Extracts ID from YouTube Shorts URL', () => {
    assert.equal(extractYouTubeId(`https://www.youtube.com/shorts/${expectedId}`), expectedId);
  });

  it('Accepts direct 11-character video ID', () => {
    assert.equal(extractYouTubeId(expectedId), expectedId);
  });

  it('Returns null for invalid or non-YouTube URLs', () => {
    assert.equal(extractYouTubeId('https://vimeo.com/12345678'), null);
    assert.equal(extractYouTubeId('https://example.com/video.mp4'), null);
    assert.equal(extractYouTubeId('not_a_valid_id'), null);
    assert.equal(extractYouTubeId(''), null);
    assert.equal(extractYouTubeId(null), null);
  });
});

// -----------------------------------------------------------------------------
// Test Suite 6: Branded PDF Document Generator
// -----------------------------------------------------------------------------
describe('Suite 6: Branded PDF Document Generator', () => {
  const sampleAssignment = {
    title: 'Distributed Key-Value Store with Raft Consensus',
    subject: 'Distributed Systems',
    module: 'Consensus Protocols',
    problemStatement: 'Implement a replicated log with leader election and log compaction in Python or Go.',
    instructions: 'Submit GitHub repository link along with benchmark results demonstrating linearizability.',
    topics: ['Raft', 'Consensus', 'Socket I/O', 'Replication'],
    deliverables: ['Source code', 'Design doc', 'Benchmark report'],
    totalMarks: 100,
  };

  it('Generates valid binary PDF buffer with %PDF-1.4 header and %%EOF trailer', () => {
    const pdfBuf = buildAssignmentPdfBytes(sampleAssignment);
    assert.ok(Buffer.isBuffer(pdfBuf), 'Must return a Node Buffer / binary byte stream');
    const pdfString = pdfBuf.toString('binary');

    assert.ok(pdfString.startsWith('%PDF-1.4'), 'Must begin with %PDF-1.4 magic header');
    assert.ok(pdfString.includes('%%EOF'), 'Must end with %%EOF trailer marker');
    assert.ok(pdfString.includes('xref'), 'Must contain xref cross-reference table');
    assert.ok(pdfString.includes('/Catalog'), 'Must contain PDF document catalog');
    assert.ok(pdfString.includes('/Pages'), 'Must contain PDF pages tree');
  });

  it('Embeds assignment details and Yogneet Edu branding into PDF stream', () => {
    const pdfBuf = buildAssignmentPdfBytes(sampleAssignment);
    const pdfString = pdfBuf.toString('utf-8');

    assert.ok(pdfString.includes('YOGNEET EDU'), 'Must embed brand header');
    assert.ok(pdfString.includes('Distributed Systems'), 'Must embed subject');
    assert.ok(pdfString.includes('Distributed Key-Value Store with Raft Consensus'), 'Must embed title');
    assert.ok(pdfString.includes('Total Marks: 100'), 'Must embed total marks');
  });

  it('Escapes parentheses and backslashes in PDF text strings to prevent corrupt streams', () => {
    assert.equal(escapePdfText('Test (nested) [value] \\ slash'), 'Test \\(nested\\) [value] \\\\ slash');
  });
});

// -----------------------------------------------------------------------------
// Test Suite 7: Platform Analytics Calculation Engine
// -----------------------------------------------------------------------------
describe('Suite 7: Platform Analytics Calculation Engine', () => {
  const now = Date.now();
  const mockAttempts = [
    { id: '1', score: 80, percentage: 80, passed: true, created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() }, // 2 days ago
    { id: '2', score: 60, percentage: 60, passed: true, created_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString() }, // 10 days ago
    { id: '3', score: 30, percentage: 30, passed: false, created_at: new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString() }, // 40 days ago
    { id: '4', score: 95, percentage: 95, passed: true, created_at: new Date(now - 120 * 24 * 60 * 60 * 1000).toISOString() }, // 120 days ago
  ];

  it('Filters records by date range correctly (7d, 30d, 90d, all)', () => {
    assert.equal(filterByDateRange(mockAttempts, '7d').length, 1, '7d should match 1 attempt');
    assert.equal(filterByDateRange(mockAttempts, '30d').length, 2, '30d should match 2 attempts');
    assert.equal(filterByDateRange(mockAttempts, '90d').length, 3, '90d should match 3 attempts');
    assert.equal(filterByDateRange(mockAttempts, 'all').length, 4, 'all should match all 4 attempts');
  });

  it('Calculates accurate metrics for filtered attempts', () => {
    const filtered = filterByDateRange(mockAttempts, '30d');
    const total = filtered.length;
    const passed = filtered.filter(a => a.passed).length;
    const avgScore = Math.round(filtered.reduce((sum, a) => sum + a.score, 0) / total);
    const passRate = Math.round((passed / total) * 100);

    assert.equal(total, 2);
    assert.equal(passed, 2);
    assert.equal(avgScore, 70); // (80 + 60) / 2
    assert.equal(passRate, 100);
  });
});

// -----------------------------------------------------------------------------
// Test Suite 8: Security Invariants & Client Bundle Protection
// -----------------------------------------------------------------------------
describe('Suite 8: Security Invariants & Client Bundle Protection', () => {
  it('Production host constant acmhdklihpqzurzuthkw.supabase.co is strictly barred from client code', () => {
    const srcDir = path.resolve(process.cwd(), 'src');
    const files = [];

    function walkDir(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push(fullPath);
        }
      }
    }
    walkDir(srcDir);

    for (const f of files) {
      const code = fs.readFileSync(f, 'utf-8');
      assert.ok(
        !code.includes('SUPABASE_SERVICE_ROLE_KEY'),
        `Forbidden SUPABASE_SERVICE_ROLE_KEY found in frontend file: ${f}`
      );
      assert.ok(
        !code.includes('acmhdklihpqzurzuthkw.supabase.co'),
        `Hardcoded production URL found in frontend file: ${f}`
      );
    }
  });

  it('Phase 3B assessment security functions remain untouched in migration history', () => {
    const phase3bMigration = path.resolve(
      process.cwd(),
      'supabase',
      'migrations',
      '20261027000004_remediate_assessment_permissions.sql'
    );
    assert.ok(fs.existsSync(phase3bMigration), '20261027000004 migration must remain intact');
    const sql = fs.readFileSync(phase3bMigration, 'utf-8');
    assert.ok(sql.includes('public.get_assessment_questions_for_taking'), 'Must preserve question stripping function');
    assert.ok(sql.includes('public.submit_assessment_attempt'), 'Must preserve server-side scoring function');
  });
});
