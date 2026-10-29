/**
 * Study Notes Service for Yogneet Edu.
 * Provides real database-backed CRUD for study notes with Supabase Storage integration,
 * compensating cleanup, dual-mode fallback, and permission enforcement.
 */

import { StudyNote, ContentStatus, UserProfile } from '../types';
import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabaseClient';
import { StorageService } from './storageService';
import { ApiService, AuditService } from './api';
import { Database } from '../types/database.types';

type NoteRow = Database['public']['Tables']['study_notes']['Row'];
type NoteInsert = Database['public']['Tables']['study_notes']['Insert'];

export interface CreateNotePayload {
  title: string;
  subject: string;
  category?: string;
  tags?: string[];
  excerpt: string;
  fullMarkdown: string;
  status: ContentStatus;
}

export interface UpdateNotePayload {
  title?: string;
  subject?: string;
  category?: string;
  tags?: string[];
  excerpt?: string;
  fullMarkdown?: string;
  status?: ContentStatus;
}

function rowToStudyNote(row: NoteRow): StudyNote {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    category: row.category,
    tags: row.tags || [],
    author: row.author_name,
    authorRole: row.author_role,
    authorAvatar: row.author_avatar || '',
    lastUpdated: new Date(row.updated_at || row.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    readTime: row.read_time || '5 min read',
    pages: row.pages || 1,
    excerpt: row.excerpt,
    fullMarkdown: row.full_markdown,
    fileUrl: row.file_url ?? undefined,
    fileSize: row.file_size ?? undefined,
    downloadAvailable: row.download_available ?? false,
    views: row.views || 0,
    downloads: row.downloads || 0,
    status: row.status as ContentStatus,
  };
}

