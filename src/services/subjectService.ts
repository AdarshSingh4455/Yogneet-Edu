/**
 * Subject Management Service (Phase 2 Secure Backend Integration).
 *
 * Persistently manages curriculum subjects in Supabase `public.subjects` table,
 * maps content counts across videos, notes, assignments, assessments, and tests,
 * and maintains reactive local state with preview fallback.
 */

import {
  Subject,
  CreateSubjectInput,
  UpdateSubjectInput,
} from '../types';
import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabaseClient';
import { Database } from '../types/database.types';

type SubjectRow = Database['public']['Tables']['subjects']['Row'];

const STORAGE_KEY = 'yogneet_subjects_v2';

export const INITIAL_PREVIEW_SUBJECTS: Subject[] = [
  {
    id: 'subj_python',
    name: 'Python Programming',
    slug: 'python-programming',
    description: 'Core runtime internals, object-oriented design, async concurrency, and high-performance backend development.',
    icon: 'Code',
    displayOrder: 1,
    isActive: true,
    colorScheme: 'cyan',
    contentCounts: {
      videos: 8,
      notes: 14,
      assignments: 5,
      assessments: 6,
      testSeries: 8,
    },
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-10-10T00:00:00Z',
  },
  {
    id: 'subj_dbms',
    name: 'Database Management Systems',
    slug: 'dbms',
    description: 'Relational database theory, ANSI SQL mastery, query planning, B-Tree indexing, transactions, and ACID concurrency.',
    icon: 'Database',
    displayOrder: 2,
    isActive: true,
    colorScheme: 'purple',
    contentCounts: {
      videos: 6,
      notes: 9,
      assignments: 4,
      assessments: 5,
      testSeries: 6,
    },
    createdAt: '2025-01-20T00:00:00Z',
    updatedAt: '2025-09-18T00:00:00Z',
  },
  {
    id: 'subj_webdev',
    name: 'Full-Stack Web Development',
    slug: 'web-development',
    description: 'React, TypeScript, Vite, Tailwind CSS, RESTful API design, and scalable client-server microservices.',
    icon: 'Globe',
    displayOrder: 3,
    isActive: true,
    colorScheme: 'blue',
    contentCounts: {
      videos: 10,
      notes: 12,
      assignments: 6,
      assessments: 4,
      testSeries: 5,
    },
    createdAt: '2025-02-01T00:00:00Z',
    updatedAt: '2025-10-25T00:00:00Z',
  },
  {
    id: 'subj_ai',
    name: 'Artificial Intelligence & ML',
    slug: 'artificial-intelligence',
    description: 'Mathematical foundations, linear regression to deep neural architectures, transformer models, and prompt engineering.',
    icon: 'Brain',
    displayOrder: 4,
    isActive: true,
    colorScheme: 'emerald',
    contentCounts: {
      videos: 5,
      notes: 8,
      assignments: 3,
      assessments: 4,
      testSeries: 4,
    },
    createdAt: '2025-02-15T00:00:00Z',
    updatedAt: '2025-10-01T00:00:00Z',
  },
  {
    id: 'subj_dsa',
    name: 'Data Structures & Algorithms',
    slug: 'dsa',
    description: 'Algorithmic complexity, non-linear structures, graphs, dynamic programming, and FAANG interview patterns.',
    icon: 'Cpu',
    displayOrder: 5,
    isActive: true,
    colorScheme: 'amber',
    contentCounts: {
      videos: 12,
      notes: 15,
      assignments: 8,
      assessments: 7,
      testSeries: 9,
    },
    createdAt: '2025-02-20T00:00:00Z',
    updatedAt: '2025-10-28T00:00:00Z',
  },
];

function loadStoredSubjects(): Subject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...INITIAL_PREVIEW_SUBJECTS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...INITIAL_PREVIEW_SUBJECTS];
  } catch (e) {
    console.warn('[SubjectService] Falling back to default preview subjects', e);
    return [...INITIAL_PREVIEW_SUBJECTS];
  }
}

