import path from 'path';
import { test, expect } from '../../../fixtures/test-data-api';
import { TEST_PASSWORD } from '../../../fixtures/test-credentials';
import { faker } from '@faker-js/faker';
import { MerxPublishSolicitationPage } from '../../../pages/merx/buyer/publish-solicitation.page';

// Ported from mets-ui-automation-project/tests/solicitation_management/merx/
//   Test_0002_Publish_a_solicitation.py (TC-Map-2).
const BUYER_USERNAME = 'seleniumbuyerpubsol@mets.com';
const PDF_PATH = path.resolve(__dirname, '../../../fixtures/data/test_pdf.pdf');

test.describe('QA: Publish a Solicitation (MERX)', () => {
  test(
    'buyer can publish a basic solicitation through the wizard @p1 @merx @regression @slow @buyer',
    async ({ testData }) => {
      test.setTimeout(8 * 60 * 1000);
      const solicitationTitle = `MERX Automation Test Solicitation ${faker.string.alphanumeric(8)}`;

      const buyer = await testData.loginAs({
        username: BUYER_USERNAME,
        password: TEST_PASSWORD,
        portal: 'MERX',
      });
      const publish = new MerxPublishSolicitationPage(buyer.page);

      await test.step('buyer opens new solicitation and lands on notice', async () => {
        await publish.clickNewSolicitation();
        await publish.fillNewSolicitation();
        expect(await publish.isNoticePageLoaded()).toBe(true);
      });

      await test.step('buyer fills notice details', async () => {
        await publish.fillNoticeDetails(solicitationTitle);
        expect(await publish.isCategoryPageLoaded()).toBe(true);
      });

      await test.step('buyer selects a category', async () => {
        await publish.selectCategory('Research and Development (R&D)');
        expect(await publish.isDocumentsAndItemsPageLoaded()).toBe(true);
      });

      await test.step('buyer uploads a document and opens preview', async () => {
        await publish.uploadDocumentAndOpenPreview(PDF_PATH);
      });

      await test.step('buyer publishes the solicitation', async () => {
        await publish.publishAndGetId();
        expect(await publish.getPublishSuccessMessage()).not.toBe('');
      });
    },
  );
});