export const StudyNotesService = {
  /**
   * Retrieves all study notes matching status and subject filters.
   */
  async getNotes(statusFilter?: ContentStatus, isStudent = false): Promise<StudyNote[]> {
    if (!isSupabaseConfigured() || !supabase) {
      let notes = ApiService.getNotes();
      if (isStudent) {
        notes = notes.filter(n => n.status === 'published');
      } else if (statusFilter) {
        notes = notes.filter(n => n.status === statusFilter);
      }
      return notes;
    }

    try {
      let query = supabase.from('study_notes').select('*').order('created_at', { ascending: false });

      if (isStudent) {
        query = query.eq('status', 'published');
      } else if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw new Error(formatSupabaseError(error));

      const rows = (data as NoteRow[]) || [];
      return rows.map(rowToStudyNote);
    } catch (err) {
      console.error('[StudyNotesService.getNotes] Error, falling back to local:', err);
      let notes = ApiService.getNotes();
      if (isStudent) {
        notes = notes.filter(n => n.status === 'published');
      }
      return notes;
    }
  },

  /**
   * Retrieves a single study note by ID.
   */
  async getNoteById(id: string): Promise<StudyNote | undefined> {
    if (!isSupabaseConfigured() || !supabase) {
      return ApiService.getNoteById(id);
    }

    try {
      const { data, error } = await supabase
        .from('study_notes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw new Error(formatSupabaseError(error));
      if (!data) return ApiService.getNoteById(id);

      return rowToStudyNote(data as NoteRow);
    } catch (err) {
      console.error('[StudyNotesService.getNoteById] Error:', err);
      return ApiService.getNoteById(id);
    }
  },

  /**
   * Creates a new study note with optional PDF attachment.
   * If storage upload succeeds but DB insertion fails, performs compensating cleanup.
   */
  async createNote(
    actor: UserProfile,
    payload: CreateNotePayload,
    file?: File
  ): Promise<StudyNote> {
    if (!payload.title?.trim()) throw new Error('Title is required.');
    if (!payload.subject?.trim()) throw new Error('Subject is required.');

    let uploadedPath = '';
    let uploadedUrl = '';
    let fileSizeFormatted = '';

    // 1. Upload File if provided
    if (file) {
      const isPrivate = payload.status === 'draft';
      const uploadRes = await StorageService.uploadNotePdf(file, isPrivate);
      uploadedPath = uploadRes.storagePath;
      uploadedUrl = uploadRes.publicUrl;
      fileSizeFormatted = uploadRes.fileSizeFormatted;
    }

    const noteId = `note_${Date.now()}`;
    const wordCount = payload.fullMarkdown ? payload.fullMarkdown.trim().split(/\s+/).length : 0;
    const readTime = `${Math.max(3, Math.ceil(wordCount / 180))} min read`;
    const pages = Math.max(1, Math.ceil((payload.fullMarkdown?.length || 0) / 1200));

    // If local mock mode
    if (!isSupabaseConfigured() || !supabase) {
      const created = ApiService.addNote(actor, {
        title: payload.title,
        subject: payload.subject,
        category: payload.category || 'Study Guide',
        tags: payload.tags || [payload.subject, 'Notes'],
        excerpt: payload.excerpt,
        fullMarkdown: payload.fullMarkdown,
        fileSize: fileSizeFormatted || undefined,
        status: payload.status,
      });

      if (file && uploadedUrl) {
        created.fileUrl = uploadedUrl;
        created.downloadAvailable = true;
      }
      return created;
    }

    try {
      // 2. Insert into PostgreSQL public.study_notes
      const newRow: NoteInsert = {
        id: noteId,
        title: payload.title.trim(),
        subject: payload.subject.trim(),
        category: payload.category?.trim() || 'Study Guide',
        tags: payload.tags || [payload.subject.trim(), 'Notes'],
        author_name: actor.name,
        author_role: actor.role === 'admin' ? 'Super Admin' : 'Content Author',
        author_avatar: actor.avatar || '',
        read_time: readTime,
        pages,
        excerpt: payload.excerpt.trim(),
        full_markdown: payload.fullMarkdown || '',
        file_url: uploadedUrl || null,
        file_size: fileSizeFormatted || null,
        download_available: Boolean(uploadedUrl),
        views: 1,
        downloads: 0,
        status: payload.status,
      };

      const { data, error } = await (supabase as any)
        .from('study_notes')
        .insert(newRow)
        .select()
        .single();

      if (error) {
        // Compensating cleanup of storage object
        if (uploadedPath) {
          await StorageService.deleteFile(uploadedPath, payload.status === 'draft');
        }
        throw new Error(formatSupabaseError(error));
      }

      AuditService.log(
        actor,
        'notes.create',
        'StudyNote',
        payload.title,
        `Created note "${payload.title}" with status "${payload.status}"${file ? ' and PDF attachment' : ''}.`,
        'SUCCESS'
      );

      return rowToStudyNote(data as NoteRow);
    } catch (err) {
      if (uploadedPath) {
        await StorageService.deleteFile(uploadedPath, payload.status === 'draft');
      }
      console.error('[StudyNotesService.createNote] Failed:', err);
      throw err;
    }
  },

  /**
   * Updates note status (e.g. publish or archive).
   */
  async updateNoteStatus(actor: UserProfile, noteId: string, status: ContentStatus): Promise<StudyNote> {
    if (!isSupabaseConfigured() || !supabase) {
      return ApiService.updateNoteStatus(actor, noteId, status);
    }

    try {
      const { data, error } = await (supabase as any)
        .from('study_notes')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw new Error(formatSupabaseError(error));

      AuditService.log(
        actor,
        status === 'published' ? 'notes.publish' : 'notes.edit',
        'StudyNote',
        noteId,
        `Updated study note status to "${status}".`,
        'SUCCESS'
      );

      return rowToStudyNote(data as NoteRow);
    } catch (err) {
      console.error('[StudyNotesService.updateNoteStatus] Error:', err);
      return ApiService.updateNoteStatus(actor, noteId, status);
    }
  },

  /**
   * Updates note details (title, excerpt, markdown, subject, etc.).
   */
  async updateNote(actor: UserProfile, noteId: string, payload: UpdateNotePayload): Promise<StudyNote> {
    if (!isSupabaseConfigured() || !supabase) {
      const note = ApiService.getNoteById(noteId);
      if (!note) throw new Error('Note not found');
      if (payload.title) note.title = payload.title;
      if (payload.subject) note.subject = payload.subject;
      if (payload.excerpt) note.excerpt = payload.excerpt;
      if (payload.fullMarkdown) note.fullMarkdown = payload.fullMarkdown;
      if (payload.status) note.status = payload.status;
      return note;
    }

    try {
      const updates: Partial<NoteRow> = {
        updated_at: new Date().toISOString(),
      };
      if (payload.title !== undefined) updates.title = payload.title.trim();
      if (payload.subject !== undefined) updates.subject = payload.subject.trim();
      if (payload.category !== undefined) updates.category = payload.category.trim();
      if (payload.tags !== undefined) updates.tags = payload.tags;
      if (payload.excerpt !== undefined) updates.excerpt = payload.excerpt.trim();
      if (payload.fullMarkdown !== undefined) updates.full_markdown = payload.fullMarkdown;
      if (payload.status !== undefined) updates.status = payload.status;

      const { data, error } = await (supabase as any)
        .from('study_notes')
        .update(updates)
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw new Error(formatSupabaseError(error));

      AuditService.log(
        actor,
        'notes.edit',
        'StudyNote',
        payload.title || noteId,
        `Updated study note "${payload.title || noteId}".`,
        'SUCCESS'
      );

      return rowToStudyNote(data as NoteRow);
    } catch (err) {
      console.error('[StudyNotesService.updateNote] Error:', err);
      throw err;
    }
  },

  /**
   * Permanently deletes a study note and cleans up its storage attachment.
   */
  async deleteNote(actor: UserProfile, noteId: string): Promise<void> {
    const existing = await this.getNoteById(noteId);

    if (!isSupabaseConfigured() || !supabase) {
      ApiService.deleteNote(actor, noteId);
      return;
    }

    try {
      const { error } = await supabase.from('study_notes').delete().eq('id', noteId);
      if (error) throw new Error(formatSupabaseError(error));

      if (existing?.fileUrl && !existing.fileUrl.startsWith('http') && !existing.fileUrl.startsWith('/mock')) {
        await StorageService.deleteFile(existing.fileUrl);
      }

      AuditService.log(
        actor,
        'notes.delete',
        'StudyNote',
        noteId,
        `Deleted study note "${existing?.title || noteId}".`,
        'SUCCESS'
      );
    } catch (err) {
      console.error('[StudyNotesService.deleteNote] Error:', err);
      ApiService.deleteNote(actor, noteId);
    }
  },
};
