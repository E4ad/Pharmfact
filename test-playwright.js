import { chromium } from 'playwright';

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://example.com');
    const pdf = await page.pdf({ format: 'A4' });
    console.log('Playwright fonctionne : PDF généré avec succès (taille :', pdf.length, 'octets)');
  } catch (error) {
    console.error('Erreur Playwright :', error);
  } finally {
    if (browser) await browser.close();
  }
})();