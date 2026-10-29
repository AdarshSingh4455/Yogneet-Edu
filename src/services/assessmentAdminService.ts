/**
 * Assessment Administration Service for Yogneet Edu.
 * Handles staff/admin assessment creation, editing, manual question authoring,
 * atomic database creation via PostgreSQL RPC, and validated JSON bulk imports.
 */

import {
  TestSeriesItem,
  AssessmentQuestion,
  DifficultyLevel,
  TestType,
  UserProfile,
  AssessmentImportPayload,
  AssessmentImportQuestion,
} from '../types';
import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabaseClient';
import { ApiService, AuditService } from './api';
import { Database } from '../types/database.types';

type AssessmentRow = Database['public']['Tables']['assessments']['Row'];
type QuestionRow = Database['public']['Tables']['assessment_questions']['Row'];

export interface CreateAssessmentInput {
  id?: string;
  title: string;
  description: string;
  subject: string;
  module: string;
  durationMinutes: number;
  difficulty: DifficultyLevel;
  type: TestType;
  status: 'available' | 'upcoming' | 'completed';
  passPercentage: number;
  tags?: string[];
}

export interface QuestionDraft {
  id?: string;
  text: string;
  codeSnippet?: string;
  codeLanguage?: string;
  options: Array<{ id: string; text: string }>;
  correctAnswerId: string;
  explanation: string;
  marks: number;
  negativeMarks: number;
}

export interface JsonValidationResult {
  isValid: boolean;
  errors: string[];
  payload?: AssessmentImportPayload;
  questionCount?: number;
}

function rowToTestItem(row: AssessmentRow, attemptStats?: { attempts: number; best: number }): TestSeriesItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    subject: row.subject,
    module: row.module,
    questionCount: row.question_count,
    durationMinutes: row.duration_minutes,
    difficulty: row.difficulty as DifficultyLevel,
    type: row.type as TestType,
    status: row.status as 'available' | 'upcoming' | 'completed',
    passPercentage: Number(row.pass_percentage),
    attemptCount: attemptStats?.attempts || 0,
    bestScore: attemptStats?.best,
    tags: row.tags || [],
  };
}

