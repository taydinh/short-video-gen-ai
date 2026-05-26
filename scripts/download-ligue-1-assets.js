#!/usr/bin/env node
import fs from "fs";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://football-logos.cc";
const ASSET_BASE_URL = "https://images.football-logos.cc";
const LEAGUE_URL = `${BASE_URL}/france/`;
const COMPETITION = "ligue-1";
const INDEX_PATH = path.join(process.cwd(), "assets", "football", "index.json");
const ATTRIBUTION_PATH = path.join(process.cwd(), "assets", "football", "ATTRIBUTION.md");

const TEAM_CODES = {
  "paris-saint-germain": "PSG",
  angers: "ANG",
  auxerre: "AJA",
  brest: "BRE",
  "le-havre-ac": "HAC",
  "rc-lens": "RCL",
  lille: "LOSC",
  lorient: "FCL",
  lyon: "OL",
  marseille: "OM",
  "as-monaco": "ASM",
  nantes: "FCN",
  nice: "OGCN",
  "paris-fc": "PFC",
  rennes: "SRFC",
  "rc-strasbourg-alsace": "RCSA",
  toulouse: "TFC",
  "fc-metz": "FCM",
};

const TEAM_ALIASES = {
  "paris-saint-germain": ["PSG", "Paris SG", "Paris Saint-Germain"],
  angers: ["Angers SCO", "SCO Angers"],
  auxerre: ["AJ Auxerre", "AJA"],
  brest: ["Stade Brestois", "Stade Brestois 29"],
  "le-havre-ac": ["Le Havre", "HAC"],
  "rc-lens": ["Lens", "Racing Club de Lens"],
  lille: ["LOSC Lille", "LOSC"],
  lorient: ["FC Lorient", "Lorient"],
  lyon: ["Lyon", "Olympique Lyonnais", "OL"],
  marseille: ["Olympique de Marseille", "OM"],
  "as-monaco": ["Monaco", "AS Monaco FC"],
  nantes: ["FC Nantes"],
  nice: ["OGC Nice", "Nice"],
  "paris-fc": ["Paris FC", "PFC"],
  rennes: ["Stade Rennais", "Stade Rennais FC"],
  "rc-strasbourg-alsace": ["Strasbourg", "RC Strasbourg", "RCSA"],
  toulouse: ["Toulouse FC", "TFC"],
  "fc-metz": ["Metz", "FC Metz"],
};

const http = axios.create({
  headers: {
    "User-Agent": "short-video-gen-ai/1.0 (asset-sync; local)",
    Accept: "text/html,image/svg+xml,image/png,*/*",
  },
  timeout: 30000,
});

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function absoluteUrl(url) {
  return new URL(url, BASE_URL).toString();
}

function readIndex() {
  if (!fs.existsSync(INDEX_PATH)) return { version: 1, updatedAt: null, records: [] };
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
  if (!Array.isArray(index.records)) index.records = [];
  return index;
}

function writeIndex(index) {
  index.updatedAt = nowIso();
  fs.writeFileSync(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`, "utf-8");
}

function upsertRecord(index, record) {
  const i = index.records.findIndex((item) => item.id === record.id);
  if (i === -1) {
    index.records.push(record);
    return;
  }
  index.records[i] = { ...index.records[i], ...record };
}

function appendAttribution(relPath, sourceUrl, licenseUrl) {
  if (!fs.existsSync(ATTRIBUTION_PATH)) return;
  const current = fs.readFileSync(ATTRIBUTION_PATH, "utf-8");
  if (current.includes(`\`${relPath}\``)) return;
  const line = `- \`${relPath}\` - Source: ${sourceUrl} - License: Editorial use; logos are property of their respective owners (${licenseUrl})\n`;
  fs.appendFileSync(ATTRIBUTION_PATH, line, "utf-8");
}

function pngToSvg(pngBuffer) {
  const base64 = pngBuffer.toString("base64");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 1500" width="1500" height="1500"><image width="1500" height="1500" href="data:image/png;base64,${base64}"/></svg>\n`;
}

async function getPage(url) {
  const { data } = await http.get(url);
  return cheerio.load(data);
}

function getPng1500FromCard($, el) {
  const src = $(el).find("img").attr("src") || "";
  if (!src) return null;
  return src.replace("/256x256/", "/1500x1500/");
}

