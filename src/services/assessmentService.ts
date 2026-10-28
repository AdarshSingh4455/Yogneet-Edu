import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabaseClient';
import { ApiService } from './api';
import { AssessmentQuestion, TestAttemptResult, QuestionStatus, QuestionOption } from '../types';
import { Database } from '../types/database.types';

type QuestionRow = Database['public']['Tables']['assessment_questions']['Row'];
type AttemptRow = Database['public']['Tables']['assessment_attempts']['Row'];

interface SanitizedQuestionRpcRow {
  id: string;
  test_id: string;
  question_number: number;
  text: string;
  code_snippet: string | null;
  code_language: string | null;
  options: unknown;
  marks: number;
  negative_marks: number;
}

interface SubmitAttemptRpcResult {
  attempt_id: string;
  test_id: string;
  score_obtained: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  correct_count: number;
  incorrect_count: number;
  answered_count: number;
  unanswered_count: number;
}

export interface AssessmentAttemptResult extends TestAttemptResult {
  isVerified?: boolean;
  isDemo?: boolean;
}

/**
 * Returns mock questions with solutions withheld to mirror secure production behavior.
 */
function getSanitizedMockQuestions(testId: string): AssessmentQuestion[] {
  const mockQuestions = ApiService.getTestQuestions(testId);
  return mockQuestions.map(q => ({
    ...q,
    correctAnswerId: '',
    explanation: '',
  }));
}

/**
 * Calculates deterministic score locally for offline or prototype persona mode.
 */
function submitMockLocally(
  testId: string,
  timeSpentSeconds: number,
  userAnswers: Record<string, string>,
  questionStatuses: Record<string, QuestionStatus>
): AssessmentAttemptResult {
  const test = ApiService.getTestById(testId);
  const mockQuestions = ApiService.getTestQuestions(testId);
  let scoreObtained = 0;
  let maxScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;

  mockQuestions.forEach(q => {
    maxScore += q.marks;
    const selected = userAnswers[q.id];
    if (selected) {
      if (selected === q.correctAnswerId) {
        scoreObtained += q.marks;
        correctCount++;
      } else {
        scoreObtained -= q.negativeMarks;
        incorrectCount++;
      }
    }
  });

  scoreObtained = Math.max(0, scoreObtained);
  const percentage = maxScore > 0 ? Math.round((scoreObtained / maxScore) * 100) : 0;
  const passed = percentage >= (test?.passPercentage || 70);
  const answeredCount = Object.keys(userAnswers).length;
  const unansweredCount = mockQuestions.length - answeredCount;
  const markedCount = Object.values(questionStatuses).filter(
    s => s === 'marked' || s === 'marked_answered'
  ).length;

  const result: AssessmentAttemptResult = {
    attemptId: `demo_att_${Date.now()}`,
    testId: test?.id || testId,
    testTitle: test?.title || 'Assessment',
    subject: test?.subject || 'Technical Assessment',
    submittedAt: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    timeSpentSeconds,
    totalQuestions: mockQuestions.length,
    answeredCount,
    unansweredCount,
    markedCount,
    correctCount,
    incorrectCount,
    scoreObtained,
    maxScore,
    percentage,
    passed,
    userAnswers,
    questionStatuses,
    isVerified: false,
    isDemo: true,
  };

  ApiService.submitTestAttempt(result);
  return result;
}

