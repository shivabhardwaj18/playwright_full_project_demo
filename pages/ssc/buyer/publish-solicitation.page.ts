import { Page, Locator, expect } from '@playwright/test';

/**
 * SSC (BidNet) buyer "create + publish solicitation" flow.
 *
 * Ported from the legacy Selenium orchestration in CommonFunctionPage
 * (`click_new_solicitation` → `submit_solicitation_verify_notice_page` →
 * `submit_notice_verify_category_page` → `submit_category_verify_document_page` →
 * `submit_document_verify_status` → `verify_matching_supplier` →
 * `open_courtesy_email_page` → `publish_a_solicitation`) and the underlying
 * BidNet buyer page objects (BitNetNewSolicitationPage, SolicitationNoticePage,
 * SolicitationCategoriesPage, SolicitationDocumentAndItemPage,
 * SolicitationMatchingSupplierPage, SolicitationCourtesyEmailPage,
 * SolicitationPreviewPage).
 *
 * Provisions a fully biddable PUBLISHED solicitation through the UI so a supplier
 * can subsequently place a No Bid (TC-Map-327).
 */
export class SscPublishSolicitationPage {
  private readonly page: Page;

  private readonly newSolicitationBtn: Locator;
  private readonly estimatedValueSection: Locator;
  private readonly estimatedContractValue: Locator;
  private readonly stateDropdown: Locator;
  private readonly countyDropdown: Locator;
  private readonly nextRegion: Locator;
  private readonly specificClientSelect: Locator;
  private readonly title: Locator;
  private readonly solicitationType: Locator;
  private readonly solicitationNumber: Locator;
  private readonly specificDateRadio: Locator;
  private readonly publicationScheduledRadio: Locator;
  private readonly publicationTimestamp: Locator;
  private readonly bidSubmissionElectronic: Locator;
  private readonly twoEnvelopeRadio: Locator;
  private readonly continueButton: Locator;
  private readonly bndServicesSearch: Locator;
  private readonly fileUpload: Locator;
  private readonly documentStatus: Locator;
  private readonly matchingSuppliersTab: Locator;
  private readonly matchingSuppliersHeading: Locator;
  private readonly courtesyEmailTab: Locator;
  private readonly courtesyEmailField: Locator;
  private readonly previewLink: Locator;
  private readonly publishButton: Locator;
  private readonly publishConfirmYes: Locator;
  private readonly successMessage: Locator;
  private readonly sessionSyncDialog: Locator;
  private readonly sessionSyncOkButton: Locator;

  // Bid document structure locators (TC-652: select_bid_document_structure_one)
  private readonly bidDocStructureRadio: Locator;
  private readonly bidItemName0: Locator;
  private readonly bidItemDesc0: Locator;
  private readonly bidItemMandatoryCheck0: Locator;
  private readonly bidItemLimitFileCheck0: Locator;
  private readonly bidItemName1: Locator;
  private readonly bidItemDesc1: Locator;
  private readonly bidItemMandatoryCheck1: Locator;
  private readonly bidItemLimitFileCheck1: Locator;
  // Bid results locators (TC-652: test_015)
  private readonly bidResultsLink: Locator;
  // Preview publication date (TC-441)
  private readonly publicationDateText: Locator;

  // Item-based / in-attached-document / lump-sum pricing (TC-748 / TC-880 / TC-190)
  private readonly itemBasedPricingRadio: Locator;
  private readonly lumpSumPricingRadio: Locator;
  private readonly inAttachedDocumentPricingRadio: Locator;
  // Item-based "manual entry" radio under Bid Submission Process (TC-772: select_item_based_option)
  private readonly itemBasedOptionRadio: Locator;
  private readonly bidSubmissionProcessHeader: Locator;

  // Documents & Items page — add item (TC-748: add_an_item / enter_item_details / save_item)
  private readonly itemsActionsTop: Locator;
  private readonly addItemOptionTop: Locator;
  private readonly itemDescriptionLast: Locator;
  private readonly itemManufacturerLast: Locator;
  private readonly itemPartNoLast: Locator;
  private readonly itemBrandPreferenceLast: Locator;
  private readonly itemUomToggleLast: Locator;
  private readonly itemQtyLast: Locator;
  private readonly saveItemLast: Locator;
  private readonly continueFromDocBtn: Locator;

  // Bid questions (TC-781: add_question / select_mandatory_checkbox_for_bonds)
  private readonly addQuestionsLink: Locator;
  private readonly question0Checkbox: Locator;
  private readonly question1Checkbox: Locator;
  private readonly modifyQuestionsSaveBtn: Locator;
  private readonly mandatoryBondsCheckbox: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newSolicitationBtn = page.locator('a.toolbarNewSolicationBtn');
    this.estimatedValueSection = page.locator('#estimatedValueSection');
    this.estimatedContractValue = page.locator('#estimatedContractValue');
    this.stateDropdown = page.locator('#region_1_2');
    this.countyDropdown = page.locator('#region_1_3');
    this.nextRegion = page.locator('#next');
    this.specificClientSelect = page.locator('[data-test-id="specific-client-on-behalf-of"]');
    this.title = page.locator('#basicInfo_solTitle_EN');
    this.solicitationType = page.locator('#solicitationType');
    this.solicitationNumber = page.locator('#solicitationNumber');
    this.specificDateRadio = page.locator('#closingTimestampTypeSpecificDate');
    // Scheduled publication radio (TC-441). The native input is overlaid by a
    // styled span that intercepts pointer events — click the span, or force-check.
    this.publicationScheduledRadio = page.locator(
      'label[for="publicationTimestampTypeScheduled"] span.radio',
    );
    this.publicationTimestamp = page.locator('#publicationTimestamp');
    this.bidSubmissionElectronic = page.locator('span[class*="inputText"]:text-is("Electronic")');
    // The native #multiEnvelopeRadio input is overlaid by a styled span (METS
    // custom radio); clicking the span toggles the 2-envelope structure.
    this.twoEnvelopeRadio = page.locator('label[for="multiEnvelopeRadio"] span.radio');
    this.continueButton = page.locator('#nextButton');
    this.bndServicesSearch = page.locator('#singleBoxSearchNIGP_SS_textBox');
    this.fileUpload = page.locator('#fileupload-solicitationDocuments');
    this.documentStatus = page.locator("//*[substring(@id, string-length(@id) - string-length('-status') + 1) = '-status']/div/span");
    this.matchingSuppliersTab = page.locator("//*[text()='Matching Suppliers']");
    this.matchingSuppliersHeading = page.locator("//*[@id='solicitationForm']//h2[normalize-space()='Matching Suppliers']");
    this.courtesyEmailTab = page.locator("//*[text()='Courtesy Email']");
    this.courtesyEmailField = page.locator('#bottomInviteButton');
    // The preview link is an icon-only anchor identified by its title
    // ("Solicitation's preview"). Match the title attribute case-insensitively on
    // both terms so it tolerates the straight (') and curly (’) apostrophe variants
    // without depending on the exact apostrophe character.
    this.previewLink = page.locator('a[title*="Solicitation" i][title*="preview" i]');
    this.publishButton = page.locator('#publishButton');
    this.publishConfirmYes = page.locator('#publishSolicitationDialogYesButton');
    this.successMessage = page.locator('div.message-panel-container.success div.message-panel-content');
    // METS rejects a form post with a stale synchronizer token by showing a
    // "Session Synchronisation Failed" modal instead of the expected dialog.
    this.sessionSyncDialog = page.getByText('Session Synchronisation Failed', { exact: false });
    this.sessionSyncOkButton = page
      .locator('button, a, span')
      .filter({ hasText: /^Ok$/ })
      .first();

    this.bidDocStructureRadio = page.locator('#structure_0_SPECIFIC_BID_DOC_STRUCTURE span.radio');
    this.bidItemName0 = page.locator('#bidItemChecklistItemName_0_0_EN');
    this.bidItemDesc0 = page.locator(
      '[id="workingRevision.bidSubmissionSpec.bidSubmissionSpecificationEnvelopes0.bidItemChecklistModel0.localizedInfosMapEN.description"]',
    );
    this.bidItemMandatoryCheck0 = page.locator(
      'label[for="bidItemChecklistModelMandatoryCheckbox_0_0"] span.checkbox',
    );
    this.bidItemLimitFileCheck0 = page.locator(
      'label[for="bidItemChecklistModelLimitSingleFileCheckbox_0_0"] span.checkbox',
    );
    this.bidItemName1 = page.locator('#bidItemChecklistItemName_0_1_EN');
    this.bidItemDesc1 = page.locator(
      '[id="workingRevision.bidSubmissionSpec.bidSubmissionSpecificationEnvelopes0.bidItemChecklistModel1.localizedInfosMapEN.description"]',
    );
    this.bidItemMandatoryCheck1 = page.locator(
      'label[for="bidItemChecklistModelMandatoryCheckbox_0_1"] span.checkbox',
    );
    this.bidItemLimitFileCheck1 = page.locator(
      'label[for="bidItemChecklistModelLimitSingleFileCheckbox_0_1"] span.checkbox',
    );
    // The "Bid Results" tab is a span containing text inside a tab anchor — legacy: //span[contains(text(),'Bid Results')]
    this.bidResultsLink = page.locator('a, span').filter({ hasText: /^Bid Results/ });
    this.publicationDateText = page.locator(
      "xpath=//span[contains(text(), 'Publication Date')]/following::div[contains(@class,'mets-field-body')][1]//p",
    );

