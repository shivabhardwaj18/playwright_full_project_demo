import { Page, Locator, expect } from '@playwright/test';

/**
 * MERX buyer "create + publish solicitation" flow.
 *
 * Ported from the legacy Selenium orchestration in CommonFunctionPage
 * (`new_solicitation` → `add_details_on_notice_page` →
 * `select_category_for_solicitation` → `upload_document_for_solicitation` →
 * `publish_a_solicitation_merx`) and the underlying buyer page objects
 * (SolicitationNoticePage, SolicitationCategoriesPage,
 * SolicitationDocumentAndItemPage, SolicitationPreviewPage,
 * SolicitationManagementHomePage).
 *
 * Used to provision a fully biddable PUBLISHED solicitation through the UI so a
 * supplier can subsequently place a No Bid (TC-Map-324).
 */
export class MerxPublishSolicitationPage {
  private readonly page: Page;
  private currentSolicitationId?: number;

  // Notice / new-solicitation
  private readonly newSolicitationBtn: Locator;
  private readonly estimatedContractValue: Locator;
  private readonly location: Locator;
  private readonly province: Locator;
  private readonly place: Locator;
  private readonly noticeLanguageEnglish: Locator;
  private readonly nextButton: Locator;
  private readonly specificClientSelect: Locator;
  // Notice details
  private readonly title: Locator;
  private readonly solicitationType: Locator;
  private readonly solicitationNumber: Locator;
  private readonly specificDateRadio: Locator;
  private readonly twoEnvelopeRadio: Locator;
  private readonly continueButton: Locator;
  // Categories
  private readonly merxServicesSearch: Locator;
  private readonly merxCategoriesSearch: Locator;
  // Documents
  private readonly fileUpload: Locator;
  private readonly documentThreeDot: Locator;
  private readonly acceptDocument: Locator;
  private readonly acceptConfirm: Locator;
  private readonly previewLink: Locator;
  // Preview / publish
  private readonly publishButton: Locator;
  private readonly publishConfirmYes: Locator;
  private readonly previewHeading: Locator;
  private readonly successMessage: Locator;

  // Bid document structure locators (TC-655: select_bid_document_structure_one)
  private readonly bidDocStructureRadio: Locator;
  private readonly bidItemName0: Locator;
  private readonly bidItemDesc0: Locator;
  private readonly bidItemMandatoryCheck0: Locator;
  private readonly bidItemLimitFileCheck0: Locator;
  private readonly bidItemName1: Locator;
  private readonly bidItemDesc1: Locator;
  // Bid results locators (TC-655: test_014)
  private readonly bidResultsLink: Locator;

