import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const allPages = [
  { name: 'welcome', url: '/' },
  { name: 'activity', url: '/activity' },
  { name: 'missions-new', url: '/missions/new' },
  { name: 'missions-dashboard', url: '/missions', aliases: ['missions'] },
  { name: 'missions-edit', url: `/missions/${process.env.SCREENSHOT_MISSION_ID || 'mis_completee'}/edit` },
  { name: 'invoices', url: '/invoices' },
  { name: 'invoice-print', url: `/invoices/${process.env.SCREENSHOT_INVOICE_ID || 'inv_seed_1'}/print` },
  { name: 'financial', url: '/financial' },
  { name: 'pharmacies', url: '/pharmacy/add', aliases: ['pharmacy', 'pharmacies'] },
  { name: 'pharmaciens', url: '/pharmacien/new', aliases: ['pharmacien', 'pharmaciens'] },
  { name: 'exports', url: '/settings', aliases: ['settings', 'exports'] },
];

const allViewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'laptop', width: 1280, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
];

const interactiveCaptures = [
  {
    name: 'missions-new-day-open',
    page: 'missions-new',
    trigger: '[data-testid="mission-day-row"]',
    ready: '[data-testid="mission-day-detail"]',
  },
  {
    name: 'missions-expense-edit',
    page: 'missions-new',
    trigger: '[data-testid="expense-row"]',
    ready: '[data-testid="expense-editor"]',
  },
  {
    name: 'missions-billing-panel',
    page: 'missions',
    trigger: '[data-testid="billing-panel-toggle"]',
    ready: '[data-testid="billing-panel"]',
  },
  {
    name: 'options-general-modal',
    page: 'options',
    trigger: '[data-testid="options-card-general"]',
    ready: '[data-testid="settings-modal-general"]',
  },
  {
    name: 'options-missions-modal',
    page: 'options',
    trigger: '[data-testid="options-card-missions"]',
    ready: '[data-testid="settings-modal-missions"]',
  },
  {
    name: 'options-invoicing-modal',
    page: 'options',
    trigger: '[data-testid="options-card-invoicing"]',
    ready: '[data-testid="settings-modal-invoicing"]',
  },
  {
    name: 'options-financial-modal',
    page: 'options',
    trigger: '[data-testid="options-card-financial"]',
    ready: '[data-testid="settings-modal-financial"]',
  },
  {
    name: 'options-appearance-modal',
    page: 'options',
    trigger: '[data-testid="options-card-appearance"]',
    ready: '[data-testid="settings-modal-appearance"]',
  },
  {
    name: 'options-data-modal',
    page: 'options',
    trigger: '[data-testid="options-card-data"]',
    ready: '[data-testid="settings-modal-data"]',
  },
  {
    name: 'options-references-modal',
    page: 'options',
    trigger: '[data-testid="options-card-references"]',
    ready: '[data-testid="settings-modal-references"]',
  },
  {
    name: 'options-pharmacy-modal',
    page: 'options',
    trigger: '[data-testid="options-add-pharmacy-button"]',
    ready: '[data-testid="pharmacie-form-modal"]',
  },
  {
    name: 'options-pharmacy-edit-modal',
    page: 'options',
    trigger: '[data-testid^="options-edit-pharmacy-"]',
    ready: '[data-testid="pharmacie-form-modal"]',
  },
  {
    name: 'options-pharmacien-modal',
    page: 'options',
    trigger: '[data-testid="options-add-pharmacien-button"]',
    ready: '[data-testid="pharmacien-form-modal"]',
  },
  {
    name: 'options-pharmacien-edit-modal',
    page: 'options',
    trigger: '[data-testid^="options-edit-pharmacien-"]',
    ready: '[data-testid="pharmacien-form-modal"]',
  },
  {
    name: 'missions-pharmacy-modal',
    page: 'missions-new',
    trigger: 'button:has-text("Ajouter une nouvelle pharmacie")',
    ready: '[data-testid="pharmacie-form-modal"]',
  },
  {
    name: 'financial-tax-payment-drawer',
    page: 'financial',
    trigger: 'button:has-text("Ajouter un acompte")',
    ready: '[data-testid="financial-tax-payment-drawer"]',
  },
  {
    name: 'financial-deductible-expense-drawer',
    page: 'financial',
    trigger: 'button:has-text("Ajouter une dépense")',
    ready: '[data-testid="financial-deductible-expense-drawer"]',
  },
  {
    name: 'financial-mission-expenses-drawer',
    page: 'financial',
    trigger: 'button:has-text("Voir tout le détail")',
    ready: '[data-testid="financial-mission-expenses-drawer"]',
  },
  {
    name: 'financial-receivables-drawer',
    page: 'financial',
    trigger: 'button:has-text("Voir les factures")',
    ready: '[data-testid="financial-receivables-drawer"]',
  },
  {
    name: 'financial-tps-tvq-drawer',
    page: 'financial',
    trigger: 'button:has-text("TPS/TVQ")',
    ready: '[data-testid="financial-tps-tvq-drawer"]',
  },
];

