import { mkdirSync, existsSync } from "fs";
import path from "path";
import { config } from "../config.js";

/**
 * Create a dated output directory from the input source.
 */
export async function createOutputDir(input) {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();

  // Generate slug from input
  let slug = input
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 50);

  const dirName = `${dd}-${mm}-${yyyy}-${slug}`;
  const outputDir = path.resolve(config.output.dir, dirName);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  return { outputDir, slug, dirName };
}

/**
 * Ensure a directory exists.
 */
export function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}