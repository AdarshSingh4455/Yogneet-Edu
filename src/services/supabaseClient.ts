import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

export type BackendMode = 'supabase' | 'local-mock' | 'fail-closed';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  mode: BackendMode;
  isFatalConfigError: boolean;
  configError?: string;
}

/**
 * Pure evaluator for runtime Supabase environment settings.
 * Enforces strict fail-closed security for production builds while allowing
 * local development and explicit demo operation.
 */
export function resolveSupabaseConfigForEnv(env: Record<string, string | undefined> = {}): SupabaseConfig {
  const rawUrl = env.VITE_SUPABASE_URL?.trim();
  const rawKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  const isProductionBuild = Boolean(
    env.PROD === 'true' ||
    env.MODE === 'production' ||
    env.VITE_ENVIRONMENT === 'production' ||
    env.VITE_ENVIRONMENT === 'staging'
  );
  const allowMockAuth = env.VITE_ALLOW_MOCK_AUTH === 'true';

  // Strict Fail-Closed Rule: In production/staging, missing credentials must NEVER silently fallback to mock personas
  if (isProductionBuild && !allowMockAuth) {
    if (!rawUrl || !rawKey) {
      return {
        url: '',
        anonKey: '',
        isConfigured: false,
        mode: 'fail-closed',
        isFatalConfigError: true,
        configError: 'Production configuration error: Supabase backend credentials are required. System operating in fail-closed mode.',
      };
    }

    try {
      const parsed = new URL(rawUrl);
      if (!parsed.protocol.startsWith('http')) {
        throw new Error('Supabase URL must use http or https protocol.');
      }
    } catch {
      return {
        url: rawUrl,
        anonKey: rawKey,
        isConfigured: false,
        mode: 'fail-closed',
        isFatalConfigError: true,
        configError: 'Production configuration error: Invalid VITE_SUPABASE_URL format. System operating in fail-closed mode.',
      };
    }

    return {
      url: rawUrl,
      anonKey: rawKey,
      isConfigured: true,
      mode: 'supabase',
      isFatalConfigError: false,
    };
  }

  // Development / Offline / Explicit Mock Mode
  if (!rawUrl && !rawKey) {
    return {
      url: '',
      anonKey: '',
      isConfigured: false,
      mode: 'local-mock',
      isFatalConfigError: false,
    };
  }

  if (rawUrl && !rawKey) {
    console.warn('[Yogneet Supabase] VITE_SUPABASE_URL is set, but VITE_SUPABASE_ANON_KEY is missing. Operating in fallback mock mode.');
    return {
      url: rawUrl,
      anonKey: '',
      isConfigured: false,
      mode: 'local-mock',
      isFatalConfigError: false,
    };
  }

  if (!rawUrl && rawKey) {
    console.warn('[Yogneet Supabase] VITE_SUPABASE_ANON_KEY is set, but VITE_SUPABASE_URL is missing. Operating in fallback mock mode.');
    return {
      url: '',
      anonKey: rawKey,
      isConfigured: false,
      mode: 'local-mock',
      isFatalConfigError: false,
    };
  }

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
      isFatalConfigError: false,
    };
  }

  return {
    url: rawUrl!,
    anonKey: rawKey!,
    isConfigured: true,
    mode: 'supabase',
    isFatalConfigError: false,
  };
}

const runtimeEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};
export const supabaseConfig: SupabaseConfig = resolveSupabaseConfigForEnv(runtimeEnv);

/**
 * Centralized Supabase Client Singleton.
 * Configured with auto-refreshing tokens and persistent auth sessions in localStorage.
 */
export const supabase: SupabaseClient<Database> | null = supabaseConfig.isConfigured
  ? createClient<Database>(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'yogneet_supabase_auth_token',
      },
    })
  : null;

/**
 * Returns the current active backend mode ('supabase', 'local-mock', or 'fail-closed').
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
 * Throws a descriptive error if called while in local-mock mode or fail-closed mode.
 */
export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      supabaseConfig.configError ||
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
