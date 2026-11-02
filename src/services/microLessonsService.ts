/**
 * Micro Lessons Service (Phase 2 Secure Backend Integration).
 *
 * Persistently manages independent Micro Subjects and YouTube Shorts Micro Lessons
 * in Supabase (`public.micro_subjects` and `public.micro_lessons` tables).
 *
 * Micro Subjects remain completely decoupled from Main Academic Subjects.
 * Official YouTube embed URLs and original link preservation are strictly enforced.
 */

import {
  MicroSubject,
  MicroLesson,
  CreateMicroSubjectInput,
  UpdateMicroSubjectInput,
  CreateMicroLessonInput,
  UpdateMicroLessonInput,
} from '../types';
import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabaseClient';
import { Database } from '../types/database.types';

type MicroSubjectRow = Database['public']['Tables']['micro_subjects']['Row'];
type MicroLessonRow = Database['public']['Tables']['micro_lessons']['Row'];

const MICRO_SUBJECTS_KEY = 'yogneet_micro_subjects_v2';
const MICRO_LESSONS_KEY = 'yogneet_micro_lessons_v2';

/**
 * Robust YouTube video ID parser supporting:
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - Raw 11-char ID
 */
export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();

  // If already 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0].split('?')[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/shorts/')) {
        const id = url.pathname.split('/')[2]?.split('?')[0];
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
      if (url.pathname.startsWith('/embed/')) {
        const id = url.pathname.split('/')[2]?.split('?')[0];
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
      if (url.pathname === '/watch') {
        const v = url.searchParams.get('v');
        return v && /^[a-zA-Z0-9_-]{11}$/.test(v) ? v : null;
      }
    }
  } catch (e) {
    // URL parsing failed; test regex fallback
  }

  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match && /^[a-zA-Z0-9_-]{11}$/.test(match[1]) ? match[1] : null;
}

/**
 * Converts a video ID into the official YouTube embed URL format.
 */
export function toOfficialYouTubeEmbedUrl(youtubeId: string): string {
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://yogneetedu.in';
  return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&loop=1&playlist=${youtubeId}&enablejsapi=1&playsinline=1&modestbranding=1&rel=0&origin=${encodeURIComponent(origin)}`;
}

/**
 * Converts a video ID into the official canonical YouTube Shorts URL.
 */
export function toOriginalYouTubeShortsUrl(youtubeId: string): string {
  return `https://www.youtube.com/shorts/${youtubeId}`;
}

export const INITIAL_PREVIEW_MICRO_SUBJECTS: MicroSubject[] = [
  {
    id: 'micro_py_tricks',
    name: 'Python Quick Tricks',
    slug: 'python-quick-tricks',
    description: 'Bite-sized Python hacks, walrus operator syntax, memory generators, and one-liner algorithmic shortcuts.',
    coverImage: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=600&auto=format&fit=crop&q=80',
    displayOrder: 1,
    isActive: true,
    videoCount: 4,
    createdAt: '2025-02-10T00:00:00Z',
    updatedAt: '2025-10-14T00:00:00Z',
  },
  {
    id: 'micro_sql_shortcuts',
    name: 'SQL Shortcuts & Joins',
    slug: 'sql-shortcuts',
    description: 'Visual breakdowns of recursive CTEs, window functions (ROW_NUMBER vs DENSE_RANK), and query optimization secrets.',
    coverImage: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&auto=format&fit=crop&q=80',
    displayOrder: 2,
    isActive: true,
    videoCount: 3,
    createdAt: '2025-02-12T00:00:00Z',
    updatedAt: '2025-09-20T00:00:00Z',
  },
  {
    id: 'micro_interview_hacks',
    name: 'Interview Hacks & SDE Tips',
    slug: 'interview-hacks',
    description: 'System design interview heuristics, behavioral question framing, and how to avoid red flags in tech rounds.',
    coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
    displayOrder: 3,
    isActive: true,
    videoCount: 4,
    createdAt: '2025-02-20T00:00:00Z',
    updatedAt: '2025-10-18T00:00:00Z',
  },
  {
    id: 'micro_java_concepts',
    name: 'Java Core Concepts',
    slug: 'java-concepts',
    description: 'JVM garbage collection zones, string pool immutability, virtual threads, and synchronized locks explained simply.',
    coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
    displayOrder: 4,
    isActive: true,
    videoCount: 3,
    createdAt: '2025-03-01T00:00:00Z',
    updatedAt: '2025-09-25T00:00:00Z',
  },
  {
    id: 'micro_coding_tips',
    name: 'Coding Tips & Clean Architecture',
    slug: 'coding-tips',
    description: 'SOLID principles in under 60 seconds, Git interactive rebase secrets, and idiomatic error handling.',
    coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    displayOrder: 5,
    isActive: true,
    videoCount: 3,
    createdAt: '2025-03-05T00:00:00Z',
    updatedAt: '2025-10-22T00:00:00Z',
  },
];

