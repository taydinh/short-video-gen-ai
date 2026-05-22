import { createReadStream } from "fs";
import { mkdir, readFile, readdir, stat, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

const YOUTUBE_UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload";
const YOUTUBE_DIR = path.resolve(".youtube");
const CLIENT_SECRET_PATH = path.join(YOUTUBE_DIR, "client_secret.json");
const TOKEN_PATH = path.join(YOUTUBE_DIR, "token.json");
const DEFAULT_CATEGORY_ID = "22";
const DEFAULT_PRIVACY_STATUS = "public";

export async function uploadYoutubeFromStoryboard(storyboardPath, options = {}) {
  if (!storyboardPath) {
    throw new Error("Missing storyboard path. Usage: node run.js upload-youtube <storyboard.json>");
  }

  const resolvedStoryboardPath = path.resolve(storyboardPath);
  const storyboard = await readStoryboard(resolvedStoryboardPath);
  const metadata = resolveYoutubeMetadata(storyboard);
  const videoPath = await findVideoForStoryboard(metadata.slug, resolvedStoryboardPath);

  logger.info("YouTube upload metadata:");
  logger.info(`  Storyboard: ${resolvedStoryboardPath}`);
  logger.info(`  Video: ${videoPath}`);
  logger.info(`  Title: ${metadata.title}`);
  logger.info(`  Privacy: ${metadata.privacyStatus}`);
  logger.info(`  Category: ${metadata.categoryId}`);

  if (options.dryRun) {
    logger.info("Dry run enabled. Skipping OAuth and upload.");
    return {
      dryRun: true,
      videoPath,
      metadata,
    };
  }

  const auth = await authorize();
  const youtube = google.youtube({ version: "v3", auth });

  logger.info("Uploading video to YouTube...");
  const response = await youtube.videos.insert({
    part: "snippet,status",
    requestBody: {
      snippet: {
        title: metadata.title,
        description: metadata.description,
        categoryId: metadata.categoryId,
        ...(metadata.tags.length > 0 ? { tags: metadata.tags } : {}),
      },
      status: {
        privacyStatus: metadata.privacyStatus,
        selfDeclaredMadeForKids: metadata.madeForKids,
        containsSyntheticMedia: metadata.containsSyntheticMedia,
      },
    },
    media: {
      mimeType: "video/*",
      body: createReadStream(videoPath),
    },
  });

  const videoId = response.data?.id;
  if (!videoId) {
    throw new Error("YouTube upload completed but no videoId was returned.");
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  logger.success(`YouTube upload complete: ${url}`);
  logger.warn("Note: YouTube may force uploads from unaudited API projects to private visibility.");

  return {
    videoId,
    url,
    videoPath,
    metadata,
  };
}

async function readStoryboard(storyboardPath) {
  if (!existsSync(storyboardPath)) {
    throw new Error(`Storyboard file not found: ${storyboardPath}`);
  }
  if (path.extname(storyboardPath).toLowerCase() !== ".json") {
    throw new Error(`Storyboard must be a .json file: ${storyboardPath}`);
  }

  try {
    const raw = await readFile(storyboardPath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Cannot read storyboard JSON: ${err.message}`);
  }
}

function resolveYoutubeMetadata(storyboard) {
  const title = requireNonEmptyString(storyboard.title, "storyboard.title");
  const slug = requireNonEmptyString(storyboard.slug, "storyboard.slug");
  const description = String(storyboard.caption || storyboard.description || "").trim();

  if (!description) {
    throw new Error("Missing YouTube caption. Add storyboard.caption or storyboard.description before uploading.");
  }

  const youtube = storyboard.youtube || {};
  const tags = Array.isArray(youtube.tags)
    ? youtube.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];

  return {
    title,
    slug,
    description,
    categoryId: String(youtube.categoryId || DEFAULT_CATEGORY_ID),
    privacyStatus: DEFAULT_PRIVACY_STATUS,
    tags,
    madeForKids: Boolean(youtube.madeForKids),
    containsSyntheticMedia: Boolean(youtube.containsSyntheticMedia),
  };
}

function requireNonEmptyString(value, fieldName) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error(`Missing required field: ${fieldName}`);
  }
  return normalized;
}

async function findVideoForStoryboard(storyboardSlug, storyboardPath) {
  const outputRoot = path.resolve(config.output?.dir || "./output");
  const legacyInputSlug = slugFromInputPath(storyboardPath);
  const searchSlugs = [...new Set([storyboardSlug, legacyInputSlug].filter(Boolean))];
  const attempted = [];

  for (const slug of searchSlugs) {
    const directPath = path.join(outputRoot, slug, `${slug}.mp4`);
    attempted.push(directPath);
    if (await isFile(directPath)) return directPath;
  }

  const outputEntries = await safeReadDir(outputRoot, { withFileTypes: true });
  const matchingDirs = outputEntries
    .filter((entry) => entry.isDirectory() && searchSlugs.some((slug) => entry.name.includes(slug)))
    .map((entry) => path.join(outputRoot, entry.name));

  for (const dir of matchingDirs) {
    for (const slug of searchSlugs) {
      const preferred = path.join(dir, `${slug}.mp4`);
      attempted.push(preferred);
      if (await isFile(preferred)) return preferred;
    }
  }

  for (const slug of searchSlugs) {
    const directOutputFile = path.join(outputRoot, `${slug}.mp4`);
    attempted.push(directOutputFile);
    if (await isFile(directOutputFile)) return directOutputFile;
  }

  const candidates = [];
  for (const dir of matchingDirs) {
    candidates.push(...await collectUploadableMp4s(dir));
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.size - a.size);
    return candidates[0].path;
  }

  throw new Error([
    `Cannot find rendered MP4 for storyboard slug "${storyboardSlug}".`,
    "Tried:",
    ...attempted.map((item) => `  - ${item}`),
    matchingDirs.length > 0
      ? `Also scanned matching output folders: ${matchingDirs.join(", ")}`
      : `No folder in ${outputRoot} contains the slug.`,
  ].join("\n"));
}

function slugFromInputPath(inputPath) {
  const relativePath = path.relative(process.cwd(), inputPath);
  return relativePath
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 50);
}

async function collectUploadableMp4s(dir) {
  const entries = await safeReadDir(dir, { withFileTypes: true });
  const candidates = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (isExcludedVideoDir(fullPath)) continue;
      candidates.push(...await collectUploadableMp4s(fullPath));
      continue;
    }

    if (!entry.isFile()) continue;
    if (path.extname(entry.name).toLowerCase() !== ".mp4") continue;
    if (entry.name.toLowerCase() === "video-raw.mp4") continue;

    const fileStat = await stat(fullPath);
    candidates.push({ path: fullPath, size: fileStat.size });
  }

  return candidates;
}

function isExcludedVideoDir(dir) {
  const normalized = dir.replaceAll("\\", "/").toLowerCase();
  return normalized.includes("/hyperframes/renders");
}

async function authorize() {
  const clientSecret = await loadClientSecret();
  const savedCredentials = await loadSavedCredentials(clientSecret);
  if (savedCredentials) return savedCredentials;

  const client = await authenticate({
    scopes: [YOUTUBE_UPLOAD_SCOPE],
    keyfilePath: CLIENT_SECRET_PATH,
  });

  if (client.credentials) {
    await saveCredentials(client.credentials);
  }

  return client;
}

async function loadClientSecret() {
  if (!existsSync(CLIENT_SECRET_PATH)) {
    throw new Error([
      `Missing YouTube OAuth client secret: ${CLIENT_SECRET_PATH}`,
      "Create an OAuth Client ID in Google Cloud Console, download the JSON file,",
      "then save it as .youtube/client_secret.json.",
    ].join("\n"));
  }

  try {
    const raw = await readFile(CLIENT_SECRET_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    const credentials = parsed.installed || parsed.web;
    if (!credentials?.client_id || !credentials?.client_secret) {
      throw new Error("client_id/client_secret not found");
    }
    return credentials;
  } catch (err) {
    throw new Error(`Cannot load YouTube OAuth client secret: ${err.message}`);
  }
}

async function loadSavedCredentials(clientSecret) {
  if (!existsSync(TOKEN_PATH)) return null;

  try {
    const raw = await readFile(TOKEN_PATH, "utf-8");
    const credentials = JSON.parse(raw);
    const client = new google.auth.OAuth2(
      clientSecret.client_id,
      clientSecret.client_secret,
      firstRedirectUri(clientSecret)
    );
    client.setCredentials(credentials);
    return client;
  } catch (err) {
    throw new Error(`Cannot load saved YouTube token. Delete ${TOKEN_PATH} and retry. ${err.message}`);
  }
}

async function saveCredentials(credentials) {
  await mkdir(YOUTUBE_DIR, { recursive: true });
  await writeFile(TOKEN_PATH, JSON.stringify(credentials, null, 2), "utf-8");
  logger.info(`Saved YouTube OAuth token: ${TOKEN_PATH}`);
}

function firstRedirectUri(clientSecret) {
  return Array.isArray(clientSecret.redirect_uris) && clientSecret.redirect_uris.length > 0
    ? clientSecret.redirect_uris[0]
    : "http://localhost";
}

async function isFile(filePath) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

async function safeReadDir(dir, options) {
  try {
    return await readdir(dir, options);
  } catch (err) {
    throw new Error(`Cannot read output directory "${dir}": ${err.message}`);
  }
}
