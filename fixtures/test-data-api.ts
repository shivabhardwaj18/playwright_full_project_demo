/**
 * Playwright fixture: testData
 *
 * Provides a per-test handle to the METS `test-data-api` Spring profile endpoints.
 * Every test gets a unique `owner` tag so parallel workers cannot interfere.
 *
 * ## Three authentication strategies
 *
 *   - `ensureBuyerAndLogin(opts)` →  Converge-on-use: creates on first run, reuses on subsequent.
 *     For dev tests. PUT /e2e/fixtures/{id}/buyers/contacts/{id}
 *   - `loginAs(opts)`             →  Pre-provisioned account login (no data creation).
 *     For QA tests. Clears IDP sessions, then logs in.
 *   - `seedBuyerAndLogin(opts?)`  →  Ephemeral escape hatch: fresh user every run.
 *     For tests needing true isolation (registration flows, destructive mutations).
 *
 * ## Ephemeral data creation
 *   - `seedBuyer(opts?)`       →  POST /e2e/{owner}/buyers
 *   - `seedSupplier(opts?)`    →  POST /e2e/{owner}/suppliers
 *   - `seedSolicitation(opts)` →  POST /e2e/{owner}/solicitations
 *
 * ## Teardown contract
 *
 * `deleteAll()` is called in the fixture's `finally` block after `use()` returns.
 * All browser contexts are closed. Persistent fixture entities are skipped by the
 * backend (lifecycle = PERSISTENT). Teardown errors are logged as WARN but do NOT
 * re-throw — a cleanup failure must not mask the actual test failure.
 *
 * @see docs/test-data-api/guide.md
 */
import { test as base, expect as baseExpect, APIRequestContext, Page, BrowserContext } from '@playwright/test';
import { resolvePortalUrls, type PortalKey } from '../utils/env-urls';

/** Base path for all test-data-api endpoints. */
export const TEST_DATA_BASE = '/e2e';

/** Portal URLs resolved once from METS_ENV (with per-portal env-var overrides). */
const urls = resolvePortalUrls();

/** Maps the API portal code to the portal key used in the URL map. */
const PORTAL_KEY_MAP: Record<string, PortalKey> = {
  SSC: 'SSC',
  MERX: 'MERX',
  MTO: 'MTO',
  BJC: 'BJC',
};

/**
 * Timeout for test-data-api calls (ms).  These are heavyweight backend
 * operations (entity creation + audit + transaction commit) that take
 * longer than normal page actions, especially under concurrent load.
 */
const API_TIMEOUT = 60_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SeededUser = {
  id: number;
  contactId: number;
  username: string;
  password: string;
  portal: string;
  organizationName?: string;
};

export type AuthenticatedUser = SeededUser & {
  page: Page;
};

export type SolicitationResult = {
  id: number;
};

/** Q&A per-question assignment-event seeding options (METS-16225). */
export type QnaAssignmentEventOptions = {
  /** Defaults server-side to `QUESTION_ASSIGNED`. */
  eventType?: 'QUESTION_ASSIGNED' | 'QUESTION_REASSIGNED' | 'QUESTION_UNASSIGNED';
  /** Contact PK stored as the previous assignee. Omit → "Unassigned" renders. */
  previousAssigneeContactId?: number;
  /** Contact PK stored as the new assignee. Omit → "Unassigned" renders. */
  newAssigneeContactId?: number;
  /** Contact PK of the actor/assigner. Omit → "System" renders. */
  actorContactId?: number;
  /** ISO-8601 event timestamp. Defaults server-side to now. */
  eventTimestamp?: string;
  /** Optional question subject (max 75 chars). */
  questionSubject?: string;
  /**
   * Existing question PK to attach the event to (from a prior call's
   * `questionId`). Omit to create a new question. Use it to add a second event
   * (e.g. a reassign after an assign) on the same question so both audit rows
   * share one "Q&A (per question) - Q{n}" task label.
   */
  questionId?: number;
  /**
   * Defaults to `MANUALLY_ADDED`. Only `SUPPLIER_QUESTION` records an asker, so
   * it is the only origin that can exercise vendor-identity masking (METS-16232).
   */
  origin?: 'MANUALLY_ADDED' | 'SUPPLIER_QUESTION';
  /** Required when `origin` is `SUPPLIER_QUESTION` — the asking supplier contact. */
  submitterContactId?: number;
};

/**
 * Result of seeding a Q&A assignment event. Returns the created PKs plus the
 * resolved display strings the Task Assignments History tab is expected to
 * render — the spec passes contact PKs and gets back the full names it needs
 * to assert on. `previousAssigneeName` / `newAssigneeName` are undefined when
 * that side is unassigned; `assignerName` is undefined for system actions.
 */
export type QnaAssignmentEventResult = {
  eventId: number;
  questionId: number;
  questionNo: string;
  previousAssigneeName?: string;
  newAssigneeName?: string;
  assignerName?: string;
};

