#!/usr/bin/env node
import fs from "fs";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://football-logos.cc";
const LEAGUE_URL = `${BASE_URL}/saudi-arabia/`;
const COMPETITION = "saudi-pro-league";
const INDEX_PATH = path.join(process.cwd(), "assets", "football", "index.json");
const ATTRIBUTION_PATH = path.join(process.cwd(), "assets", "football", "ATTRIBUTION.md");

const TEAM_CODES = {
  "al-ittihad": "ITT",
  "al-hilal": "HIL",
  "al-qadsiah": "QAD",
  "al-nassr": "NAS",
  "al-ahli": "AHL",
  "al-shabab": "SHB",
  "al-hazem": "HAZ",
  "al-najma": "NAJ",
  "al-ettifaq": "ETT",
  "al-taawoun": "TA",
  "al-riyadh": "RIY",
  "al-khaleej": "KHA",
  "damac": "DAM",
  "al-kholood": "KHO",
  "al-fateh": "FAT",
  "al-fayha": "FAY",
  "al-okhdood": "OKH",
  "neom": "NEO",
};

const TEAM_ALIASES = {
  "al-ittihad": ["Al-Ittihad", "Ittihad", "Al Ittihad Club"],
  "al-hilal": ["Al-Hilal", "Hilal", "Al Hilal SFC"],
  "al-qadsiah": ["Al-Qadsiah", "Qadsiah", "Al Qadsiah FC"],
  "al-nassr": ["Al-Nassr", "Nassr", "Al Nassr FC"],
  "al-ahli": ["Al-Ahli", "Ahli", "Al Ahli Saudi FC"],
  "al-shabab": ["Al-Shabab", "Shabab", "Al Shabab FC"],
  "al-hazem": ["Al-Hazem", "Hazem", "Al Hazem FC"],
  "al-najma": ["Al-Najma", "Najma", "Al Najma SC"],
  "al-ettifaq": ["Al-Ettifaq", "Ettifaq", "Al Ettifaq FC"],
  "al-taawoun": ["Al-Taawoun", "Taawoun", "Al Taawoun FC"],
  "al-riyadh": ["Al-Riyadh", "Riyadh", "Al Riyadh SC"],
  "al-khaleej": ["Al-Khaleej", "Khaleej", "Al Khaleej FC"],
  "damac": ["Damac FC"],
  "al-kholood": ["Al-Kholood", "Kholood", "Al Kholood Club"],
  "al-fateh": ["Al-Fateh", "Fateh", "Al Fateh SC"],
  "al-fayha": ["Al-Fayha", "Fayha", "Al Fayha FC"],
  "al-okhdood": ["Al-Okhdood", "Okhdood", "Al Okhdood Club"],
  "neom": ["NEOM SC", "Neom SC"],
};

const http = axios.create({
  headers: {
    "User-Agent": "short-video-gen-ai/1.0 (asset-sync; local)",
    Accept: "text/html,image/png,*/*",
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

function titleCaseFromSlug(slug) {
  return String(slug)
    .split("-")
    .map((part) => part.toUpperCase() === "SC" ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

async function findPng1500(pageUrl) {
  const $ = await getPage(pageUrl);
  const pngs = [];
  $("a[href$='.png'], img[src$='.png'], img[data-src$='.png']").each((_, el) => {
    const href = $(el).attr("href") || $(el).attr("src") || $(el).attr("data-src");
    if (href) pngs.push(absoluteUrl(href));
  });
  const preferred = pngs.find((url) => url.includes("/1500x1500/")) || pngs[0];
  if (!preferred) throw new Error(`No PNG asset found on ${pageUrl}`);
  return preferred;
}

async function writeSvgFromPng(pngUrl, relPath) {
  const absPath = path.join(process.cwd(), relPath);
  ensureDir(path.dirname(absPath));
  const response = await http.get(pngUrl, { responseType: "arraybuffer" });
  fs.writeFileSync(absPath, pngToSvg(Buffer.from(response.data)), "utf-8");
}

async function scrapeSaudiProLeagueItems() {
  const $ = await getPage(LEAGUE_URL);
  const items = [];
  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || !href.startsWith("/saudi-arabia/")) return;
    const slug = href.split("/").filter(Boolean).pop();
    const text = cleanText($(el).text());
    const img = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || "";
    if (!slug || !img) return;
    if (items.some((item) => item.slug === slug)) return;
    items.push({ slug, text, pageUrl: absoluteUrl(href) });
  });

  const leagueIndex = items.findIndex((item) => item.slug === "saudi-professional-league");
  if (leagueIndex === -1) throw new Error("Saudi Professional League item not found");

  const teamItems = items
    .slice(leagueIndex + 1)
    .filter((item) => TEAM_CODES[item.slug])
    .slice(0, 18);

  return {
    tournament: items[leagueIndex],
    teams: teamItems,
  };
}

async function main() {
  const { tournament, teams } = await scrapeSaudiProLeagueItems();
  const index = readIndex();
  const updatedAt = nowIso();
  const licenseName = "Editorial use; logos are property of their respective owners";
  const licenseUrl = tournament.pageUrl;

  const tournamentPngUrl = await findPng1500(tournament.pageUrl);
  const tournamentRelPath = "assets/football/tournaments/saudi-arabia_saudi-professional-league.football-logos.cc.svg";
  await writeSvgFromPng(tournamentPngUrl, tournamentRelPath);
  upsertRecord(index, {
    id: COMPETITION,
    kind: "tournament",
    competition: COMPETITION,
    name: "Saudi Pro League",
    aliases: ["Saudi Professional League", "Roshn Saudi League", "SPL"],
    codes: { short: "SPL" },
    badge: {
      type: "logo",
      path: tournamentRelPath,
      sourceUrl: tournament.pageUrl,
      sourcePngUrl: tournamentPngUrl,
      licenseName,
      licenseUrl,
    },
    updatedAt,
  });
  appendAttribution(tournamentRelPath, tournament.pageUrl, licenseUrl);
  console.log(`tournament: ${tournamentRelPath}`);

  for (const team of teams) {
    const pngUrl = await findPng1500(team.pageUrl);
    const relPath = `assets/football/clubs/${COMPETITION}/${team.slug}.svg`;
    await writeSvgFromPng(pngUrl, relPath);
    const name = cleanText(team.text).replace(/ [\u0600-\u06FF].*$/, "") || titleCaseFromSlug(team.slug);
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
        sourcePngUrl: pngUrl,
        licenseName,
        licenseUrl,
      },
      updatedAt,
    });
    appendAttribution(relPath, team.pageUrl, licenseUrl);
    console.log(`club: ${team.slug} -> ${relPath}`);
  }

  index.records = index.records.filter((record) => (
    record.id !== "epl:al-nassr" && record.id !== "epl:damac"
  ));
  writeIndex(index);
  console.log(`updated ${INDEX_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