export const INITIAL_PREVIEW_MICRO_LESSONS: MicroLesson[] = [
  {
    id: 'short_py_1',
    microSubjectId: 'micro_py_tricks',
    microSubjectName: 'Python Quick Tricks',
    title: 'Python Walrus Operator (:=) in 40 Seconds',
    description: 'Assign and evaluate expressions simultaneously inside while-loops and if-conditions to write cleaner, faster Python.',
    youtubeShortsUrl: 'https://www.youtube.com/shorts/bM7SZ5SBzyY',
    youtubeId: 'bM7SZ5SBzyY',
    displayOrder: 1,
    status: 'published',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&auto=format&fit=crop&q=80',
    authorName: 'Tech Geek Adarsh',
    duration: '0:42',
    likesCount: 1240,
    tags: ['Python', 'Walrus', 'CleanCode'],
    createdAt: '2025-02-11T00:00:00Z',
    updatedAt: '2025-10-10T00:00:00Z',
  },
  {
    id: 'short_py_2',
    microSubjectId: 'micro_py_tricks',
    microSubjectName: 'Python Quick Tricks',
    title: 'Stop Using range(len())! Use enumerate() & zip()',
    description: 'Why looping with range(len()) is un-pythonic and slows your iteration down. Master simultaneous sequence traversal with zip() and enumerate().',
    youtubeShortsUrl: 'https://www.youtube.com/shorts/kJQP7kiw5Fk',
    youtubeId: 'kJQP7kiw5Fk',
    displayOrder: 2,
    status: 'published',
    thumbnailUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&auto=format&fit=crop&q=80',
    authorName: 'Tech Geek Adarsh',
    duration: '0:55',
    likesCount: 980,
    tags: ['Python', 'Loops', 'Enumerate'],
    createdAt: '2025-02-12T00:00:00Z',
    updatedAt: '2025-10-12T00:00:00Z',
  },
  {
    id: 'short_sql_1',
    microSubjectId: 'micro_sql_shortcuts',
    microSubjectName: 'SQL Shortcuts & Joins',
    title: 'ROW_NUMBER vs RANK vs DENSE_RANK in 50 Seconds',
    description: 'Visual comparison of tie-handling behaviors across window functions. Never confuse dense ranking again!',
    youtubeShortsUrl: 'https://www.youtube.com/shorts/3JZ_D3ELwOQ',
    youtubeId: '3JZ_D3ELwOQ',
    displayOrder: 1,
    status: 'published',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&auto=format&fit=crop&q=80',
    authorName: 'Tech Geek Adarsh',
    duration: '0:35',
    likesCount: 2100,
    tags: ['SQL', 'WindowFunctions', 'Interviews'],
    createdAt: '2025-02-15T00:00:00Z',
    updatedAt: '2025-10-05T00:00:00Z',
  },
  {
    id: 'short_sql_2',
    microSubjectId: 'micro_sql_shortcuts',
    microSubjectName: 'SQL Shortcuts & Joins',
    title: 'COALESCE Trick for Clean Null Handling',
    description: 'Eliminate nested IFNULL or CASE statements with idiomatic ANSI COALESCE chain evaluation.',
    youtubeShortsUrl: 'https://www.youtube.com/shorts/L_LUpnjgPso',
    youtubeId: 'L_LUpnjgPso',
    displayOrder: 2,
    status: 'published',
    thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&auto=format&fit=crop&q=80',
    authorName: 'Tech Geek Adarsh',
    duration: '0:38',
    likesCount: 1450,
    tags: ['SQL', 'Performance', 'Indexes'],
    createdAt: '2025-02-17T00:00:00Z',
    updatedAt: '2025-10-08T00:00:00Z',
  },
];

