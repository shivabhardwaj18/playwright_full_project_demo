/**
 * Centralized portal URL resolution from METS_ENV.
 *
 * The target environment is taken **solely** from METS_ENV (falling back to DEV
 * when unset). There is intentionally NO tag-based environment forcing: the
 * operator who triggers a run — locally or via a GitLab pipeline — chooses the
 * environment explicitly through METS_ENV (or the `mets_env` pipeline input).
 * Tags such as `@regression`, `@sanity`, `@smoke`, `@merx`/`@ssc` select WHICH
 * tests run; they never decide WHERE those tests run. Whoever runs the suite is
 * responsible for pointing it at the right environment.
 *
 * Counterpart: scripts/resolve-portal-urls.sh (bash resolver for CI shell jobs).
 * When adding a portal or environment, update BOTH files.
 */

/** Canonical portal identifiers. Add new portals here. */
export type PortalKey = 'MERX' | 'SSC' | 'MTO' | 'BJC';

/** Maps each portal key to the env-var name used for explicit overrides. */
export const PORTAL_ENV_VAR: Record<PortalKey, string> = {
  MERX: 'MERX_BASE_URL',
  SSC: 'SSC_BASE_URL',
  MTO: 'MTO_BASE_URL',
  BJC: 'BJC_BASE_URL',
};

type PortalUrls = Record<PortalKey, string>;

const ENV_MAP: Record<string, (port: string) => PortalUrls> = {
  DEV: () => ({
    MERX: 'https://merx.mets-dev.aws.mediagrif.com',
    SSC: 'https://ssc.mets-dev.aws.mediagrif.com',
    MTO: 'http://mtoesp.mets-dev.aws.mediagrif.com',
    BJC: 'http://bgis.mets-dev.aws.mediagrif.com',
  }),
  QA: () => ({
    MERX: 'https://merx.qa.mediagrif.com',
    SSC: 'https://ssc.qa.mediagrif.com',
    MTO: 'http://mtoesp.qa.mediagrif.com',
    BJC: 'https://bgis.qa.mediagrif.com',
  }),
  PP: () => ({
    MERX: 'https://merx.pp.mediagrif.com',
    SSC: 'https://ssc.pp.mediagrif.com',
    // PP host not confirmed in legacy config — override via MTO_BASE_URL if needed.
    MTO: 'http://mtoesp.pp.mediagrif.com',
    // PP host not confirmed in legacy config — override via BJC_BASE_URL if needed.
    BJC: 'https://bgis.pp.mediagrif.com',
  }),
  LOCAL: (port) => ({
    MERX: `http://merx:${port}`,
    SSC: `http://ssc:${port}`,
    MTO: `http://mto:${port}`,
    BJC: `http://bjc:${port}`,
  }),
};

/**
 * Resolve the effective METS environment name from METS_ENV (default: DEV).
 * No tag-based overrides — see the file header.
 */
export function resolveEffectiveMetsEnv(
  rawEnv: string | undefined = process.env.METS_ENV,
): string {
   const normalizedEnv = (rawEnv ?? 'QA').toUpperCase();
   return normalizedEnv;
}

export function resolvePortalUrls(
  rawEnv: string | undefined = process.env.METS_ENV,
): PortalUrls {
  const env = resolveEffectiveMetsEnv(rawEnv);
  const port = process.env.LOCAL_PORT ?? '8080';
  const resolver = ENV_MAP[env];
  if (!resolver) {
    const valid = Object.keys(ENV_MAP).join(', ');
    throw new Error(`Unknown METS_ENV "${env}". Valid values: ${valid}`);
  }
  const resolved = resolver(port);

  const result = { ...resolved };
  for (const [key, envVar] of Object.entries(PORTAL_ENV_VAR)) {
    const explicit = process.env[envVar];
    if (explicit) result[key as PortalKey] = explicit;
  }
  return result;
}
