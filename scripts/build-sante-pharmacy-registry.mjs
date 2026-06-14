import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = 'https://sante.gouv.qc.ca';
const SEARCH_PATH = '/repertoire-ressources/resultats-recherche/';
const DEFAULT_OUTPUT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/sante-pharmacies-index.json');
const OUTPUT_PATH = process.env.SANTE_OUTPUT_PATH ? resolve(process.env.SANTE_OUTPUT_PATH) : DEFAULT_OUTPUT_PATH;
const DELAY_MS = Number(process.env.SANTE_SCRAPE_DELAY_MS ?? 500);
const START_PAGE = Number(process.env.SANTE_SCRAPE_START_PAGE ?? 1);
const LIMIT_PAGES = Number(process.env.SANTE_SCRAPE_LIMIT_PAGES ?? 0);
const MAX_RETRIES = Number(process.env.SANTE_SCRAPE_RETRIES ?? 3);

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&eacute;/g, 'é')
    .replace(/&Eacute;/g, 'É')
    .replace(/&egrave;/g, 'è')
    .replace(/&agrave;/g, 'à')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function searchUrl(page) {
  const url = new URL(SEARCH_PATH, BASE_URL);
  url.searchParams.set('theme', 'autres-ressources');
  url.searchParams.set('ch_type[12]', '2101');
  url.searchParams.set('ch_code', '');
  url.searchParams.set('ch_rayon', '4');
  url.searchParams.set('ch_choixReg', '0');
  url.searchParams.set('bt_rechType', '');
  url.searchParams.set('page', String(page));
  return url;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Pharmfact/1.0 contact:local',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

async function fetchTextWithRetry(url) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fetchText(url);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await sleep(DELAY_MS * attempt);
      }
    }
  }

  throw lastError;
}

function parseTotalPages(html) {
  const totalMatch = html.match(/<span id="total-results">\s*([\d\s]+)\s+ressources/i);
  const lastPageMatch = html.match(/page=(\d+)"><span class="sr-only">Page \1<\/span><span aria-hidden="true">\1<\/span><\/a><\/li>\s*<li class=""><a[^>]+chevron-droite/);
  const explicitLastMatch = html.match(/class="page-derniere"><a href="[^"]*page=(\d+)"/);
  const total = totalMatch ? Number(totalMatch[1].replace(/\s/g, '')) : undefined;
  const totalPages = explicitLastMatch
    ? Number(explicitLastMatch[1])
    : lastPageMatch
      ? Number(lastPageMatch[1])
      : total
        ? Math.ceil(total / 10)
        : 1;

  return { total, totalPages };
}

function parseAddress(rawAddressHtml) {
  const lines = rawAddressHtml
    .split(/<br\s*\/?>/gi)
    .map((line) => decodeHtml(line))
    .filter(Boolean);
  const addressLine = lines[0] ?? '';
  const cityLine = lines.slice(1).join(' ');
  const normalized = [addressLine, cityLine].filter(Boolean).join(' ');
  const cityMatch = cityLine.match(/^(.+?)\s+\(Québec\)\s+([A-Z]\d[A-Z])\s?(\d[A-Z]\d)$/i);

  return {
    addressLine,
    city: cityMatch ? cityMatch[1].trim() : '',
    province: 'Québec',
    postalCode: cityMatch ? `${cityMatch[2].toUpperCase()} ${cityMatch[3].toUpperCase()}` : '',
    formattedAddress: normalized,
  };
}

function parseListPage(html) {
  const entries = [];
  const itemRegex = /<li class='liste-resultats_item'>[\s\S]*?<a href='\.\.\/ressource\/\?nofiche=(\d+)[^']*'>\s*([\s\S]*?)\s*<\/a><\/h3><p class='adresse h7'>([\s\S]*?)<\/p>/g;
  let match;

  while ((match = itemRegex.exec(html)) !== null) {
    const [, id, rawName, rawAddress] = match;
    const address = parseAddress(rawAddress);
    entries.push({
      id,
      name: decodeHtml(rawName),
      ...address,
      source: 'sante.gouv.qc.ca',
      sourceUrl: `${BASE_URL}/repertoire-ressources/ressource/?nofiche=${id}`,
    });
  }

  return entries;
}

function normalizePhone(value) {
  return decodeHtml(value).replace(/\s+/g, ' ').trim();
}

