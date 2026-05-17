#!/usr/bin/env node
/**
 * Sync football assets from Wikimedia (best-effort):
 * - Seed records for WC2026 (48 teams) and EPL clubs
 * - Fetch missing flags/logos (prefer SVG) and store in assets/football/**
 * - Update assets/football/index.json and write minimal attribution metadata
 *
 * Usage:
 *   node scripts/sync-football-assets.js --seed wc2026 --slots 48 --fetch-missing
 *   node scripts/sync-football-assets.js --seed epl --fetch-missing
 *   node scripts/sync-football-assets.js --fetch-team "Argentina" --kind national
 *   node scripts/sync-football-assets.js --fetch-team "Arsenal" --kind club --competition epl
 */

import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";

const INDEX_PATH = path.join(process.cwd(), "assets", "football", "index.json");
const ATTRIBUTION_PATH = path.join(process.cwd(), "assets", "football", "ATTRIBUTION.md");

const http = axios.create({
  headers: {
    // Wikimedia APIs require a descriptive UA; some endpoints return 403 without it.
    "User-Agent": "short-video-gen-ai/1.0 (asset-sync; local)",
    "Accept": "application/json,text/html,*/*",
  },
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function httpGetWithRetry(url, config, options = {}) {
  const maxAttempts = options.maxAttempts || 6;
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await http.get(url, config);
    } catch (err) {
      const status = err?.response?.status;
      if ((status === 429 || status === 503) && attempt < maxAttempts) {
        const retryAfter = err?.response?.headers?.["retry-after"];
        const retryAfterSeconds = Number.isFinite(Number(retryAfter)) ? Number(retryAfter) : null;
        const waitMsFromRetryAfter = retryAfterSeconds != null ? Math.max(0, Math.floor(retryAfterSeconds * 1000)) : null;
        const backoffMs = Math.min(60000, 800 * (2 ** (attempt - 1)));
        const waitMs = (waitMsFromRetryAfter != null ? Math.max(backoffMs, waitMsFromRetryAfter) : backoffMs)
          + Math.floor(Math.random() * 250);
        // eslint-disable-next-line no-console
        console.log(`⏳ rate-limited (${status}), retry in ${waitMs}ms...`);
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
}

function nowIso() {
  return new Date().toISOString();
}

function stripDiacritics(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function slugifySimple(str) {
  return stripDiacritics(str)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function readIndex() {
  if (!fs.existsSync(INDEX_PATH)) {
    return { version: 1, updatedAt: null, records: [] };
  }
  const raw = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
  if (!raw.records) raw.records = [];
  if (!raw.version) raw.version = 1;
  return raw;
}

function writeIndex(index) {
  index.updatedAt = nowIso();
  fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true });
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), "utf-8");
}

function upsertRecord(index, record) {
  const id = String(record.id);
  const i = index.records.findIndex((r) => String(r.id) === id);
  if (i === -1) index.records.push(record);
  else index.records[i] = { ...index.records[i], ...record, updatedAt: nowIso() };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    args[k] = v;
  }
  return args;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function appendAttributionLine({ relPath, sourceUrl, licenseName, licenseUrl }) {
  try {
    if (!fs.existsSync(ATTRIBUTION_PATH)) return;
    const md = fs.readFileSync(ATTRIBUTION_PATH, "utf-8");
    if (md.includes(relPath)) return;
    const line = `- \`${relPath}\` — Source: ${sourceUrl || "unknown"} — License: ${licenseName || "unknown"}${licenseUrl ? ` (${licenseUrl})` : ""}\n`;
    fs.appendFileSync(ATTRIBUTION_PATH, line, "utf-8");
  } catch {
    // ignore attribution write failures
  }
}

async function mwSearchCommons(query) {
  const url = "https://commons.wikimedia.org/w/api.php";
  const { data } = await httpGetWithRetry(url, {
    params: {
      action: "query",
      format: "json",
      origin: "*",
      list: "search",
      srsearch: query,
      srlimit: 5,
      srnamespace: 6, // File:
    },
    timeout: 20000,
  });
  const hits = data?.query?.search || [];
  return hits.map((h) => h.title).filter(Boolean);
}

async function mwGetImageInfoCommons(fileTitle) {
  const url = "https://commons.wikimedia.org/w/api.php";
  const { data } = await httpGetWithRetry(url, {
    params: {
      action: "query",
      format: "json",
      origin: "*",
      prop: "imageinfo",
      titles: fileTitle,
      iiprop: "url|extmetadata|mime|size",
    },
    timeout: 20000,
  });
  const pages = data?.query?.pages || {};
  const page = Object.values(pages)[0];
  const ii = page?.imageinfo?.[0];
  if (!ii?.url) return null;
  const ext = ii.extmetadata || {};
  const licenseName = ext?.LicenseShortName?.value
    ? String(ext.LicenseShortName.value).replace(/<[^>]+>/g, "").trim()
    : (ext?.License?.value ? String(ext.License.value).replace(/<[^>]+>/g, "").trim() : "");
  const licenseUrl = ext?.LicenseUrl?.value
    ? String(ext.LicenseUrl.value).replace(/<[^>]+>/g, "").trim()
    : "";
  return {
    url: ii.url,
    mime: ii.mime || "",
    width: ii.width,
    height: ii.height,
    sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(fileTitle.replace(/ /g, "_"))}`,
    licenseName: licenseName || "Unknown",
    licenseUrl: licenseUrl || "",
    fileTitle,
  };
}

async function downloadToFile(url, absPath) {
  ensureDir(path.dirname(absPath));
  const res = await httpGetWithRetry(url, { responseType: "arraybuffer", timeout: 30000 });
  fs.writeFileSync(absPath, Buffer.from(res.data));
}

function pickPreferredFileTitle(fileTitles) {
  // Prefer SVG then PNG
  const svg = fileTitles.find((t) => /\.svg$/i.test(t));
  if (svg) return svg;
  const png = fileTitles.find((t) => /\.png$/i.test(t));
  if (png) return png;
  return fileTitles[0] || null;
}

async function fetchBadgeForRecord(record) {
  const kind = record.kind;
  const name = record.name;
  if (kind === "national") {
    // Common pattern: "Flag of <Country>.svg"
    const q1 = `intitle:"Flag of ${name}"`;
    const q2 = `intitle:"Flag of ${name}" filetype:svg`;
    const hits = [
      ...(await mwSearchCommons(`${q2}`)),
      ...(await mwSearchCommons(`${q1}`)),
      ...(await mwSearchCommons(`Flag of ${name} svg`)),
    ];
    const fileTitle = pickPreferredFileTitle(hits);
    if (!fileTitle) return null;
    const info = await mwGetImageInfoCommons(fileTitle);
    if (!info) return null;
    const slug = slugifySimple(name) || slugifySimple(record.id);
    const ext = /\.png$/i.test(info.url) ? "png" : "svg";
    const relPath = path.posix.join("assets/football/flags", `${slug}.${ext}`);
    const absPath = path.join(process.cwd(), relPath);
    await downloadToFile(info.url, absPath);
    appendAttributionLine({ relPath, sourceUrl: info.sourceUrl, licenseName: info.licenseName, licenseUrl: info.licenseUrl });
    return {
      badge: {
        type: "flag",
        path: relPath,
        sourceUrl: info.sourceUrl,
        licenseName: info.licenseName,
        licenseUrl: info.licenseUrl,
      },
    };
  }

  // Club (EPL)
  const q = `${name} logo filetype:svg`;
  const hits = [
    ...(await mwSearchCommons(`intitle:"${name}" logo filetype:svg`)),
    ...(await mwSearchCommons(q)),
    ...(await mwSearchCommons(`${name} crest svg`)),
  ];
  const fileTitle = pickPreferredFileTitle(hits);
  if (!fileTitle) return null;
  const info = await mwGetImageInfoCommons(fileTitle);
  if (!info) return null;
  const slug = slugifySimple(name) || slugifySimple(record.id);
  const ext = /\.png$/i.test(info.url) ? "png" : "svg";
  const relPath = path.posix.join("assets/football/clubs/epl", `${slug}.${ext}`);
  const absPath = path.join(process.cwd(), relPath);
  await downloadToFile(info.url, absPath);
  appendAttributionLine({ relPath, sourceUrl: info.sourceUrl, licenseName: info.licenseName, licenseUrl: info.licenseUrl });
  return {
    badge: {
      type: "logo",
      path: relPath,
      sourceUrl: info.sourceUrl,
      licenseName: info.licenseName,
      licenseUrl: info.licenseUrl,
    },
  };
}

// Seed lists (fallback if online seed fails)
const WC2026_TEAMS_FALLBACK = [
  "Canada","Mexico","United States",
  "Australia","Iraq","IR Iran","Japan","Jordan","Korea Republic","Qatar","Saudi Arabia","Uzbekistan",
  "Algeria","Cabo Verde","DR Congo","Côte d'Ivoire","Egypt","Ghana","Morocco","Senegal","South Africa","Tunisia",
  "Curaçao","Haiti","Panama",
  "Argentina","Brazil","Colombia","Ecuador","Paraguay","Uruguay",
  "New Zealand",
  "Austria","Belgium","Bosnia and Herzegovina","Croatia","Czechia","England","France","Germany","Netherlands","Norway","Portugal","Scotland","Spain","Sweden","Switzerland","Türkiye"
];

async function seedWc2026(index, slots = 48) {
  const teams = WC2026_TEAMS_FALLBACK.slice(0, slots);
  teams.forEach((name) => {
    const id = `wc2026:${slugifySimple(name)}`;
    upsertRecord(index, {
      id,
      kind: "national",
      competition: "wc2026",
      name,
      aliases: [],
      codes: { short: "" },
      badge: { type: "flag", path: null, sourceUrl: null, licenseName: null, licenseUrl: null },
      updatedAt: nowIso(),
    });
  });
}

async function seedEpl(index) {
  const fallback = [
    "Arsenal","Aston Villa","Bournemouth","Brentford","Brighton & Hove Albion",
    "Chelsea","Crystal Palace","Everton","Fulham","Ipswich Town",
    "Leeds United","Leicester City","Liverpool","Manchester City","Manchester United",
    "Newcastle United","Nottingham Forest","Southampton","Tottenham Hotspur","West Ham United"
  ];
  // Note: Keeping this list static avoids false positives (players/venues) from scraping.
  // Update this list manually per season if needed.
  fallback.forEach((name) => {
    const id = `epl:${slugifySimple(name)}`;
    upsertRecord(index, {
      id,
      kind: "club",
      competition: "epl",
      name,
      aliases: [],
      codes: { short: "" },
      badge: { type: "logo", path: null, sourceUrl: null, licenseName: null, licenseUrl: null },
      updatedAt: nowIso(),
    });
  });
}

async function fetchMissing(index, filter = {}) {
  const recs = index.records.filter((r) => {
    if (filter.competition && r.competition !== filter.competition) return false;
    if (filter.kind && r.kind !== filter.kind) return false;
    if (filter.id && String(r.id) !== String(filter.id)) return false;
    const p = r.badge?.path;
    return !p;
  });

  const limited = Number.isFinite(filter.limit) && filter.limit > 0
    ? recs.slice(0, filter.limit)
    : recs;

  for (const r of limited) {
    // Soft throttle to reduce Wikimedia rate limiting
    await sleep(350);
    try {
      const patch = await fetchBadgeForRecord(r);
      if (patch?.badge?.path) {
        upsertRecord(index, { ...r, ...patch, updatedAt: nowIso() });
        // eslint-disable-next-line no-console
        console.log(`✅ fetched ${r.kind} badge: ${r.name} -> ${patch.badge.path}`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`⚠️ missing badge: ${r.name}`);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`⚠️ fetch failed: ${r.name} (${e.message})`);
    }
  }
}

export async function syncFootballAssets(options = {}) {
  const index = readIndex();
  const seed = options.seed || null;
  const slots = Number(options.slots || 48);

  if (seed === "wc2026") await seedWc2026(index, slots);
  if (seed === "epl") await seedEpl(index);

  if (options.fetchTeam) {
    const name = String(options.fetchTeam);
    const kind = options.kind === "club" ? "club" : "national";
    const competition = options.competition || (kind === "club" ? "epl" : "wc2026");
    const id = `${competition}:${slugifySimple(name)}`;
    upsertRecord(index, {
      id,
      kind,
      competition,
      name,
      aliases: [],
      codes: { short: options.code || "" },
      badge: { type: kind === "club" ? "logo" : "flag", path: null, sourceUrl: null, licenseName: null, licenseUrl: null },
      updatedAt: nowIso(),
    });
    await fetchMissing(index, { id });
  } else if (options.fetchMissing) {
    await fetchMissing(index, {
      competition: options.filterCompetition || null,
      kind: options.filterKind || null,
      limit: options.limit ? Number(options.limit) : null,
    });
  }

  writeIndex(index);
  return index;
}

async function main() {
  const args = parseArgs(process.argv);
  await syncFootballAssets({
    seed: args.seed === true ? null : args.seed,
    slots: args.slots,
    fetchMissing: Boolean(args["fetch-missing"] || args.fetchMissing),
    fetchTeam: args["fetch-team"] || args.fetchTeam || null,
    kind: args.kind || null,
    competition: args.competition || null,
    code: args.code || null,
    filterCompetition: args["filter-competition"] || args.filterCompetition || null,
    filterKind: args["filter-kind"] || args.filterKind || null,
    limit: args.limit || null,
  });
}

const isRunDirectly = (() => {
  try {
    const selfPath = path.resolve(fileURLToPath(import.meta.url));
    const argvPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
    return selfPath === argvPath;
  } catch {
    return false;
  }
})();

if (isRunDirectly) {
  main().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  });
}