function parseArgs(argv) {
  const options = {
    baseUrl: process.env.BASE_URL || 'http://127.0.0.1:5173',
    outputDir: process.env.SCREENSHOT_OUTPUT || 'screenshots',
    page: undefined,
    viewport: undefined,
    headed: false,
    fullPage: true,
    timestamp: false,
    theme: undefined,
    debug: false,
    timeoutMs: 30_000,
    keepAnimations: false,
    activePharmacien: process.env.SCREENSHOT_ACTIVE_PHARMACIEN,
    allViewports: false,
    withBackend: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--page') options.page = next, index += 1;
    else if (arg === '--viewport') options.viewport = next, index += 1;
    else if (arg === '--base-url') options.baseUrl = next, index += 1;
    else if (arg === '--output') options.outputDir = next, index += 1;
    else if (arg === '--timeout') options.timeoutMs = Number(next) || options.timeoutMs, index += 1;
    else if (arg === '--active-pharmacien') options.activePharmacien = next, index += 1;
    else if (arg === '--theme') options.theme = next, index += 1;
    else if (arg === '--dark') options.theme = 'dark';
    else if (arg === '--light') options.theme = 'light';
    else if (arg === '--headed') options.headed = true;
    else if (arg === '--debug') options.debug = true;
    else if (arg === '--timestamp') options.timestamp = true;
    else if (arg === '--full-page') options.fullPage = true;
    else if (arg === '--no-full-page') options.fullPage = false;
    else if (arg === '--keep-animations') options.keepAnimations = true;
    else if (arg === '--all-viewports') options.allViewports = true;
    else if (arg === '--with-backend') options.withBackend = true;
    else if (arg === '--help') options.help = true;
  }

  return options;
}

function printHelp() {
  console.log(`Usage: npm run screenshots -- [options]

Options:
  --page <name>              Capture a single page or group (missions, invoices, financial)
  --viewport <name>          desktop, laptop, tablet
  --all-viewports            Capture all configured viewports
  --base-url <url>           Default http://127.0.0.1:5173
  --output <dir>             Default screenshots
  --headed                   Run Chromium headed
  --full-page                Full page screenshots (default)
  --no-full-page             Viewport-only screenshots
  --dark | --light           Set localStorage theme
  --theme <light|dark>       Set localStorage theme
  --active-pharmacien <id>   Inject active pharmacist id into localStorage snapshot
  --timestamp                Write into screenshots/YYYY-MM-DD_HH-mm
  --timeout <ms>             Default 30000
  --keep-animations          Do not disable CSS animations/transitions
  --debug                    Verbose logs
  --with-backend             Warn if /api/health is unreachable
`);
}

function timestampFolder() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
}

function resolveOutputDir(options) {
  const base = path.isAbsolute(options.outputDir) ? options.outputDir : path.join(rootDir, options.outputDir);
  return options.timestamp ? path.join(base, timestampFolder()) : base;
}

function selectPages(pageFilter) {
  if (!pageFilter) return allPages;
  return allPages.filter((page) => page.name.includes(pageFilter) || page.aliases?.includes(pageFilter));
}

function selectViewports(options) {
  if (options.viewport) return allViewports.filter((viewport) => viewport.name === options.viewport);
  if (options.allViewports) return allViewports;
  return allViewports.filter((viewport) => viewport.name === 'desktop');
}