function saveStoredSubjects(subjects: Subject[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
  } catch (e) {
    console.error('[SubjectService] Failed to persist subjects to localStorage', e);
  }
}

let subjectsCache: Subject[] = loadStoredSubjects();

function mapRowToSubject(row: SubjectRow, existingCounts?: Subject['contentCounts']): Subject {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    icon: row.icon || 'BookOpen',
    displayOrder: row.display_order,
    isActive: row.is_active,
    colorScheme: row.color_scheme || 'blue',
    contentCounts: existingCounts || {
      videos: 0,
      notes: 0,
      assignments: 0,
      assessments: 0,
      testSeries: 0,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function aggregateContentCounts(subjectIds: string[]): Promise<Record<string, Subject['contentCounts']>> {
  const result: Record<string, Subject['contentCounts']> = {};
  for (const id of subjectIds) {
    result[id] = { videos: 0, notes: 0, assignments: 0, assessments: 0, testSeries: 0 };
  }

  if (!isSupabaseConfigured() || !supabase || subjectIds.length === 0) return result;

  try {
    const [videosRes, notesRes, asmtRes, assignRes] = await Promise.all([
      supabase.from('video_lessons').select('subject_id'),
      supabase.from('study_notes').select('subject_id'),
      supabase.from('assessments').select('subject_id'),
      supabase.from('practical_assignments').select('subject_id'),
    ]);

    if (videosRes.data) {
      for (const row of videosRes.data as Array<{ subject_id: string | null }>) {
        if (row.subject_id && result[row.subject_id]) result[row.subject_id].videos++;
      }
    }
    if (notesRes.data) {
      for (const row of notesRes.data as Array<{ subject_id: string | null }>) {
        if (row.subject_id && result[row.subject_id]) result[row.subject_id].notes++;
      }
    }
    if (asmtRes.data) {
      for (const row of asmtRes.data as Array<{ subject_id: string | null }>) {
        if (row.subject_id && result[row.subject_id]) {
          result[row.subject_id].assessments++;
          result[row.subject_id].testSeries++;
        }
      }
    }
    if (assignRes.data) {
      for (const row of assignRes.data as Array<{ subject_id: string | null }>) {
        if (row.subject_id && result[row.subject_id]) result[row.subject_id].assignments++;
      }
    }
  } catch (e) {
    console.warn('[SubjectService] Could not aggregate live content counts', e);
  }

  return result;
}

export const SubjectService = {
  /**
   * Retrieves all subjects (active and inactive), ordered by displayOrder.
   */
  async getSubjects(): Promise<Subject[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          const rows = data as any[];
          const countsMap = await aggregateContentCounts(rows.map(d => d.id));
          const mapped = rows.map(row => {
            const cachedMatch = subjectsCache.find(c => c.id === row.id);
            const counts = countsMap[row.id] || cachedMatch?.contentCounts;
            return mapRowToSubject(row, counts);
          });
          subjectsCache = mapped;
          saveStoredSubjects(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[SubjectService] Supabase fetch failed, using cached subjects', err);
      }
    }

    return [...subjectsCache].sort((a, b) => a.displayOrder - b.displayOrder);
  },

  /**
   * Synchronous accessor for fast rendering.
   */
  getSubjectsSync(): Subject[] {
    return [...subjectsCache].sort((a, b) => a.displayOrder - b.displayOrder);
  },

  /**
   * Retrieves only active subjects for student-facing navigation.
   */
  async getActiveSubjects(): Promise<Subject[]> {
    const all = await this.getSubjects();
    return all.filter(s => s.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
  },

  /**
   * Synchronous accessor for active subjects.
   */
  getActiveSubjectsSync(): Subject[] {
    return subjectsCache
      .filter(s => s.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },

  /**
   * Finds a subject by ID or slug.
   */
  async getSubjectById(idOrSlug: string): Promise<Subject | null> {
    const all = await this.getSubjects();
    const found = all.find(s => s.id === idOrSlug || s.slug === idOrSlug);
    return found ? { ...found } : null;
  },

  /**
   * Creates a new subject.
   */
  async createSubject(input: CreateSubjectInput): Promise<Subject> {
    if (!input.name || !input.name.trim()) {
      throw new Error('Subject name is required.');
    }

    const trimmedName = input.name.trim();
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const subjectId = `subj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const displayOrder = Number(input.displayOrder) || subjectsCache.length + 1;
    const isActive = input.isActive ?? true;
    const colorScheme = input.colorScheme || 'blue';
    const icon = input.icon || 'BookOpen';
    const description = input.description?.trim() || '';

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await (supabase as any)
        .from('subjects')
        .insert({
          id: subjectId,
          name: trimmedName,
          slug,
          description,
          icon,
          display_order: displayOrder,
          is_active: isActive,
          color_scheme: colorScheme,
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      const created = mapRowToSubject(data);
      subjectsCache = [...subjectsCache, created];
      saveStoredSubjects(subjectsCache);
      return created;
    }

    const fallbackSubject: Subject = {
      id: subjectId,
      name: trimmedName,
      slug,
      description,
      icon,
      displayOrder,
      isActive,
      colorScheme,
      contentCounts: {
        videos: 0,
        notes: 0,
        assignments: 0,
        assessments: 0,
        testSeries: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    subjectsCache = [...subjectsCache, fallbackSubject];
    saveStoredSubjects(subjectsCache);
    return fallbackSubject;
  },

  /**
   * Updates an existing subject.
   */
  async updateSubject(id: string, input: UpdateSubjectInput): Promise<Subject> {
    const index = subjectsCache.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error(`Subject with ID "${id}" was not found.`);
    }

    const current = subjectsCache[index];
    const updatedName = input.name !== undefined ? input.name.trim() : current.name;
    const updatedSlug = input.name ? input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : current.slug;
    const updatedDesc = input.description !== undefined ? input.description.trim() : current.description;
    const updatedIcon = input.icon !== undefined ? input.icon : current.icon;
    const updatedOrder = input.displayOrder !== undefined ? Number(input.displayOrder) : current.displayOrder;
    const updatedActive = input.isActive !== undefined ? input.isActive : current.isActive;
    const updatedColor = input.colorScheme !== undefined ? input.colorScheme : current.colorScheme;

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await (supabase as any)
        .from('subjects')
        .update({
          name: updatedName,
          slug: updatedSlug,
          description: updatedDesc,
          icon: updatedIcon,
          display_order: updatedOrder,
          is_active: updatedActive,
          color_scheme: updatedColor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      const updated = mapRowToSubject(data, current.contentCounts);
      subjectsCache[index] = updated;
      saveStoredSubjects(subjectsCache);
      return updated;
    }

    const updatedLocal: Subject = {
      ...current,
      name: updatedName,
      slug: updatedSlug,
      description: updatedDesc,
      icon: updatedIcon,
      displayOrder: updatedOrder,
      isActive: updatedActive,
      colorScheme: updatedColor,
      updatedAt: new Date().toISOString(),
    };

    subjectsCache[index] = updatedLocal;
    saveStoredSubjects(subjectsCache);
    return updatedLocal;
  },

  /**
   * Toggles the active status of a subject.
   */
  async toggleSubjectStatus(id: string): Promise<Subject> {
    const subject = subjectsCache.find(s => s.id === id);
    if (!subject) throw new Error('Subject not found');
    return this.updateSubject(id, { isActive: !subject.isActive });
  },

  /**
   * Deletes a subject with dependency checks.
   */
  async deleteSubject(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(formatSupabaseError(error));
      }
    }

    const initialLen = subjectsCache.length;
    subjectsCache = subjectsCache.filter(s => s.id !== id);
    if (subjectsCache.length !== initialLen) {
      saveStoredSubjects(subjectsCache);
      return true;
    }
    return false;
  },

  /**
   * Resets preview state back to initial fixtures.
   */
  async resetToDefaults(): Promise<Subject[]> {
    subjectsCache = [...INITIAL_PREVIEW_SUBJECTS];
    saveStoredSubjects(subjectsCache);
    return subjectsCache;
  },
};