function loadStoredMicroSubjects(): MicroSubject[] {
  try {
    const raw = localStorage.getItem(MICRO_SUBJECTS_KEY);
    if (!raw) return [...INITIAL_PREVIEW_MICRO_SUBJECTS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...INITIAL_PREVIEW_MICRO_SUBJECTS];
  } catch (e) {
    return [...INITIAL_PREVIEW_MICRO_SUBJECTS];
  }
}

function saveStoredMicroSubjects(subs: MicroSubject[]): void {
  try {
    localStorage.setItem(MICRO_SUBJECTS_KEY, JSON.stringify(subs));
  } catch (e) {
    console.error('[MicroLessonsService] Failed to save micro subjects', e);
  }
}

function loadStoredMicroLessons(): MicroLesson[] {
  try {
    const raw = localStorage.getItem(MICRO_LESSONS_KEY);
    if (!raw) return [...INITIAL_PREVIEW_MICRO_LESSONS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...INITIAL_PREVIEW_MICRO_LESSONS];
  } catch (e) {
    return [...INITIAL_PREVIEW_MICRO_LESSONS];
  }
}

function saveStoredMicroLessons(lessons: MicroLesson[]): void {
  try {
    localStorage.setItem(MICRO_LESSONS_KEY, JSON.stringify(lessons));
  } catch (e) {
    console.error('[MicroLessonsService] Failed to save micro lessons', e);
  }
}

let microSubjectsCache: MicroSubject[] = loadStoredMicroSubjects();
let microLessonsCache: MicroLesson[] = loadStoredMicroLessons();