function ensureOutputDir(outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function checkBackendHealth(options) {
  try {
    const response = await fetch(`${options.baseUrl}/api/health`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (options.debug) console.log('✓ Backend API accessible via proxy /api/health');
  } catch (error) {
    console.warn('Backend API inaccessible. Démarrez le backend avant les captures.');
    if (options.debug) console.warn(`Détail healthcheck: ${error.message}`);
  }
}

async function preparePage(page, options) {
  if (options.theme) {
    await page.addInitScript((theme) => {
      window.localStorage.setItem('theme', theme);
    }, options.theme);
  }

  if (options.activePharmacien) {
    await page.addInitScript((activePharmacienId) => {
      const key = 'mission-app:v1';
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const state = JSON.parse(raw);
        state.activePharmacienId = activePharmacienId;
        window.localStorage.setItem(key, JSON.stringify(state));
      }
      window.localStorage.setItem('activePharmacienId', activePharmacienId);
    }, options.activePharmacien);
  }
}

async function stabilizePage(page, options) {
  if (!options.keepAnimations) {
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          scroll-behavior: auto !important;
        }
      `,
    }).catch(() => {});
  }
}

async function maybeSelectUser(page, options) {
  const userCard = page.locator('[data-testid="user-card"]').first();
  try {
    if (await userCard.isVisible({ timeout: 1000 })) {
      if (options.debug) console.log('Sélection automatique du premier pharmacien...');
      await userCard.click();
      await page.waitForLoadState('networkidle', { timeout: options.timeoutMs }).catch(() => {});
      if (options.debug) console.log('✓ Pharmacien sélectionné');
    }
  } catch {
    // Page does not require user selection.
  }
}

async function gotoAndPrepare(page, url, options) {
  await page.goto(`${options.baseUrl}${url}`, { waitUntil: 'networkidle', timeout: options.timeoutMs });
  await maybeSelectUser(page, options);
  await stabilizePage(page, options);
  await page.waitForTimeout(options.debug ? 400 : 150);
}

async function recordCapture(result, page, name, viewportName, outputDir, options) {
  const fileName = `${name}-${viewportName}.png`;
  const filePath = path.join(outputDir, fileName);
  await page.screenshot({ path: filePath, fullPage: options.fullPage });
  result.successes.push(filePath);
  console.log(`✓ ${fileName}`);
}

async function captureStaticPage(page, item, viewportName, outputDir, options, result) {
  const captureName = `${item.name}-${viewportName}`;
  console.log(`Capture: ${captureName}.png`);
  try {
    await gotoAndPrepare(page, item.url, options);
    await recordCapture(result, page, item.name, viewportName, outputDir, options);
  } catch (error) {
    result.errors.push({ name: captureName, message: error.message });
    console.error(`✗ Erreur ${captureName}: ${error.message}`);
  }
}

async function captureMissionDrawer(page, viewportName, outputDir, options, result) {
  const name = 'missions-drawer-open';
  const captureName = `${name}-${viewportName}`;
  console.log(`Capture: ${captureName}.png`);
  try {
    await gotoAndPrepare(page, '/missions', options);
    const firstMission = page.locator('[data-testid="mission-row"]').first();
    await firstMission.waitFor({ timeout: 10000 });
    await firstMission.click();
    const drawer = page.locator('[data-testid="mission-drawer"]');
    await drawer.waitFor({ timeout: 10000 });
    await page.waitForTimeout(250);
    await recordCapture(result, page, name, viewportName, outputDir, options);
  } catch (error) {
    result.errors.push({ name: captureName, message: `${error.message} — vérifier data-testid mission-row/mission-drawer` });
    console.error(`✗ Erreur ${captureName}: ${error.message}`);
  }
}

async function optionalInteractiveCapture(page, config, viewportName, outputDir, options, result) {
  const captureName = `${config.name}-${viewportName}`;
  console.log(`Capture optionnelle: ${captureName}.png`);
  try {
    await gotoAndPrepare(page, config.url, options);
    const trigger = page.locator(config.trigger).first();
    if (!(await trigger.isVisible({ timeout: 1500 }).catch(() => false))) {
      if (options.debug) console.log(`↷ Ignorée ${captureName}: trigger absent (${config.trigger})`);
      return;
    }
    await trigger.click();
    await page.locator(config.ready).first().waitFor({ timeout: 5000 });
    await page.waitForTimeout(250);
    await recordCapture(result, page, config.name, viewportName, outputDir, options);
  } catch (error) {
    result.errors.push({ name: captureName, message: error.message });
    console.error(`✗ Erreur ${captureName}: ${error.message}`);
  }
}

function printSummary(result, outputDir) {
  console.log('\nCaptures terminées.');
  console.log(`\nRéussies : ${result.successes.length}`);
  console.log(`Échouées : ${result.errors.length}`);
  if (result.successes.length) {
    console.log('\nFichiers :');
    result.successes.forEach((filePath) => console.log(path.relative(rootDir, filePath)));
  }
  if (result.errors.length) {
    console.log('\nErreurs :');
    result.errors.forEach((error) => console.log(`- ${error.name} : ${error.message}`));
  }
  console.log(`\nDossier: ${outputDir}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const pages = selectPages(options.page);
  const viewports = selectViewports(options);
  const outputDir = resolveOutputDir(options);
  const result = { successes: [], errors: [] };

  if (!pages.length) {
    console.warn(`Aucune page ne correspond au filtre: ${options.page}`);
    return;
  }
  if (!viewports.length) {
    console.warn(`Aucun viewport ne correspond au filtre: ${options.viewport}`);
    return;
  }

  ensureOutputDir(outputDir);
  await checkBackendHealth(options);

  const browser = await chromium.launch({ headless: !options.headed });

  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      await preparePage(page, options);

      for (const item of pages) {
        await captureStaticPage(page, item, viewport.name, outputDir, options, result);
      }

      if (!options.page || ['missions', 'missions-dashboard', 'drawer'].includes(options.page)) {
        await captureMissionDrawer(page, viewport.name, outputDir, options, result);
      }

      if (!options.page) {
        for (const config of interactiveCaptures) {
          if (config.page === 'missions' || config.page === 'missions-new') {
            await optionalInteractiveCapture(page, { ...config, url: config.page === 'missions' ? '/missions' : '/missions/new' }, viewport.name, outputDir, options, result);
          } else if (config.page === 'options') {
            await optionalInteractiveCapture(page, { ...config, url: '/settings' }, viewport.name, outputDir, options, result);
          } else if (config.page === 'financial') {
            await optionalInteractiveCapture(page, { ...config, url: '/financial' }, viewport.name, outputDir, options, result);
          }
        }
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }

  printSummary(result, outputDir);
}

main().catch((error) => {
  console.error(`Erreur globale captures: ${error.message}`);
  process.exitCode = 1;
});
