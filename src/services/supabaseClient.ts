import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type BackendMode = 'supabase' | 'local-mock';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  mode: BackendMode;
}

/**
 * Sanitizes and validates the runtime Supabase environment settings.
 */
function resolveSupabaseConfig(): SupabaseConfig {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};
  const rawUrl = env.VITE_SUPABASE_URL?.trim();
  const rawKey = env.VITE_SUPABASE_ANON_KEY?.trim();

  // If neither is defined, deliberately default to local-mock mode for offline/demo operation
  if (!rawUrl && !rawKey) {
    return {
      url: '',
      anonKey: '',
      isConfigured: false,
      mode: 'local-mock',
    };
  }

  // Check for partial or malformed configurations
  if (rawUrl && !rawKey) {
    console.warn(
      '[Yogneet Supabase] VITE_SUPABASE_URL is set, but VITE_SUPABASE_ANON_KEY is missing. Operating in fallback mock mode.'
    );
    return {
      url: rawUrl,
      anonKey: '',
      isConfigured: false,
      mode: 'local-mock',
    };
  }

  if (!rawUrl && rawKey) {
    console.warn(
      '[Yogneet Supabase] VITE_SUPABASE_ANON_KEY is set, but VITE_SUPABASE_URL is missing. Operating in fallback mock mode.'
    );
    return {
      url: '',
      anonKey: rawKey,
      isConfigured: false,
      mode: 'local-mock',
    };
  }

  // Basic URL structure check
  try {
    const parsed = new URL(rawUrl!);
    if (!parsed.protocol.startsWith('http')) {
      throw new Error('Supabase URL must use http or https protocol.');
    }
  } catch (err) {
    console.error('[Yogneet Supabase] Invalid VITE_SUPABASE_URL provided:', rawUrl, err);
    return {
      url: rawUrl!,
      anonKey: rawKey!,
      isConfigured: false,
      mode: 'local-mock',
    };
  }

  return {
    url: rawUrl!,
    anonKey: rawKey!,
    isConfigured: true,
    mode: 'supabase',
  };
}

export const supabaseConfig: SupabaseConfig = resolveSupabaseConfig();

/**
 * Centralized Supabase Client Singleton.
 * Configured with auto-refreshing tokens and persistent auth sessions in localStorage.
 */
export const supabase: SupabaseClient | null = supabaseConfig.isConfigured
  ? createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'yogneet_supabase_auth_token',
      },
    })
  : null;

/**
 * Returns the current active backend mode ('supabase' or 'local-mock').
 */
export function getBackendMode(): BackendMode {
  return supabaseConfig.mode;
}

/**
 * Checks if Supabase client is properly instantiated and configured.
 */
export function isSupabaseConfigured(): boolean {
  return supabaseConfig.isConfigured && supabase !== null;
}

/**
 * Safe accessor for the Supabase client.
 * Throws a descriptive error if called while in local-mock mode.
 */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase client is not configured. Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    );
  }
  return supabase;
}

/**
 * Formats database errors into user-friendly diagnostic messages
 * without leaking internal server secrets or raw schema credentials.
 */
export function formatSupabaseError(error: unknown): string {
  if (!error) return 'An unexpected error occurred.';
  if (typeof error === 'string') return error;

  if (typeof error === 'object' && error !== null) {
    const err = error as { message?: string; error_description?: string; details?: string };
    if (err.message) return err.message;
    if (err.error_description) return err.error_description;
    if (err.details) return err.details;
  }

  return 'A database communication error occurred. Please check network connectivity and retry.';
}
