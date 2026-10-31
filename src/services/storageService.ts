/**
 * Storage Service for Yogneet Edu.
 * Handles secure file validation, Supabase Storage uploads, signed URLs, and compensating deletion.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const ALLOWED_MIME_TYPES = ['application/pdf'];

export interface UploadFileResult {
  storagePath: string;
  publicUrl: string;
  fileSizeFormatted: string;
  fileSizeBytes: number;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function validatePdfFile(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'No file selected.' };
  }

  if (file.size === 0) {
    return { isValid: false, error: 'Selected file is empty (0 bytes).' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size (${formatBytes(file.size)}) exceeds the maximum allowed limit of ${formatBytes(MAX_FILE_SIZE_BYTES)}.`,
    };
  }

  const nameLower = file.name.toLowerCase();
  if (!nameLower.endsWith('.pdf')) {
    return { isValid: false, error: 'Only PDF documents (.pdf) are supported.' };
  }

  if (file.type && file.type !== 'application/pdf') {
    return { isValid: false, error: `Invalid MIME type (${file.type}). Expected application/pdf.` };
  }

  return { isValid: true };
}

export function generateStoragePath(prefix: string, originalFilename: string): string {
  const sanitizedName = originalFilename
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-');
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}/${timestamp}_${randomSuffix}_${sanitizedName}`;
}

export const StorageService = {
  /**
   * Uploads a validated PDF file to Supabase Storage.
   */
  async uploadNotePdf(file: File, isPrivate = false): Promise<UploadFileResult> {
    const validation = validatePdfFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid file.');
    }

    const bucketName = isPrivate ? 'yogneet-private' : 'yogneet-public';
    const storagePath = generateStoragePath('notes', file.name);

    if (!isSupabaseConfigured() || !supabase) {
      // Local Mock fallback
      const mockBlobUrl = URL.createObjectURL(file);
      return {
        storagePath: `mock/${storagePath}`,
        publicUrl: mockBlobUrl,
        fileSizeFormatted: formatBytes(file.size),
        fileSizeBytes: file.size,
      };
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, file, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      let publicUrl = '';
      if (!isPrivate) {
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(data.path);
        publicUrl = urlData.publicUrl;
      } else {
        // Generate signed URL with 2-hour expiry for private resources
        const { data: signedData, error: signError } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(data.path, 7200);
        if (signError) {
          throw new Error(`Failed to create signed URL: ${signError.message}`);
        }
        publicUrl = signedData.signedUrl;
      }

      return {
        storagePath: data.path,
        publicUrl,
        fileSizeFormatted: formatBytes(file.size),
        fileSizeBytes: file.size,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown storage error';
      console.error('[StorageService.uploadNotePdf] Error:', message);
      throw err;
    }
  },

  /**
   * Resolves a download URL for a stored file path.
   */
  async getDownloadUrl(storagePath: string, isPrivate = false): Promise<string> {
    if (!storagePath) return '';
    if (storagePath.startsWith('blob:') || storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      return storagePath;
    }

    const bucketName = isPrivate ? 'yogneet-private' : 'yogneet-public';

    if (!isSupabaseConfigured() || !supabase) {
      return storagePath;
    }

    try {
      if (isPrivate) {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(storagePath, 3600);
        if (error || !data) throw error;
        return data.signedUrl;
      } else {
        const { data } = supabase.storage
          .from(bucketName)
          .getPublicUrl(storagePath);
        return data.publicUrl;
      }
    } catch (err) {
      console.error('[StorageService.getDownloadUrl] Error resolving URL:', err);
      return '';
    }
  },

  /**
   * Resolves an authorized download URL for a study note by verifying server-side entitlement.
   */
  async getAuthorizedNoteDownloadUrl(noteId: string): Promise<string> {
    if (!isSupabaseConfigured() || !supabase) {
      return '';
    }

    const { data, error } = await (supabase as any).rpc('get_study_note_download_url', {
      p_note_id: noteId,
    });

    if (error) {
      throw new Error(error.message || 'Access Denied: Insufficient entitlement.');
    }

    if (!data?.fileUrl) {
      return '';
    }

    const isPrivate = Boolean(data.isRestricted || (data.requiredTier && data.requiredTier !== 'standard'));
    return this.getDownloadUrl(data.fileUrl, isPrivate);
  },

  /**
   * Compensating cleanup: deletes an uploaded file if a database transaction fails.
   */
  async deleteFile(storagePath: string, isPrivate = false): Promise<void> {
    if (!storagePath || storagePath.startsWith('mock/') || storagePath.startsWith('blob:')) {
      return;
    }

    const bucketName = isPrivate ? 'yogneet-private' : 'yogneet-public';

    if (!isSupabaseConfigured() || !supabase) {
      return;
    }

    try {
      await supabase.storage.from(bucketName).remove([storagePath]);
    } catch (err) {
      console.warn('[StorageService.deleteFile] Failed to clean up file:', storagePath, err);
    }
  },
};
