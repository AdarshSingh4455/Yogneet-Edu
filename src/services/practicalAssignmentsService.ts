/**
 * Practical Assessments & Assignments Service for Yogneet Edu.
 * Handles rich text/markdown practical assignments, evaluation rubrics,
 * database persistence via public.practical_assignments, and branded PDF generation.
 */

import { PracticalAssignment, AssignmentRubricItem, ContentStatus, UserProfile } from '../types';
import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabaseClient';
import { AuditService } from './api';
import { downloadAssignmentPdf } from '../utils/pdfGenerator';
import { Database } from '../types/database.types';

type AssignmentRow = Database['public']['Tables']['practical_assignments']['Row'];
type AssignmentInsert = Database['public']['Tables']['practical_assignments']['Insert'];

const LOCAL_STORAGE_KEY = 'yogneet_practical_assignments';

const INITIAL_ASSIGNMENTS: PracticalAssignment[] = [
  {
    id: 'asg_py_concurrency',
    title: 'High-Concurrency Event-Loop Worker Pool Implementation',
    subject: 'Python',
    module: 'Advanced AsyncIO & Networking',
    problemStatement:
      'Design and construct a production-ready asynchronous worker pool in Python using asyncio.Queue, custom backpressure mechanisms, and graceful termination hooks. The pool must ingest bursty JSON payloads over TCP, deserialize them, execute CPU-bound transformations inside a ProcessPoolExecutor, and write deduplicated summaries to an append-only WAL file without blocking the event loop.',
    instructions:
      '1. Implement an async producer coroutine that listens on TCP port 9090.\n2. Bound the incoming buffer queue to prevent OOM errors under simulated 10k req/s traffic.\n3. Implement a consumer pool with configurable worker count.\n4. Handle SIGINT and SIGTERM gracefully: allow in-flight tasks up to 5 seconds to complete before forceful exit.\n5. Write unit tests achieving at least 85% branch coverage using pytest and pytest-asyncio.',
    topics: ['Python AsyncIO', 'Event Loops', 'ProcessPoolExecutor', 'Graceful Shutdown', 'TCP Sockets'],
    deliverables: [
      'worker_pool.py (Clean, typed source implementation)',
      'test_worker_pool.py (Comprehensive async test suite)',
      'ARCHITECTURE.md (Design choices, backpressure rationale, and benchmark results)',
    ],
    submissionRequirements: 'Submit a clean GitHub repository link or zipped archive containing all source files and test logs.',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    totalMarks: 100,
    rubric: [
      { id: 'r1', criteria: 'Non-blocking I/O Architecture & Backpressure', marks: 30, description: 'Correct usage of asyncio queues without blocking the main event loop.' },
      { id: 'r2', criteria: 'Graceful Shutdown & Signal Trapping', marks: 25, description: 'Clean cancellation of background tasks and socket closure upon termination.' },
      { id: 'r3', criteria: 'CPU-bound Process Offloading', marks: 20, description: 'Efficient IPC serialization and ProcessPoolExecutor integration.' },
      { id: 'r4', criteria: 'Test Coverage & Edge Cases', marks: 15, description: 'Mocking network stalls, queue overflow, and error handling.' },
      { id: 'r5', criteria: 'Documentation & Code Quality', marks: 10, description: 'PEP-8 compliance, comprehensive docstrings, and clear architecture writeup.' },
    ],
    status: 'published',
    authorName: 'Tech Geek Adarsh',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function getStoredAssignments(): PracticalAssignment[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse assignments from local storage', e);
  }
  return INITIAL_ASSIGNMENTS;
}

function setStoredAssignments(items: PracticalAssignment[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save assignments to local storage', e);
  }
}

function rowToAssignment(row: AssignmentRow): PracticalAssignment {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    module: row.module || 'General',
    problemStatement: row.problem_statement,
    instructions: row.instructions,
    topics: row.topics || [],
    deliverables: row.deliverables || [],
    submissionRequirements: row.submission_requirements ?? undefined,
    deadline: row.deadline ?? undefined,
    totalMarks: Number(row.total_marks),
    rubric: Array.isArray(row.rubric) ? (row.rubric as unknown as AssignmentRubricItem[]) : [],
    status: row.status as ContentStatus,
    authorId: row.author_id ?? undefined,
    authorName: row.author_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const PracticalAssignmentsService = {
  /**
   * Retrieves all practical assignments.
   */
  async getAssignments(statusFilter?: ContentStatus, isStudent = false): Promise<PracticalAssignment[]> {
    if (!isSupabaseConfigured() || !supabase) {
      let items = getStoredAssignments();
      if (isStudent) {
        items = items.filter(a => a.status === 'published');
      } else if (statusFilter) {
        items = items.filter(a => a.status === statusFilter);
      }
      return items;
    }

    try {
      let query = supabase.from('practical_assignments').select('*').order('created_at', { ascending: false });

      if (isStudent) {
        query = query.eq('status', 'published');
      } else if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw new Error(formatSupabaseError(error));

      const rows = (data as AssignmentRow[]) || [];
      return rows.map(rowToAssignment);
    } catch (err) {
      console.error('[PracticalAssignmentsService.getAssignments] Error, falling back to local:', err);
      let items = getStoredAssignments();
      if (isStudent) {
        items = items.filter(a => a.status === 'published');
      }
      return items;
    }
  },

  /**
   * Creates a new practical assignment.
   */
  async createAssignment(actor: UserProfile, assignment: Omit<PracticalAssignment, 'id' | 'createdAt' | 'updatedAt' | 'authorName'>): Promise<PracticalAssignment> {
    if (!assignment.title?.trim()) throw new Error('Assignment title is required.');
    if (!assignment.subject?.trim()) throw new Error('Subject is required.');
    if (!assignment.problemStatement?.trim()) throw new Error('Problem statement is required.');
    if (!assignment.instructions?.trim()) throw new Error('Instructions are required.');

    const id = `asg_${assignment.subject.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const now = new Date().toISOString();

    const newObj: PracticalAssignment = {
      ...assignment,
      id,
      authorName: actor.name,
      createdAt: now,
      updatedAt: now,
    };

    if (!isSupabaseConfigured() || !supabase) {
      const items = [newObj, ...getStoredAssignments()];
      setStoredAssignments(items);

      AuditService.log(
        actor,
        'content.create' as any,
        'PracticalAssignment',
        newObj.title,
        `Created practical assignment "${newObj.title}" (Local Mode).`,
        'SUCCESS'
      );
      return newObj;
    }

    try {
      const row: AssignmentInsert = {
        id,
        title: assignment.title.trim(),
        subject: assignment.subject.trim(),
        module: assignment.module?.trim() || 'Core',
        problem_statement: assignment.problemStatement.trim(),
        instructions: assignment.instructions.trim(),
        topics: assignment.topics || [],
        deliverables: assignment.deliverables || [],
        submission_requirements: assignment.submissionRequirements || null,
        deadline: assignment.deadline || null,
        total_marks: assignment.totalMarks || 100,
        rubric: assignment.rubric as any,
        status: (assignment.status as any) || 'published',
        author_name: actor.name,
      };

      const { data, error } = await (supabase as any).from('practical_assignments').insert(row).select().single();
      if (error) throw new Error(formatSupabaseError(error));

      AuditService.log(
        actor,
        'content.create' as any,
        'PracticalAssignment',
        assignment.title,
        `Created practical assignment "${assignment.title}" in Supabase.`,
        'SUCCESS'
      );

      return rowToAssignment(data as AssignmentRow);
    } catch (err) {
      console.error('[PracticalAssignmentsService.createAssignment] Error:', err);
      throw err;
    }
  },

  /**
   * Updates an assignment.
   */
  async updateAssignment(actor: UserProfile, id: string, updates: Partial<PracticalAssignment>): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      const items = getStoredAssignments();
      const idx = items.findIndex(x => x.id === id);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
        setStoredAssignments(items);
      }
      return;
    }

    try {
      const dbUpdates: Partial<AssignmentRow> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.title) dbUpdates.title = updates.title.trim();
      if (updates.subject) dbUpdates.subject = updates.subject.trim();
      if (updates.module) dbUpdates.module = updates.module.trim();
      if (updates.problemStatement) dbUpdates.problem_statement = updates.problemStatement.trim();
      if (updates.instructions) dbUpdates.instructions = updates.instructions.trim();
      if (updates.topics) dbUpdates.topics = updates.topics;
      if (updates.deliverables) dbUpdates.deliverables = updates.deliverables;
      if (updates.submissionRequirements !== undefined) dbUpdates.submission_requirements = updates.submissionRequirements;
      if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
      if (updates.totalMarks !== undefined) dbUpdates.total_marks = updates.totalMarks;
      if (updates.rubric !== undefined) dbUpdates.rubric = updates.rubric as any;
      if (updates.status !== undefined) dbUpdates.status = updates.status as any;

      const { error } = await (supabase as any).from('practical_assignments').update(dbUpdates).eq('id', id);
      if (error) throw new Error(formatSupabaseError(error));

      AuditService.log(
        actor,
        'content.edit' as any,
        'PracticalAssignment',
        id,
        `Updated practical assignment "${id}".`,
        'SUCCESS'
      );
    } catch (err) {
      console.error('[PracticalAssignmentsService.updateAssignment] Error:', err);
      throw err;
    }
  },

  /**
   * Deletes an assignment.
   */
  async deleteAssignment(actor: UserProfile, id: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      const items = getStoredAssignments().filter(x => x.id !== id);
      setStoredAssignments(items);
      return;
    }

    try {
      const { error } = await supabase.from('practical_assignments').delete().eq('id', id);
      if (error) throw new Error(formatSupabaseError(error));

      AuditService.log(
        actor,
        'content.delete' as any,
        'PracticalAssignment',
        id,
        `Deleted practical assignment "${id}".`,
        'SUCCESS'
      );
    } catch (err) {
      console.error('[PracticalAssignmentsService.deleteAssignment] Error:', err);
      throw err;
    }
  },

  /**
   * Generates and downloads a branded PDF of the assignment.
   */
  downloadPdf(assignment: PracticalAssignment): void {
    downloadAssignmentPdf(assignment);
  },
};
