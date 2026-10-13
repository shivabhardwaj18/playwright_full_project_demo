import path from 'path';
import { test, expect } from '../../../fixtures/test-data-api';
import { TEST_PASSWORD } from '../../../fixtures/test-credentials';
import { faker } from '@faker-js/faker';
import { SscPublishSolicitationPage } from '../../../pages/ssc/buyer/publish-solicitation.page';

// Ported from mets-ui-automation-project/tests/solicitation_management/bidnet/
//   Test_0042_Publish_a_solicitation.py (TC-Map-42).
// Buyer walks the full BidNet publish wizard (new → notice → category → document →
// matching suppliers → courtesy email → preview/publish) and asserts the success banner.
const BUYER_USERNAME = 'seleniumbuyer@bnd.com'; // qa bnd_buyer1 / cfp.login default
const PDF_PATH = path.resolve(__dirname, '../../../fixtures/data/test_pdf.pdf');

test.describe('QA: Publish a Solicitation (SSC)', () => {
  test(
    'buyer can publish a basic solicitation through the wizard @p1 @ssc @regression @slow @buyer',
    async ({ testData }) => {
      test.setTimeout(8 * 60 * 1000);
      const solicitationTitle = `Automation Test Solicitation ${faker.string.alphanumeric(8)}`;

      const buyer = await testData.loginAs({
        username: BUYER_USERNAME,
        password: TEST_PASSWORD,
        portal: 'SSC',
      });
      const publish = new SscPublishSolicitationPage(buyer.page);

      await test.step('buyer opens the new solicitation form', async () => {
        await publish.clickNewSolicitation();
        await publish.fillNewSolicitation();
      });

      await test.step('buyer fills the notice details', async () => {
        await publish.fillNoticeDetails(solicitationTitle);
      });

      await test.step('buyer selects a category', async () => {
        await publish.selectCategory('99348');
      });

      await test.step('buyer uploads a document', async () => {
        await publish.uploadDocument(PDF_PATH);
      });

      await test.step('buyer reviews matching suppliers', async () => {
        await publish.gotoMatchingSuppliers();
      });

      await test.step('buyer opens the courtesy email step', async () => {
        await publish.gotoCourtesyEmail();
      });

      await test.step('buyer publishes the solicitation', async () => {
        await publish.openPreviewPublishAndGetId();
        expect(await publish.getPublishSuccessMessage()).not.toBe('');
      });
    },
  );
});
