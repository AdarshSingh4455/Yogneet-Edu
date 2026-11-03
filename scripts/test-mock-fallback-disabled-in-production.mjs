import { test } from 'node:test';
import assert from 'node:assert/strict';

function resolveSupabaseConfigForEnv(env = {}) {
  const rawUrl = env.VITE_SUPABASE_URL?.trim();
  const rawKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  const isProductionBuild = Boolean(
    env.PROD === 'true' ||
    env.MODE === 'production' ||
    env.VITE_ENVIRONMENT === 'production' ||
    env.VITE_ENVIRONMENT === 'staging'
  );
  const allowMockAuth = env.VITE_ALLOW_MOCK_AUTH === 'true';

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
  }

  return {
    isConfigured: Boolean(rawUrl && rawKey),
    mode: isProductionBuild ? 'supabase' : 'local-mock',
    isFatalConfigError: false,
  };
}

function isMockFallbackAllowedForEnv(env = {}) {
  const isProduction = Boolean(
    env.PROD === true ||
    env.PROD === 'true' ||
    env.MODE === 'production' ||
    env.VITE_ENVIRONMENT === 'production' ||
    env.VITE_ENVIRONMENT === 'staging'
  );
  if (isProduction) {
    return false;
  }
  return env.VITE_ALLOW_MOCK_AUTH === 'true' || (!env.VITE_SUPABASE_URL && !env.VITE_SUPABASE_ANON_KEY);
}

test('Production Mock Fallback Disablement Suite', async (t) => {
  await t.test('1. resolveSupabaseConfigForEnv strictly enforces fail-closed mode when credentials are missing in production', () => {
    const prodConfig = resolveSupabaseConfigForEnv({
      VITE_ENVIRONMENT: 'production',
      PROD: 'true',
    });
    assert.equal(prodConfig.mode, 'fail-closed', 'Must operate in fail-closed mode');
    assert.equal(prodConfig.isConfigured, false);
    assert.equal(prodConfig.isFatalConfigError, true);
    assert.match(prodConfig.configError || '', /Production configuration error/);
  });

  await t.test('2. resolveSupabaseConfigForEnv strictly enforces fail-closed mode when credentials are missing in staging', () => {
    const stagingConfig = resolveSupabaseConfigForEnv({
      VITE_ENVIRONMENT: 'staging',
      PROD: 'false',
    });
    assert.equal(stagingConfig.mode, 'fail-closed', 'Must operate in fail-closed mode in staging as well');
    assert.equal(stagingConfig.isConfigured, false);
    assert.equal(stagingConfig.isFatalConfigError, true);
  });

  await t.test('3. isMockFallbackAllowedForEnv returns FALSE for all production and staging permutations', () => {
    const prodEnvs = [
      { VITE_ENVIRONMENT: 'production' },
      { VITE_ENVIRONMENT: 'staging' },
      { PROD: 'true' },
      { PROD: true },
      { MODE: 'production' },
      { VITE_ENVIRONMENT: 'production', VITE_ALLOW_MOCK_AUTH: 'true' }, // cannot override production
      { VITE_ENVIRONMENT: 'staging', VITE_ALLOW_MOCK_AUTH: 'true' },
    ];

    for (const env of prodEnvs) {
      const allowed = isMockFallbackAllowedForEnv(env);
      assert.equal(allowed, false, `Mock fallback MUST be false for environment: ${JSON.stringify(env)}`);
    }
  });

  await t.test('4. Allows mock fallback only in intentional offline development without credentials', () => {
    const localDevEnv = {
      VITE_ENVIRONMENT: 'development',
      PROD: 'false',
    };
    assert.equal(isMockFallbackAllowedForEnv(localDevEnv), true, 'Local dev with no credentials allows mock mode');

    const localDevWithFlag = {
      VITE_ENVIRONMENT: 'development',
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-key',
      VITE_ALLOW_MOCK_AUTH: 'true',
    };
    assert.equal(isMockFallbackAllowedForEnv(localDevWithFlag), true, 'Local dev with explicit flag allows mock mode');
  });
});
