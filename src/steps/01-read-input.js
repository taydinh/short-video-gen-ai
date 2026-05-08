/**
 * Step 1: Read input content from:
 *  - URL: fetch and extract text
 *  - .md file: read markdown
 *  - .json file: parse as storyboard
 *  - any text file: read as-is
 */

import { readFileSync, existsSync } from "fs";
import path from "path";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

export async function readInput(input) {
  // ── JSON storyboard ──────────────────────────────────────────────────────
  if (input.endsWith(".json") && existsSync(input)) {
    logger.info(`Reading storyboard JSON: ${input}`);
    const raw = readFileSync(input, "utf-8");
    const storyboardData = JSON.parse(raw);
    return {
      content: null,
      title: storyboardData.title || "Video",
      isStoryboard: true,
      storyboardData,
    };
  }

  // ── Local file (.md, .txt, etc.) ─────────────────────────────────────────
  if (existsSync(input)) {
    logger.info(`Reading local file: ${input}`);
    const content = readFileSync(input, "utf-8");
    const title = extractTitle(content, input);
    return { content, title, isStoryboard: false };
  }

  // ── URL ──────────────────────────────────────────────────────────────────
  if (input.startsWith("http://") || input.startsWith("https://")) {
    logger.info(`Fetching URL: ${input}`);
    const content = await fetchUrl(input);
    const title = extractTitleFromHtml(content) || new URL(input).hostname;
    const cleanContent = htmlToText(content);
    return { content: cleanContent, title, isStoryboard: false };
  }

  throw new Error(`Cannot read input: "${input}" — not a valid URL, JSON, or file path.`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchUrl(url) {
  const { default: fetch } = await import("node-fetch");
  const res = await fetch(url, {
    headers: { "User-Agent": config.fetch.userAgent },
    signal: AbortSignal.timeout(config.fetch.timeout),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

function htmlToText(html) {
  // Simple HTML → text extraction (no dependencies needed for basic cases)
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{3,}/g, "\n\n")
    .trim()
    .slice(0, 8000); // Limit to 8k chars for LLM context
}

function extractTitle(content, filePath) {
  // Try to get first heading from markdown
  const match = content.match(/^#\s+(.+)/m);
  if (match) return match[1].trim();
  return path.basename(filePath, path.extname(filePath));
}

function extractTitleFromHtml(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (match) return match[1].trim();
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1) return h1[1].replace(/<[^>]+>/g, "").trim();
  return null;
}