/** Q&A answer seeding options (METS-18077). */
export type QnaAnswerOptions = {
  /**
   * Target revision status. Defaults server-side to `PUBLISHED` — the state that
   * makes a question count as "already published" and therefore ineligible for
   * bulk forward. `DRAFT` and the approval statuses stay forwardable.
   */
  status?:
    | 'DRAFT'
    | 'APPROVAL_REJECTED'
    | 'AWAITING_APPROVAL'
    | 'AWAITING_PUBLICATION'
    | 'PUBLISHED'
    | 'READY_FOR_PUBLICATION'
    | 'PENDING_PUBLICATION';
  /** Answer body. Defaults server-side to a deterministic `[E2E]` value. */
  answerText?: string;
  /**
   * Buyer contact recorded as "Replied By". Must belong to a buying organization
   * — answers are submitted by the buyer side. Defaults server-side to the
   * solicitation's issuing buyer main contact.
   */
  submitterContactId?: number;
};

/**
 * Result of seeding a Q&A answer. `status` echoes what was actually applied, so
 * a call that omitted `status` can assert on the resolved default rather than
 * assuming it. `questionNo` is returned because the bulk-forward exclusion
 * banner renders question numbers — a spec asserting on (or asserting the
 * absence of) that number has no other way to learn it.
 */
export type QnaAnswerResult = {
  answerId: number;
  answerRevisionId: number;
  questionId: number;
  questionNo: string;
  status: string;
};

export type BuyerCreateOptions = {
  portal?: string;
  organizationName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  password?: string;
  /** Role codes to assign (e.g. "BUYER_ADMIN", "BUYER_COORDINATOR"). Defaults to ["BUYER_ADMIN"]. */
  roles?: string[];
  /** Report-related settings to configure after buyer creation. Applied via PATCH /buyers/{id}/settings. */
  settings?: BuyerReportSettingsOptions;
  /**
   * Contact time zone — a zone ID from the portal's supported zones (e.g.
   * `America/Vancouver` on MERX). Drives how dates are formatted for this
   * user. Omit for the server default `America/New_York`.
   */
  timeZone?: string;
};

export type SupplierCreateOptions = {
  portal?: string;
  organizationName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  password?: string;
  categories?: string[];
  /** See {@link BuyerCreateOptions.timeZone}. */
  timeZone?: string;
};

export type SolicitationCreateOptions = {
  buyerId: number;
  portal?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  title?: string;
  solicitationType?: string;
  closingTimestamp?: string;
  /**
   * Solicitation time zone — a zone ID from the portal's supported zones.
   * Sets both the solicitation and closing-timestamp zone, which decides the
   * wall-clock time buyers see on the edit form. Omit to leave it unset.
   */
  timeZone?: string;
  /**
   * ISO-639 codes (e.g. `['en']`). Omit to inherit the buyer's defaults.
   */
  supportedLanguages?: string[];
  /**
   * Override the solicitation's `externalSystemId` — e.g. `'MADISON'` for
   * Madison AI solicitations.
   */
  externalSystemId?: string;
  /**
   * Category codes in the portal solicitation taxonomy (NIGP_SS on SSC, MERX
   * on MERX). Omit to use the server's quiet portal default (avoids empty-
   * category opportunity matching blasting most suppliers).
   */
  categories?: string[];
  /**
   * Contact PKs to provision as Q&A answerers on the solicitation. When
   * non-empty the backend flips `questionsSubmittedOnline = true`, creates the
   * QNA user task, and grants each contact the `ANSWER` privilege — which is
   * what makes them eligible in the bulk-assign dropdown (METS-16235). Omit to
   * skip answerer provisioning (existing behavior).
   */
  answererContactIds?: number[];
};

export type ConfigResponse = {
  key: string;
  value: string;
  valueType: string;
};

/**
 * Optional flags PATCHed onto a buyer's `BuyerSettingsRevision`. Undefined
 * leaves the existing value alone. Grown ad-hoc as tests require fields.
 */