function parseDetailPage(html) {
  const coordinatesMatch = html.match(/google\.ca\/maps\/dir\/[^"']*\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  const principalPhoneMatch = html.match(/<h4>\s*Principal\s*<\/h4>[\s\S]*?<a href="tel:[^"]+">([\s\S]*?)<\/a>/i);
  const firstPhoneMatch = html.match(/<a href="tel:[^"]+">([\s\S]*?)<\/a>/i);
  const telephone = principalPhoneMatch
    ? normalizePhone(principalPhoneMatch[1])
    : firstPhoneMatch
      ? normalizePhone(firstPhoneMatch[1])
      : '';
  const openingHours = parseOpeningHours(html);

  return {
    telephone,
    lat: coordinatesMatch ? Number(coordinatesMatch[1]) : undefined,
    lng: coordinatesMatch ? Number(coordinatesMatch[2]) : undefined,
    openingHours,
  };
}

function parseOpeningHours(html) {
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const entries = [];

  for (const day of days) {
    const start = html.indexOf(`id="jourgeneral${day}"`);
    if (start === -1) continue;

    const nextStarts = days
      .filter((otherDay) => otherDay !== day)
      .map((otherDay) => html.indexOf(`id="jourgeneral${otherDay}"`, start + 1))
      .filter((index) => index > start);
    const end = nextStarts.length ? Math.min(...nextStarts) : html.indexOf('<div class="rangee"', start + 1);
    const block = html.slice(start, end > start ? end : undefined);
    const isClosed = /<p>\s*Fermé\s*<\/p>/i.test(block);
    const hours = [...block.matchAll(/class="heure"[\s\S]*?<p>([\s\S]*?)<\/p>/gi)]
      .map((match) => decodeHtml(match[1]))
      .filter(Boolean);

    if (isClosed) {
      entries.push(`${day}: Fermé`);
    } else if (hours.length) {
      entries.push(`${day}: ${hours.join(', ')}`);
    }
  }

  return entries.join('; ');
}

async function main() {
  console.log(`[SANTE] Construction du référentiel pharmacies avec délai ${DELAY_MS} ms`);
  const firstHtml = await fetchTextWithRetry(searchUrl(1));
  const { total, totalPages } = parseTotalPages(firstHtml);
  const pagesToFetch = LIMIT_PAGES > 0 ? Math.min(LIMIT_PAGES, totalPages) : totalPages;
  const byId = new Map();

  for (const entry of parseListPage(firstHtml)) {
    byId.set(entry.id, entry);
  }

  console.log(`[SANTE] Page 1/${pagesToFetch}: ${byId.size} pharmacie(s), total annoncé ${total ?? 'inconnu'}`);

  for (let page = Math.max(2, START_PAGE); page <= pagesToFetch; page += 1) {
    await sleep(DELAY_MS);
    const html = await fetchTextWithRetry(searchUrl(page));
    const entries = parseListPage(html);
    for (const entry of entries) {
      byId.set(entry.id, entry);
    }
    console.log(`[SANTE] Page ${page}/${pagesToFetch}: +${entries.length}, cumul ${byId.size}`);
  }

  const listEntries = Array.from(byId.values()).sort((left, right) => left.name.localeCompare(right.name, 'fr'));
  const entries = [];

  for (let index = 0; index < listEntries.length; index += 1) {
    const entry = listEntries[index];
    await sleep(DELAY_MS);

    try {
      const html = await fetchTextWithRetry(entry.sourceUrl);
      const detail = parseDetailPage(html);
      entries.push({ ...entry, ...detail });
    } catch (error) {
      console.warn(`[SANTE] Détail indisponible pour ${entry.id}: ${error instanceof Error ? error.message : String(error)}`);
      entries.push(entry);
    }

    if ((index + 1) % 25 === 0 || index === listEntries.length - 1) {
      console.log(`[SANTE] Détails ${index + 1}/${listEntries.length}`);
    }
  }

  const payload = {
    source: 'sante.gouv.qc.ca',
    sourceUrl: `${BASE_URL}${SEARCH_PATH}?theme=autres-ressources&ch_type%5B12%5D=2101&ch_code=&ch_rayon=4&ch_choixReg=0&bt_rechType=`,
    generatedAt: new Date().toISOString(),
    totalAnnounced: total ?? entries.length,
    entries,
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`[SANTE] Référentiel écrit: ${OUTPUT_PATH}`);
  console.log(`[SANTE] ${entries.length} pharmacie(s) enregistrée(s)`);
}

main().catch((error) => {
  console.error(`[SANTE] Échec: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