    // --- Item-based / in-attached-document / lump-sum pricing (legacy select_pricing) ---
    this.itemBasedPricingRadio = page.locator(':has(> input[data-label="Item Based"]) span').first();
    this.lumpSumPricingRadio = page.locator(':has(> input[data-label="Lump sum"]) span').first();
    this.inAttachedDocumentPricingRadio = page
      .locator(':has(> input[data-label="In attached document"]) span')
      .first();
    // Manual-entry item-based radio (legacy select_item_based_option)
    this.itemBasedOptionRadio = page.locator("label[for='bidSubmissionSpecPricingType_radio_ITEM_BASED'] span.radio");
    this.bidSubmissionProcessHeader = page
      .locator('span')
      .filter({ hasText: /^Bid Submission Process$/ })
      .first();

    // --- Documents & Items: add item (legacy add_an_item / enter_item_details) ---
    this.itemsActionsTop = page.locator('#itemsActionstop');
    this.addItemOptionTop = page.locator('#addItemOptiontop');
    this.itemDescriptionLast = page.locator("xpath=(//textarea[starts-with(@id,'itemDescription')])[last()]");
    this.itemManufacturerLast = page.locator("xpath=(//input[starts-with(@id,'itemManufacturer')])[last()]");
    this.itemPartNoLast = page.locator('input[id^="itemPartNo"]').last();
    this.itemBrandPreferenceLast = page.locator('select[id^="itemBrandPreference"]').last();
    this.itemUomToggleLast = page.locator('span[class*="selection"] span > b').last();
    this.itemQtyLast = page.locator('input[id^="itemQty"]').last();
    this.saveItemLast = page.locator('button[id^="saveItemButton"]').last();
    this.continueFromDocBtn = page.locator('#nextButton');

