/**
 * Video Lessons Service for Yogneet Edu.
 * Handles staff creation, editing, status toggling, and YouTube ID extraction for video lessons.
 */

import { VideoLesson, ContentStatus, UserProfile } from '../types';
import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabaseClient';
import { ApiService, AuditService } from './api';
import { Database } from '../types/database.types';

type VideoRow = Database['public']['Tables']['video_lessons']['Row'];
type VideoInsert = Database['public']['Tables']['video_lessons']['Insert'];

export interface CreateVideoLessonInput {
  title: string;
  courseTitle: string;
  moduleName?: string;
  description?: string;
  overview?: string[];
  videoUrl: string;
  duration?: string;
  status: 'draft' | 'published' | 'archived';
}

export interface UpdateVideoLessonInput {
  title?: string;
  courseTitle?: string;
  moduleName?: string;
  description?: string;
  overview?: string[];
  videoUrl?: string;
  duration?: string;
  status?: 'draft' | 'published' | 'archived';
}

/**
 * Extracts YouTube video ID from various URL formats safely:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 * - dQw4w9WgXcQ (raw 11-char ID)
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
    }
  } catch (e) {
    // Not a valid URL structure
  }

  // Regex fallback
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

function rowToVideoLesson(row: VideoRow): VideoLesson {
  return {
    id: row.id,
    courseId: row.course_id || 'course_default',
    courseTitle: row.course_title,
    title: row.title,
    youtubeId: row.youtube_id,
    duration: row.duration,
    durationSeconds: row.duration_seconds || 0,
    order: row.lesson_order || 1,
    moduleName: row.module_name,
    description: row.description || '',
    overview: row.overview || [],
    publishedAt: row.published_at ? new Date(row.published_at).toISOString().split('T')[0] : 'Recently',
    views: row.views || 0,
    completed: false,
    resources: Array.isArray(row.resources) ? (row.resources as any) : [],
    status: (row.status as ContentStatus) || 'published',
  };
}

export const VideoLessonsService = {
  /**
   * Retrieves video lessons (filtering published only for students, or all for staff).
   */
  async getVideoLessons(statusFilter?: 'draft' | 'published' | 'archived', isStudent = false): Promise<VideoLesson[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return ApiService.getVideos();
    }

    try {
      let query = supabase.from('video_lessons').select('*').order('lesson_order', { ascending: true });

      if (isStudent) {
        query = query.eq('status', 'published');
      } else if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw new Error(formatSupabaseError(error));

      const rows = (data as VideoRow[]) || [];
      return rows.map(rowToVideoLesson);
    } catch (err) {
      console.error('[VideoLessonsService.getVideoLessons] Error, falling back to local:', err);
      return ApiService.getVideos();
    }
  },

  /**
   * Creates a new video lesson.
   */
  async createVideoLesson(actor: UserProfile, input: CreateVideoLessonInput): Promise<VideoLesson> {
    if (!input.title?.trim()) throw new Error('Lesson title is required.');
    if (!input.courseTitle?.trim()) throw new Error('Course / subject title is required.');

    const youtubeId = extractYouTubeId(input.videoUrl);
    if (!youtubeId) {
      throw new Error('Invalid YouTube URL or Video ID. Please provide a valid YouTube link (e.g., https://youtu.be/... or https://www.youtube.com/watch?v=...).');
    }

    const lessonId = `vid_${Date.now()}`;

    if (!isSupabaseConfigured() || !supabase) {
      const created = ApiService.addVideoLesson(actor, {
        courseId: 'course_default',
        courseTitle: input.courseTitle.trim(),
        title: input.title.trim(),
        youtubeId,
        duration: input.duration?.trim() || '15:00',
        durationSeconds: 900,
        order: 1,
        moduleName: input.moduleName?.trim() || 'Core Modules',
        description: input.description?.trim() || '',
        overview: input.overview || ['Core Concept Breakdown', 'Practical Implementation'],
        resources: [],
      });
      return created;
    }

    try {
      const newRow: VideoInsert = {
        id: lessonId,
        course_title: input.courseTitle.trim(),
        title: input.title.trim(),
        youtube_id: youtubeId,
        duration: input.duration?.trim() || '15:00',
        duration_seconds: 900,
        lesson_order: 1,
        module_name: input.moduleName?.trim() || 'Core Modules',
        description: input.description?.trim() || '',
        overview: input.overview || ['Core Concept Breakdown', 'Practical Implementation'],
        resources: [],
        status: input.status || 'published',
      };

      const { data, error } = await (supabase as any).from('video_lessons').insert(newRow).select().single();
      if (error) throw new Error(formatSupabaseError(error));

      AuditService.log(
        actor,
        'videos.create',
        'VideoLesson',
        input.title,
        `Created video lesson "${input.title}" (${youtubeId}) with status "${input.status}".`,
        'SUCCESS'
      );

      return rowToVideoLesson(data as VideoRow);
    } catch (err) {
      console.error('[VideoLessonsService.createVideoLesson] Error:', err);
      throw err;
    }
  },

  /**
   * Updates an existing video lesson.
   */
  async updateVideoLesson(actor: UserProfile, lessonId: string, input: UpdateVideoLessonInput): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      return;
    }

    try {
      const updates: Partial<VideoRow> = {};
      if (input.title !== undefined) updates.title = input.title.trim();
      if (input.courseTitle !== undefined) updates.course_title = input.courseTitle.trim();
      if (input.moduleName !== undefined) updates.module_name = input.moduleName.trim();
      if (input.description !== undefined) updates.description = input.description.trim();
      if (input.overview !== undefined) updates.overview = input.overview;
      if (input.duration !== undefined) updates.duration = input.duration.trim();
      if (input.status !== undefined) updates.status = input.status;

      if (input.videoUrl !== undefined) {
        const id = extractYouTubeId(input.videoUrl);
        if (!id) throw new Error('Invalid YouTube URL or ID.');
        updates.youtube_id = id;
      }

      const { error } = await (supabase as any).from('video_lessons').update(updates).eq('id', lessonId);
      if (error) throw new Error(formatSupabaseError(error));

      AuditService.log(
        actor,
        'videos.edit',
        'VideoLesson',
        lessonId,
        `Updated video lesson "${lessonId}".`,
        'SUCCESS'
      );
    } catch (err) {
      console.error('[VideoLessonsService.updateVideoLesson] Error:', err);
      throw err;
    }
  },

  /**
   * Deletes a video lesson.
   */
  async deleteVideoLesson(actor: UserProfile, lessonId: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      return;
    }

    try {
      const { error } = await supabase.from('video_lessons').delete().eq('id', lessonId);
      if (error) throw new Error(formatSupabaseError(error));

      AuditService.log(
        actor,
        'videos.delete',
        'VideoLesson',
        lessonId,
        `Deleted video lesson "${lessonId}".`,
        'SUCCESS'
      );
    } catch (err) {
      console.error('[VideoLessonsService.deleteVideoLesson] Error:', err);
      throw err;
    }
  },
};