  // Item-based pricing and Documents & Items entry (Test 0667)
  private readonly itemBasedPricingRadio: Locator;
  private readonly lumpSumPricingRadio: Locator;
  private readonly publicationScheduledRadio: Locator;
  private readonly publicationTimestamp: Locator;
  private readonly publicationDateText: Locator;
  private readonly itemsActionsTop: Locator;
  private readonly addItemOptionTop: Locator;
  private readonly itemDescriptionLast: Locator;
  private readonly itemManufacturerLast: Locator;
  private readonly itemPartNoLast: Locator;
  private readonly itemBrandPreferenceLast: Locator;
  private readonly itemUomLast: Locator;
  private readonly itemQtyLast: Locator;
  private readonly saveAndAddAnotherItem: Locator;
  private readonly saveItemLast: Locator;
  private readonly itemsContinueButton: Locator;
  private readonly addedItemDescriptions: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newSolicitationBtn = page.locator('a.toolbarNewSolicationBtn');
    this.estimatedContractValue = page.locator('#estimatedContractValue');
    this.location = page.locator('#region_1_1');
    this.province = page.locator('#region_1_2');
    this.place = page.locator('#region_1_3');
    this.noticeLanguageEnglish = page.getByText('English', { exact: true });
    this.nextButton = page.locator('#next');
    this.specificClientSelect = page.locator('[data-test-id="specific-client-on-behalf-of"]');
    this.title = page.locator('#basicInfo_solTitle_EN');
    this.solicitationType = page.locator('#solicitationType');
    this.solicitationNumber = page.locator('#solicitationNumber');
    this.specificDateRadio = page.locator('#closingTimestampTypeSpecificDate');
    // The native #multiEnvelopeRadio input is overlaid by a styled span (METS
    // custom radio); clicking the span toggles the 2-envelope structure.
    this.twoEnvelopeRadio = page.locator('label[for="multiEnvelopeRadio"] span.radio');
    this.continueButton = page.locator('#nextButton');
    this.merxServicesSearch = page.locator('#singleBoxSearchMERX_textBox');
    this.merxCategoriesSearch = page.getByLabel('Search criteria for MERX categories').first();
    this.fileUpload = page.locator('#fileupload-solicitationDocuments');
    this.documentThreeDot = page.locator("//td[@class='actionsCol']//*[contains(@class,'mets-ellipsis')]");
    this.acceptDocument = page.locator("//*[contains(@id,'ellipsisActionMenu')]//*[contains(@id,'acceptDocument')]");
    this.acceptConfirm = page.locator("//*[contains(@id,'acceptDialogBtn')]");
    this.previewLink = page.locator('a[title$="preview"]');
    this.publishButton = page.locator('#publishButton');
    this.publishConfirmYes = page.locator('#publishSolicitationDialogYesButton');
    this.previewHeading = page.getByRole('heading', { name: 'Preview', exact: true });
    this.successMessage = page.locator('div.message-panel-container.success div.message-panel-content');

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
    this.bidResultsLink = page.locator('a, span').filter({ hasText: /^Bid Results/ });
    // Prefer data-label spans (legacy select_pricing); keep for= id as fallback.
    this.itemBasedPricingRadio = page
      .locator(':has(> input[data-label="Item Based"]) span')
      .or(page.locator('label[for="bidSubmissionSpecPricingType_radio_ITEM_BASED"] span.radio'))
      .first();
    this.lumpSumPricingRadio = page
      .locator(':has(> input[data-label="Lump sum"]) span')
      .or(page.locator('label[for="bidSubmissionSpecPricingType_radio_LUMP_SUM"] span.radio'))
      .first();
    this.publicationScheduledRadio = page.locator(
      'label[for="publicationTimestampTypeScheduled"] span.radio',
    );
    this.publicationTimestamp = page.locator('#publicationTimestamp');
    this.publicationDateText = page.locator(
      '#publicationDate, .publicationDate, dd:has-text("Publication"), [id*="publicationDate"]',
    );
    this.itemsActionsTop = page.locator('#itemsActionstop');
    this.addItemOptionTop = page.locator('#addItemOptiontop');
    this.itemDescriptionLast = page.locator('textarea[id^="itemDescription"]').last();
    this.itemManufacturerLast = page.locator('input[id^="itemManufacturer"]').last();
    this.itemPartNoLast = page.locator('input[id^="itemPartNo"]').last();
    this.itemBrandPreferenceLast = page.locator('select[id^="itemBrandPreference"]').last();
    this.itemUomLast = page.locator('select[id^="itemUom"]').last();
    this.itemQtyLast = page.locator('input[id^="itemQty"]').last();
    this.saveAndAddAnotherItem = page.getByRole('button', {
      name: 'Save & Add another Item',
      exact: true,
    });
    this.saveItemLast = page.getByRole('button', { name: 'Save', exact: true }).last();
    this.itemsContinueButton = page.getByRole('button', { name: 'Continue', exact: true }).last();
    this.addedItemDescriptions = page.locator('[id^="itemListDesc_"]');
  }

  /**
   * Accept (and forcibly remove) the cookie banner. It re-mounts on navigation
   * and mid-form; `.cookie-banner` intercepts pointer events / selectOption.
   * Covers METS `#cookieBanner*` buttons plus "Allow all cookies" / reject variants.
   */
  private async acceptCookieBanner(): Promise<void> {
    const allowAll = this.page.getByRole('button', { name: /Allow all cookies/i });
    if (await allowAll.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await allowAll.click({ force: true }).catch(() => {});
    }
    const cookieButtons = [
      this.page.locator('#cookieBannerAcceptBtn'),
      this.page.locator('#cookieBannerRejectBtn'),
      this.page.locator('#cookieBannerAcceptEssentialBtn'),
      this.page.getByRole('button', { name: /Reject all non-essential cookies/i }),
    ];
    for (const button of cookieButtons) {
      if (await button.isVisible().catch(() => false)) {
        await button.click({ force: true }).catch(async () => {
          await button.evaluate((el) => (el as HTMLElement).click());
        });
        await this.page
          .locator('.cookie-banner')
          .waitFor({ state: 'hidden', timeout: 5_000 })
          .catch(() => {});
        break;
      }
    }
    await this.page.evaluate(() => {
      document.querySelectorAll('.cookie-banner').forEach((el) => el.remove());
    }).catch(() => {});
  }

  /** Region cascade on New Solicitation — dismiss cookie between steps (selectOption can hang under overlay). */
  private async selectCanadaOntarioToronto(): Promise<void> {
    await this.acceptCookieBanner();
    await this.location.selectOption({ label: 'Canada' });
    await this.acceptCookieBanner();
    // Cookie overlay can swallow the country change event so province never renders —
    // re-dismiss and re-select Canada once if the cascade stalls (same idea as SSC).
    const provinceVisible = await this.province
      .waitFor({ state: 'visible', timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (!provinceVisible) {
      await this.acceptCookieBanner();
      await this.location.selectOption({ label: 'Canada' }).catch(() => {});
      await this.acceptCookieBanner();
      await this.province.waitFor({ state: 'visible', timeout: 15_000 });
    }
    await expect(this.province).toBeEnabled({ timeout: 15_000 });
    await this.acceptCookieBanner();
    await this.province.selectOption({ label: 'Ontario' });
    await this.acceptCookieBanner();
    await this.place.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(this.place).toBeEnabled({ timeout: 15_000 });
    await this.acceptCookieBanner();
    await this.place.selectOption({ label: 'Toronto' });
    await this.acceptCookieBanner();
  }

  /** Open the New Solicitation form from the buyer toolbar. */
  async clickNewSolicitation(): Promise<void> {
    await this.acceptCookieBanner();
    await this.newSolicitationBtn.click();
    await this.estimatedContractValue.waitFor({ state: 'visible' });
  }

  /** Notice page step 1: estimated value, region cascade, language, next. */
  async fillNewSolicitation(opts?: {
    noticeType?: string;
    byInvitation?: boolean;
    vendorRotation?: boolean;
  }): Promise<void> {
    await this.acceptCookieBanner();
    await this.estimatedContractValue.fill('100');
    await this.selectCanadaOntarioToronto();
    await this.noticeLanguageEnglish.first().click();
    if (opts?.noticeType) {
      await this.selectNoticeType(opts.noticeType);
    }
    if (opts?.byInvitation) {
      await this.selectByInvitation(!!opts?.vendorRotation);
    }
    if (opts?.vendorRotation) {
      await expect(this.page.locator('#invitationSolicitation')).toBeChecked({ timeout: 5_000 });
      await this.ensureVendorRotationChecked();
    }
    // Dismiss the Yandex.Metrica / Aiva popup that intercepts the Next button click.
    await this.page.evaluate(() => {
      const c1 = document.getElementById('ymPluginDivContainerInitial');
      if (c1) c1.style.display = 'none';
      const c2 = document.getElementById('ym-auto-pop-up-container');
      if (c2) c2.style.display = 'none';
    }).catch(() => {});
    await this.acceptCookieBanner();
    // By-Invitation re-render can reset rotation — re-assert immediately before Next.
    if (opts?.vendorRotation) {
      await this.ensureVendorRotationChecked();
    }
    await this.nextButton.click({ timeout: 30_000 }).catch(async () => {
      await this.nextButton.evaluate((el) => (el as HTMLElement).click());
    });
    await this.title.waitFor({ state: 'visible', timeout: 30_000 });
  }

  /**
   * Fill estimated value, location, and English notice language without clicking Next.
   * Used when the next step is expected to stay on this form (validation error).
   */
  async fillNewSolicitationLocationAndValue(): Promise<void> {
    await this.acceptCookieBanner();
    await this.estimatedContractValue.fill('100');
    await this.selectCanadaOntarioToronto();
    await this.noticeLanguageEnglish.first().click();
    await this.page.evaluate(() => {
      const c1 = document.getElementById('ymPluginDivContainerInitial');
      if (c1) c1.style.display = 'none';
      const c2 = document.getElementById('ym-auto-pop-up-container');
      if (c2) c2.style.display = 'none';
    }).catch(() => {});
    await this.acceptCookieBanner();
  }

  async clickNewSolicitationNext(): Promise<void> {
    await this.acceptCookieBanner();
    await this.nextButton.click({ timeout: 30_000 }).catch(async () => {
      await this.nextButton.evaluate((el) => (el as HTMLElement).click());
    });
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
   * Select notice type on the New Solicitation step (legacy `notice_type`).
   * MERX: click "Goods & Services" to reveal `#noticeType`, then pick the subtype
   * (e.g. "Goods"). Matching /Goods/ on the parent label alone leaves the subtype
   * unset → pre-attached docs never auto-attach (TC-199).
   */
  private async selectNoticeType(label: string): Promise<void> {
    const goodsAndServices = this.page
      .locator('span')
      .filter({ hasText: /^Goods\s*&\s*Services\s*$/i })
      .first();
    if (await goodsAndServices.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await goodsAndServices.click();
    }
    const select = this.page.locator('#noticeType');
    if (await select.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const options = await select.locator('option').allTextContents();
      const exact = options.find((o) => o.trim().toLowerCase() === label.toLowerCase());
      const partial = options.find((o) => o.toLowerCase().includes(label.toLowerCase()));
      const match = exact ?? partial;
      if (match) {
        await select.selectOption({ label: match.trim() });
        return;
      }
    }
    const byText = this.page
      .locator('span.inputText, label, span.radio')
      .filter({ hasText: new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') })
      .first();
    if (await byText.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await byText.click();
    }
  }

  /** Notice page step 2: title, type, number, the three dates, then continue. */
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

    await this.ensureDescriptionFilled();
    await this.acceptCookieBanner();
    await this.continueButton.click({ force: true }).catch(async () => {
      await this.continueButton.evaluate((el) => (el as HTMLElement).click());
    });
    await this.page.waitForTimeout(2000);
  }

  /** Categories step: search the MERX service, select it, continue. */
  async selectCategory(serviceName: string): Promise<void> {
    await this.acceptCookieBanner();
    const search = this.merxServicesSearch;
    await search.waitFor({ state: 'visible', timeout: 30_000 });
    await search.fill(serviceName);
    await this.page.waitForTimeout(2000);
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(1000);
    await this.page.keyboard.press('Space');
    // Banner often re-mounts after category selection and blocks #nextButton.
    await this.acceptCookieBanner();
    await this.continueButton.click({ force: true }).catch(async () => {
      await this.continueButton.evaluate((el) => (el as HTMLElement).click());
    });
    await this.page.waitForTimeout(2000);
  }

  /** Documents step: upload the PDF, accept it, then open the preview. */
  async uploadDocumentAndOpenPreview(pdfPath: string): Promise<void> {
    await this.fileUpload.waitFor({ state: 'attached' });
    await this.fileUpload.setInputFiles(pdfPath);
    // Wait until the uploaded document reaches a processed/accepted state.
    await this.page
      .getByText(/^(Processed|Accepted)$/)
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 });
    // Dismiss Yandex / sticky-toolbar overlays that can intercept the three-dot button.
    await this.page.evaluate(() => {
      const c = document.getElementById('ymPluginDivContainerInitial');
      if (c) c.style.display = 'none';
    }).catch(() => {});
    await this.documentThreeDot.first().scrollIntoViewIfNeeded();
    await this.documentThreeDot.first().click({ timeout: 15_000 }).catch(async () => {
      await this.documentThreeDot.first().evaluate((el) => (el as HTMLElement).click());
    });
    await this.acceptDocument.first().click();
    await this.acceptConfirm.first().click();
    await this.page.waitForTimeout(2000);
    await this.previewLink.click();
    await this.previewHeading.waitFor({ state: 'visible' });
  }

  /**
   * Notice page step 2 for a TWO-ENVELOPE solicitation (TC-661): title, type, dates,
   * description, the "2 Envelopes" radio, then continue. Unlike SSC, MERX shows the
   * Bid Submission Process section directly (no "Electronic" selection needed).
   *
   * Deliberately written WITHOUT explicit waitForTimeout calls — it relies on
   * Playwright auto-waiting plus targeted web-first polls (toPass) for the two
   * spots auto-wait cannot cover: the flatpickr JS date setter and the number
   * field that a section re-render clears.
   */
  async fillNoticeDetailsWithTwoEnvelopes(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Formal)' });
    // "Specific Date" is selected by default; ensure it (custom span + sticky toolbar intercept normal clicks).
    if (!(await this.specificDateRadio.isChecked())) {
      await this.specificDateRadio.check({ force: true });
    }

    // Select the 2-envelope structure (Envelope 1 - Identity & Proposal,
    // Envelope 2 - Pricing) in the Bid Submission Process section.
    const bidSubmissionProcessLabel = this.page
      .locator('span')
      .filter({ hasText: /^Bid Submission Process$/ })
      .first();
    await bidSubmissionProcessLabel.scrollIntoViewIfNeeded().catch(() => {});
    await this.twoEnvelopeRadio.scrollIntoViewIfNeeded().catch(() => {});
    await this.twoEnvelopeRadio.click();

    // Fill the solicitation number after the type / envelope selections (each
    // re-renders the Basic Information section and wipes an earlier value).
    const solicitationNumber = String(Math.floor(100000 + Math.random() * 2999999999));
    await expect(async () => {
      await this.solicitationNumber.fill(solicitationNumber);
      await this.solicitationNumber.blur();
      await expect(this.solicitationNumber).toHaveValue(solicitationNumber, { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });

    await this.ensureDescriptionFilled();

    // Set the dates LAST. pickFutureDate sets the value via the field's flatpickr JS
    // instance, which re-initialises asynchronously after "Specific Date" is checked
    // and silently no-ops / clears an early value (a page.evaluate call can't be
    // auto-waited). By setting them after all other notice work — so the instances
    // are fully initialised and nothing re-renders afterwards — and verifying each
    // value stuck (web-first, retried), the dates persist without any fixed sleep.
    const setFutureDate = async (inputId: string, days: number): Promise<void> => {
      await expect(async () => {
        await this.pickFutureDate(inputId, days);
        await expect(this.page.locator(`#${inputId}`)).not.toHaveValue('', { timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
    };
    await setFutureDate('closingTimestamp', 5);
    await setFutureDate('questionAcceptanceDeadlineLocal', 4);
    await setFutureDate('deliveryDate', 10);

    await this.continueButton.click();
  }

  /**
   * Advance from the Documents & Items page to the Preview WITHOUT uploading a
   * document (TC-661 buyer flow does not attach a solicitation document).
   */
  async gotoPreviewWithoutDocument(): Promise<void> {
    await this.acceptCookieBanner();
    await this.continueButton.click();
    await this.previewHeading.waitFor({ state: 'visible', timeout: 30_000 });
  }

  /** On the preview page, capture the solicitation id, then publish + confirm. */
  async publishAndGetId(): Promise<number> {
    const id = this.extractSolicitationId(this.page.url());
    await this.page.waitForTimeout(1000);
    await this.publishButton.click();
    await this.publishConfirmYes.click();
    return id;
  }

  /** Read the green publish success banner. */
  async getPublishSuccessMessage(): Promise<string> {
    await this.successMessage.first().waitFor({ state: 'visible', timeout: 30_000 });
    return (await this.successMessage.first().textContent())?.trim() ?? '';
  }


  async isNewSolicitationPageLoaded(): Promise<boolean> {
    return this.estimatedContractValue.isVisible();
  }

  async isNoticePageLoaded(): Promise<boolean> {
    return this.title.isVisible();
  }

  /**
   * Test 0667: configure an RFQ with item-based pricing.
   * Preserves the legacy notice-field and pricing-selection order.
   */
  async fillNoticeDetailsItemBased(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'RFQ - Request for Quote (Informal)' });
    await this.page.waitForTimeout(3000);
    await this.solicitationNumber.fill(String(Math.floor(100000 + Math.random() * 2_999_999_999)));

    if (!(await this.specificDateRadio.isChecked())) {
      await this.specificDateRadio.check({ force: true });
    }

    await this.pickFutureDate('closingTimestamp', 5);
    await this.pickFutureDate('questionAcceptanceDeadlineLocal', 4);
    await this.pickFutureDate('deliveryDate', 10);
    await this.ensureDescriptionFilled();
    await this.itemBasedPricingRadio.scrollIntoViewIfNeeded();
    await this.itemBasedPricingRadio.click();
    await this.page.waitForTimeout(2000);
    await this.acceptCookieBanner();
    await this.continueButton.click({ timeout: 30_000 }).catch(async () => {
      await this.continueButton.evaluate((el) => (el as HTMLElement).click());
    });

    const categoriesHeading = this.page.getByRole('heading', { name: 'Categories', exact: true });
    await Promise.race([
      categoriesHeading.waitFor({ state: 'visible', timeout: 30_000 }),
      this.merxServicesSearch.waitFor({ state: 'visible', timeout: 30_000 }),
      this.merxCategoriesSearch.waitFor({ state: 'visible', timeout: 30_000 }),
    ]).catch(() => {});
  }


  /**
   * Test 0751: configure a formal solicitation with item-based pricing.
   */
  async fillNoticeDetailsItemBasedFormal(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Formal)' });
    await this.page.waitForTimeout(3000);
    await this.solicitationNumber.fill(String(Math.floor(100000 + Math.random() * 2_999_999_999)));

    if (!(await this.specificDateRadio.isChecked())) {
      await this.specificDateRadio.check({ force: true });
    }

    await this.pickFutureDate('closingTimestamp', 5);
    await this.pickFutureDate('questionAcceptanceDeadlineLocal', 4);
    await this.pickFutureDate('deliveryDate', 10);
    await this.ensureDescriptionFilled();
    await this.itemBasedPricingRadio.scrollIntoViewIfNeeded();
    await this.itemBasedPricingRadio.click();
    await this.page.waitForTimeout(2000);
    await this.acceptCookieBanner();
    await this.continueButton.click({ timeout: 30_000 }).catch(async () => {
      await this.continueButton.evaluate((element) => (element as HTMLElement).click());
    });

    const categoriesHeading = this.page.getByRole('heading', { name: 'Categories', exact: true });
    await Promise.race([
      categoriesHeading.waitFor({ state: 'visible', timeout: 30_000 }),
      this.merxServicesSearch.waitFor({ state: 'visible', timeout: 30_000 }),
      this.merxCategoriesSearch.waitFor({ state: 'visible', timeout: 30_000 }),
    ]).catch(() => {});
  }

  async isCategoryPageLoaded(): Promise<boolean> {
    const categoriesHeading = this.page.getByRole('heading', { name: 'Categories', exact: true });
    await Promise.race([
      categoriesHeading.waitFor({ state: 'visible', timeout: 10_000 }),
      this.merxServicesSearch.waitFor({ state: 'visible', timeout: 10_000 }),
      this.merxCategoriesSearch.waitFor({ state: 'visible', timeout: 10_000 }),
    ]).catch(() => {});

    if (await categoriesHeading.isVisible().catch(() => false)) {
      return true;
    }
    if (await this.merxServicesSearch.isVisible().catch(() => false)) {
      return true;
    }
    return this.merxCategoriesSearch.isVisible().catch(() => false);
  }

  async isDocumentsAndItemsPageLoaded(): Promise<boolean> {
    return (await this.fileUpload.count()) === 1;
  }


  async addItem(): Promise<void> {
    await this.itemsActionsTop.waitFor({ state: 'attached' });
    await this.itemsActionsTop.evaluate((element) => (element as HTMLElement).click());
    await this.addItemOptionTop.waitFor({ state: 'attached' });
    await this.addItemOptionTop.evaluate((element) => (element as HTMLElement).click());
    await this.itemDescriptionLast.waitFor({ state: 'visible', timeout: 15_000 });
  }

  async enterItemDetails(
    description: string,
    manufacturer: string,
    partNumber: string,
    brandPreference: string,
    unitOfMeasure: string,
    quantity: string,
  ): Promise<void> {
    await this.itemDescriptionLast.fill(description);
    await this.itemManufacturerLast.fill(manufacturer);
    await this.itemPartNoLast.fill(partNumber);
    await this.itemBrandPreferenceLast.selectOption({ label: brandPreference });
    await this.itemUomLast.selectOption({ label: unitOfMeasure });
    await this.itemQtyLast.fill(quantity);
  }

  async saveItem(): Promise<void> {
    await expect(this.saveItemLast).not.toHaveClass(/\bdisabled\b/, { timeout: 15_000 });
    await this.saveItemLast.click();
    await this.itemDescriptionLast.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
  }


  /**
   * Test 0775: create a project, a Standard group, and the two legacy QA items.
   */
  async addGroupAndAddStandard(projectName: string): Promise<void> {
    this.currentSolicitationId = this.extractSolicitationId(this.page.url());

    const projectSuffix = Math.floor(10000 + Math.random() * 89_999).toString();
    const projectNameWithNumber = projectName + projectSuffix;
    const groupCode = Math.floor(100000 + Math.random() * 899_999).toString();

    await this.continueButton.scrollIntoViewIfNeeded().catch(() => {});

    const addProjectOption = this.page.locator('#addItemProjectOptiontop');
    if (!(await addProjectOption.isVisible({ timeout: 2_000 }).catch(() => false))) {
      await this.itemsActionsTop.click();
    }
    await addProjectOption.click();
    await this.page.locator('#itemProjectName').fill(projectNameWithNumber);
    await this.page.locator('#itemProjectDlgSave').click();

    await this.page.locator('#itemProjectActions0').click();
    await this.page.locator('#addItemGroupOption_0').click();
    await this.page
      .locator('[id="workingRevision.itemProjects0.projectGroups0.code"]')
      .fill(groupCode);
    await this.page
      .locator('[id="workingRevision.itemProjects0.projectGroups0.name"]')
      .fill(projectNameWithNumber);
    await this.page
      .locator('select[id*="projectGroups0.groupType"]')
      .selectOption({ label: 'Standard' });
    await this.page.locator('#itemGroupDlgSave').click();

    await this.page.locator('button[id^="itemGroupActions_"]').first().click();
    await this.page
      .getByRole('button', { name: 'Add an Item', exact: true })
      .or(this.page.getByRole('link', { name: 'Add an Item', exact: true }))
      .click();

    await this.page.locator('#itemManufacturer0').fill('QA1');
    await this.page.locator('#itemPartNo0').fill('123');
    await this.page.locator('#itemDescription0').fill('item Description1');
    await this.page.locator('#itemBrandPreference0').selectOption({ index: 1 });
    await this.page.locator('#itemUom0').selectOption({ index: 1 });
    await this.page.locator('#itemQty0').fill('1');
    await this.page
      .getByRole('button', { name: 'Save & Add another Item', exact: true })
      .click();

    await this.page.locator('#itemManufacturer1').fill('QA2');
    await this.page.locator('#itemPartNo1').fill('321');
    await this.page.locator('#itemDescription1').fill('item Description2');
    await this.page.locator('#itemBrandPreference1').selectOption({ index: 2 });
    await this.page.locator('#itemUom1').selectOption({ index: 2 });
    await this.page.locator('#itemQty1').fill('2');
    await this.page.locator('#saveItemButton1').click();
  }

  /** Test 0667: create the exact QA1/QA2 items used by the legacy journey. */
  async addTwoItems(): Promise<void> {
    const solicitationId = this.extractSolicitationId(this.page.url());
    this.currentSolicitationId = solicitationId;

    await this.itemsActionsTop.waitFor({ state: 'attached' });
    await this.itemsActionsTop.evaluate((element) => (element as HTMLElement).click());
    await this.addItemOptionTop.waitFor({ state: 'attached' });
    await this.addItemOptionTop.evaluate((element) => (element as HTMLElement).click());

    await this.itemDescriptionLast.fill('QA1');
    await this.itemManufacturerLast.fill('QA1');
    await this.itemPartNoLast.fill('123');
    await this.itemBrandPreferenceLast.selectOption({ index: 1 });
    await this.itemUomLast.selectOption({ index: 1 });
    await this.itemQtyLast.fill('12');
    await expect(this.saveAndAddAnotherItem).not.toHaveClass(/\bdisabled\b/, {
      timeout: 15_000,
    });
    await this.saveAndAddAnotherItem.click();

    await this.itemDescriptionLast.fill('QA2');
    await this.itemManufacturerLast.fill('QA2');
    await this.itemPartNoLast.fill('321');
    await this.itemBrandPreferenceLast.selectOption({ index: 1 });
    await this.itemUomLast.selectOption({ index: 1 });
    await this.itemQtyLast.fill('5');
    await expect(this.saveItemLast).not.toHaveClass(/\bdisabled\b/, { timeout: 15_000 });
    await this.saveItemLast.click();

    // Some layouts keep the item form expanded after Save until Continue is pressed.
    if ((await this.addedItemDescriptions.count()) < 2) {
      if (await this.itemsContinueButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await this.itemsContinueButton.click();
      }
    }

    const lockMessage = this.page.getByText('This solicitation is currently being edited by another user.');
    const redirectedToList = /\/private\/buyer\/solicitations\/?$/.test(this.page.url());
    if (redirectedToList || (await lockMessage.isVisible({ timeout: 2_000 }).catch(() => false))) {
      await this.page.goto(`/private/buyer/solicitations/${solicitationId}/docs-items`);
      await this.itemsActionsTop.waitFor({ state: 'attached', timeout: 30_000 });
    }

    // Some runs persist only the first item; add QA2 explicitly when needed.
    if ((await this.addedItemDescriptions.count()) < 2) {
      await this.itemsActionsTop.waitFor({ state: 'attached', timeout: 30_000 });
      await this.itemsActionsTop.evaluate((element) => (element as HTMLElement).click());
      await this.addItemOptionTop.waitFor({ state: 'attached', timeout: 30_000 });
      await this.addItemOptionTop.evaluate((element) => (element as HTMLElement).click());

      await this.itemDescriptionLast.fill('QA2');
      await this.itemManufacturerLast.fill('QA2');
      await this.itemPartNoLast.fill('321');
      await this.itemBrandPreferenceLast.selectOption({ index: 1 });
      await this.itemUomLast.selectOption({ index: 1 });
      await this.itemQtyLast.fill('5');
      await expect(this.saveItemLast).not.toHaveClass(/\bdisabled\b/, { timeout: 15_000 });
      await this.saveItemLast.click();
    }
  }

  async getAddedItemDescriptions(): Promise<string[]> {
    const onListPage = /\/private\/buyer\/solicitations\/?$/.test(this.page.url());
    if (onListPage && this.currentSolicitationId) {
      await this.page.goto(`/private/buyer/solicitations/${this.currentSolicitationId}/docs-items`);
    }

    await expect(this.addedItemDescriptions).toHaveCount(2, { timeout: 20_000 });

    const fromList = (await this.addedItemDescriptions.allTextContents())
      .map((text) => text.trim())
      .filter(Boolean);
    const normalized = new Set(fromList.filter((text) => /^QA[12]$/i.test(text)).map((text) => text.toUpperCase()));

    if (!(normalized.has('QA1') && normalized.has('QA2'))) {
      const descriptionInputs = this.page.locator('textarea[id^="itemDescription"], input[id^="itemDescription"]');
      const inputLocators = await descriptionInputs.all();
      const fromInputs: string[] = [];
      for (const locator of inputLocators) {
        const value = (await locator.inputValue().catch(() => '')).trim();
        if (/^QA[12]$/i.test(value)) {
          fromInputs.push(value.toUpperCase());
        }
      }
      for (const text of fromInputs) normalized.add(text);
    }

    if (normalized.has('QA1') && normalized.has('QA2')) {
      return ['QA1', 'QA2'];
    }

    return fromList;
  }

  async openPreviewFromDocumentsAndItems(): Promise<void> {
    const currentUrl = this.page.url();
    const idMatch = currentUrl.match(/solicitations\/(\d+)/);
    const solicitationId = idMatch ? Number(idMatch[1]) : this.currentSolicitationId;

    const onListPage = /\/private\/buyer\/solicitations\/?$/.test(this.page.url());
    if (onListPage && solicitationId) {
      await this.page.goto(`/private/buyer/solicitations/${solicitationId}/preview`);
      await this.previewHeading.waitFor({ state: 'visible', timeout: 30_000 });
      return;
    }

    await this.previewLink.click().catch(() => {});
    if (await this.previewHeading.isVisible({ timeout: 5_000 }).catch(() => false)) {
      return;
    }

    await this.continueButton.click().catch(() => {});
    if (await this.previewHeading.isVisible({ timeout: 10_000 }).catch(() => false)) {
      return;
    }

    if (solicitationId) {
      await this.page.goto(`/private/buyer/solicitations/${solicitationId}/preview`);
      await this.previewHeading.waitFor({ state: 'visible', timeout: 30_000 });
      return;
    }

    await this.previewHeading.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async isPreviewPageLoaded(): Promise<boolean> {
    return this.previewHeading.isVisible();
  }

  async getPreviewSolicitationTitle(expectedTitle: string): Promise<string> {
    const heading = this.page.getByRole('heading', { level: 1, name: new RegExp(expectedTitle) }).first();
    await heading.waitFor({ state: 'visible', timeout: 30_000 });
    return (await heading.textContent())?.trim() ?? '';
  }

  /**
   * TC-655: Fill notice details AND configure the specific bid document structure.
   * Uses "RFQ - Request for Quote (Informal)". Unlike the SSC equivalent, MERX
   * does NOT require selecting "Electronic" bid submission before the bid doc
   * structure section — the section is visible directly on the notice page.
   * Legacy sequence: enter_title → select_solicitation_type → enter_solicitation_number
   *   → click_specific_date → click_question_acceptance_deadline → enter_delivery_date
   *   → enter_description → select_bid_document_structure_one → click_continue
   */
  async fillNoticeDetailsWithBidDocStructure(
    title: string,
    bothItemsMandatory = false,
  ): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'RFQ - Request for Quote (Informal)' });
    await this.page.waitForTimeout(3000);

    await this.solicitationNumber.fill(String(Math.floor(100000 + Math.random() * 2_999_999_999)));
    if (!(await this.specificDateRadio.isChecked())) {
      await this.specificDateRadio.check({ force: true });
    }
    await this.page.waitForTimeout(3000);

    await this.pickFutureDate('closingTimestamp', 5);
    await this.pickFutureDate('questionAcceptanceDeadlineLocal', 4);
    await this.pickFutureDate('deliveryDate', 10);
    await this.ensureDescriptionFilled();

    // Select specific bid document structure and fill QA1 / QA2 items
    // (legacy: select_bid_document_structure_one with sleep(2) after radio click)
    const bidSubmissionProcessLabel = this.page
      .locator('span')
      .filter({ hasText: /^Bid Submission Process$/ })
      .first();
    await bidSubmissionProcessLabel.scrollIntoViewIfNeeded().catch(() => {});
    await this.bidDocStructureRadio.click();
    await this.page.waitForTimeout(2000);

    // Item 1: QA1, mandatory + limit-single-file checked
    await this.bidItemName0.fill('QA1');
    await this.bidItemDesc0.fill('QA1');
    await this.bidItemMandatoryCheck0.click();
    await this.bidItemLimitFileCheck0.click();

    // Item 2: QA2 — TC-655 leaves unchecked; TC-649 checks both mandatory + limit.
    await this.bidItemName1.fill('QA2');
    await this.bidItemDesc1.fill('QA2');
    if (bothItemsMandatory) {
      await this.page
        .locator('label[for="bidItemChecklistModelMandatoryCheckbox_0_1"] span.checkbox')
        .click();
      await this.page
        .locator('label[for="bidItemChecklistModelLimitSingleFileCheckbox_0_1"] span.checkbox')
        .click();
    }

    await this.continueButton.click();
    await this.page.waitForTimeout(2000);
  }

  /** TC-655 step 14: click the Bid Results tab on the buyer's solicitation preview page. */
  async clickBidResultsTab(): Promise<void> {
    await this.bidResultsLink.first().waitFor({ state: 'visible', timeout: 30_000 });
    await this.bidResultsLink.first().click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Return the organisation name text from the MERX bid results table.
   * The expected org name varies by supplier account (TC-655: Gregory-Campos,
   * TC-661: Morris Group), so it is parameterised; defaults preserve TC-655.
   */
  async getOrganisationNameInBidResults(orgName: string = 'Gregory-Campos'): Promise<string> {
    const orgLink = this.page.locator('a').filter({ hasText: orgName }).first();
    await orgLink.waitFor({ state: 'visible' });
    return (await orgLink.textContent())?.trim() ?? '';
  }

  /** Extract the numeric solicitation id from a `/solicitations/{id}/...` URL. */
  private extractSolicitationId(url: string): number {
    const match = url.match(/solicitations\/(\d+)/);
    if (!match) throw new Error(`Could not extract solicitation id from URL: ${url}`);
    return Number(match[1]);
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

  /** MERX standard flow leaves the description empty; fill the CKEditor if present. */
  private async ensureDescriptionFilled(): Promise<void> {
    const frame = this.page.frameLocator('iframe[title="Rich Text Editor, description_EN"]');
    const body = frame.locator('body.cke_editable');
    if (await body.isVisible({ timeout: 2000 }).catch(() => false)) {
      const current = (await body.textContent().catch(() => '')) ?? '';
      if (!current.trim()) {
        await body.click();
        await body.fill('Test');
      }
    }
  }

  private async clickElectronicBidSubmission(): Promise<void> {
    const electronic = this.page
      .locator('span.inputText')
      .filter({ hasText: /^Electronic$/i })
      .first();
    if (await electronic.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await electronic.scrollIntoViewIfNeeded().catch(() => {});
      await electronic.click().catch(() => {});
      await this.page.waitForTimeout(1_000);
    }
  }

  private async clickPhysicalBidSubmission(): Promise<void> {
    // Legacy click_phy_bid_submission_type: click Bid Submission Process header, then Physical.
    // Section can sit above the fold after date/description fill — scroll the whole form.
    await this.page.evaluate(() => window.scrollTo(0, 0));
    const header = this.page.getByText('Bid Submission Process', { exact: true }).first();
    await header.waitFor({ state: 'attached', timeout: 10_000 }).catch(() => {});
    if (await header.count()) {
      await header.scrollIntoViewIfNeeded().catch(() => {});
      await header.click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(1_000);
    }

    const physical = this.page
      .locator('span.inputText')
      .filter({ hasText: /^Physical$/i })
      .or(this.page.locator('label[for*="PHYSICAL"] span'))
      .or(this.page.locator('input[data-label="Physical"]'))
      .first();
    if (await physical.count()) {
      await physical.scrollIntoViewIfNeeded().catch(() => {});
      await physical.click({ force: true });
      await this.page.waitForTimeout(1_000);
      return;
    }

    // Last resort: native click on any Physical radio/label in the DOM.
    await this.page.evaluate(() => {
      const span = document.querySelector(
        "label[for*='PHYSICAL'] span.radio, span.inputText",
      ) as HTMLElement | null;
      const candidates = Array.from(
        document.querySelectorAll('span.inputText, label span.radio'),
      ) as HTMLElement[];
      const physical = candidates.find((el) => /^Physical$/i.test(el.textContent?.trim() ?? ''));
      (physical ?? span)?.click();
    });
    await this.page.waitForTimeout(1_000);
  }

  /**
   * Select "By Invitation". METS overlays the native radio with a styled span;
   * a native span.click() fires the framework handler that reveals Vendor Rotation.
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

  private async ensureVendorRotationChecked(): Promise<void> {
    const input = this.page.locator('#useVendorRotation');
    await input.waitFor({ state: 'visible', timeout: 20_000 });
    await expect(async () => {
      if (!(await input.isChecked().catch(() => false))) {
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

  /** Publish success for invitation solicitations (invite wording). */
  async expectInvitationPublishSuccess(): Promise<void> {
    const msg = this.successMessage.first();
    await expect(msg).toBeVisible({ timeout: 60_000 });
    await expect(msg).toContainText(
      /has been successfully published and invitations will be sent/i,
    );
  }

  /**
   * TC-627: notice with Physical bid submission selected (not Electronic).
   */
  async fillNoticeDetailsPhysicalBid(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Formal)' });
    await this.page.waitForTimeout(1_000);
    await this.solicitationNumber.fill(String(Math.floor(100000 + Math.random() * 2_999_999_999)));
    if (!(await this.specificDateRadio.isChecked())) {
      await this.specificDateRadio.check({ force: true });
    }
    await this.pickFutureDate('closingTimestamp', 5);
    await this.pickFutureDate('questionAcceptanceDeadlineLocal', 4);
    await this.pickFutureDate('deliveryDate', 10);
    await this.ensureDescriptionFilled();
    await this.clickPhysicalBidSubmission();
    await this.acceptCookieBanner();
    await this.continueButton.click({ timeout: 30_000 }).catch(async () => {
      await this.continueButton.evaluate((el) => (el as HTMLElement).click());
    });
  }

  /** Upload + accept document; leave the wizard on Documents & Items (no preview). */
  async uploadDocumentAndAccept(pdfPath: string): Promise<void> {
    await this.fileUpload.waitFor({ state: 'attached' });
    await this.fileUpload.setInputFiles(pdfPath);
    await this.page
      .getByText(/^(Processed|Accepted)$/)
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 });
    await this.page.evaluate(() => {
      const c = document.getElementById('ymPluginDivContainerInitial');
      if (c) c.style.display = 'none';
    }).catch(() => {});
    await this.documentThreeDot.first().scrollIntoViewIfNeeded();
    await this.documentThreeDot.first().click({ timeout: 15_000 }).catch(async () => {
      await this.documentThreeDot.first().evaluate((el) => (el as HTMLElement).click());
    });
    await this.acceptDocument.first().click();
    await this.acceptConfirm.first().click();
    await this.page.waitForTimeout(2_000);
  }

  private async selectPricing(
    kind: 'item-based' | 'lump-sum' | 'in-attached-document',
  ): Promise<void> {
    await this.clickElectronicBidSubmission();
    const radio =
      kind === 'item-based'
        ? this.itemBasedPricingRadio
        : kind === 'lump-sum'
          ? this.lumpSumPricingRadio
          : this.page
              .locator(':has(> input[data-label="In attached document"]) span')
              .or(this.page.locator('label[for*="IN_ATTACHED"] span.radio'))
              .first();
    await radio.waitFor({ state: 'visible', timeout: 20_000 });
    await radio.scrollIntoViewIfNeeded().catch(() => {});
    await radio.click();
    await this.page.waitForTimeout(1_000);
  }

  /** TC-187: ITB Formal + lump-sum pricing. */
  async fillNoticeDetailsLumpSum(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Formal)' });
    await this.page.waitForTimeout(1_000);
    // Pricing first (reveals Bid Submission Process); dates after — matches SSC TC-190.
    await this.selectPricing('lump-sum');
    if (!(await this.specificDateRadio.isChecked())) {
      await this.specificDateRadio.check({ force: true });
    }
    await this.pickFutureDate('closingTimestamp', 5);
    await this.pickFutureDate('questionAcceptanceDeadlineLocal', 4);
    await this.pickFutureDate('deliveryDate', 10);
    await this.ensureDescriptionFilled();
    await this.solicitationNumber.fill(String(Math.floor(100000 + Math.random() * 2_999_999_999)));
    await this.acceptCookieBanner();
    await this.continueButton.click({ timeout: 30_000 }).catch(async () => {
      await this.continueButton.evaluate((el) => (el as HTMLElement).click());
    });
  }

  /**
   * TC-199: RFQ Informal + lump-sum (matches pre-attached Goods/RFQ setup).
   * Same order as fillNoticeDetailsLumpSum / SSC — pricing first (re-renders
   * Dates), then dates, description, number last, continue.
   */
  async fillNoticeDetailsRfqLumpSum(title: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'RFQ - Request for Quote (Informal)' });
    await this.page.waitForTimeout(1_000);
    await this.selectPricing('lump-sum');
    if (!(await this.specificDateRadio.isChecked())) {
      await this.specificDateRadio.check({ force: true });
    }
    await this.pickFutureDate('closingTimestamp', 5);
    await this.pickFutureDate('questionAcceptanceDeadlineLocal', 4);
    await this.pickFutureDate('deliveryDate', 10);
    await this.ensureDescriptionFilled();
    await this.solicitationNumber.fill(String(Math.floor(100000 + Math.random() * 2_999_999_999)));
    await this.acceptCookieBanner();
    await this.continueButton.click({ timeout: 30_000 }).catch(async () => {
      await this.continueButton.evaluate((el) => (el as HTMLElement).click());
    });
  }

  /** TC-336: notice with scheduled future publication; returns timestamp string. */
  async fillNoticeDetailsWithScheduledPublication(title: string): Promise<string> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.solicitationType.selectOption({ label: 'ITB - Invitation to Bid (Formal)' });
    await this.page.waitForTimeout(1_000);
    await this.solicitationNumber.fill(String(Math.floor(100000 + Math.random() * 2_999_999_999)));
    if (!(await this.specificDateRadio.isChecked())) {
      await this.specificDateRadio.check({ force: true });
    }
    await this.pickFutureDate('closingTimestamp', 5);
    await this.pickFutureDate('questionAcceptanceDeadlineLocal', 4);

    const scheduledSpan = this.publicationScheduledRadio.first();
    await scheduledSpan.scrollIntoViewIfNeeded().catch(() => {});
    const clicked = await scheduledSpan
      .click({ timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (!clicked) {
      await this.page.locator('#publicationTimestampTypeScheduled').check({ force: true });
    }
    await expect(async () => {
      await this.pickFutureDate('publicationTimestamp', 1);
      await expect(this.publicationTimestamp).not.toHaveValue('', { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    const publicationTimestamp = (await this.publicationTimestamp.inputValue()).trim();

    await this.pickFutureDate('deliveryDate', 10);
    await this.ensureDescriptionFilled();
    await this.continueButton.click({ timeout: 30_000 }).catch(async () => {
      await this.continueButton.evaluate((el) => (el as HTMLElement).click());
    });
    return publicationTimestamp;
  }

  async verifyPublicationDateContains(timestamp: string): Promise<boolean> {
    const candidates = this.page
      .getByText(timestamp, { exact: false })
      .or(this.publicationDateText.first());
    await candidates.first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
    const body = await this.page.locator('main, #content, body').first().innerText();
    return body.includes(timestamp);
  }

  async getItemDescription(row: number): Promise<string> {
    const byId = this.page.locator(`[id^="itemListDesc_"]`).nth(row - 1);
    if (await byId.isVisible({ timeout: 5_000 }).catch(() => false)) {
      return ((await byId.textContent()) || '').trim();
    }
    const cell = this.page.locator('td.description').nth(row - 1);
    await cell.waitFor({ state: 'visible', timeout: 30_000 });
    return ((await cell.textContent()) || '').trim();
  }

  async getDocumentStatusFor(fileName: string): Promise<string> {
    const row = this.page.locator('tr').filter({ hasText: fileName }).first();
    await row.waitFor({ state: 'visible', timeout: 60_000 });
    const status = row.locator('.statusCellContainer span, [id$="-status"] span').first();
    await status.waitFor({ state: 'visible', timeout: 60_000 });
    return ((await status.textContent()) || '').trim();
  }

  async clickContinue(): Promise<void> {
    await this.continueButton.click();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async gotoPreview(): Promise<void> {
    await this.previewLink.click();
    await this.previewHeading.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async openPreviewPublishAndGetId(): Promise<number> {
    await this.gotoPreview().catch(async () => {
      await this.previewLink.click();
    });
    return this.publishAndGetId();
  }

  async clickFirstSolicitationInList(): Promise<void> {
    await this.page.waitForURL(/\/private\/buyer\/solicitations/, { timeout: 60_000 }).catch(() => {});
    const first = this.page.locator('#solicitationsList tbody tr td a, table tbody tr td a').first();
    await first.waitFor({ state: 'visible', timeout: 30_000 });
    await first.click();
  }

  async isScheduledForPublicationInHeader(): Promise<boolean> {
    const header = this.page.locator('h1, .solicitationTitle').first();
    await header.waitFor({ state: 'visible', timeout: 30_000 });
    const text = ((await header.textContent()) || '').toLowerCase();
    return text.includes('scheduled for publication');
  }

  // ---------------------------------------------------------------------------
  // Batch 3 — feature variants (ack / prefs / e-bond / EFT / pre-bid / questions)
  // ---------------------------------------------------------------------------

  /**
   * Prefer the exact visible text; fall back when Informal/ITB variants are absent.
   * Selects by option `value` — MERX options often have a `label` attribute that
   * does not match visible text, so selectOption({ label }) fails.
   */
  private async selectSolicitationTypeLabel(preferred: string): Promise<void> {
    await this.solicitationType.waitFor({ state: 'visible', timeout: 30_000 });
    const optionEls = this.solicitationType.locator('option');
    const count = await optionEls.count();
    const opts: { text: string; value: string }[] = [];
    for (let i = 0; i < count; i++) {
      const el = optionEls.nth(i);
      const text = ((await el.textContent()) ?? '').replace(/\s+/g, ' ').trim();
      const value = (await el.getAttribute('value')) ?? '';
      if (!text || !value) continue;
      opts.push({ text, value });
    }
    const preferredIsInformal = /\(Informal\)/i.test(preferred);
    const preferredIsRfq = /Request for Quote/i.test(preferred);
    const pick =
      opts.find((o) => o.text === preferred) ||
      (preferredIsInformal
        ? opts.find((o) => /ITB\s*-\s*Invitation to Bid \(Formal\)/i.test(o.text))
        : undefined) ||
      (preferredIsRfq
        ? opts.find((o) => /^RFQ\s*-\s*Request for Quote \(Formal\)$/i.test(o.text)) ||
          opts.find((o) => /^RFQ\s*-\s*Request for Quote/i.test(o.text)) ||
          opts.find((o) => /^RFQ\s*-\s*Request for Quotation \(Informal\)$/i.test(o.text))
        : undefined) ||
      opts.find((o) => /^ITB\s*-\s*Invitation to Bid \(Formal\)$/i.test(o.text)) ||
      opts.find((o) => /^ITB\s*-\s*Invitation to Bid$/i.test(o.text)) ||
      opts.find((o) => /^ITB\s*-\s*Invitation to Bid/i.test(o.text));
    if (!pick) {
      throw new Error(
        `No solicitation type matching "${preferred}". Available: ${opts.map((o) => o.text).join(' | ')}`,
      );
    }
    await this.solicitationType.selectOption(pick.value);
  }

  private async fillNoticeCore(
    title: string,
    typeLabel: string,
    beforeContinue?: () => Promise<void>,
  ): Promise<void> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    await this.selectSolicitationTypeLabel(typeLabel);
    await this.page.waitForTimeout(1_000);
    if (beforeContinue) await beforeContinue();
    if (!(await this.specificDateRadio.isChecked())) {
      await this.specificDateRadio.check({ force: true });
    }
    await this.pickFutureDate('closingTimestamp', 5);
    await this.pickFutureDate('questionAcceptanceDeadlineLocal', 4);
    await this.pickFutureDate('deliveryDate', 10);
    await this.ensureDescriptionFilled();
    // Some buyers auto-generate the solicitation number (hidden input).
    const numberVisible = await this.solicitationNumber
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (numberVisible) {
      await this.solicitationNumber.fill(String(Math.floor(100000 + Math.random() * 2_999_999_999)));
    }
    await this.acceptCookieBanner();
    await this.continueButton.click({ timeout: 30_000 }).catch(async () => {
      await this.continueButton.evaluate((el) => (el as HTMLElement).click());
    });
  }

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
    const body = this.page
      .frameLocator("iframe[title*='acknowledgement' i], iframe[title*='Rich Text' i]")
      .locator('body.cke_editable')
      .first();
    if (await body.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await body.click();
      await body.fill(details);
    } else {
      await this.page.keyboard.press('Tab');
      await this.page.keyboard.type(details);
    }
  }

  async fillNoticeDetailsWithAcknowledgement(title: string): Promise<void> {
    await this.fillNoticeCore(title, 'ITB - Invitation to Bid (Formal)', async () => {
      await this.addRequiredAcknowledgement('Buyer', 'acknowledgement details');
      await this.clickElectronicBidSubmission();
    });
  }

  async selectAllBuyerPreferences(): Promise<void> {
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
    // MERX set from legacy select_all_buyer_pref_option (no SSC-only FOB / DBE rows).
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
    ];
    for (const label of labels) {
      const box = this.page
        .getByRole('checkbox', { name: label, exact: true })
        .or(this.page.locator(`span[title='${label}']`))
        .first();
      await box.scrollIntoViewIfNeeded().catch(() => {});
      await box.click({ force: true });
    }
  }

  async fillNoticeDetailsWithBuyerPreferences(title: string): Promise<void> {
    await this.fillNoticeCore(title, 'ITB - Invitation to Bid (Formal)', async () => {
      await this.clickElectronicBidSubmission();
      await this.selectAllBuyerPreferences();
    });
  }

  private async expandBidSecurity(): Promise<void> {
    const header = this.page.getByText('Bid Security', { exact: false }).first();
    await header.scrollIntoViewIfNeeded().catch(() => {});
    await header.waitFor({ state: 'visible', timeout: 30_000 });
    await header.click();
  }

  async selectEBonding(): Promise<void> {
    await this.expandBidSecurity();
    const checkbox = this.page.getByText(/Bidders must provide E-bonding/i).first();
    await checkbox.waitFor({ state: 'visible', timeout: 15_000 });
    await checkbox.click();
  }

  async selectEftOption(): Promise<void> {
    await this.expandBidSecurity();
    const checkbox = this.page
      .getByText(/Require Electronic Fund Transfer \(EFT\)/i)
      .first();
    await checkbox.waitFor({ state: 'visible', timeout: 15_000 });
    await checkbox.click();
  }

  async fillNoticeDetailsWithEBonding(title: string): Promise<void> {
    await this.fillNoticeCore(title, 'ITB - Invitation to Bid (Informal)', async () => {
      await this.clickElectronicBidSubmission();
      await this.selectEBonding();
    });
  }

  async fillNoticeDetailsWithEft(title: string): Promise<void> {
    await this.fillNoticeCore(title, 'RFQ - Request for Quote (Informal)', async () => {
      await this.clickElectronicBidSubmission();
      await this.selectEftOption();
    });
  }

  async expandAllBidResultsAndGetEBondingFileName(): Promise<string> {
    await this.acceptCookieBanner();
    await this.clickBidResultsTab();
    await this.acceptCookieBanner();
    // Do NOT click the org-name link — on MERX it navigates to the vendor profile.
    const expand = this.page.getByRole('link', { name: /Expand All/i }).or(this.page.locator('#expandAllLink'));
    await expand.first().waitFor({ state: 'visible', timeout: 30_000 });
    await expand.first().click({ force: true });
    await this.page.waitForTimeout(2_000);
    // Prefer the chevron toggle on the bid row (not the org profile link).
    const rowToggle = this.page.locator('tr.mets-table-row .mets-table-row-toggle, tr.mets-table-row td.expand a').first();
    if (await rowToggle.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await rowToggle.click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(1_000);
    }
    const file = this.page
      .locator('[title="test_pdf.pdf"]')
      .or(this.page.getByText(/test_pdf\.pdf/i))
      .first();
    try {
      await file.waitFor({ state: 'visible', timeout: 20_000 });
      return (await file.getAttribute('title')) || (await file.textContent())?.trim() || 'test_pdf.pdf';
    } catch {
      const body = (await this.page.locator('body').innerText()) ?? '';
      return body.includes('test_pdf.pdf') ? 'test_pdf.pdf' : '';
    }
  }

  async getBidSecurityAmountFromResults(): Promise<[string, string]> {
    await this.clickBidResultsTab();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    const expand = this.page.locator('#expandAllLink');
    if (await expand.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expand.click();
    }
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
    const onsiteOpt = typeSelect.locator('option').filter({ hasText: /Onsite Visit/i }).first();
    if (await onsiteOpt.count()) {
      await typeSelect.selectOption({ label: ((await onsiteOpt.textContent()) ?? '').trim() });
    } else {
      await typeSelect.selectOption({ index: 2 });
    }
    const mandatory = this.page
      .getByRole('group', { name: /Attendance/i })
      .getByRole('radio', { name: /^Mandatory$/i })
      .or(this.page.getByRole('radio', { name: /^Mandatory$/i }))
      .first();
    await mandatory.waitFor({ state: 'attached', timeout: 15_000 });
    await mandatory.check({ force: true }).catch(async () => {
      await mandatory.click({ force: true });
    });
    const dateInput = this.page
      .getByRole('textbox', { name: /Event date/i })
      .or(this.page.locator("#preBidEventDate0, input[id*='preBidEvent'][id*='ate']"))
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
    const noteBody = this.page
      .frameLocator("iframe[title='Rich Text Editor, preBidEventNote0EN'], iframe[title*='preBidEventNote']")
      .locator('body.cke_editable')
      .first();
    if (await noteBody.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await noteBody.click();
      await noteBody.fill(eventNote);
    } else {
      await this.page.keyboard.press('Tab');
      await this.page.keyboard.type(eventNote);
    }
  }

  async fillNoticeDetailsWithPreBiddingEvent(
    title: string,
    location: string,
    eventNote: string,
  ): Promise<void> {
    await this.fillNoticeCore(title, 'ITB - Invitation to Bid (Informal)', async () => {
      await this.clickElectronicBidSubmission();
      await this.addPreBiddingEvent(location, eventNote);
    });
  }

  async fillNoticeDetailsItemBasedManualEntry(title: string): Promise<void> {
    await this.fillNoticeCore(title, 'ITB - Invitation to Bid (Informal)', async () => {
      await this.selectPricing('item-based');
    });
  }

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

  async getManufacturerTexts(): Promise<[string, string]> {
    const m1 = this.page.locator('#itemListRow_0 td.manufacturer, td.manufacturer').nth(0);
    const m2 = this.page.locator('#itemListRow_1 td.manufacturer, td.manufacturer').nth(1);
    await m1.waitFor({ state: 'visible', timeout: 30_000 });
    return [((await m1.textContent()) || '').trim(), ((await m2.textContent()) || '').trim()];
  }

  async addGroupAndAddCostAllowance(projectName: string): Promise<void> {
    const suffix = Math.floor(10000 + Math.random() * 89_999).toString();
    const projectNameWithNumber = `${projectName}${suffix}`;
    const groupCode = Math.floor(100000 + Math.random() * 899_999).toString();

    await this.continueButton.scrollIntoViewIfNeeded().catch(() => {});
    const addProjectOption = this.page.locator('#addItemProjectOptiontop');
    if (!(await addProjectOption.isVisible({ timeout: 2_000 }).catch(() => false))) {
      await this.itemsActionsTop.click();
    }
    await addProjectOption.click();
    await this.page.locator('#itemProjectName').fill(projectNameWithNumber);
    await this.page.locator('#itemProjectDlgSave').click();

    await this.page.locator('#itemProjectActions0').first().click();
    await this.page.locator('#addItemGroupOption_0').click();
    await this.page.locator("[id='workingRevision.itemProjects0.projectGroups0.code']").fill(groupCode);
    await this.page
      .locator("[id='workingRevision.itemProjects0.projectGroups0.name']")
      .fill(projectNameWithNumber);
    const groupType = this.page.locator("select[id*='projectGroups0.groupType']").first();
    const costOpt = groupType.locator('option').filter({ hasText: /Cost Allowance/i }).first();
    if (await costOpt.count()) {
      await groupType.selectOption({ label: ((await costOpt.textContent()) || '').trim() });
    } else {
      await groupType.selectOption({ index: 1 });
    }
    await this.page.locator('#itemGroupDlgSave').click();

    await this.page.locator("[id^='itemGroupActions']").first().click();
    await this.page
      .getByRole('button', { name: 'Add an Item', exact: true })
      .or(this.page.getByRole('link', { name: 'Add an Item', exact: true }))
      .click();
    await this.page.locator('#itemPrice0').first().fill('15000');
    await this.page.locator('#itemDescription0').first().fill('QA1');
    await this.page.getByRole('button', { name: 'Save & Add another Item' }).first().click();
    await this.page.locator('#itemPrice1').first().fill('25000');
    await this.page.locator('#itemDescription1').first().fill('QA2');
    await this.page.locator('#saveItemButton1').click();
  }

  async getAddedPrices(): Promise<[string, string]> {
    const prices = this.page.locator('td.price');
    await prices.nth(0).waitFor({ state: 'visible', timeout: 30_000 });
    return [
      ((await prices.nth(0).textContent()) || '').trim(),
      ((await prices.nth(1).textContent()) || '').trim(),
    ];
  }

  async addQuestion(): Promise<void> {
    const link = this.page.getByRole('link', { name: 'Add Questions', exact: true }).first();
    await link.scrollIntoViewIfNeeded().catch(() => {});
    await link.click();
    await this.page
      .locator("input[id*='ebsBuyerQuestions0.selected']")
      .first()
      .click({ force: true });
    await this.page
      .locator("input[id*='ebsBuyerQuestions1.selected']")
      .first()
      .click({ force: true });
    await this.page.locator("button[id='modifyEbsQuestionsSelectionSaveButton']").click();
  }

  /** MERX legacy: mark Major Brand mandatory (first selected question). */
  async selectMandatoryCheckboxForMajorBrand(): Promise<void> {
    const row = this.page
      .locator('tr')
      .filter({ has: this.page.getByRole('cell', { name: 'Major Brand', exact: true }) })
      .first();
    const box = row.getByRole('checkbox').first();
    if (await box.count()) {
      await box.check({ force: true });
      return;
    }
    await this.page
      .locator(
        '[id="workingRevision.bidSubmissionSpec.bidSubmissionSpecificationEnvelopes[0].bidSubmissionSpecificationQuestions[0].responseRequired"]',
      )
      .check({ force: true });
  }

  async fillNoticeDetailsWithQuestionsAndVerify(title: string): Promise<[string, string]> {
    await this.acceptCookieBanner();
    await this.title.fill(title);
    // Legacy MERX TC-673 uses RFQ Informal; fall back via selectSolicitationTypeLabel.
    await this.selectSolicitationTypeLabel('RFQ - Request for Quote (Informal)');
    await this.clickElectronicBidSubmission();
    await this.addQuestion();
    const q1 = this.page.getByRole('cell', { name: 'Major Brand', exact: true }).first();
    const q2 = this.page.getByRole('cell', { name: 'Special Condition', exact: true }).first();
    await q1.waitFor({ state: 'visible', timeout: 30_000 });
    const names: [string, string] = [
      (await q1.textContent())?.trim() ?? '',
      (await q2.textContent())?.trim() ?? '',
    ];
    await this.selectMandatoryCheckboxForMajorBrand();
    if (!(await this.specificDateRadio.isChecked())) {
      await this.specificDateRadio.check({ force: true });
    }
    await this.pickFutureDate('closingTimestamp', 5);
    await this.pickFutureDate('questionAcceptanceDeadlineLocal', 4);
    await this.pickFutureDate('deliveryDate', 10);
    await this.ensureDescriptionFilled();
    await this.solicitationNumber.fill(String(Math.floor(100000 + Math.random() * 2_999_999_999)));
    await this.continueButton.click();
    return names;
  }

  async fillNoticeDetailsInAttachedDocument(title: string): Promise<void> {
    await this.fillNoticeCore(title, 'ITB - Invitation to Bid (Informal)', async () => {
      await this.selectPricing('in-attached-document');
    });
  }

  /** MERX has no Matching Suppliers step — advance via Continue when present. */
  async gotoPreviewFromWizard(): Promise<void> {
    const matching = this.page.getByRole('tab', { name: /Matching Suppliers/i });
    if (await matching.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await matching.click();
    }
    await this.clickContinue().catch(() => {});
  }

  // ---------------------------------------------------------------------------
  // CETA / threshold (TC-438 / TC-579)
  // ---------------------------------------------------------------------------

  async fillNewSolicitationWithValue(value: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.estimatedContractValue.fill(value);
    await this.selectCanadaOntarioToronto();
    await this.noticeLanguageEnglish.first().click();
    await this.page.evaluate(() => {
      document.getElementById('ymPluginDivContainerInitial')?.remove();
    }).catch(() => {});
    await this.nextButton.click({ timeout: 30_000 }).catch(async () => {
      await this.nextButton.evaluate((el) => (el as HTMLElement).click());
    });
    await this.title.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async getThresholdWarningText(): Promise<string> {
    const warn = this.page.locator('#thresholdWarning p').first();
    if (!(await warn.isVisible({ timeout: 3_000 }).catch(() => false))) return '';
    return ((await warn.textContent()) ?? '').trim();
  }

  async openAgreementTypeDropdown(): Promise<void> {
    const btn = this.page
      .locator('button.ui-multiselect')
      .filter({ hasText: /Agreement|Select options|Canada-European|None selected/i })
      .or(this.page.locator("button[type='button']").filter({ has: this.page.locator('.ui-icon-triangle-1-s') }))
      .first();
    await btn.click({ force: true });
  }

  async selectCeta(): Promise<void> {
    await this.openAgreementTypeDropdown();
    const opt = this.page.locator('#ui-multiselect-agreementTypeMultiSelect-option-3');
    await opt.waitFor({ state: 'attached', timeout: 10_000 });
    if (!(await opt.isChecked().catch(() => false))) {
      // Multiselect options stay display:none — Playwright check() still rejects; click via DOM.
      await opt.evaluate((el) => (el as HTMLInputElement).click());
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(500);
  }

  async unselectCeta(): Promise<void> {
    await this.openAgreementTypeDropdown();
    const opt = this.page.locator('#ui-multiselect-agreementTypeMultiSelect-option-3');
    await opt.waitFor({ state: 'attached', timeout: 10_000 });
    if (await opt.isChecked().catch(() => false)) {
      await opt.evaluate((el) => (el as HTMLInputElement).click());
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(500);
  }

  async modifyEstimatedContractValue(value: string): Promise<void> {
    await this.page.locator('#modifyNoticeTypeLink').click();
    await this.estimatedContractValue.fill(value);
    await this.page.locator('#modifyNoticeTypeSaveButton').click();
    await this.page.locator('#modifyNoticeTypeYesButton').click();
    await this.page.waitForTimeout(1_000);
  }

  async selectTermPurchaseAndOtherDuration(months: string): Promise<void> {
    await this.page.evaluate(() => {
      document.getElementById('ymPluginDivContainerInitial')?.remove();
      document.getElementById('ym-auto-pop-up-container')?.remove();
    }).catch(() => {});
    // Accessibility tree exposes radio "Term" under Purchase Type (not always a <span>).
    const purchaseType = this.page.getByRole('group', { name: /Purchase Type/i });
    const termRadio = purchaseType.getByRole('radio', { name: /^Term$/i });
    await termRadio.scrollIntoViewIfNeeded();
    await termRadio.check({ force: true });
    await this.page.waitForTimeout(500);

    // Legacy: (//span[@class='radio'])[8] then duration Other.
    const durationRadio = this.page.locator('span.radio').nth(7);
    if (await durationRadio.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await durationRadio.click({ force: true });
    }

    const duration = this.page.locator('#durationOption');
    await duration.waitFor({ state: 'visible', timeout: 15_000 });
    // selectOption's `label` is an exact string match — a RegExp never matched
    // and always fell through to the index fallback.
    await duration.selectOption({ label: 'Other' }).catch(async () => {
      await duration.selectOption({ index: 14 });
    });
    const other = this.page.locator('#durationOtherMonths, #durationOther').first();
    await other.waitFor({ state: 'visible', timeout: 10_000 });
    await other.fill(months);
    await other.press('Tab');
  }

  async getDurationOtherValue(): Promise<string> {
    return this.page.locator('#durationOtherMonths, #durationOther').first().inputValue();
  }

  async isDisplayAsContactDisabled(): Promise<boolean> {
    const cb = this.page.locator('#displayIssuingContactInfo');
    return cb.isDisabled();
  }

  async clearIssuingContactFields(): Promise<void> {
    await this.page.locator('#issuingContactEmail').fill('');
    await this.page.locator('#issuingContactPhoneNumber').fill('');
  }

  async fillIssuingContact(email: string, phone: string): Promise<void> {
    await this.page.locator('#issuingContactEmail').fill(email);
    await this.page.locator('#issuingContactPhoneNumber').fill(phone);
  }

  async clickPublishExpectingValidationError(): Promise<string> {
    await this.publishButton.click();
    const errOk = this.page.locator('#publishSolicitationDialogOkButton');
    const yes = this.publishConfirmYes;
    await Promise.race([
      errOk.waitFor({ state: 'visible', timeout: 15_000 }),
      yes.waitFor({ state: 'visible', timeout: 15_000 }),
    ]).catch(() => {});
    if (await yes.isVisible().catch(() => false)) {
      // Contact already satisfied — no validation dialog; cancel and report.
      await this.page.getByRole('button', { name: /^No$/i }).first().click().catch(() => {});
      return 'Publication will make the solicitation active';
    }
    const text = ((await this.page.locator('#publishSolicitatioFormContainer, .ui-dialog').first().innerText()) ?? '').trim();
    await errOk.click({ force: true }).catch(async () => {
      await this.page.getByRole('button', { name: /^Ok$/i }).first().click({ force: true });
    });
    return text;
  }

  // ---------------------------------------------------------------------------
  // Bilingual EN/FR (TC-369)
  // ---------------------------------------------------------------------------

  async fillNewSolicitationFrenchNotice(): Promise<void> {
    // Legacy: select English, then French (xpath contains 'French' — may hit bilingual).
    await this.acceptCookieBanner();
    await this.estimatedContractValue.fill('100');
    await this.selectCanadaOntarioToronto();
    await this.noticeLanguageEnglish.first().click();
    const bilingual = this.page.locator('span').filter({ hasText: /^English\s*&\s*French$/i }).first();
    if (await bilingual.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await bilingual.click();
    } else {
      // Legacy select_notice_language_as_fr: //span[contains(text(),'French')]
      await this.page.locator('span').filter({ hasText: /French/i }).first().click();
    }
    await this.page.evaluate(() => {
      document.getElementById('ymPluginDivContainerInitial')?.remove();
      document.getElementById('ym-auto-pop-up-container')?.remove();
    }).catch(() => {});
    await this.nextButton.click({ timeout: 30_000 }).catch(async () => {
      await this.nextButton.evaluate((el) => (el as HTMLElement).click());
    });
    await this.page
      .getByRole('textbox', { name: /Title/i })
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 });
  }

  async fillNoticeDetailsBilingual(opts: {
    titleEn: string;
    titleFr: string;
    descriptionEn: string;
    descriptionFr: string;
  }): Promise<void> {
    await this.acceptCookieBanner();
    // French-only notice hides EN title in the UI; Selenium still fills #basicInfo_solTitle_EN.
    const titleEn = this.page.locator('#basicInfo_solTitle_EN');
    const titleFr = this.page.locator('#basicInfo_solTitle_FR');
    if ((await titleEn.count()) > 0) {
      await titleEn.fill(opts.titleEn, { force: true });
    }
    if ((await titleFr.count()) > 0) {
      await titleFr.fill(opts.titleFr, { force: true });
    } else {
      await this.page.getByRole('textbox', { name: /Title/i }).first().fill(opts.titleFr);
    }
    const visibleTitle = this.page.getByRole('textbox', { name: /Title/i }).first();
    if (await visibleTitle.isVisible().catch(() => false)) {
      const current = await visibleTitle.inputValue().catch(() => '');
      if (!current) await visibleTitle.fill(opts.titleFr || opts.titleEn);
    }

    await this.selectSolicitationTypeLabel('ITB - Invitation to Bid (Formal)');

    if (!(await this.specificDateRadio.isChecked())) {
      await this.specificDateRadio.check({ force: true });
    }

    // Fill EN/FR CKEditors via instance API (innerHTML alone doesn't sync the model).
    for (const [instanceKey, text] of [
      ['description_EN', opts.descriptionEn],
      ['description_FR', opts.descriptionFr],
    ] as const) {
      const iframe = this.page.locator(`iframe[title="Rich Text Editor, ${instanceKey}"]`);
      if ((await iframe.count()) === 0) continue;
      await this.page.evaluate(
        ({ key, value }) => {
          const win = window as unknown as {
            CKEDITOR?: {
              instances?: Record<
                string,
                { setData: (d: string) => void; updateElement: () => void }
              >;
            };
          };
          const editor = win.CKEDITOR?.instances?.[key];
          if (editor) {
            editor.setData(`<p>${value}</p>`);
            editor.updateElement();
            return;
          }
          const frame = document.querySelector(
            `iframe[title="Rich Text Editor, ${key}"]`,
          ) as HTMLIFrameElement | null;
          const body = frame?.contentDocument?.body;
          if (body) {
            body.textContent = value;
            body.dispatchEvent(new Event('input', { bubbles: true }));
            body.dispatchEvent(new Event('change', { bubbles: true }));
          }
        },
        { key: instanceKey, value: text },
      );
    }

    // Dates after type/description work so flatpickr isn't wiped by bilingual re-renders
    // (early sets → midnight AM closing / QAD after closing → Failed Check).
    const setFutureDate = async (inputId: string, days: number, requireNoon = true): Promise<void> => {
      await expect(async () => {
        await this.pickFutureDate(inputId, days);
        const input = this.page.locator(`#${inputId}`);
        await expect(input).not.toHaveValue('', { timeout: 1_000 });
        if (requireNoon) {
          await expect(input).toHaveValue(/12:00:00 PM/i, { timeout: 1_000 });
        }
      }).toPass({ timeout: 20_000 });
    };
    await setFutureDate('closingTimestamp', 5);
    await setFutureDate('questionAcceptanceDeadlineLocal', 4);
    await setFutureDate('deliveryDate', 10, false);

    // Number LAST — same as SSC fillNoticeDetailsWithTwoEnvelopes / fillSolicitationNumberLast.
    // Type + bilingual description re-renders wipe an earlier value (empty → Failed Check).
    const solNumber = String(Math.floor(100000 + Math.random() * 2_999_999_999));
    const solNumberBox = this.page
      .getByRole('textbox', { name: /Solicitation Number/i })
      .or(this.solicitationNumber)
      .first();
    await expect(async () => {
      await solNumberBox.fill(solNumber);
      await solNumberBox.blur();
      await expect(solNumberBox).toHaveValue(solNumber, { timeout: 2_000 });
    }).toPass({ timeout: 20_000 });

    await this.acceptCookieBanner();
    await this.page.evaluate(() => {
      document.getElementById('ymPluginDivContainerInitial')?.remove();
      document.getElementById('ym-auto-pop-up-container')?.remove();
      document.querySelectorAll('.cookie-banner').forEach((el) => el.remove());
    }).catch(() => {});
    await this.continueButton.click({ force: true }).catch(async () => {
      await this.continueButton.evaluate((el) => (el as HTMLElement).click());
    });
    await this.merxServicesSearch.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async setDocumentLanguageEnglishAndFrench(): Promise<void> {
    // Legacy: //select[contains(@onchange,'changeChildrenLanguage')]
    const lang = this.page
      .locator("select[onchange*='changeChildrenLanguage']")
      .or(
        this.page
          .locator('table select')
          .filter({ has: this.page.locator('option', { hasText: /English\s*[&/]\s*French/i }) }),
      )
      .first();
    await lang.waitFor({ state: 'visible', timeout: 15_000 });
    const options = await lang.locator('option').allTextContents();
    const match = options.find((o) => /English\s*[&/]\s*French/i.test(o.trim()));
    if (!match) {
      throw new Error(`No English/French document language option; saw: ${options.join(' | ')}`);
    }
    await lang.selectOption({ label: match.trim() });
    await expect(lang.locator('option:checked')).toHaveText(match.trim(), { timeout: 5_000 });
  }

  /** Upload PDF, set bilingual document language, accept, open Preview (TC-369). */
  async uploadDocumentSetLangAndOpenPreview(pdfPath: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.fileUpload.waitFor({ state: 'attached' });
    await this.fileUpload.setInputFiles(pdfPath);
    await this.page
      .getByText(/^(Processed|Accepted|Submitted)$/)
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 });
    await this.page.evaluate(() => {
      document.getElementById('ymPluginDivContainerInitial')?.remove();
      document.querySelectorAll('.cookie-banner').forEach((el) => el.remove());
    }).catch(() => {});
    await this.setDocumentLanguageEnglishAndFrench();
    await this.documentThreeDot.first().scrollIntoViewIfNeeded();
    await this.documentThreeDot.first().click({ force: true }).catch(async () => {
      await this.documentThreeDot.first().evaluate((el) => (el as HTMLElement).click());
    });
    await this.acceptDocument.first().click({ force: true });
    await this.acceptConfirm.first().click({ force: true });
    await this.page
      .getByText(/^Accepted$/)
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 });
    // Re-assert language after accept (accept can re-render the row).
    await this.setDocumentLanguageEnglishAndFrench().catch(() => {});
    await this.continueButton.click({ force: true }).catch(async () => {
      await this.previewLink.click();
    });
    await this.previewHeading.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async switchUiLanguage(lang: 'EN' | 'FR'): Promise<void> {
    const link = this.page.getByRole('link', { name: lang === 'FR' ? /^FR$/i : /^EN$/i }).first();
    if (await link.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await link.click();
      await this.page.waitForLoadState('domcontentloaded');
    }
  }

  // ---------------------------------------------------------------------------
  // Document conversion (TC-333)
  // ---------------------------------------------------------------------------

  async uploadTxtAndWaitForConversion(txtPath: string): Promise<void> {
    await this.acceptCookieBanner();
    await this.fileUpload.waitFor({ state: 'attached' });
    await this.fileUpload.setInputFiles(txtPath);
    await expect
      .poll(
        async () => {
          const body = ((await this.page.locator('body').innerText()) ?? '').toLowerCase();
          return /completed|accepted|processed/.test(body);
        },
        { timeout: 3 * 60 * 1000 },
      )
      .toBeTruthy();
    await this.page.evaluate(() => {
      document.getElementById('ymPluginDivContainerInitial')?.remove();
      document.getElementById('ym-auto-pop-up-container')?.remove();
    }).catch(() => {});

    // Empty Display Name can block publish — set converted name when blank.
    const displayName = this.page.locator('input[id*="displayName"], input[name*="displayName"]').first();
    if (await displayName.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const val = await displayName.inputValue().catch(() => '');
      if (!val.trim()) await displayName.fill('test_txt(TXT).pdf');
    }

    // Open ellipsis menu (force) then Accept — menu item stays attached but hidden until open.
    await this.documentThreeDot.first().scrollIntoViewIfNeeded().catch(() => {});
    await this.documentThreeDot.first().click({ force: true });
    const acceptBtn = this.page.getByRole('button', { name: /^\s*Accept\s*$/i }).first();
    await acceptBtn.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    await acceptBtn.click({ force: true }).catch(async () => {
      await this.acceptDocument.first().evaluate((el) => (el as HTMLElement).click());
    });
    await this.acceptConfirm.first().click({ force: true }).catch(async () => {
      await this.page.getByRole('button', { name: /^\s*Accept\s*$/i }).last().click({ force: true });
    });
    await this.page
      .getByText(/^(Accepted|Processed)$/)
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  async expectConvertedDocumentName(name: string | RegExp): Promise<void> {
    await expect(this.page.getByText(name).first()).toBeVisible({ timeout: 60_000 });
  }

  async openPreviewFromDocuments(): Promise<void> {
    // Legacy uses Continue from Documents; Preview toolbar link is a fallback.
    await this.continueButton.click({ timeout: 15_000 }).catch(async () => {
      await this.previewLink.click();
    });
    await this.previewHeading.waitFor({ state: 'visible', timeout: 30_000 });
  }

  /**
   * Publish from preview; if validation error dialog appears, dismiss and throw
   * with the dialog text (clearer than waiting on Yes forever).
   */
  async publishAndGetIdOrThrow(): Promise<number> {
    const id = this.extractSolicitationId(this.page.url());
    await this.publishButton.click();
    const yes = this.publishConfirmYes;
    const errOk = this.page.locator('#publishSolicitationDialogOkButton');
    await Promise.race([
      yes.waitFor({ state: 'visible', timeout: 15_000 }),
      errOk.waitFor({ state: 'visible', timeout: 15_000 }),
    ]).catch(() => {});
    if (await errOk.isVisible().catch(() => false)) {
      const text = (
        (await this.page.locator('#publishSolicitatioFormContainer, .ui-dialog').first().innerText()) ??
        ''
      ).trim();
      await errOk.click().catch(() => {});
      // Collect section Error badges / Failed Check labels for a useful failure.
      const diagnostics = await this.page
        .evaluate(() => {
          const bits: string[] = [];
          document.querySelectorAll('[aria-label*="Error"], .error, .FailedCheck, img[alt="Failed Check"]').forEach((el) => {
            const label = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('alt') || '').trim();
            if (label) bits.push(label);
          });
          document.querySelectorAll('.mets-field-error, .fieldError, .errorMessage, .alert-danger').forEach((el) => {
            const t = (el.textContent || '').trim();
            if (t) bits.push(t);
          });
          return bits.slice(0, 20).join(' | ');
        })
        .catch(() => '');
      throw new Error(
        `Publish blocked by validation: ${text}${diagnostics ? ` | page: ${diagnostics}` : ''}`,
      );
    }
    await yes.click();
    return id;
  }
}