function mapRowToMicroSubject(row: MicroSubjectRow, count: number = 0): MicroSubject {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    coverImage: row.cover_image || '',
    displayOrder: row.display_order,
    isActive: row.is_active,
    videoCount: count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToMicroLesson(row: MicroLessonRow, subjectName: string = 'General Shorts'): MicroLesson {
  return {
    id: row.id,
    microSubjectId: row.micro_subject_id,
    microSubjectName: subjectName,
    title: row.title,
    description: row.description || '',
    youtubeShortsUrl: row.youtube_shorts_url,
    youtubeId: row.youtube_id,
    displayOrder: row.display_order,
    status: row.status,
    thumbnailUrl: row.thumbnail_url || undefined,
    authorName: row.author_name || 'Tech Geek Adarsh',
    duration: row.duration || '0:50',
    likesCount: 1000,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const MicroLessonsService = {
  /**
   * Retrieves all micro subjects.
   */
  async getMicroSubjects(): Promise<MicroSubject[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const [subjRes, lessonsRes] = await Promise.all([
          supabase.from('micro_subjects').select('*').order('display_order', { ascending: true }),
          supabase.from('micro_lessons').select('id, micro_subject_id'),
        ]);

        if (!subjRes.error && subjRes.data) {
          const counts: Record<string, number> = {};
          if (lessonsRes.data) {
            for (const l of lessonsRes.data as Array<{ micro_subject_id: string }>) {
              counts[l.micro_subject_id] = (counts[l.micro_subject_id] || 0) + 1;
            }
          }

          const rows = subjRes.data as any[];
          const mapped = rows.map(r => mapRowToMicroSubject(r, counts[r.id] || 0));
          microSubjectsCache = mapped;
          saveStoredMicroSubjects(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[MicroLessonsService] Supabase micro subjects query failed', err);
      }
    }

    return [...microSubjectsCache].sort((a, b) => a.displayOrder - b.displayOrder);
  },

  getMicroSubjectsSync(): MicroSubject[] {
    return [...microSubjectsCache].sort((a, b) => a.displayOrder - b.displayOrder);
  },

  async getActiveMicroSubjects(): Promise<MicroSubject[]> {
    const all = await this.getMicroSubjects();
    return all.filter(s => s.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
  },

  getActiveMicroSubjectsSync(): MicroSubject[] {
    return microSubjectsCache
      .filter(s => s.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },

  async getMicroSubjectById(idOrSlug: string): Promise<MicroSubject | null> {
    const all = await this.getMicroSubjects();
    const found = all.find(s => s.id === idOrSlug || s.slug === idOrSlug);
    return found ? { ...found } : null;
  },

  async createSubject(input: CreateMicroSubjectInput): Promise<MicroSubject> {
    if (!input.name || !input.name.trim()) {
      throw new Error('Micro subject name is required.');
    }

    const trimmedName = input.name.trim();
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = `micro_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const displayOrder = Number(input.displayOrder) || microSubjectsCache.length + 1;
    const isActive = input.isActive ?? true;
    const coverImage = input.coverImage?.trim() || '';
    const description = input.description?.trim() || '';

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await (supabase as any)
        .from('micro_subjects')
        .insert({
          id,
          name: trimmedName,
          slug,
          description,
          cover_image: coverImage,
          display_order: displayOrder,
          is_active: isActive,
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      const created = mapRowToMicroSubject(data, 0);
      microSubjectsCache = [...microSubjectsCache, created];
      saveStoredMicroSubjects(microSubjectsCache);
      return created;
    }

    const fallback: MicroSubject = {
      id,
      name: trimmedName,
      slug,
      description,
      coverImage,
      displayOrder,
      isActive,
      videoCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    microSubjectsCache = [...microSubjectsCache, fallback];
    saveStoredMicroSubjects(microSubjectsCache);
    return fallback;
  },

  async updateSubject(id: string, input: UpdateMicroSubjectInput): Promise<MicroSubject> {
    const current = microSubjectsCache.find(s => s.id === id);
    if (!current) throw new Error(`Micro subject "${id}" not found.`);

    const updatedName = input.name !== undefined ? input.name.trim() : current.name;
    const updatedSlug = input.name ? input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : current.slug;
    const updatedDesc = input.description !== undefined ? input.description.trim() : current.description;
    const updatedCover = input.coverImage !== undefined ? input.coverImage.trim() : current.coverImage;
    const updatedOrder = input.displayOrder !== undefined ? Number(input.displayOrder) : current.displayOrder;
    const updatedActive = input.isActive !== undefined ? input.isActive : current.isActive;

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await (supabase as any)
        .from('micro_subjects')
        .update({
          name: updatedName,
          slug: updatedSlug,
          description: updatedDesc,
          cover_image: updatedCover,
          display_order: updatedOrder,
          is_active: updatedActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      const updated = mapRowToMicroSubject(data, current.videoCount);
      microSubjectsCache = microSubjectsCache.map(s => (s.id === id ? updated : s));
      saveStoredMicroSubjects(microSubjectsCache);
      return updated;
    }

    const updatedLocal: MicroSubject = {
      ...current,
      name: updatedName,
      slug: updatedSlug,
      description: updatedDesc,
      coverImage: updatedCover,
      displayOrder: updatedOrder,
      isActive: updatedActive,
      updatedAt: new Date().toISOString(),
    };

    microSubjectsCache = microSubjectsCache.map(s => (s.id === id ? updatedLocal : s));
    saveStoredMicroSubjects(microSubjectsCache);
    return updatedLocal;
  },

  async toggleSubjectStatus(id: string): Promise<MicroSubject> {
    const current = microSubjectsCache.find(s => s.id === id);
    if (!current) throw new Error('Micro subject not found');
    return this.updateSubject(id, { isActive: !current.isActive });
  },

  async deleteSubject(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('micro_subjects')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(formatSupabaseError(error));
      }
    }

    const initialLen = microSubjectsCache.length;
    microSubjectsCache = microSubjectsCache.filter(s => s.id !== id);
    microLessonsCache = microLessonsCache.filter(l => l.microSubjectId !== id);
    saveStoredMicroSubjects(microSubjectsCache);
    saveStoredMicroLessons(microLessonsCache);
    return microSubjectsCache.length !== initialLen;
  },

  // --------------------------------------------------------------------------
  // Micro Lessons (Vertical Shorts)
  // --------------------------------------------------------------------------

  async getAllLessons(): Promise<MicroLesson[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('micro_lessons')
          .select('*')
          .order('display_order', { ascending: true });

        if (!error && data) {
          return data.map(r => mapRowToMicroLesson(r));
        }
      } catch (e) {
        console.warn('[MicroLessonsService] getAllLessons failed', e);
      }
    }
    return [...microLessonsCache];
  },

  async getLessonsBySubject(microSubjectId: string): Promise<MicroLesson[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('micro_lessons')
          .select('*')
          .eq('micro_subject_id', microSubjectId)
          .order('display_order', { ascending: true });

        if (!error && data) {
          const sub = microSubjectsCache.find(s => s.id === microSubjectId);
          const mapped = data.map(r => mapRowToMicroLesson(r, sub?.name));
          return mapped;
        }
      } catch (err) {
        console.warn('[MicroLessonsService] Supabase micro lessons query failed', err);
      }
    }

    return microLessonsCache
      .filter(l => l.microSubjectId === microSubjectId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },

  async getPublishedLessonsBySubject(microSubjectId: string): Promise<MicroLesson[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('micro_lessons')
          .select('*')
          .eq('micro_subject_id', microSubjectId)
          .eq('status', 'published')
          .order('display_order', { ascending: true });

        if (!error && data) {
          const sub = microSubjectsCache.find(s => s.id === microSubjectId);
          return data.map(r => mapRowToMicroLesson(r, sub?.name));
        }
      } catch (err) {
        console.warn('[MicroLessonsService] Supabase published lessons query failed', err);
      }
    }

    return microLessonsCache
      .filter(l => l.microSubjectId === microSubjectId && l.status === 'published')
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },

  async createLesson(input: CreateMicroLessonInput): Promise<MicroLesson> {
    if (!input.title || !input.title.trim()) {
      throw new Error('Video title is required.');
    }
    if (!input.youtubeShortsUrl || !input.youtubeShortsUrl.trim()) {
      throw new Error('YouTube Shorts URL is required.');
    }

    const youtubeId = extractYouTubeId(input.youtubeShortsUrl);
    if (!youtubeId) {
      throw new Error('Invalid YouTube URL or Shorts ID. Please provide a valid link (e.g., https://youtube.com/shorts/...).');
    }

    const microSubj = microSubjectsCache.find(s => s.id === input.microSubjectId);
    const microSubjectName = microSubj ? microSubj.name : 'General Shorts';
    const id = `short_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const displayOrder = Number(input.displayOrder) || 1;
    const status = input.status || 'published';
    const authorName = input.authorName || 'Tech Geek Adarsh';
    const canonicalShortsUrl = toOriginalYouTubeShortsUrl(youtubeId);

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await (supabase as any)
        .from('micro_lessons')
        .insert({
          id,
          micro_subject_id: input.microSubjectId,
          title: input.title.trim(),
          description: input.description?.trim() || '',
          youtube_shorts_url: canonicalShortsUrl,
          youtube_id: youtubeId,
          display_order: displayOrder,
          status,
          author_name: authorName,
          duration: '0:50',
          thumbnail_url: input.thumbnailUrl || '',
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      const created = mapRowToMicroLesson(data, microSubjectName);
      microLessonsCache = [...microLessonsCache, created];
      saveStoredMicroLessons(microLessonsCache);
      return created;
    }

    const fallbackLesson: MicroLesson = {
      id,
      microSubjectId: input.microSubjectId,
      microSubjectName,
      title: input.title.trim(),
      description: input.description?.trim() || '',
      youtubeShortsUrl: canonicalShortsUrl,
      youtubeId,
      displayOrder,
      status,
      authorName,
      duration: '0:50',
      likesCount: 1000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    microLessonsCache = [...microLessonsCache, fallbackLesson];
    saveStoredMicroLessons(microLessonsCache);
    return fallbackLesson;
  },

  async updateLesson(id: string, input: UpdateMicroLessonInput): Promise<MicroLesson> {
    const current = microLessonsCache.find(l => l.id === id);
    if (!current) throw new Error(`Lesson "${id}" not found.`);

    let youtubeId = current.youtubeId;
    let shortsUrl = current.youtubeShortsUrl;

    if (input.youtubeShortsUrl && input.youtubeShortsUrl !== current.youtubeShortsUrl) {
      const extracted = extractYouTubeId(input.youtubeShortsUrl);
      if (!extracted) {
        throw new Error('Invalid YouTube URL or Shorts ID format.');
      }
      youtubeId = extracted;
      shortsUrl = toOriginalYouTubeShortsUrl(extracted);
    }

    const updatedTitle = input.title !== undefined ? input.title.trim() : current.title;
    const updatedDesc = input.description !== undefined ? input.description.trim() : current.description;
    const updatedSubId = input.microSubjectId || current.microSubjectId;
    const updatedOrder = input.displayOrder !== undefined ? Number(input.displayOrder) : current.displayOrder;
    const updatedStatus = input.status || current.status;
    const updatedAuthor = input.authorName || current.authorName;

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await (supabase as any)
        .from('micro_lessons')
        .update({
          micro_subject_id: updatedSubId,
          title: updatedTitle,
          description: updatedDesc,
          youtube_shorts_url: shortsUrl,
          youtube_id: youtubeId,
          display_order: updatedOrder,
          status: updatedStatus,
          author_name: updatedAuthor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      const updated = mapRowToMicroLesson(data);
      microLessonsCache = microLessonsCache.map(l => (l.id === id ? updated : l));
      saveStoredMicroLessons(microLessonsCache);
      return updated;
    }

    const updatedLocal: MicroLesson = {
      ...current,
      microSubjectId: updatedSubId,
      title: updatedTitle,
      description: updatedDesc,
      youtubeShortsUrl: shortsUrl,
      youtubeId,
      displayOrder: updatedOrder,
      status: updatedStatus,
      authorName: updatedAuthor,
      updatedAt: new Date().toISOString(),
    };

    microLessonsCache = microLessonsCache.map(l => (l.id === id ? updatedLocal : l));
    saveStoredMicroLessons(microLessonsCache);
    return updatedLocal;
  },

  async reorderLessons(microSubjectId: string, orderedIds: string[]): Promise<MicroLesson[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const client = supabase as any;
        await Promise.all(
          orderedIds.map((id, index) =>
            client
              .from('micro_lessons')
              .update({ display_order: index + 1 })
              .eq('id', id)
          )
        );
      } catch (e) {
        console.warn('[MicroLessonsService] Could not persist reordering to database', e);
      }
    }

    microLessonsCache = microLessonsCache.map(l => {
      if (l.microSubjectId !== microSubjectId) return l;
      const newIndex = orderedIds.indexOf(l.id);
      return newIndex !== -1 ? { ...l, displayOrder: newIndex + 1 } : l;
    });

    saveStoredMicroLessons(microLessonsCache);
    return this.getLessonsBySubject(microSubjectId);
  },

  async deleteLesson(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('micro_lessons')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(formatSupabaseError(error));
      }
    }

    const initialLen = microLessonsCache.length;
    microLessonsCache = microLessonsCache.filter(l => l.id !== id);
    saveStoredMicroLessons(microLessonsCache);
    return microLessonsCache.length !== initialLen;
  },

  // Aliases for admin and subadmin page consumption
  async createMicroSubject(input: CreateMicroSubjectInput): Promise<MicroSubject> {
    return this.createSubject(input);
  },
  async updateMicroSubject(id: string, input: UpdateMicroSubjectInput): Promise<MicroSubject> {
    return this.updateSubject(id, input);
  },
  async toggleMicroSubjectStatus(id: string): Promise<MicroSubject> {
    return this.toggleSubjectStatus(id);
  },
  async deleteMicroSubject(id: string): Promise<boolean> {
    return this.deleteSubject(id);
  },

  async resetToDefaults(): Promise<void> {
    microSubjectsCache = [...INITIAL_PREVIEW_MICRO_SUBJECTS];
    microLessonsCache = [...INITIAL_PREVIEW_MICRO_LESSONS];
    saveStoredMicroSubjects(microSubjectsCache);
    saveStoredMicroLessons(microLessonsCache);
  },
};