export type BuyerReportSettingsOptions = {
  managementReports?: number[];
  supplierActivityBySolicitationActionGearItemEnabled?: boolean;
  solicitationDocumentDownloadActionGearItemEnabled?: boolean;
  matchingSupplierReportActionGearItemEnabled?: boolean;
  supplierActivityAuditReportEnabled?: boolean;
  bidBreakdownReportActionGearItemEnabled?: boolean;
  /** Master switch for the Q&A module on the buyer org. */
  useQuestionsAndAnswers?: boolean;
  /** Default value of `SolicitationRevision.questionsSubmittedOnline` for new sols. */
  qnaActivatedByDefault?: boolean;
  /**
   * Per-org "Enable Madison AI" gate (Gate 3 in `MadisonAccessService.canLaunch`).
   * Must be `true` for the ProcureAI Assistance launch button to render.
   */
  madisonAiEnabled?: boolean;
  /**
   * Master switch for Bid Evaluation (`BidEvaluationSettings.useBidEvaluationModule`).
   * Must be `true` for `#setupBidEvalLink` to render. Pair with role
   * `BUYER_BIDEVALUATION_MANAGER` (`BUYER_MANAGE_BID_EVALUATION`).
   */
  useBidEvaluationModule?: boolean;
  /**
   * Shows the consensus toggle on technical steps during BEM setup
   * (`BidEvaluationSettings.allowConsensusEvaluation`). Defaults to false on
   * new E2E buyers even after `useBidEvaluationModule` is turned on.
   */
  allowConsensusEvaluation?: boolean;
  /** Master switch for Client Management on the buyer's Notice settings. */
  useClientManagement?: boolean;
  /**
   * `MANDATORY` or `OPTIONAL`. The e2e PATCH bypasses `BuyerSettingsValidator`,
   * so Mandatory can be set with zero active clients (clients inactivated after
   * save) — the METS-17707 solicitation-creation case.
   */
  specificClientOnBehalfMode?: 'MANDATORY' | 'OPTIONAL';
};

/** QA E2E tests — login to pre-existing account, no API creation. */
export type LoginAsOptions = {
  username: string;
  password: string;
  portal: string;
  /** If true (default), skip the test when login fails. If false, throw. */
  skipOnFailure?: boolean;
};

/** Dev tests — converge-on-use, self-provisioning. */
export type FixtureBuyerOptions = {
  buyerFixtureId: string;
  contactFixtureId: string;
  portal?: string;
  roles?: string[];
  settings?: BuyerReportSettingsOptions;
  password?: string;
  /** See {@link BuyerCreateOptions.timeZone}. Re-applied on every converge. */
  timeZone?: string;
};

export type FixtureSupplierOptions = {
  supplierFixtureId: string;
  contactFixtureId: string;
  portal?: string;
  categories?: string[];
  password?: string;
  /** See {@link BuyerCreateOptions.timeZone}. Re-applied on every converge. */
  timeZone?: string;
};

export type FixtureSolicitationOptions = {
  buyerFixtureId: string;
  solicitationFixtureId: string;
  portal?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  title?: string;
  solicitationType?: string;
  closingTimestamp?: string;
  /**
   * See {@link SolicitationCreateOptions.timeZone}. Honored only on first
   * creation — reuse ignores it (and `closingTimestamp`).
   */
  timeZone?: string;
  /**
   * ISO-639 language codes — honored only on first creation; reuse ignores.
   * See {@link SolicitationCreateOptions.supportedLanguages} for usage notes.
   */
  supportedLanguages?: string[];
  /**
   * Override the solicitation's `externalSystemId` to simulate import from an
   * external source — e.g. `'MADISON'` for Madison AI solicitations that
   * bypass the creation wizard.
   */
  externalSystemId?: string;
  /**
   * Category codes — honored only on first creation; reuse ignores.
   * See {@link SolicitationCreateOptions.categories} for usage notes.
   */
  categories?: string[];
  /**
   * Contact PKs to provision as Q&A answerers on the solicitation — honored
   * only on first creation of the fixture. See
   * {@link SolicitationCreateOptions.answererContactIds}. Needed so a contact
   * shows up in the bulk-assign dropdown (METS-16235).
   */
  answererContactIds?: number[];
};