export const AssessmentService = {
  /**
   * Fetches sanitized assessment questions for active test-taking.
   * In Supabase mode with an active session, calls the get_assessment_questions_for_taking RPC
   * which strictly strips correct_answer_id and explanation at the PostgreSQL level.
   * If unauthenticated or in prototype/mock mode, returns mock questions with solutions withheld.
   */
  async getQuestionsForTaking(testId: string): Promise<AssessmentQuestion[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return getSanitizedMockQuestions(testId);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Prototype / Demo persona mode without active Supabase session
        return getSanitizedMockQuestions(testId);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_assessment_questions_for_taking', {
        p_test_id: testId,
      });

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      const rows = (data as SanitizedQuestionRpcRow[]) || [];
      if (rows.length === 0) {
        // If not found in database (e.g. test not yet seeded), check mock tests
        const mockQuestions = ApiService.getTestQuestions(testId);
        if (mockQuestions && mockQuestions.length > 0) {
          return getSanitizedMockQuestions(testId);
        }
      }

      return rows.map(r => ({
        id: r.id,
        testId: r.test_id,
        questionNumber: r.question_number,
        text: r.text,
        codeSnippet: r.code_snippet ?? undefined,
        codeLanguage: r.code_language ?? undefined,
        options: (r.options as unknown as QuestionOption[]) || [],
        correctAnswerId: '', // Withheld during examination
        explanation: '',      // Withheld during examination
        marks: Number(r.marks),
        negativeMarks: Number(r.negative_marks),
      }));
    } catch (err) {
      console.error('[AssessmentService.getQuestionsForTaking] Error fetching questions:', err);
      throw err;
    }
  },

  /**
   * Submits student answers to the server-authoritative scoring engine.
   * In Supabase mode with an active session, calls the submit_assessment_attempt RPC
   * where score, pass/fail, and metrics are deterministically computed and persisted on PostgreSQL.
   * In local-mock mode or if the test is mock-only, securely falls back to local scoring.
   */
  async submitAttempt(
    testId: string,
    timeSpentSeconds: number,
    userAnswers: Record<string, string>,
    questionStatuses: Record<string, QuestionStatus>
  ): Promise<AssessmentAttemptResult> {
    const test = ApiService.getTestById(testId);

    if (!isSupabaseConfigured() || !supabase) {
      return submitMockLocally(testId, timeSpentSeconds, userAnswers, questionStatuses);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Prototype / Demo persona mode without active Supabase session
        return submitMockLocally(testId, timeSpentSeconds, userAnswers, questionStatuses);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('submit_assessment_attempt', {
        p_test_id: testId,
        p_time_spent_seconds: timeSpentSeconds,
        p_user_answers: userAnswers,
        p_question_statuses: questionStatuses,
      });

      if (error) {
        // If the assessment is not seeded in Supabase database, fall back to mock scoring gracefully
        if (error.message && error.message.includes('Assessment not found')) {
          console.warn('[AssessmentService.submitAttempt] Test not in Supabase, using mock scoring:', testId);
          return submitMockLocally(testId, timeSpentSeconds, userAnswers, questionStatuses);
        }
        throw new Error(formatSupabaseError(error));
      }

      const res = data as SubmitAttemptRpcResult;

      const result: AssessmentAttemptResult = {
        attemptId: res.attempt_id,
        testId: res.test_id,
        testTitle: test?.title || 'Assessment',
        subject: test?.subject || 'Technical Assessment',
        submittedAt: 'Just now',
        timeSpentSeconds,
        totalQuestions: res.answered_count + res.unanswered_count,
        answeredCount: res.answered_count,
        unansweredCount: res.unanswered_count,
        markedCount: Object.values(questionStatuses).filter(s => s === 'marked' || s === 'marked_answered').length,
        correctCount: res.correct_count,
        incorrectCount: res.incorrect_count,
        scoreObtained: res.score_obtained,
        maxScore: res.max_score,
        percentage: res.percentage,
        passed: res.passed,
        userAnswers,
        questionStatuses,
        isVerified: true,
        isDemo: false,
      };

      // Keep local state in sync
      ApiService.submitTestAttempt(result);
      return result;
    } catch (err) {
      console.error('[AssessmentService.submitAttempt] Error submitting attempt:', err);
      throw err;
    }
  },

  /**
   * Fetches full assessment questions with solutions and explanations for post-test review.
   * In Supabase mode, queries the base assessment_questions table, which RLS permits
   * only after an attempt record exists for the authenticated student.
   */
  async getQuestionsForReview(testId: string): Promise<AssessmentQuestion[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return ApiService.getTestQuestions(testId);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return ApiService.getTestQuestions(testId);
      }

      const { data, error } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('test_id', testId)
        .order('question_number');

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      const rows = (data as unknown as QuestionRow[]) || [];
      if (rows.length === 0) {
        return ApiService.getTestQuestions(testId);
      }

      return rows.map(r => ({
        id: r.id,
        testId: r.test_id,
        questionNumber: r.question_number,
        text: r.text,
        codeSnippet: r.code_snippet ?? undefined,
        codeLanguage: r.code_language ?? undefined,
        options: (r.options as unknown as QuestionOption[]) || [],
        correctAnswerId: r.correct_answer_id,
        explanation: r.explanation,
        marks: Number(r.marks),
        negativeMarks: Number(r.negative_marks),
      }));
    } catch (err) {
      console.error('[AssessmentService.getQuestionsForReview] Error fetching solutions:', err);
      throw err;
    }
  },

  /**
   * Retrieves the latest submitted attempt for a test.
   */
  async getLatestAttempt(testId: string): Promise<TestAttemptResult | undefined> {
    if (!isSupabaseConfigured() || !supabase) {
      return ApiService.getLatestAttempt(testId);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return ApiService.getLatestAttempt(testId);
      }

      const { data, error } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('test_id', testId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      if (!data) {
        return ApiService.getLatestAttempt(testId);
      }

      const row = data as unknown as AttemptRow;
      const test = ApiService.getTestById(testId);
      return {
        attemptId: row.attempt_id,
        testId: row.test_id,
        testTitle: test?.title || 'Assessment',
        subject: test?.subject || 'Technical Assessment',
        submittedAt: new Date(row.submitted_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        timeSpentSeconds: row.time_spent_seconds,
        totalQuestions: row.total_questions,
        answeredCount: row.answered_count,
        unansweredCount: row.unanswered_count,
        markedCount: row.marked_count,
        correctCount: row.correct_count,
        incorrectCount: row.incorrect_count,
        scoreObtained: Number(row.score_obtained),
        maxScore: Number(row.max_score),
        percentage: Number(row.percentage),
        passed: row.passed,
        userAnswers: (row.user_answers as Record<string, string>) || {},
        questionStatuses: (row.question_statuses as Record<string, QuestionStatus>) || {},
      };
    } catch (err) {
      console.error('[AssessmentService.getLatestAttempt] Error fetching attempt:', err);
      return ApiService.getLatestAttempt(testId);
    }
  },
};
