/**
 * Shared test-account credentials for METS non-production environments.
 *
 * `!Dev12345` is the standard password for pre-provisioned test accounts across
 * all non-prod environments (Dev, QA, etc.). It is NOT a production secret — the
 * value is well-known and already committed throughout this repo. Centralizing it
 * here gives a single source of truth, so a future rotation is a one-line change
 * instead of editing every spec.
 *
 * Used by suites that log in to pre-provisioned accounts via `loginAs`
 * (contact_groups) and as the default password for accounts created
 * during registration flows.
 *
 * Do NOT use this for production or staging accounts.
 */
export const TEST_PASSWORD = '!Dev12345';