async function scrapeLigue1Items() {
  const $ = await getPage(LEAGUE_URL);
  const items = [];

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || !href.startsWith("/france/")) return;
    const img = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || "";
    if (!img.includes("/256x256/")) return;
    const slug = href.split("/").filter(Boolean).pop();
    const text = cleanText($(el).text());
    if (!slug || !text) return;
    if (items.some((item) => item.slug === slug)) return;
    items.push({
      slug,
      text,
      pageUrl: absoluteUrl(href),
      sourcePngUrl: getPng1500FromCard($, el),
    });
  });

  const leagueIndex = items.findIndex((item) => item.slug === COMPETITION);
  const nextLeagueIndex = items.findIndex((item, index) => index > leagueIndex && item.slug === "ligue-2");
  if (leagueIndex === -1) throw new Error("Ligue 1 item not found");
  if (nextLeagueIndex === -1) throw new Error("Ligue 2 boundary not found");

  return {
    tournament: items[leagueIndex],
    teams: items.slice(leagueIndex + 1, nextLeagueIndex),
  };
}

async function getDownloadUrls(pageUrl) {
  const $ = await getPage(pageUrl);
  const downloads = $("[data-logo-downloads]").first();
  const categoryId = downloads.attr("data-category-id");
  const logoId = downloads.attr("data-logo-id");
  const svgHash = downloads.attr("data-svg-hash");
  const pngUrl = $("a[href*='/1500x1500/'][href$='.png']").first().attr("href")
    || $("img[src*='/1500x1500/'][src$='.png']").first().attr("src");

  if (!categoryId || !logoId) throw new Error(`Download metadata missing on ${pageUrl}`);
  return {
    svgUrl: svgHash ? `${ASSET_BASE_URL}/${categoryId}/${logoId}.${svgHash}.svg` : null,
    pngUrl: pngUrl || null,
  };
}

async function writePreferredSvg({ svgUrl, pngUrl }, relPath) {
  const absPath = path.join(process.cwd(), relPath);
  ensureDir(path.dirname(absPath));

  if (svgUrl) {
    try {
      const response = await http.get(svgUrl, { responseType: "text" });
      if (String(response.data).includes("<svg")) {
        fs.writeFileSync(absPath, response.data.endsWith("\n") ? response.data : `${response.data}\n`, "utf-8");
        return { sourceSvgUrl: svgUrl };
      }
    } catch (error) {
      if (error?.response?.status !== 404) throw error;
    }
  }

  if (!pngUrl) throw new Error(`No usable SVG or PNG fallback for ${relPath}`);
  const response = await http.get(pngUrl, { responseType: "arraybuffer" });
  fs.writeFileSync(absPath, pngToSvg(Buffer.from(response.data)), "utf-8");
  return { sourceSvgUrl: null };
}

async function main() {
  const { tournament, teams } = await scrapeLigue1Items();
  const index = readIndex();
  const updatedAt = nowIso();
  const licenseName = "Editorial use; logos are property of their respective owners";
  const licenseUrl = tournament.pageUrl;

  const tournamentDownloads = await getDownloadUrls(tournament.pageUrl);
  const tournamentRelPath = "assets/football/tournaments/france_ligue-1.football-logos.cc.svg";
  const tournamentWritten = await writePreferredSvg(tournamentDownloads, tournamentRelPath);
  upsertRecord(index, {
    id: COMPETITION,
    kind: "tournament",
    competition: COMPETITION,
    name: "Ligue 1",
    aliases: ["Ligue 1 McDonald's", "French Ligue 1"],
    codes: { short: "L1" },
    badge: {
      type: "logo",
      path: tournamentRelPath,
      sourceUrl: tournament.pageUrl,
      sourceSvgUrl: tournamentWritten.sourceSvgUrl,
      sourcePngUrl: tournamentDownloads.pngUrl || tournament.sourcePngUrl,
      licenseName,
      licenseUrl,
    },
    updatedAt,
  });
  appendAttribution(tournamentRelPath, tournament.pageUrl, licenseUrl);
  console.log(`tournament: ${tournamentRelPath}`);

  for (const team of teams) {
    const downloads = await getDownloadUrls(team.pageUrl);
    const relPath = `assets/football/clubs/${COMPETITION}/${team.slug}.svg`;
    const written = await writePreferredSvg(downloads, relPath);
    const name = cleanText(team.text);
    upsertRecord(index, {
      id: `${COMPETITION}:${team.slug}`,
      kind: "club",
      competition: COMPETITION,
      name,
      aliases: TEAM_ALIASES[team.slug] || [],
      codes: { short: TEAM_CODES[team.slug] || "" },
      badge: {
        type: "logo",
        path: relPath,
        sourceUrl: team.pageUrl,
        sourceSvgUrl: written.sourceSvgUrl,
        sourcePngUrl: downloads.pngUrl || team.sourcePngUrl,
        licenseName,
        licenseUrl,
      },
      updatedAt,
    });
    appendAttribution(relPath, team.pageUrl, licenseUrl);
    console.log(`club: ${team.slug} -> ${relPath}`);
  }

  writeIndex(index);
  console.log(`updated ${INDEX_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