export type TestDataApi = {
  /** Returns the per-test owner tag used in all endpoint paths. */
  owner: string;

  /**
   * Reads a dynamic property from the backend.
   * Returns `null` if the key does not exist.
   */
  getConfig: (key: string) => Promise<ConfigResponse | null>;

  /**
   * Guards a test on a dynamic property value.  If the property's current
   * value does not match `expectedValue`, the test is skipped.
   */
  requireConfig: (key: string, expectedValue: string) => Promise<void>;

  // --- Phase 1: lifecycle actions ---

  /**
   * Closes a solicitation immediately without waiting for its closing timestamp.
   *
   * Replaces the legacy Selenium `execute_sql_to_close_solicitation_in_{merx,ssc}`.
   */
  closeSolicitation: (solicitationId: number) => Promise<void>;

  /**
   * Bulk-deletes (or transitions to terminal state) every entity registered
   * under this test's owner tag, then removes the registry rows.
   *
   * Called automatically in the fixture's teardown.
   */
  deleteAll: () => Promise<void>;

  // --- Phase 2: data creation ---

  /**
   * Creates a login-capable buyer organization with an ACTIVE main contact.
   * Returns the org PK, contact PK, username, and plaintext password so the
   * test can authenticate immediately.
   */
  seedBuyer: (opts?: Partial<BuyerCreateOptions>) => Promise<SeededUser>;

  /**
   * Creates a login-capable supplier organization with an ACTIVE main contact,
   * UNSPSC categories, and a matching profile.
   */
  seedSupplier: (opts?: Partial<SupplierCreateOptions>) => Promise<SeededUser>;

  /**
   * Creates a solicitation owned by the given buyer at the requested status.
   * Status chaining: DRAFT → PUBLISHED → CLOSED.
   */
  seedSolicitation: (opts: SolicitationCreateOptions) => Promise<SolicitationResult>;

  /**
   * Seeds a single per-question Q&A assignment event (plus the question it
   * hangs off) on an existing solicitation, so the buyer Task Assignments
   * History tab (METS-16225) and the Question Activity timeline (METS-16232)
   * have deterministic data to render.
   *
   * Writes the `QNA_QUESTION_EVENT` audit row directly — it does NOT drive the
   * assign UI or provision eligible answerers. Seed on an **ephemeral**
   * solicitation (`seedSolicitation`) so event counts stay deterministic across
   * reruns and questions do not accumulate on a persistent fixture. Returns the
   * resolved contact full names for assertion.
   */
  seedQnaAssignmentEvent: (
    solicitationId: number,
    opts?: QnaAssignmentEventOptions,
  ) => Promise<QnaAssignmentEventResult>;

  /**
   * Attaches an answer to an existing question at a requested revision status —
   * `PUBLISHED` by default.
   *
   * This is the only headless way to reach the "already published" state the
   * bulk-forward exclusion banner reports (METS-16238 / METS-18077); answering
   * and publishing through the buyer UI 50 times per scenario is not viable.
   * Publication deliberately bypasses `QuestionsAnswersService#publishAnswer`,
   * so no answer notification email is sent and no View Activity timeline entry
   * is recorded.
   *
   * Pair it with {@link seedQnaAssignmentEvent} to create the question, and give
   * that question `origin: 'SUPPLIER_QUESTION'` when it must land in the
   * already-published bucket — the categorizer reports buyer-added questions as
   * manually-added regardless of their answer.
   *
   * Seed on an **ephemeral** solicitation (`seedSolicitation`) so counts stay
   * deterministic across reruns.
   */
  seedQnaAnswer: (
    solicitationId: number,
    questionId: number,
    opts?: QnaAnswerOptions,
  ) => Promise<QnaAnswerResult>;

  /**
   * Marks an organization's subscription as expired.  Portal-aware: resolves
   * to the correct holder (contact for MERX CLB, org for SSC).
   *
   * Replaces the legacy Selenium `execute_sql_to_get_organization_id_and_mark_as_expired*`.
   */
  expireSubscription: (organizationId: number, contactId?: number) => Promise<void>;

  /**
   * Triggers the Iris indexer on-demand so newly seeded entities become
   * Polls the Iris search index client-side until the supplier matching the
   * given keyword appears.  Uses Playwright's {@link baseExpect.poll} for
   * trace visibility — each poll attempt appears as a separate API call in
   * the Playwright trace with timestamps and response bodies.
   *
   * @param keyword Organization name or keyword to search for
   * @param opts.portal Portal code (defaults to 'MERX')
   * @param opts.timeoutMs Max time to wait (defaults to 60000ms)
   */
  awaitIndex: (keyword: string, opts?: { portal?: string; timeoutMs?: number }) => Promise<void>;

  /**
   * Configures report-related settings on an existing buyer's BuyerSettingsRevision.
   * Only non-null/non-undefined fields are applied; everything else is left at its
   * current (portal default) value.
   *
   * Called automatically by `seedBuyerAndLogin` when `opts.settings` is provided,
   * but also available standalone for mid-test reconfiguration.
   */
  configureBuyerSettings: (buyerId: number, settings: BuyerReportSettingsOptions) => Promise<void>;

  /**
   * Creates a buyer via the API and logs in through the SAML IDP in a fresh
   * browser context.  Returns the authenticated page ready for UI interactions.
   *
   * If `opts.settings` is provided, configures buyer report settings via
   * PATCH /buyers/{id}/settings before logging in.
   *
   * The browser context is tracked and closed automatically in fixture teardown.
   */
  seedBuyerAndLogin: (opts?: Partial<BuyerCreateOptions>) => Promise<AuthenticatedUser>;

  /**
   * Creates a supplier via the API and logs in through the SAML IDP in a fresh
   * browser context.  Returns the authenticated page ready for UI interactions.
   *
   * The browser context is tracked and closed automatically in fixture teardown.
   */
  seedSupplierAndLogin: (opts?: Partial<SupplierCreateOptions>) => Promise<AuthenticatedUser>;

  // --- Converge-on-use (persistent fixtures) ---

  /**
   * Logs in to a pre-existing account without creating any data.
   * Clears IDP session rows first to prevent single-session conflicts.
   *
   * For QA E2E tests with pre-provisioned accounts. If login fails and
   * `skipOnFailure` is true (default), the test is skipped with a message.
   */
  loginAs: (opts: LoginAsOptions) => Promise<AuthenticatedUser>;

  /**
   * Ensures a persistent buyer org + contact exist (creates on first call,
   * repairs on subsequent calls), clears IDP sessions, then logs in.
   *
   * For dev tests that self-provision across environments.
   */
  ensureBuyerAndLogin: (opts: FixtureBuyerOptions) => Promise<AuthenticatedUser>;

  /**
   * Ensures a persistent supplier org + contact exist, clears IDP sessions,
   * then logs in. Same converge-on-use pattern as ensureBuyerAndLogin.
   */
  ensureSupplierAndLogin: (opts: FixtureSupplierOptions) => Promise<AuthenticatedUser>;

  /**
   * Ensures a persistent buyer org exists without logging in.
   * Useful for seeding entities the test interacts with indirectly.
   */
  ensureBuyer: (opts: FixtureBuyerOptions) => Promise<SeededUser>;

  /**
   * Ensures a persistent supplier org exists without logging in.
   */
  ensureSupplier: (opts: FixtureSupplierOptions) => Promise<SeededUser>;

  /**
   * Ensures a persistent solicitation exists under a buyer fixture.
   * **Existence-only** — reuses as-is, no status repair (server-side WARN on drift).
   * **Prerequisite:** call `ensureBuyerAndLogin` (or `ensureBuyer`) first so
   * the buyer has a main contact; cold-start returns HTTP 400 otherwise.
   *
   * @see docs/test-data-api/guide.md §"Solicitation fixtures"
   */
  ensureSolicitation: (opts: FixtureSolicitationOptions) => Promise<SolicitationResult>;

  /**
   * Clears IDP session log rows for a given username+portal combination.
   * Called automatically by loginAs and ensure*AndLogin, but available
   * standalone for ad-hoc session cleanup.
   */
  clearIdpSessions: (username: string, portal: string) => Promise<void>;
};