export const AssessmentAdminService = {
  /**
   * Retrieves all assessments from Supabase or fallback mock.
   */
  async getAssessments(statusFilter?: string): Promise<TestSeriesItem[]> {
    if (!isSupabaseConfigured() || !supabase) {
      const tests = ApiService.getTests();
      if (statusFilter) {
        return tests.filter(t => t.status === statusFilter);
      }
      return tests;
    }

    try {
      let query = supabase.from('assessments').select('*').order('created_at', { ascending: false });
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw new Error(formatSupabaseError(error));

      const rows = (data as AssessmentRow[]) || [];
      return rows.map(r => rowToTestItem(r));
    } catch (err) {
      console.error('[AssessmentAdminService.getAssessments] Error, falling back to local:', err);
      return ApiService.getTests();
    }
  },

  /**
   * Retrieves a single assessment and its full question set (staff only).
   */
  async getAssessmentWithQuestions(testId: string): Promise<{ assessment: TestSeriesItem; questions: AssessmentQuestion[] } | null> {
    if (!isSupabaseConfigured() || !supabase) {
      const test = ApiService.getTestById(testId);
      if (!test) return null;
      const questions = ApiService.getTestQuestions(testId);
      return { assessment: test, questions };
    }

    try {
      const { data: testRow, error: testErr } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', testId)
        .single();
      if (testErr) throw new Error(formatSupabaseError(testErr));

      const { data: qRows, error: qErr } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('test_id', testId)
        .order('question_number');
      if (qErr) throw new Error(formatSupabaseError(qErr));

      const questions: AssessmentQuestion[] = ((qRows as QuestionRow[]) || []).map(r => ({
        id: r.id,
        testId: r.test_id,
        questionNumber: r.question_number,
        text: r.text,
        codeSnippet: r.code_snippet ?? undefined,
        codeLanguage: r.code_language ?? undefined,
        options: (r.options as unknown as Array<{ id: string; text: string }>) || [],
        correctAnswerId: r.correct_answer_id,
        explanation: r.explanation,
        marks: Number(r.marks),
        negativeMarks: Number(r.negative_marks),
      }));

      return {
        assessment: rowToTestItem(testRow as AssessmentRow),
        questions,
      };
    } catch (err) {
      console.error('[AssessmentAdminService.getAssessmentWithQuestions] Error:', err);
      const test = ApiService.getTestById(testId);
      if (!test) return null;
      return { assessment: test, questions: ApiService.getTestQuestions(testId) };
    }
  },

  /**
   * Creates or updates an assessment atomically with its questions.
   * In Supabase mode, calls the security definier RPC create_assessment_with_questions.
   */
  async saveAssessmentWithQuestions(
    actor: UserProfile,
    assessment: CreateAssessmentInput,
    questions: QuestionDraft[]
  ): Promise<{ testId: string; questionCount: number }> {
    if (!assessment.title?.trim()) throw new Error('Assessment title is required.');
    if (!assessment.subject?.trim()) throw new Error('Assessment subject is required.');
    if (!questions || questions.length === 0) throw new Error('At least one question is required.');

    // Validate questions client-side
    questions.forEach((q, idx) => {
      if (!q.text?.trim()) throw new Error(`Question ${idx + 1}: Text cannot be empty.`);
      if (!q.options || q.options.length < 2) throw new Error(`Question ${idx + 1}: Must provide at least 2 options.`);
      const optIds = new Set(q.options.map(o => o.id));
      if (!optIds.has(q.correctAnswerId)) {
        throw new Error(`Question ${idx + 1}: Correct answer "${q.correctAnswerId}" must match one of the option IDs.`);
      }
      q.options.forEach((opt, oIdx) => {
        if (!opt.text?.trim()) throw new Error(`Question ${idx + 1}, Option ${oIdx + 1}: Option text cannot be empty.`);
      });
    });

    const testId = assessment.id || `test_${assessment.subject.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

    if (!isSupabaseConfigured() || !supabase) {
      // Local Mock fallback
      const newItem: TestSeriesItem = {
        id: testId,
        title: assessment.title.trim(),
        description: assessment.description.trim(),
        subject: assessment.subject.trim(),
        module: assessment.module.trim() || 'Core',
        durationMinutes: assessment.durationMinutes || 30,
        questionCount: questions.length,
        difficulty: assessment.difficulty,
        type: assessment.type,
        status: assessment.status,
        passPercentage: assessment.passPercentage,
        attemptCount: 0,
        tags: assessment.tags || [assessment.subject.trim()],
      };

      // Add to local mock storage
      const currentTests = ApiService.getTests();
      const existingIdx = currentTests.findIndex(t => t.id === testId);
      if (existingIdx >= 0) {
        currentTests[existingIdx] = newItem;
      } else {
        currentTests.unshift(newItem);
      }
      localStorage.setItem('yogneet_tests', JSON.stringify(currentTests));

      AuditService.log(
        actor,
        'tests.create',
        'TestSeries',
        testId,
        `Created/Updated assessment "${newItem.title}" with ${questions.length} questions (Demo Mode).`,
        'SUCCESS'
      );

      return { testId, questionCount: questions.length };
    }

    try {
      const assessmentPayload = {
        id: testId,
        title: assessment.title.trim(),
        description: assessment.description.trim(),
        subject: assessment.subject.trim(),
        module: assessment.module.trim() || 'General',
        duration_minutes: assessment.durationMinutes || 30,
        difficulty: assessment.difficulty,
        type: assessment.type,
        status: assessment.status,
        pass_percentage: assessment.passPercentage,
        tags: assessment.tags || [assessment.subject.trim()],
      };

      const questionsPayload = questions.map((q, idx) => ({
        id: q.id || `${testId}_q${idx + 1}`,
        question_number: idx + 1,
        text: q.text.trim(),
        code_snippet: q.codeSnippet?.trim() || null,
        code_language: q.codeLanguage?.trim() || null,
        options: q.options.map(o => ({ id: o.id, text: o.text.trim() })),
        correct_answer_id: q.correctAnswerId,
        explanation: q.explanation?.trim() || '',
        marks: q.marks || 4,
        negative_marks: q.negativeMarks ?? 1,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('create_assessment_with_questions', {
        p_assessment: assessmentPayload,
        p_questions: questionsPayload,
      });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      AuditService.log(
        actor,
        'tests.create',
        'TestSeries',
        testId,
        `Created/Updated assessment "${assessment.title}" with ${questions.length} questions in Supabase.`,
        'SUCCESS'
      );

      const res = data as { success: boolean; test_id: string; question_count: number };
      return { testId: res.test_id || testId, questionCount: res.question_count || questions.length };
    } catch (err) {
      console.error('[AssessmentAdminService.saveAssessmentWithQuestions] RPC Error:', err);
      throw err;
    }
  },

  /**
   * Updates assessment availability status.
   */
  async updateAssessmentStatus(actor: UserProfile, testId: string, status: 'available' | 'upcoming' | 'completed'): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      const tests = ApiService.getTests();
      const t = tests.find(x => x.id === testId);
      if (t) {
        t.status = status;
        localStorage.setItem('yogneet_tests', JSON.stringify(tests));
      }
      return;
    }

    try {
      const { error } = await (supabase as any).from('assessments').update({ status }).eq('id', testId);
      if (error) throw new Error(formatSupabaseError(error));

      AuditService.log(
        actor,
        'tests.publish',
        'TestSeries',
        testId,
        `Updated assessment status to "${status}".`,
        'SUCCESS'
      );
    } catch (err) {
      console.error('[AssessmentAdminService.updateAssessmentStatus] Error:', err);
      throw err;
    }
  },

  /**
   * Deletes an assessment and its cascades.
   */
  async deleteAssessment(actor: UserProfile, testId: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      const tests = ApiService.getTests().filter(t => t.id !== testId);
      localStorage.setItem('yogneet_tests', JSON.stringify(tests));
      return;
    }

    try {
      const { error } = await supabase.from('assessments').delete().eq('id', testId);
      if (error) throw new Error(formatSupabaseError(error));

      AuditService.log(
        actor,
        'tests.edit',
        'TestSeries',
        testId,
        `Deleted assessment "${testId}".`,
        'SUCCESS'
      );
    } catch (err) {
      console.error('[AssessmentAdminService.deleteAssessment] Error:', err);
      throw err;
    }
  },

  /**
   * Validates a JSON bulk import string or object against the schemaVersion 1 contract.
   */
  validateJsonImport(input: string | unknown): JsonValidationResult {
    const errors: string[] = [];
    let parsed: any;

    if (typeof input === 'string') {
      try {
        parsed = JSON.parse(input);
      } catch (err) {
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
      qs.forEach((q: AssessmentImportQuestion, idx: number) => {
        const qNum = idx + 1;
        const text = q.text || q.question_text;
        if (!text || typeof text !== 'string' || !text.trim()) {
          errors.push(`Question ${qNum}: Question text is required.`);
        }
        if (!Array.isArray(q.options) || q.options.length < 2) {
          errors.push(`Question ${qNum}: Must provide at least 2 options.`);
        } else {
          const optIds = new Set<string>();
          q.options.forEach((opt, oIdx) => {
            if (!opt.id || typeof opt.id !== 'string') {
              errors.push(`Question ${qNum}, Option ${oIdx + 1}: Option "id" is required.`);
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
      payload: parsed as AssessmentImportPayload,
      questionCount: qs.length,
    };
  },

  /**
   * Generates a documented JSON template for staff download.
   */
  generateJsonTemplate(): string {
    const template: AssessmentImportPayload = {
      schemaVersion: 1,
      assessment: {
        title: 'Modern Python Data Structures & Algorithmic Patterns',
        description: 'Comprehensive evaluation of list comprehensions, generators, dict internals, and set algebra.',
        subject: 'Python',
        module: 'Advanced Data Structures',
        duration_minutes: 25,
        difficulty: 'Medium',
        type: 'Practice Quiz',
        status: 'available',
        pass_percentage: 60,
        tags: ['python', 'algorithms', 'backend'],
      },
      questions: [
        {
          question_text: 'What is the average time complexity of searching for an element in a Python hash table (dict)?',
          options: [
            { id: 'a', text: 'O(1) average case lookup' },
            { id: 'b', text: 'O(log n) binary search lookup' },
            { id: 'c', text: 'O(n) linear scan' },
            { id: 'd', text: 'O(n log n) amortized' },
          ],
          correct_answer_id: 'a',
          explanation: 'Python dict lookups use open-addressing hash maps providing O(1) amortized average complexity.',
          marks: 4,
          negative_marks: 1,
        },
        {
          question_text: 'Which built-in Python function returns an iterator that produces tuples containing counts and values?',
          options: [
            { id: 'a', text: 'zip()' },
            { id: 'b', text: 'enumerate()' },
            { id: 'c', text: 'map()' },
            { id: 'd', text: 'filter()' },
          ],
          correct_answer_id: 'b',
          explanation: 'enumerate(iterable, start=0) yields (index, value) tuples.',
          marks: 4,
          negative_marks: 1,
        },
      ],
    };

    return JSON.stringify(template, null, 2);
  },
};