    // --- Bid questions (legacy add_question / select_mandatory_checkbox_for_bonds) ---
    this.addQuestionsLink = page.getByRole('link', { name: 'Add Questions', exact: true }).first();
    this.question0Checkbox = page
      .locator("input[id='buyerSettingsRevision.ebsQuestionsGOOD_AND_SERVICES.ebsBuyerQuestions0.selected1']")
      .first();
    this.question1Checkbox = page
      .locator("input[id='buyerSettingsRevision.ebsQuestionsGOOD_AND_SERVICES.ebsBuyerQuestions1.selected1']")
      .first();
    this.modifyQuestionsSaveBtn = page.locator("button[id='modifyEbsQuestionsSelectionSaveButton']").first();
    // Mandatory ("responseRequired") checkbox for the first question (Bonds).
    // Legacy used a brittle global index ((//span[@class='checkbox '])[41]); the
    // real input is overlaid by a styled span that intercepts clicks, so target
    // the input directly and check() it with force.
    this.mandatoryBondsCheckbox = page.locator(
      '[id="workingRevision.bidSubmissionSpec.bidSubmissionSpecificationEnvelopes[0].bidSubmissionSpecificationQuestions[0].responseRequired"]',
    );
  }

  /**
   * Accept the cookie banner. It re-renders on each navigation and its overlay
   * intercepts toolbar/Next clicks, so this is called defensively before the
   * click-heavy steps. Accepting sets a consent cookie that suppresses it.
   */
  private async acceptCookieBanner(): Promise<void> {
    const accept = this.page.locator('#cookieBannerAcceptBtn');
    if (await accept.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await accept.click().catch(() => {});
      await this.page.locator('.cookie-banner').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    }
  }

  /** Open the New Solicitation form from the buyer toolbar. */
  async clickNewSolicitation(): Promise<void> {
    await this.acceptCookieBanner();
    await this.newSolicitationBtn.click();
    await this.estimatedValueSection.waitFor({ state: 'visible' });
  }

  /** Notice page step 1: estimated value, state + county, next. */
  async fillNewSolicitation(opts?: {
    byInvitation?: boolean;
    vendorRotation?: boolean;
  }): Promise<void> {
    await this.acceptCookieBanner();
    // Default notice type for pre-attached matching (TC-202: Goods).
    const goods = this.page.locator('#noticeType_radio_GOOD_AND_SERVICES');
    if (await goods.count()) {
      await goods.check({ force: true }).catch(() => {});
    }
    await this.estimatedContractValue.fill('100');

    // Select state. If the county cascade AJAX doesn't fire (county dropdown stays
    // absent after ~8 s), re-select state so the change event is re-dispatched.
    await this.selectRegionOption(this.stateDropdown, 'Florida');
    const countyAttached = await this.countyDropdown
      .waitFor({ state: 'attached', timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (!countyAttached) {
      await this.stateDropdown.selectOption({ label: 'Florida' }).catch(() => {});
      await this.page.waitForTimeout(2_000);
    }

    await this.selectRegionOption(this.countyDropdown, 'Bay County');

    if (opts?.byInvitation) {
      await this.selectByInvitation(!!opts?.vendorRotation);
    }
    if (opts?.vendorRotation) {
      await expect(this.page.locator('#invitationSolicitation')).toBeChecked({ timeout: 5_000 });
      await this.ensureVendorRotationChecked();
    }

    // Some MERX/BND pages float a Yandex.Metrica popup that intercepts the next click.
    await this.page.evaluate(() => {
      const popup = document.getElementById('ym-auto-pop-up-container');
      if (popup) popup.style.display = 'none';
    });
    await this.acceptCookieBanner();
    // Selecting "By Invitation" fires an async re-render that can silently reset the
    // rotation checkbox after we checked it — re-assert immediately before submitting so
    // the wizard resolves to the rotation flow (auto-selected supplier) rather than a
    // plain by-invitation flow (manual "Selected Supplier (0)").
    if (opts?.vendorRotation) {
      await this.ensureVendorRotationChecked();
    }
    await this.nextRegion.click();
    await this.title.waitFor({ state: 'visible' });
  }

  /**
   * Fill estimated value and Florida / Bay County without clicking Next.
   * Used when the next step is expected to stay on this form (validation error).
   */
  async fillNewSolicitationLocationAndValue(): Promise<void> {
    await this.acceptCookieBanner();
    const goods = this.page.locator('#noticeType_radio_GOOD_AND_SERVICES');
    if (await goods.count()) {
      await goods.check({ force: true }).catch(() => {});
    }
    await this.estimatedContractValue.fill('100');
    await this.selectRegionOption(this.stateDropdown, 'Florida');
    const countyAttached = await this.countyDropdown
      .waitFor({ state: 'attached', timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (!countyAttached) {
      await this.stateDropdown.selectOption({ label: 'Florida' }).catch(() => {});
      await this.page.waitForTimeout(2_000);
    }
    await this.selectRegionOption(this.countyDropdown, 'Bay County');
    await this.page.evaluate(() => {
      const popup = document.getElementById('ym-auto-pop-up-container');
      if (popup) popup.style.display = 'none';
    });
    await this.acceptCookieBanner();
  }

  async clickNewSolicitationNext(): Promise<void> {
    await this.acceptCookieBanner();
    await this.nextRegion.click();
  }

  async expectSpecificClientOnBehalfField(): Promise<void> {
    await expect(this.specificClientSelect).toBeVisible();
  }

  async expectNoActiveClientsOnBehalfMessage(): Promise<void> {
    await expect(this.specificClientSelect).toBeVisible();
    // METS keeps `.mets-field-error` at display:none until the field body is hovered.
    await this.specificClientSelect.hover();
    await expect(this.page.locator('[id="onBehalfOf.errors"]')).toBeVisible();
    await expect(this.page.locator('[id="onBehalfOf.errors"]')).toHaveText(
      'You must have a client organization created before you can continue with this solicitation.',
    );
    await expect(this.title).toBeHidden();
  }

  /**
   * Select the "By Invitation" publication method. METS overlays the native radio with a
   * styled span; a synthetic click dispatched on the input (or a Playwright coordinate
   * click) checks the radio but does NOT reliably fire the framework handler that
   * re-renders the form to reveal the Vendor Rotation checkbox. A native element.click()
   * on the label's span does (verified via live inspection). When rotation is required,
   * poll until that reveal actually happens, re-clicking the span each iteration.
   */
  private async selectByInvitation(expectRotationReveal: boolean): Promise<void> {
    const radio = this.page.locator('#invitationSolicitation');
    const rotation = this.page.locator('#useVendorRotation');
    await expect(async () => {
      await this.page.evaluate(() => {
        const span = document.querySelector(
          "label[for='invitationSolicitation'] span.radio",
        ) as HTMLElement | null;
        span?.click();
      });
      await expect(radio).toBeChecked({ timeout: 1_000 });
      if (expectRotationReveal) {
        await expect(rotation).toBeVisible({ timeout: 3_000 });
      }
    }).toPass({ timeout: 30_000 });
  }

  /**
   * Ensure the Use Vendor Rotation checkbox is checked. METS overlays the native input
   * with a styled span; clicking that span fires the framework's handler reliably, whereas
   * a forced `check()` on the input can be reverted by the By-Invitation re-render. Only
   * clicks when currently unchecked (idempotent) and retries until the input reports checked.
   */
  private async ensureVendorRotationChecked(): Promise<void> {
    const input = this.page.locator('#useVendorRotation');
    // The control is present-but-hidden until selecting "By Invitation" fires an async
    // re-render that reveals AND wires up its toggle handler. Polling on count() passes
    // instantly (the input exists while hidden) and lets us click before the handler is
    // ready — the checkbox then silently drops on submit and the wizard renders the plain
    // by-invitation flow (Categories + manual "Selected Supplier (0)") instead of the
    // rotation flow. Gating on visibility ensures the re-render has completed.
    await input.waitFor({ state: 'visible', timeout: 20_000 });
    await expect(async () => {
      if (!(await input.isChecked().catch(() => false))) {
        // Mirror a native element.click() on the styled span. A Playwright coordinate
        // click can miss the zero-size/overlaid control, but the DOM click fires the
        // framework's toggle handler reliably (verified via live inspection).
        await this.page.evaluate(() => {
          const span = document.querySelector(
            "label[for='useVendorRotation'] span.checkbox",
          ) as HTMLElement | null;
          span?.click();
        });
      }
      await expect(input).toBeChecked({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
  }

  /** Publish success message for invitation solicitations (includes invite wording). */
  async expectInvitationPublishSuccess(): Promise<void> {
    const msg = this.page.locator('.message-panel.success, .message-panel-content').first();
    await expect(msg).toBeVisible({ timeout: 60_000 });
    await expect(msg).toContainText(
      /has been successfully published and invitations will be sent/i,
    );
  }

  /** Notice page step 2: title, type, number, dates, description, electronic bid, continue. */
  async fillNoticeDetails(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Formal)' });
    await this.page.waitForTimeout(1000);
    await this.solicitationNumber.fill(String(Math.floor(100000 + Math.random() * 2999999999)));
    // "Specific Date" is selected by default; ensure it (custom span + sticky toolbar intercept normal clicks).
    if (!(await this.specificDateRadio.isChecked())) {
      await this.specificDateRadio.check({ force: true });
    }
    await this.page.waitForTimeout(1000);

    await this.pickFutureDate('closingTimestamp', 5);
    await this.pickFutureDate('questionAcceptanceDeadlineLocal', 4);
    await this.pickFutureDate('deliveryDate', 10);

    await this.enterDescription('Test');

    // Best-effort: select Electronic bid submission if the option is rendered.
    const electronic = this.bidSubmissionElectronic.first();
    if (await electronic.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await electronic.scrollIntoViewIfNeeded().catch(() => {});
      await electronic.click().catch(() => {});
      await this.page.waitForTimeout(1_000);
    }

    await this.continueButton.click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Notice page step 2 for a TWO-ENVELOPE solicitation (TC-658): title, type,
   * number, dates, description, Electronic bid submission, then the "2 Envelopes"
   * radio, then continue.
   *
   * Deliberately written WITHOUT explicit waitForTimeout calls — it relies on
   * Playwright's auto-waiting and web-first waits to exercise whether the
   * framework copes with the BND notice page's async rendering on its own.
   */
  async fillNoticeDetailsWithTwoEnvelopes(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Formal)' });
    // "Specific Date" is selected by default; ensure it (custom span + sticky toolbar intercept normal clicks).
    if (!(await this.specificDateRadio.isChecked())) {
      await this.specificDateRadio.check({ force: true });
    }

    // pickFutureDate sets the value via the field's flatpickr JS instance. That
    // instance initialises asynchronously after "Specific Date" is checked, and the
    // setter silently no-ops if it isn't ready yet (this is why the legacy code slept
    // here). Auto-waiting can't cover a page.evaluate JS call, so instead poll: set,
    // then verify the input received a value, retrying until the instance is ready.
    const setFutureDate = async (inputId: string, days: number): Promise<void> => {
      await expect(async () => {
        await this.pickFutureDate(inputId, days);
        await expect(this.page.locator(`#${inputId}`)).not.toHaveValue('', { timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
    };
    await setFutureDate('closingTimestamp', 5);
    await setFutureDate('questionAcceptanceDeadlineLocal', 4);
    await setFutureDate('deliveryDate', 10);

    await this.enterDescription('Test');

    // Electronic bid submission must be selected before the envelope structure renders.
    await this.clickElectronicBidSubmission();

    // Select the 2-envelope structure (Envelope 1 - Identity & Proposal,
    // Envelope 2 - Pricing). The radio auto-waits to be actionable.
    await this.twoEnvelopeRadio.scrollIntoViewIfNeeded().catch(() => {});
    await this.twoEnvelopeRadio.click();

    // Fill the solicitation number LAST: selecting the type / Electronic / envelope
    // structure each re-renders the Basic Information section and wipes a number
    // entered earlier. Filling after all re-renders — and asserting the value stuck
    // (web-first, retried) — keeps this deterministic with no fixed waitForTimeout.
    const solicitationNumber = String(Math.floor(100000 + Math.random() * 2999999999));
    await expect(async () => {
      await this.solicitationNumber.fill(solicitationNumber);
      await this.solicitationNumber.blur();
      await expect(this.solicitationNumber).toHaveValue(solicitationNumber, { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });

    await this.continueButton.click();
  }

  /** Categories step: search the NIGP service code, select it, continue. */
  async selectCategory(categoryCode: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.bndServicesSearch.waitFor({ state: 'visible', timeout: 30_000 });
    await this.bndServicesSearch.fill(categoryCode);
    await this.page.waitForTimeout(2000);
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(1000);
    await this.page.keyboard.press('Space');
    await this.continueButton.click();
    await this.page.waitForTimeout(2000);
  }

  /** Documents step: upload the PDF and wait for its processing status to render. */
  async uploadDocument(pdfPath: string): Promise<void> {
    await this.fileUpload.waitFor({ state: 'attached' });
    await this.fileUpload.setInputFiles(pdfPath);
    await this.documentStatus.first().waitFor({ state: 'visible', timeout: 60_000 });
  }

  /** Navigate to the Matching Suppliers tab and confirm the heading. */
  async gotoMatchingSuppliers(): Promise<void> {
    await this.page.waitForTimeout(2000);
    // The tab click can be swallowed while the items page is still settling
    // after the last item save, so retry the click until the heading renders.
    await expect(async () => {
      await this.matchingSuppliersTab.first().click({ timeout: 10_000 });
      await this.matchingSuppliersHeading.waitFor({ state: 'visible', timeout: 10_000 });
    }).toPass({ timeout: 60_000 });
  }

  /** Navigate to the Courtesy Email tab and confirm the invite field. */
  async gotoCourtesyEmail(): Promise<void> {
    await this.page.waitForTimeout(2000);
    await this.courtesyEmailTab.first().click();
    await this.courtesyEmailField.waitFor({ state: 'visible', timeout: 30_000 });
  }

  /**
   * TC-441: open the buyer preview tab WITHOUT publishing, so the caller can
   * assert preview-only details (e.g. the scheduled Publication Date) before the
   * publish/confirm step runs.
   */
  async gotoPreview(): Promise<void> {
    await this.page.waitForTimeout(2000);
    await this.previewLink.click();
  }

  /** Open the preview tab, capture the solicitation id, then publish + confirm. */
  async openPreviewPublishAndGetId(): Promise<number> {
    await this.page.waitForTimeout(2000);
    await this.previewLink.click();
    await this.publishButton.waitFor({ state: 'visible', timeout: 30_000 });
    const id = this.extractSolicitationId(this.page.url());

    // The Publish button lives in the persistent top toolbar, so it is clickable
    // before the preview's server-side synchronizer (CSRF) token finishes
    // loading. Submitting too early makes METS reject the post with a
    // "Session Synchronisation Failed" modal, so the publish-confirm dialog
    // never appears. Let the preview settle first, then publish — and if the
    // session-sync error still appears, dismiss it and retry with a fresh page.
    await this.page.waitForLoadState('load').catch(() => {});
    await this.page.waitForTimeout(3_000);

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.publishButton.click();

      const confirmVisible = await this.publishConfirmYes
        .waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => true)
        .catch(() => false);
      if (confirmVisible) {
        await this.publishConfirmYes.click();
        return id;
      }

      // Not the confirm dialog — check for the session-sync error and recover.
      if (await this.sessionSyncDialog.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await this.sessionSyncOkButton.click({ timeout: 5_000 }).catch(() => {});
        // Reload the preview so the page picks up a fresh synchronizer token.
        await this.page.reload({ waitUntil: 'load' }).catch(() => {});
        await this.publishButton.waitFor({ state: 'visible', timeout: 30_000 });
        await this.page.waitForTimeout(2_000);
        continue;
      }

      // Neither dialog surfaced; one last attempt to expose the real error.
      await this.publishConfirmYes.click({ timeout: 5_000 });
      return id;
    }

    // Exhausted retries — surface the failure clearly.
    await this.publishConfirmYes.click();
    return id;
  }

  /** Read the green publish success banner. */
  async getPublishSuccessMessage(): Promise<string> {
    await this.successMessage.first().waitFor({ state: 'visible', timeout: 30_000 });
    return (await this.successMessage.first().textContent())?.trim() ?? '';
  }

  /**
   * TC-652 / TC-646: Fill notice details AND configure the specific bid document structure.
   * Uses "ITB - Invitation to Bid (Informal)" and inserts QA1/QA2 bid items between
   * the Electronic bid-submission selection and the Continue click.
   *
   * @param bothItemsMandatory - when true (TC-646 `select_bid_document_structure`),
   *   also checks mandatory + limit-single-file on QA2. When false (TC-652
   *   `select_bid_document_structure_one`), QA2 stays unchecked ("No"/"No").
   */
  async fillNoticeDetailsWithBidDocStructure(
    title: string,
    bothItemsMandatory = false,
  ): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Informal)' });
    await this.page.waitForTimeout(3000);

    await this.solicitationNumber.fill(String(Math.floor(100000 + Math.random() * 2_999_999_999)));
    if (!(await this.specificDateRadio.isChecked())) {
      await this.specificDateRadio.check({ force: true });
    }
    await this.page.waitForTimeout(3000);

    await this.pickFutureDate('closingTimestamp', 5);
    await this.pickFutureDate('questionAcceptanceDeadlineLocal', 4);
    await this.pickFutureDate('deliveryDate', 10);
    await this.enterDescription('Test');

    // Select Electronic bid submission type (legacy: click_bid_submission_type sleep(2) before/after)
    await this.page.waitForTimeout(2000);
    const electronic = this.bidSubmissionElectronic.first();
    if (await electronic.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await electronic.scrollIntoViewIfNeeded().catch(() => {});
      await electronic.click().catch(() => {});
      await this.page.waitForTimeout(2000);
    }

    // Scroll to "Bid Submission Process" section, click "Specific Bid Doc Structure" radio
    const bidSubmissionProcessLabel = this.page
      .locator('span')
      .filter({ hasText: /^Bid Submission Process$/ })
      .first();
    await bidSubmissionProcessLabel.scrollIntoViewIfNeeded().catch(() => {});
    await this.bidDocStructureRadio.click();
    await this.page.waitForTimeout(2000); // legacy sleep(2) after radio click

    // Item 1: QA1, mandatory + limit-single-file checked
    await this.bidItemName0.fill('QA1');
    await this.bidItemDesc0.fill('QA1');
    await this.bidItemMandatoryCheck0.click();
    await this.bidItemLimitFileCheck0.click();

    // Item 2: QA2 — optional mandatory/limit (TC-646 checks both; TC-652 leaves unchecked)
    await this.bidItemName1.fill('QA2');
    await this.bidItemDesc1.fill('QA2');
    if (bothItemsMandatory) {
      await this.bidItemMandatoryCheck1.click();
      await this.bidItemLimitFileCheck1.click();
    }

    await this.continueButton.click();
    await this.page.waitForTimeout(3000);
  }

  /**
   * TC-441: Notice details with a scheduled (future) publication timestamp.
   * Returns the publication timestamp input value for later assertions.
   * Legacy: enter_title → type → number → specific date → QAD →
   *   click_publication_scheduled → delivery → Electronic → continue.
   */
  async fillNoticeDetailsWithScheduledPublication(title: string): Promise<string> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Formal)' });
    await this.clickElectronicBidSubmission();
    // Select "Scheduled" publication. Prefer the styled span click; fall back to
    // force-checking the native radio when the sticky toolbar intercepts.
    const scheduledSpan = this.publicationScheduledRadio.first();
    await scheduledSpan.scrollIntoViewIfNeeded().catch(() => {});
    const clicked = await scheduledSpan
      .click({ timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (!clicked) {
      await this.page.locator('#publicationTimestampTypeScheduled').check({ force: true });
    }
    // Schedule publication ~1 day out via flatpickr (replaces brittle keyboard dance).
    await expect(async () => {
      await this.pickFutureDate('publicationTimestamp', 1);
      await expect(this.publicationTimestamp).not.toHaveValue('', { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    const publicationTimestamp = (await this.publicationTimestamp.inputValue()).trim();
    await this.setNoticeDatesVerified();
    await this.enterDescription('Test');
    await this.fillSolicitationNumberLast();
    await this.continueButton.click();
    return publicationTimestamp;
  }

  /** TC-441: preview "Publication Date" contains the scheduled timestamp. */
  async verifyPublicationDateContains(timestamp: string): Promise<boolean> {
    await this.publicationDateText.first().waitFor({ state: 'visible', timeout: 30_000 });
    const text = (await this.publicationDateText.first().textContent())?.trim() ?? '';
    return text.includes(timestamp);
  }

  /** TC-196: read a saved item description cell by 1-based row index. */
  async getItemDescription(row: number): Promise<string> {
    const cell = this.page.locator(`xpath=(//td[@class='description'])[${row}]`);
    await cell.waitFor({ state: 'visible', timeout: 30_000 });
    return (await cell.textContent())?.trim() ?? '';
  }

  /**
   * Documents & Items "Group Items" toggle is on.
   * `#groupItemToggle` is aria-hidden; `div.switch.on` is also hidden, so
   * `isVisible()` is a false negative when grouping is enabled.
   */
  async isGroupItemToggleActivated(): Promise<boolean> {
    const input = this.page.locator('#groupItemToggle');
    if (await input.count()) {
      return input.isChecked().catch(() => false);
    }
    const toggle = this.page.locator('.group-items-toggle-container div.switch').first();
    try {
      await toggle.waitFor({ state: 'attached', timeout: 15_000 });
      return ((await toggle.getAttribute('class')) ?? '').split(/\s+/).includes('on');
    } catch {
      return false;
    }
  }

  /**
   * TC-639: add a project, a Cost Allowance group, and two priced items (QA1/QA2).
   * Legacy `add_group_and_add_cost_allowance_group`.
   */
  async addGroupAndAddCostAllowance(projectName: string): Promise<void> {
    const suffix = Math.floor(10000 + Math.random() * 89_999).toString();
    const projectNameWithNumber = `${projectName}${suffix}`;
    const groupCode = Math.floor(100000 + Math.random() * 899_999).toString();

    await this.continueFromDocBtn.scrollIntoViewIfNeeded().catch(() => {});

    await this.openItemsActionThenClick('#addItemProjectOptiontop');
    await this.page.locator('#itemProjectName').fill(projectNameWithNumber);
    await this.page.locator('#itemProjectDlgSave').click();

    await this.page.locator('#itemProjectActions0').first().click();
    await this.page.locator('#addItemGroupOption_0').click();
    await this.page
      .locator("[id='workingRevision.itemProjects0.projectGroups0.code']")
      .first()
      .fill(groupCode);
    await this.page
      .locator("[id='workingRevision.itemProjects0.projectGroups0.name']")
      .first()
      .fill(projectNameWithNumber);

    const groupType = this.page.locator("select[id*='projectGroups0.groupType']").first();
    // Cost Allowance is selected via keyboard ARROW_DOWN in legacy; prefer label, then index.
    const costAllowanceOpt = groupType.locator('option').filter({ hasText: /Cost Allowance/i }).first();
    if (await costAllowanceOpt.count().then((n) => n > 0).catch(() => false)) {
      const value = await costAllowanceOpt.getAttribute('value');
      if (value) {
        await groupType.selectOption(value);
      } else {
        await groupType.selectOption({ label: (await costAllowanceOpt.textContent())?.trim() ?? '' });
      }
    } else {
      await groupType.selectOption({ index: 1 });
    }
    await this.page.locator('#itemGroupDlgSave').click();

    await this.page.locator("[id^='itemGroupActions']").first().click();
    await this.clickAddAnItem();
    await this.page.locator('#itemPrice0').first().fill('15000');
    await this.page.locator('#itemDescription0').first().fill('QA1');
    await this.page.getByRole('button', { name: 'Save & Add another Item' }).first().click();

    await this.page.locator('#itemPrice1').first().fill('25000');
    await this.page.locator('#itemDescription1').first().fill('QA2');
    await this.page.locator('#saveItemButton1').click();
  }

  /** TC-639: prices shown for the two cost-allowance items after save. */
  async getAddedPrices(): Promise<[string, string]> {
    const prices = this.page.locator('td.price');
    await prices.nth(0).waitFor({ state: 'visible', timeout: 30_000 });
    const p1 = (await prices.nth(0).textContent())?.trim() ?? '';
    const p2 = (await prices.nth(1).textContent())?.trim() ?? '';
    return [p1, p2];
  }

  /** TC-633: manufacturer cells after adding a Standard group (legacy verify_manufacturer_text). */
  async getManufacturerTexts(): Promise<[string, string]> {
    const m1 = this.page.locator('#itemListRow_0 td.manufacturer');
    const m2 = this.page.locator('#itemListRow_1 td.manufacturer');
    await m1.waitFor({ state: 'visible', timeout: 30_000 });
    return [
      (await m1.textContent())?.trim() ?? '',
      (await m2.textContent())?.trim() ?? '',
    ];
  }

  /**
   * TC-624: notice details without selecting Electronic — default Physical Bid Submission.
   */
  async fillNoticeDetailsPhysicalBid(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Formal)' });
    await this.setNoticeDatesVerified();
    await this.enterDescription('Test');
    await this.fillSolicitationNumberLast();
    await this.continueButton.click();
  }

  /**
   * TC-670: Informal notice with bid questions; asserts Bonds / Business Description
   * appear on the notice page before continue (legacy verify_added_questions_for_bnd).
   */
  async fillNoticeDetailsWithQuestionsAndVerify(title: string): Promise<[string, string]> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Informal)' });
    await this.clickElectronicBidSubmission();
    await this.addQuestion();
    // Question Name cells — class names vary; match by exact cell text.
    const q1 = this.page.getByRole('cell', { name: 'Bonds', exact: true }).first();
    const q2 = this.page.getByRole('cell', { name: 'Business Description', exact: true }).first();
    await q1.waitFor({ state: 'visible', timeout: 30_000 });
    const names: [string, string] = [
      (await q1.textContent())?.trim() ?? '',
      (await q2.textContent())?.trim() ?? '',
    ];
    await this.selectMandatoryCheckboxForBonds();
    await this.setNoticeDatesVerified();
    await this.enterDescription('Test');
    await this.fillSolicitationNumberLast();
    await this.continueButton.click();
    return names;
  }

  /** Expand the Bonding Requirements accordion (collapsed by default). */
  private async expandBondingRequirements(): Promise<void> {
    const header = this.page
      .getByText('Bonding Requirements', { exact: false })
      .first();
    await header.scrollIntoViewIfNeeded().catch(() => {});
    await header.waitFor({ state: 'visible', timeout: 30_000 });
    await header.click();
  }

  /** Expand Bonding Requirements and select E-bonding (legacy select_ssc_buyer_e_bonding). */
  async selectEBonding(): Promise<void> {
    await this.expandBondingRequirements();
    const checkbox = this.page
      .getByText(/Bidders must provide E-bonding/i)
      .first();
    await checkbox.waitFor({ state: 'visible', timeout: 15_000 });
    await checkbox.click();
  }

  /** Expand Bonding Requirements and select EFT (legacy select_ssc_buyer_eft_option). */
  async selectEftOption(): Promise<void> {
    await this.expandBondingRequirements();
    const checkbox = this.page
      .getByText(/Require Electronic Fund Transfer \(EFT\)/i)
      .first();
    await checkbox.waitFor({ state: 'visible', timeout: 15_000 });
    await checkbox.click();
  }

  /**
   * TC-597: Informal ITB notice with Electronic + E-bonding selected.
   */
  async fillNoticeDetailsWithEBonding(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Informal)' });
    await this.clickElectronicBidSubmission();
    await this.selectEBonding();
    await this.setNoticeDatesVerified();
    await this.enterDescription('Test');
    await this.fillSolicitationNumberLast();
    await this.continueButton.click();
  }

  /**
   * TC-609: Informal RFQ notice with Electronic + EFT selected.
   */
  async fillNoticeDetailsWithEft(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'RFQ - Request for Quote (Informal)' });
    await this.clickElectronicBidSubmission();
    await this.selectEftOption();
    await this.setNoticeDatesVerified();
    await this.enterDescription('Test');
    await this.fillSolicitationNumberLast();
    await this.continueButton.click();
  }

  /** Expand Bid Results and return uploaded e-bonding filename if present. */
  async expandAllBidResultsAndGetEBondingFileName(): Promise<string> {
    await this.clickBidResultsTab();
    const expand = this.page.locator('#expandAllLink');
    if (await expand.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expand.click();
    }
    const file = this.page.locator("[title='test_pdf.pdf'], a").filter({ hasText: /test_pdf\.pdf/i }).first();
    if (await file.isVisible({ timeout: 10_000 }).catch(() => false)) {
      return (await file.getAttribute('title')) || (await file.textContent())?.trim() || '';
    }
    const body = (await this.page.locator('body').innerText()) ?? '';
    return body.includes('test_pdf.pdf') ? 'test_pdf.pdf' : '';
  }

  /**
   * TC-612: expand Pre-Bidding Events and add an Onsite Visit (Mandatory) with
   * location + note. Legacy `add_pre_bidding_event`.
   */
  async addPreBiddingEvent(location: string, eventNote: string): Promise<void> {
    const header = this.page.getByText('Pre-Bidding Events', { exact: false }).first();
    await header.scrollIntoViewIfNeeded().catch(() => {});
    await header.waitFor({ state: 'visible', timeout: 30_000 });
    await header.click();
    const addBtn = this.page.locator('#addPreBidEventButton');
    await addBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await addBtn.click();
    const typeSelect = this.page.locator('#preBidEventType0');
    await typeSelect.waitFor({ state: 'visible', timeout: 15_000 });
    // Prefer label match; fall back to index 2 (legacy ARROW_DOWN x2).
    const onsiteOpt = typeSelect.locator('option').filter({ hasText: /Onsite Visit/i }).first();
    if (await onsiteOpt.count()) {
      const label = ((await onsiteOpt.textContent()) ?? '').trim();
      await typeSelect.selectOption({ label });
    } else {
      await typeSelect.selectOption({ index: 2 });
    }
    // Attendance radio — avoid matching hidden bid-checklist "Mandatory" aria labels.
    const mandatory = this.page
      .getByRole('group', { name: /Attendance/i })
      .getByRole('radio', { name: /^Mandatory$/i })
      .or(this.page.getByRole('radio', { name: /^Mandatory$/i }))
      .first();
    await mandatory.waitFor({ state: 'attached', timeout: 15_000 });
    await mandatory.check({ force: true }).catch(async () => {
      await mandatory.click({ force: true });
    });
    // Event date ~1 day out — discover flatpickr input under the pre-bid block.
    const dateInput = this.page
      .getByRole('textbox', { name: /Event date/i })
      .or(
        this.page.locator(
          "#preBidEventDate0, input[id*='preBidEvent'][id*='ate'], input[name*='preBidEventsModel'][id*='ate']",
        ),
      )
      .first();
    await dateInput.waitFor({ state: 'attached', timeout: 15_000 });
    const id = (await dateInput.getAttribute('id').catch(() => null)) ?? 'preBidEventDate0';
    await expect(async () => {
      await this.pickFutureDate(id, 1);
      const val = await this.page.locator(`#${id}`).inputValue().catch(() => '');
      expect(val).not.toBe('');
    }).toPass({ timeout: 20_000 });
    await this.page
      .locator("input[name='workingRevision.preBidEventsModel[0].eventLocation']")
      .or(this.page.getByRole('textbox', { name: /^Location/i }))
      .first()
      .fill(location);
    // Event Note is a CKEditor iframe (title: Rich Text Editor, preBidEventNote0EN).
    const noteFrame = this.page.frameLocator(
      "iframe[title='Rich Text Editor, preBidEventNote0EN'], iframe[title*='preBidEventNote']",
    );
    const noteBody = noteFrame.locator('body.cke_editable').first();
    if (await noteBody.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await noteBody.click();
      await noteBody.fill(eventNote);
    } else {
      const note = this.page
        .locator(
          "textarea[name*='preBidEventsModel'], textarea[id*='preBidEvent'][id*='ote'], input[name*='eventNote']",
        )
        .first();
      if (await note.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await note.fill(eventNote);
      } else {
        await this.page.keyboard.press('Tab');
        await this.page.keyboard.type(eventNote);
      }
    }
  }

  /**
   * TC-612 notice: Informal + Electronic + pre-bidding event.
   */
  async fillNoticeDetailsWithPreBiddingEvent(
    title: string,
    location: string,
    eventNote: string,
  ): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Informal)' });
    await this.clickElectronicBidSubmission();
    await this.addPreBiddingEvent(location, eventNote);
    await this.setNoticeDatesVerified();
    await this.enterDescription('Test');
    await this.fillSolicitationNumberLast();
    await this.continueButton.click();
  }

  /**
   * TC-582: Required Acknowledgement toggle + name/details.
   * Legacy `click_acknowledgement_add_details`.
   */
  async addRequiredAcknowledgement(name: string, details: string): Promise<void> {
    const header = this.page.getByText('Required Acknowledgement', { exact: false }).first();
    await header.scrollIntoViewIfNeeded().catch(() => {});
    await header.waitFor({ state: 'visible', timeout: 30_000 });
    await header.click();
    const toggle = this.page.locator('#basic_toggle_acknowledgementRequired_toggle');
    await toggle.waitFor({ state: 'visible', timeout: 15_000 });
    await toggle.click({ force: true });
    const nameField = this.page.locator('#requiredAcknowledgement_name_EN');
    await nameField.waitFor({ state: 'visible', timeout: 15_000 });
    await nameField.fill(name);
    // Details field — rich text / textarea after the name.
    const detailsField = this.page
      .locator(
        "textarea[id*='requiredAcknowledgement'], textarea[name*='requiredAcknowledgement'], iframe[title*='acknowledgement' i]",
      )
      .first();
    if (await detailsField.evaluate((el) => el.tagName.toLowerCase() === 'iframe').catch(() => false)) {
      const body = this.page
        .frameLocator("iframe[title*='acknowledgement' i], iframe[title*='Rich Text' i]")
        .locator('body.cke_editable')
        .first();
      await body.click();
      await body.fill(details);
    } else if (await detailsField.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await detailsField.fill(details);
    } else {
      await this.page.keyboard.press('Tab');
      await this.page.keyboard.type(details);
    }
  }

  /** TC-582 notice: Formal + acknowledgement + Electronic. */
  async fillNoticeDetailsWithAcknowledgement(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Formal)' });
    await this.addRequiredAcknowledgement('Buyer', 'acknowledgement details');
    await this.clickElectronicBidSubmission();
    await this.setNoticeDatesVerified();
    await this.enterDescription('Test');
    await this.fillSolicitationNumberLast();
    await this.continueButton.click();
  }

  /**
   * TC-594: open Buyer Preferences accordion and select all listed options
   * (legacy select_all_buyer_pref_option + select_all_ssc_buyer_pref_option).
   */
  async selectAllBuyerPreferences(): Promise<void> {
    // Legacy scrolls Bid Submission Process into view before opening preferences.
    await this.page
      .getByText('Bid Submission Process', { exact: false })
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
    const header = this.page
      .getByText('Buyer Preferences, Guidelines & Requirements', { exact: false })
      .first();
    await header.scrollIntoViewIfNeeded().catch(() => {});
    await header.click();
    const labels = [
      'Bid Deposit Required',
      'Bidder Prequalification/Preregistration Required',
      'Contractors License Required',
      'Installation Required',
      'Insurance Required',
      'Local Service Required',
      'Onsite Maintenance Required',
      'Prevailing Wage Required',
      'Samples Required',
      'Training Required',
      'Warranty Information Required',
      'License Required',
      'Irrevocable Letter of Credit',
      'Employee Background Checks Required',
      'Certification/Training',
      'Federally Funded',
      'Certified Payroll',
      'Safety Standards Plan',
      'Spill Containment Plan',
      'Material Safety Data Sheets Required',
      'Security Badges',
      'Payment by Credit Card',
      'FOB Destination',
      'FOB Pre-Paid',
      'All or None Award',
      'Reserve Rights to Award by Line Item',
      'Minority Business Participation',
      'Small Business Participation',
      'Women-Owned Business Participation',
      'Disadvantaged Business Enterprise (DBE)',
      'Service-Disabled Veteran Owned',
      'Business Concern',
      'Native American Participation',
      'Airport Concessionaires Disadvantaged Business Enterprise (ACDBE)',
    ];
    const first = this.page.getByRole('checkbox', { name: labels[0], exact: true });
    await first.waitFor({ state: 'attached', timeout: 20_000 });
    for (const label of labels) {
      const box = this.page.getByRole('checkbox', { name: label, exact: true });
      await box.scrollIntoViewIfNeeded().catch(() => {});
      await box.check({ force: true });
    }
  }

  /** TC-594 notice: Formal + Electronic + all buyer preferences. */
  async fillNoticeDetailsWithBuyerPreferences(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Formal)' });
    await this.clickElectronicBidSubmission();
    await this.selectAllBuyerPreferences();
    await this.setNoticeDatesVerified();
    await this.enterDescription('Test');
    await this.fillSolicitationNumberLast();
    await this.continueButton.click();
  }

  /**
   * TC-664: add two plain items on Documents & Items (not under a project group).
   * Legacy `add_two_items_in_upload_document_page`.
   */
  async addTwoItemsQa1Qa2(): Promise<void> {
    await this.addItem();
    await this.page.locator('#itemDescription0').first().fill('QA1');
    await this.page.locator('#itemManufacturer0').first().fill('QA1');
    await this.page.locator('#itemPartNo0').first().fill('123');
    await this.page.locator('#itemBrandPreference0').selectOption({ index: 1 });
    await this.page.locator('#itemUom0').selectOption({ index: 1 });
    await this.page.locator('#itemQty0').first().fill('12');
    await this.page.getByRole('button', { name: 'Save & Add another Item' }).first().click();

    await this.page.locator('#itemDescription1').first().fill('QA2');
    await this.page.locator('#itemManufacturer1').first().fill('QA2');
    await this.page.locator('#itemPartNo1').first().fill('321');
    await this.page.locator('#itemBrandPreference1').selectOption({ index: 2 });
    await this.page.locator('#itemUom1').selectOption({ index: 2 });
    await this.page.locator('#itemQty1').first().fill('5');
    await this.page.locator('#saveItemButton1').click();
  }

  /** TC-664: item list description cells after save. */
  async getAddedItemDescriptions(): Promise<[string, string]> {
    const d1 = this.page.locator('#itemListDesc_0').first();
    const d2 = this.page.locator('#itemListDesc_1').first();
    await d1.waitFor({ state: 'visible', timeout: 30_000 });
    return [
      (await d1.textContent())?.trim() ?? '',
      (await d2.textContent())?.trim() ?? '',
    ];
  }

  /** Bid Results: Bid Security Amount label + value (legacy verify_bid_security_amount). */
  async getBidSecurityAmountFromResults(): Promise<[string, string]> {
    await this.clickBidResultsTab();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    const expand = this.page.locator('#expandAllLink');
    if (await expand.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expand.click();
    }
    // Label may be a span or other text node; amount uses .mets-amount.
    const label = this.page.getByText('Bid Security Amount', { exact: true }).first();
    await label.scrollIntoViewIfNeeded().catch(() => {});
    await label.waitFor({ state: 'visible', timeout: 45_000 });
    const amount = this.page.locator('span.mets-amount').filter({ hasText: /\$/ }).first();
    await amount.waitFor({ state: 'visible', timeout: 15_000 });
    return [
      (await label.textContent())?.trim() ?? '',
      (await amount.textContent())?.trim() ?? '',
    ];
  }

  /** Read the solicitation title heading on the buyer preview page (legacy verify_solicitation_title). */
  async getSolicitationTitle(expectedTitle: string): Promise<string> {
    const heading = this.page.locator('h1').filter({ hasText: expectedTitle }).first();
    await heading.waitFor({ state: 'visible', timeout: 30_000 });
    return (await heading.textContent())?.trim() ?? '';
  }

  /** TC-652 step 15: click the Bid Results tab on the buyer's solicitation preview page. */
  async clickBidResultsTab(): Promise<void> {
    await this.bidResultsLink.first().waitFor({ state: 'visible', timeout: 30_000 });
    await this.bidResultsLink.first().click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Return the organisation name text from the BND bid results table.
   * Legacy: verify_org_name_in_bid_result(org_name) — defaults to 'George-Webb'
   * (the standard BND supplier org) so existing callers keep working; TC-748
   * passes 'MAP-748 Supplier'.
   */
  async getOrganisationNameInBidResults(orgName = 'George-Webb'): Promise<string> {
    const orgLink = this.page.locator('a').filter({ hasText: orgName }).first();
    await orgLink.waitFor({ state: 'visible' });
    return (await orgLink.textContent())?.trim() ?? '';
  }

  // ---------------------------------------------------------------------------
  // Item-based pricing — TC-748 (select_pricing "item-based")
  // ---------------------------------------------------------------------------

  /**
   * Click the "Electronic" bid-submission toggle. The Basic Information section
   * re-renders after the solicitation type is selected, so wait for the option to
   * be visible before clicking (avoids flaky timeouts).
   */
  private async clickElectronicBidSubmission(): Promise<void> {
    const electronic = this.bidSubmissionElectronic.first();
    await electronic.scrollIntoViewIfNeeded().catch(() => {});
    await electronic.waitFor({ state: 'visible', timeout: 30_000 });
    await electronic.click();
  }

  /**
   * Select a non-default pricing structure on the notice page (legacy select_pricing):
   * clicks Electronic bid submission, then the requested pricing radio.
   */
  async selectPricing(type: 'item-based' | 'in-attached-document' | 'lump-sum'): Promise<void> {
    await this.clickElectronicBidSubmission();
    const radio =
      type === 'item-based'
        ? this.itemBasedPricingRadio
        : type === 'lump-sum'
          ? this.lumpSumPricingRadio
          : this.inAttachedDocumentPricingRadio;
    await radio.scrollIntoViewIfNeeded().catch(() => {});
    await radio.click();
  }

  /**
   * TC-202 notice: IFB Formal + item-based (triggers pre-attached docs auto-attach).
   */
  async fillNoticeDetailsIfbItemBased(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'IFB - Invitation for Bid (Formal)' });
    await this.selectPricing('item-based');
    await this.setNoticeDatesVerified();
    await this.enterDescription('Test');
    await this.fillSolicitationNumberLast();
    await this.continueButton.click();
  }

  /**
   * TC-190 notice: default type + lump-sum pricing, then continue to categories.
   */
  async fillNoticeDetailsLumpSum(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Formal)' });
    await this.selectPricing('lump-sum');
    await this.setNoticeDatesVerified();
    await this.enterDescription('Test');
    await this.fillSolicitationNumberLast();
    await this.continueButton.click();
  }

  /** Read document row status text (e.g. COMPLETED) for an uploaded filename. */
  async getDocumentStatusFor(fileName: string): Promise<string> {
    const row = this.page.locator('tr').filter({ hasText: fileName }).first();
    await row.waitFor({ state: 'visible', timeout: 60_000 });
    const status = row.locator('.statusCellContainer span, [id$="-status"] span').first();
    await status.waitFor({ state: 'visible', timeout: 60_000 });
    return ((await status.textContent()) || '').trim();
  }

  /** Continue from documents/matching/preview wizard steps via #nextButton. */
  async clickContinue(): Promise<void> {
    await this.continueButton.click();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  /**
   * TC-748 notice details for an ITEM-BASED solicitation (Formal type).
   * Legacy: enter_title → select_solicitation_type → enter_solicitation_number →
   * click_specific_date → click_question_acceptance_deadline → enter_delivery_date →
   * select_pricing("item-based") → click_continue.
   */
  async fillNoticeDetailsItemBased(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Formal)' });
    // Select pricing first — it re-renders the Dates + Basic Information sections,
    // so dates, description and the number are all set AFTER it (and verified).
    await this.selectPricing('item-based');
    await this.setNoticeDatesVerified();
    await this.enterDescription('Test');
    await this.fillSolicitationNumberLast();
    await this.continueButton.click();
  }

  /**
   * TC-772 notice details for an ITEM-BASED (manual-entry) solicitation (Informal type).
   * Legacy: enter_title → select_solicitation_type → enter_solicitation_number →
   * click_specific_date → click_question_acceptance_deadline → enter_delivery_date →
   * click_bid_submission_type (Electronic) → select_item_based_option → click_continue.
   */
  async fillNoticeDetailsItemBasedManualEntry(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Informal)' });
    // Electronic bid submission, then the ITEM_BASED radio under "Bid Submission Process".
    await this.clickElectronicBidSubmission();
    await this.bidSubmissionProcessHeader.scrollIntoViewIfNeeded().catch(() => {});
    await this.itemBasedOptionRadio.click();
    // Dates, description and number AFTER the pricing selection (it re-renders
    // those sections and clears the closing date / number set earlier).
    await this.setNoticeDatesVerified();
    await this.enterDescription('Test');
    await this.fillSolicitationNumberLast();
    await this.continueButton.click();
  }

  /**
   * TC-781 notice details for a solicitation WITH bid questions (Informal type).
   * Legacy: enter_title → select_solicitation_type → enter_solicitation_number →
   * click_specific_date → click_question_acceptance_deadline → enter_delivery_date →
   * click_bid_submission_type (Electronic) → add_question →
   * select_mandatory_checkbox_for_bonds → click_continue.
   */
  async fillNoticeDetailsWithQuestions(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Informal)' });
    await this.clickElectronicBidSubmission();
    await this.addQuestion();
    await this.selectMandatoryCheckboxForBonds();
    // Dates, description and number AFTER the question selection re-renders the form.
    await this.setNoticeDatesVerified();
    await this.enterDescription('Test');
    await this.fillSolicitationNumberLast();
    await this.continueButton.click();
  }

  /**
   * TC-880 notice details for an IN-ATTACHED-DOCUMENT solicitation (Informal type).
   * Legacy: enter_title → select_solicitation_type → enter_solicitation_number →
   * click_specific_date → click_question_acceptance_deadline → enter_delivery_date →
   * select_pricing("in-attached-document") → click_continue.
   */
  async fillNoticeDetailsInAttachedDocument(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Informal)' });
    // Select pricing first — it re-renders the Dates + Basic Information sections,
    // so dates, description and the number are all set AFTER it (and verified).
    await this.selectPricing('in-attached-document');
    await this.setNoticeDatesVerified();
    await this.enterDescription('Test');
    await this.fillSolicitationNumberLast();
    await this.continueButton.click();
  }

  /**
   * TC-781: add the two BND bid questions (Bonds + Business Description) via the
   * "Add Questions" dialog. Legacy add_question.
   */
  async addQuestion(): Promise<void> {
    await this.addQuestionsLink.scrollIntoViewIfNeeded().catch(() => {});
    await this.addQuestionsLink.click();
    await this.question0Checkbox.click();
    await this.question1Checkbox.click();
    await this.modifyQuestionsSaveBtn.click();
  }

  /** TC-781: mark the "Bonds" question mandatory. Legacy select_mandatory_checkbox_for_bonds. */
  async selectMandatoryCheckboxForBonds(): Promise<void> {
    await this.mandatoryBondsCheckbox.check({ force: true });
  }

  /**
   * Documents & Items: open the "Add an Item" form (legacy add_an_item).
   * Opens the items actions menu, then the "Add Item" option, and waits for the
   * item description field to render.
   */
  async addItem(): Promise<void> {
    // The items "Actions" menu and its "Add an Item" option toggle in/out of
    // visibility as the dropdown animates, so a normal click is racy. Dispatch
    // JS clicks directly (mirrors the legacy execute_script clicks).
    await this.itemsActionsTop.waitFor({ state: 'attached' });
    await this.itemsActionsTop.evaluate((el) => (el as HTMLElement).click());
    await this.addItemOptionTop.waitFor({ state: 'attached' });
    await this.addItemOptionTop.evaluate((el) => (el as HTMLElement).click());
    await this.itemDescriptionLast.waitFor({ state: 'visible' });
  }

  /**
   * Fill the just-opened item form (legacy enter_item_details). `uom` is a select2
   * widget; `brandPreference` is a native select.
   */
  async enterItemDetails(
    description: string,
    manufacturer: string,
    part: string,
    brandPreference: string,
    uom: string,
    qty: string,
  ): Promise<void> {
    await this.itemDescriptionLast.fill(description);
    await this.itemManufacturerLast.fill(manufacturer);
    await this.itemPartNoLast.fill(part);
    await this.itemBrandPreferenceLast.selectOption({ label: brandPreference });
    // Open the UOM select2 widget and pick the exact option.
    await this.itemUomToggleLast.click();
    await this.page
      .locator('li')
      .filter({ hasText: new RegExp(`^${uom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) })
      .first()
      .click();
    await this.itemQtyLast.fill(qty);
  }

  /** Save the current item (legacy save_item). */
  async saveItem(): Promise<void> {
    const saveBtn = this.saveItemLast;
    await saveBtn.waitFor({ state: 'visible' });
    // The Save button is a mets-commandButton gated by a `disabled` class until
    // the item form is valid (all required fields filled). Wait for it to enable
    // before clicking, otherwise the onclick no-ops.
    await expect(saveBtn).not.toHaveClass(/\bdisabled\b/, { timeout: 15_000 });
    await saveBtn.scrollIntoViewIfNeeded().catch(() => {});
    // A sticky footer `.button-bar` overlays the Save button and intercepts real
    // pointer events, so dispatch the JS click directly (fires the onclick that
    // calls resetEditedItem()). Mirrors the addItem() approach.
    await saveBtn.evaluate((el) => (el as HTMLElement).click());
    // The saved item form collapses (the editable description field detaches);
    // wait for it to disappear so the next addItem() starts from a clean state.
    await this.itemDescriptionLast.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
  }

  /**
   * Set "Specific Date" and the three flatpickr dates, asserting each value
   * actually stuck (web-first, retried). Called AFTER the pricing / question
   * selections because selecting a pricing structure re-renders the Dates section
   * and silently clears the closing date set earlier.
   */
  private async setNoticeDatesVerified(): Promise<void> {
    if (!(await this.specificDateRadio.isChecked())) {
      await this.specificDateRadio.check({ force: true });
    }
    const setDate = async (inputId: string, days: number): Promise<void> => {
      await expect(async () => {
        await this.pickFutureDate(inputId, days);
        await expect(this.page.locator(`#${inputId}`)).not.toHaveValue('', { timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
    };
    await setDate('closingTimestamp', 5);
    await setDate('questionAcceptanceDeadlineLocal', 4);
    await setDate('deliveryDate', 10);
  }

  /**
   * Fill the solicitation number LAST and assert it stuck (web-first, retried).
   * Selecting the type / Electronic / pricing structure each re-renders the Basic
   * Information section and wipes a number entered earlier, so this is called after
   * all such selections.
   */
  private async fillSolicitationNumberLast(): Promise<void> {
    // Some buyers auto-generate the solicitation number (hidden input).
    const numberVisible = await this.solicitationNumber
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (!numberVisible) {
      return;
    }
    const solicitationNumber = String(Math.floor(100000 + Math.random() * 2_999_999_999));
    await expect(async () => {
      await this.solicitationNumber.fill(solicitationNumber);
      await this.solicitationNumber.blur();
      await expect(this.solicitationNumber).toHaveValue(solicitationNumber, { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
  }

  /**
   * TC-772: add a project, a Standard-type group, and two manual items (QA1/QA2)
   * on the Documents & Items page. Legacy add_group_and_add_standard.
   */
  async addGroupAndAddStandard(projectName: string): Promise<void> {
    const suffix = Math.floor(10000 + Math.random() * 89_999).toString();
    const projectNameWithNumber = `${projectName}${suffix}`;
    const groupCode = Math.floor(100000 + Math.random() * 899_999).toString();

    await this.continueFromDocBtn.scrollIntoViewIfNeeded().catch(() => {});

    // Add a project.
    await this.openItemsActionThenClick('#addItemProjectOptiontop');
    await this.page.locator('#itemProjectName').fill(projectNameWithNumber);
    await this.page.locator('#itemProjectDlgSave').click();

    // Add a group under the project.
    await this.page.locator('#itemProjectActions0').first().click();
    await this.page.locator('#addItemGroupOption_0').click();
    await this.page
      .locator("[id='workingRevision.itemProjects0.projectGroups0.code']")
      .first()
      .fill(groupCode);
    await this.page
      .locator("[id='workingRevision.itemProjects0.projectGroups0.name']")
      .first()
      .fill(projectNameWithNumber);
    await this.page
      .locator("select[id*='projectGroups0.groupType']")
      .first()
      .selectOption({ label: 'Standard' });
    await this.page.locator('#itemGroupDlgSave').click();

    // Add the first item (QA1).
    await this.page.locator("[id^='itemGroupActions']").first().click();
    await this.clickAddAnItem();
    await this.page.locator('#itemManufacturer0').first().fill('QA1');
    await this.page.locator('#itemPartNo0').first().fill('123');
    await this.page.locator('#itemDescription0').first().fill('item Description1');
    await this.page.locator('#itemBrandPreference0').selectOption({ index: 1 });
    await this.page.locator('#itemUom0').selectOption({ index: 1 });
    await this.page.locator('#itemQty0').first().fill('1');
    await this.page.getByRole('button', { name: 'Save & Add another Item' }).first().click();

    // Add the second item (QA2).
    await this.page.locator('#itemManufacturer1').first().fill('QA2');
    await this.page.locator('#itemPartNo1').first().fill('321');
    await this.page.locator('#itemDescription1').first().fill('item Description2');
    await this.page.locator('#itemBrandPreference1').selectOption({ index: 2 });
    await this.page.locator('#itemUom1').selectOption({ index: 2 });
    await this.page.locator('#itemQty1').first().fill('2');
    await this.page.locator('#saveItemButton1').click();
  }

  /** Open the items "Actions" menu (if needed) and click a dropdown option. */
  private async openItemsActionThenClick(optionSelector: string): Promise<void> {
    const option = this.page.locator(optionSelector);
    if (!(await option.isVisible({ timeout: 2_000 }).catch(() => false))) {
      await this.itemsActionsTop.click().catch(() => {});
    }
    await option.click();
  }

  /** Click the "Add an Item" action (button or link variants). */
  private async clickAddAnItem(): Promise<void> {
    await this.page
      .getByRole('button', { name: 'Add an Item' })
      .or(this.page.getByRole('link', { name: 'Add an Item' }))
      .first()
      .click();
  }

  private extractSolicitationId(url: string): number {
    const match = url.match(/solicitations\/(\d+)/);
    if (!match) throw new Error(`Could not extract solicitation id from URL: ${url}`);
    return Number(match[1]);
  }

  /**
   * Select a region option. The region cascade is async — county options load
   * only after the state is chosen — so we first wait for the dropdown element
   * to be attached to the DOM (covers slow AJAX on the QA environment), then
   * retry `selectOption` while the options themselves populate.
   */
  private async selectRegionOption(dropdown: Locator, optionLabel: string): Promise<void> {
    // Wait for the element to appear in the DOM before starting option selection.
    // The county dropdown (#region_1_3) is rendered asynchronously after the
    // state is selected — allow up to 60s on a slow QA environment.
    await dropdown.waitFor({ state: 'attached', timeout: 60_000 });
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        await dropdown.selectOption({ label: optionLabel }, { timeout: 3_000 });
        return;
      } catch {
        await this.page.waitForTimeout(1_000);
      }
    }
    // Final attempt surfaces the real error if the option never appears.
    await dropdown.selectOption({ label: optionLabel }, { timeout: 10_000 });
  }

  private async enterDescription(text: string): Promise<void> {
    const frame = this.page.frameLocator("//iframe[@title='Rich Text Editor, description_EN']");
    const body = frame.locator('body.cke_editable');
    await body.waitFor({ state: 'visible', timeout: 15_000 });
    await body.click();
    await body.fill(text);
  }

  /**
   * Set a future date on a flatpickr field via its JS instance API.
   * The inputs are readonly and their calendars overlap, so direct
   * keyboard/click interaction is unreliable; `_flatpickr.setDate` is stable.
   */
  private async pickFutureDate(inputId: string, days: number): Promise<void> {
    const target = new Date();
    target.setDate(target.getDate() + days);
    target.setHours(12, 0, 0, 0);
    await this.page.evaluate(({ id, ts }) => {
      const el = document.getElementById(id) as
        | (HTMLInputElement & { _flatpickr?: { setDate: (d: Date, triggerChange: boolean) => void; close: () => void } })
        | null;
      const fp = el?._flatpickr;
      if (fp) {
        fp.setDate(new Date(ts), true);
        fp.close();
      }
    }, { id: inputId, ts: target.getTime() });
    await this.page.waitForTimeout(300);
  }
}