// ---------------------------------------------------------------------------
// Fixture extension
// ---------------------------------------------------------------------------

type TestDataFixtures = {
  testData: TestDataApi;
};

/**
 * Extended `test` object that provides the `testData` fixture for test-scoped
 * ephemeral user creation and authenticated browser sessions.
 *
 * This is the sole test fixture entry point for all specs.
 */
export const test = base.extend<TestDataFixtures>({
  testData: async ({ request, browser }, use, testInfo) => {
    const owner = `playwright-${testInfo.testId}`;
    const contexts: BrowserContext[] = [];
    let hasSeedActivity = false;

    const assertOk = async (
      response: Awaited<ReturnType<APIRequestContext['get']>>,
      label: string,
    ): Promise<void> => {
      if (!response.ok()) {
        const body = await response.text();
        throw new Error(
          `[test-data-api] ${label} failed: HTTP ${response.status()} — ${body}`,
        );
      }
    };

    const loginUser = async (user: SeededUser): Promise<Page> => {
      const portalKey = PORTAL_KEY_MAP[user.portal] ?? 'MERX';
      const portalBaseUrl = urls[portalKey];

      const context = await browser.newContext({
        baseURL: portalBaseUrl,
        ignoreHTTPSErrors: true,
      });
      contexts.push(context);
      const page = await context.newPage();

      await page.goto('/public/authentication/login');
      await page.locator('#j_username').waitFor({ state: 'visible', timeout: 15_000 });
      await page.locator('#j_username').fill(user.username);
      await page.locator('#j_password').fill(user.password);
      await page.locator('#loginButton').click();

      await page.waitForURL(
        url => !url.hostname.includes('idp-') && !url.pathname.includes('/login'),
        { timeout: 30_000, waitUntil: 'domcontentloaded' },
      );

      const cookieBtn = page.locator('#cookieBannerAcceptBtn');
      if (await cookieBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await cookieBtn.click();
      }

      return page;
    };

    const api: TestDataApi = {
      owner,

      getConfig: async (key: string): Promise<ConfigResponse | null> => {
        const url = `${TEST_DATA_BASE}/${owner}/config?key=${encodeURIComponent(key)}`;
        const response = await request.get(url, { timeout: API_TIMEOUT });
        if (response.status() === 404) return null;
        await assertOk(response, `getConfig(${key})`);
        return await response.json();
      },

      requireConfig: async (key: string, expectedValue: string): Promise<void> => {
        const config = await api.getConfig(key);
        const actual = config?.value ?? null;
        if (actual !== expectedValue) {
          const tags = testInfo.title;
          const isSmoke = tags.includes('@smoke');
          if (isSmoke) {
            throw new Error(
              `[requireConfig] ${key} is "${actual}" but expected "${expectedValue}" — ` +
              `smoke test cannot skip, failing.`,
            );
          }
          // eslint-disable-next-line playwright/no-skipped-test -- conditional skip based on env config
          base.skip(
            true,
            `[requireConfig] ${key} is "${actual}" — expected "${expectedValue}", skipping.`,
          );
        }
      },

      closeSolicitation: async (solicitationId: number): Promise<void> => {
        const url = `${TEST_DATA_BASE}/${owner}/solicitations/${solicitationId}/close`;
        const response = await request.put(url, { timeout: API_TIMEOUT });
        await assertOk(response, `closeSolicitation(${solicitationId})`);
      },

      deleteAll: async (): Promise<void> => {
        const url = `${TEST_DATA_BASE}/${owner}/delete`;
        const response = await request.delete(url, { timeout: API_TIMEOUT });
        if (!response.ok()) {
          const body = await response.text();
          console.warn(
            `[test-data-api] deleteAll(owner='${owner}') failed: ` +
            `HTTP ${response.status()} — ${body}`,
          );
        }
      },

      seedBuyer: async (opts: Partial<BuyerCreateOptions> = {}): Promise<SeededUser> => {
        hasSeedActivity = true;
        const url = `${TEST_DATA_BASE}/${owner}/buyers`;
        const response = await request.post(url, { data: opts, timeout: API_TIMEOUT });
        await assertOk(response, 'seedBuyer');
        const json = await response.json();
        return {
          id: json.id,
          contactId: json.contactId,
          username: json.username,
          password: json.password,
          portal: json.portal,
          organizationName: json.organizationName,
        };
      },

      seedSupplier: async (opts: Partial<SupplierCreateOptions> = {}): Promise<SeededUser> => {
        hasSeedActivity = true;
        const url = `${TEST_DATA_BASE}/${owner}/suppliers`;
        const response = await request.post(url, { data: opts, timeout: API_TIMEOUT });
        await assertOk(response, 'seedSupplier');
        const json = await response.json();
        return {
          id: json.id,
          contactId: json.contactId,
          username: json.username,
          password: json.password,
          portal: json.portal,
          organizationName: json.organizationName,
        };
      },

      seedSolicitation: async (opts: SolicitationCreateOptions): Promise<SolicitationResult> => {
        hasSeedActivity = true;
        const url = `${TEST_DATA_BASE}/${owner}/solicitations`;
        const response = await request.post(url, { data: opts, timeout: API_TIMEOUT });
        await assertOk(response, 'seedSolicitation');
        const json = await response.json();
        return { id: json.id };
      },

      seedQnaAssignmentEvent: async (
        solicitationId: number,
        opts: QnaAssignmentEventOptions = {},
      ): Promise<QnaAssignmentEventResult> => {
        hasSeedActivity = true;
        const url = `${TEST_DATA_BASE}/${owner}/solicitations/${solicitationId}/qna-assignment-events`;
        const response = await request.post(url, { data: opts, timeout: API_TIMEOUT });
        await assertOk(response, `seedQnaAssignmentEvent(${solicitationId})`);
        const json = await response.json();
        return {
          eventId: json.eventId,
          questionId: json.questionId,
          questionNo: json.questionNo,
          previousAssigneeName: json.previousAssigneeName,
          newAssigneeName: json.newAssigneeName,
          assignerName: json.assignerName,
        };
      },

      seedQnaAnswer: async (
        solicitationId: number,
        questionId: number,
        opts: QnaAnswerOptions = {},
      ): Promise<QnaAnswerResult> => {
        hasSeedActivity = true;
        const url = `${TEST_DATA_BASE}/${owner}/solicitations/${solicitationId}/questions/${questionId}/answer`;
        const response = await request.post(url, { data: opts, timeout: API_TIMEOUT });
        await assertOk(response, `seedQnaAnswer(${solicitationId}, ${questionId})`);
        const json = await response.json();
        return {
          answerId: json.answerId,
          answerRevisionId: json.answerRevisionId,
          questionId: json.questionId,
          questionNo: json.questionNo,
          status: json.status,
        };
      },

      expireSubscription: async (organizationId: number, contactId?: number): Promise<void> => {
        hasSeedActivity = true;
        let url = `${TEST_DATA_BASE}/${owner}/organizations/${organizationId}/expire-subscription`;
        if (contactId !== undefined) {
          url += `?contactId=${contactId}`;
        }
        const response = await request.put(url, { timeout: API_TIMEOUT });
        await assertOk(response, `expireSubscription(${organizationId})`);
      },

      awaitIndex: async (keyword: string, opts?: { portal?: string; timeoutMs?: number }): Promise<void> => {
        const portal = opts?.portal ?? 'MERX';
        const timeoutMs = opts?.timeoutMs ?? 60_000;
        const url = `${TEST_DATA_BASE}/${owner}/check-index?keyword=${encodeURIComponent(keyword)}&portal=${portal}`;

        await baseExpect.poll(
          async () => {
            const response = await request.get(url, { timeout: 10_000 });
            if (!response.ok()) return 0;
            const json = await response.json();
            return json.count ?? 0;
          },
          {
            message: `IRIS index did not return a match for keyword="${keyword}" within ${timeoutMs}ms`,
            timeout: timeoutMs,
            intervals: [2_000],
          },
        ).toBeGreaterThan(0);
      },

      configureBuyerSettings: async (buyerId: number, settings: BuyerReportSettingsOptions): Promise<void> => {
        const url = `${TEST_DATA_BASE}/${owner}/buyers/${buyerId}/settings`;
        const response = await request.patch(url, { data: settings, timeout: API_TIMEOUT });
        await assertOk(response, `configureBuyerSettings(${buyerId})`);
      },

      seedBuyerAndLogin: async (opts: Partial<BuyerCreateOptions> = {}): Promise<AuthenticatedUser> => {
        const { settings, ...buyerOpts } = opts;
        const user = await api.seedBuyer(buyerOpts);
        if (settings) {
          await api.configureBuyerSettings(user.id, settings);
        }
        const page = await loginUser(user);
        return { ...user, page };
      },

      seedSupplierAndLogin: async (opts: Partial<SupplierCreateOptions> = {}): Promise<AuthenticatedUser> => {
        const user = await api.seedSupplier(opts);
        const page = await loginUser(user);
        return { ...user, page };
      },

      clearIdpSessions: async (username: string, portal: string): Promise<void> => {
        const url = `${TEST_DATA_BASE}/sessions?username=${encodeURIComponent(username)}&portal=${encodeURIComponent(portal)}`;
        try {
          const response = await request.delete(url, { timeout: API_TIMEOUT });
          if (!response.ok()) {
            console.warn(
              `[test-data-api] clearIdpSessions failed for ${username}@${portal}: HTTP ${response.status()}`,
            );
          }
        } catch (err) {
          console.warn(
            `[test-data-api] clearIdpSessions network error for ${username}@${portal}:`,
            err instanceof Error ? err.message : err,
          );
        }
      },

      loginAs: async (opts: LoginAsOptions): Promise<AuthenticatedUser> => {
        const { username, password, portal, skipOnFailure = true } = opts;

        await api.clearIdpSessions(username, portal);

        const portalKey = PORTAL_KEY_MAP[portal] ?? 'MERX';
        const portalBaseUrl = urls[portalKey];

        const context = await browser.newContext({
          baseURL: portalBaseUrl,
          ignoreHTTPSErrors: true,
        });
        contexts.push(context);
        const page = await context.newPage();

        try {
          if (portalKey === 'MTO') {
            // MTO uses a header login dialog (legacy MTOLoginPage), not /public/authentication/login.
            await page.goto('/');
            const cookieBtn = page.locator('#cookieBannerAcceptBtn');
            if (await cookieBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
              await cookieBtn.click({ timeout: 5_000 }).catch(() => {});
              await page.waitForTimeout(1_000);
            }
            await page.locator('#loginLink').click();
            await page.locator('#loginBox_j_username').fill(username);
            await page.locator('#loginBox_j_password').fill(password);
            await page.locator('#loginWindowButton').click();
            await page.locator('#myAccountMenuLink, [title="My Account"]').first()
              .waitFor({ state: 'visible', timeout: 60_000 });
          } else {
            await page.goto('/public/authentication/login');
            await page.locator('#j_username').waitFor({ state: 'visible', timeout: 15_000 });
            await page.locator('#j_username').fill(username);
            await page.locator('#j_password').fill(password);
            await page.locator('#loginButton').click();

            await page.waitForURL(
              url => !url.hostname.includes('idp-') && !url.pathname.includes('/login'),
              { timeout: 30_000 },
            );

            const cookieBtn = page.locator('#cookieBannerAcceptBtn');
            if (await cookieBtn.isVisible({ timeout: 500 }).catch(() => false)) {
              // Best-effort: some pre-provisioned accounts render a post-login modal
              // (e.g. a saved-search dialog) whose overlay intercepts the banner click.
              // Cookie acceptance is non-critical and login already succeeded, so a
              // blocked click must not fail the session.
              await cookieBtn.click({ timeout: 5_000 }).catch(() => {});
            }
          }
        } catch (err) {
          if (skipOnFailure) {
            // eslint-disable-next-line playwright/no-skipped-test -- pre-provisioned account unavailable
            base.skip(
              true,
              `Login failed for '${username}' on ${portal} — ` +
              `this test requires pre-provisioned data. Skipping. (${err instanceof Error ? err.message : err})`,
            );
          }
          throw err;
        }

        return { id: 0, contactId: 0, username, password, portal, page };
      },

      ensureBuyerAndLogin: async (opts: FixtureBuyerOptions): Promise<AuthenticatedUser> => {
        const { buyerFixtureId, contactFixtureId, settings, ...rest } = opts;
        const portal = rest.portal ?? 'MERX';
        const body = { portal, roles: rest.roles, password: rest.password, timeZone: rest.timeZone };

        const contactUrl = `${TEST_DATA_BASE}/fixtures/${buyerFixtureId}/buyers/contacts/${contactFixtureId}`;
        const response = await request.put(contactUrl, { data: body, timeout: API_TIMEOUT });
        await assertOk(response, `ensureBuyerAndLogin(${buyerFixtureId}/${contactFixtureId})`);
        const json = await response.json();

        const user: SeededUser = {
          id: json.id,
          contactId: json.contactId,
          username: json.username,
          password: json.password,
          portal: json.portal,
          organizationName: json.organizationName,
        };

        if (settings) {
          await api.configureBuyerSettings(user.id, settings);
        }

        const page = await loginUser(user);
        return { ...user, page };
      },

      ensureSupplierAndLogin: async (opts: FixtureSupplierOptions): Promise<AuthenticatedUser> => {
        const { supplierFixtureId, contactFixtureId, ...rest } = opts;
        const portal = rest.portal ?? 'MERX';
        const body = { portal, categories: rest.categories, password: rest.password, timeZone: rest.timeZone };

        const contactUrl = `${TEST_DATA_BASE}/fixtures/${supplierFixtureId}/suppliers/contacts/${contactFixtureId}`;
        const response = await request.put(contactUrl, { data: body, timeout: API_TIMEOUT });
        await assertOk(response, `ensureSupplierAndLogin(${supplierFixtureId}/${contactFixtureId})`);
        const json = await response.json();

        const user: SeededUser = {
          id: json.id,
          contactId: json.contactId,
          username: json.username,
          password: json.password,
          portal: json.portal,
          organizationName: json.organizationName,
        };

        const page = await loginUser(user);
        return { ...user, page };
      },

      ensureBuyer: async (opts: FixtureBuyerOptions): Promise<SeededUser> => {
        const { buyerFixtureId, contactFixtureId, settings, ...rest } = opts;
        const portal = rest.portal ?? 'MERX';
        const body = { portal, roles: rest.roles, password: rest.password, timeZone: rest.timeZone };

        const contactUrl = `${TEST_DATA_BASE}/fixtures/${buyerFixtureId}/buyers/contacts/${contactFixtureId}`;
        const response = await request.put(contactUrl, { data: body, timeout: API_TIMEOUT });
        await assertOk(response, `ensureBuyer(${buyerFixtureId}/${contactFixtureId})`);
        const json = await response.json();

        const user: SeededUser = {
          id: json.id,
          contactId: json.contactId,
          username: json.username,
          password: json.password,
          portal: json.portal,
          organizationName: json.organizationName,
        };

        if (settings) {
          await api.configureBuyerSettings(user.id, settings);
        }
        return user;
      },

      ensureSupplier: async (opts: FixtureSupplierOptions): Promise<SeededUser> => {
        const { supplierFixtureId, contactFixtureId, ...rest } = opts;
        const portal = rest.portal ?? 'MERX';
        const body = { portal, categories: rest.categories, password: rest.password, timeZone: rest.timeZone };

        const contactUrl = `${TEST_DATA_BASE}/fixtures/${supplierFixtureId}/suppliers/contacts/${contactFixtureId}`;
        const response = await request.put(contactUrl, { data: body, timeout: API_TIMEOUT });
        await assertOk(response, `ensureSupplier(${supplierFixtureId}/${contactFixtureId})`);
        const json = await response.json();

        return {
          id: json.id,
          contactId: json.contactId,
          username: json.username,
          password: json.password,
          portal: json.portal,
          organizationName: json.organizationName,
        };
      },

      ensureSolicitation: async (opts: FixtureSolicitationOptions): Promise<SolicitationResult> => {
        // Intentionally does NOT set `hasSeedActivity = true` — the server
        // registers fixtures as `lifecycle=PERSISTENT` and `deleteByOwner`
        // skips them, so triggering cleanup here would be a no-op anyway and
        // would only mask the intent.
        const { buyerFixtureId, solicitationFixtureId, ...body } = opts;
        const url = `${TEST_DATA_BASE}/fixtures/${buyerFixtureId}/solicitations/${solicitationFixtureId}`;
        const response = await request.put(url, { data: body, timeout: API_TIMEOUT });
        await assertOk(response, `ensureSolicitation(${buyerFixtureId}/${solicitationFixtureId})`);
        const json = await response.json();
        return { id: json.id };
      },
    };

    try {
      await use(api);
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
      if (hasSeedActivity) {
        await api.deleteAll();
      }
    }
  },
});

export { expect } from '@playwright/test';
