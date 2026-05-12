/**
 * Step 6: Render MP4 using HyperFrames CLI
 * Runs: npx hyperframes render inside the project directory
 */

import { execSync, spawn } from "child_process";
import { existsSync, readdirSync, statSync } from "fs";
import path from "path";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

export async function renderVideo(projectDir, outputDir) {
  logger.info(`  Running: npx hyperframes@${config.hyperframes.version} render`);
  logger.info(`  Project: ${projectDir}`);

  return new Promise((resolve, reject) => {
    const isWin = process.platform === "win32";
    const ver = config.hyperframes.version;

    // On Windows, `npx` is typically a PowerShell script (`npx.ps1`) which cannot be spawned
    // directly without a shell. Use PowerShell explicitly to avoid `shell: true` and DEP0190.
    const cmd = isWin ? "powershell.exe" : "npx";
    const args = isWin
      ? [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          `npx --yes hyperframes@${ver} render`,
        ]
      : [`--yes`, `hyperframes@${ver}`, `render`];

    const proc = spawn(cmd, args, {
      cwd: projectDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CI: "1" },
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => {
      stdout += d.toString();
      process.stdout.write(`    ${d}`);
    });
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
      // Only log errors, not progress spam
      const line = d.toString().trim();
      if (line && !line.includes("Downloading") && !line.includes("npm warn")) {
        process.stderr.write(`    ${d}`);
      }
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        logger.warn(`  HyperFrames render exited with code ${code}`);
        logger.warn(`  Stderr: ${stderr.slice(-500)}`);

        // Try to find any MP4 that was generated anyway
        const mp4 = findRenderedMp4(projectDir);
        if (mp4) {
          logger.info(`  Found output: ${mp4}`);
          return resolve(mp4);
        }

        return reject(new Error(`hyperframes render failed (code ${code})`));
      }

      // Find the rendered MP4
      const mp4 = findRenderedMp4(projectDir) || findRenderedMp4(path.join(projectDir, "dist"));
      if (!mp4) {
        return reject(new Error("Render succeeded but no MP4 found"));
      }

      logger.info(`  🎬 Rendered: ${mp4}`);
      resolve(mp4);
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to start hyperframes: ${err.message}\nMake sure Node.js and npm are installed.`));
    });
  });
}

function findRenderedMp4(dir) {
  if (!existsSync(dir)) return null;
  try {
    const files = readdirSync(dir, { recursive: true });
    let best = null;
    let bestMtime = -1;

    for (const f of files) {
      if (typeof f !== "string" || !f.endsWith(".mp4")) continue;
      const full = path.join(dir, f);
      if (!existsSync(full)) continue;

      const mtime = statSync(full).mtimeMs;
      if (mtime > bestMtime) {
        bestMtime = mtime;
        best = full;
      }
    }

    return best;
  } catch {
    return null;
  }
}
