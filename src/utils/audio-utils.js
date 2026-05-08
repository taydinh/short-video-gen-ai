import { execSync } from "child_process";
import { existsSync } from "fs";

/**
 * Get audio duration in seconds using ffprobe
 */
export async function getAudioDuration(audioPath) {
  if (!existsSync(audioPath)) return 3;

  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
      { encoding: "utf-8", timeout: 10000 }
    ).trim();
    const d = parseFloat(out);
    return isNaN(d) ? 3 : d;
  } catch {
    // Fallback: estimate from file size (rough)
    try {
      const { statSync } = await import("fs");
      const bytes = statSync(audioPath).size;
      return Math.max(1, bytes / 16000); // ~16KB/s for 8kHz mono
    } catch {
      return 3;
    }
  }
}

/**
 * Concatenate multiple audio files into one WAV
 */
export async function concatenateAudio(audioPaths, outputPath, gaps = []) {
  // Build ffmpeg filter complex for concat with gaps
  const inputs = audioPaths.map((p) => `-i "${p}"`).join(" ");

  let filterParts = [];
  let streams = [];

  audioPaths.forEach((_, i) => {
    streams.push(`[${i}:a]`);
    if (gaps[i] && gaps[i] > 0) {
      // Add silence gap after this audio
      streams.push(`aevalsrc=0:d=${gaps[i].toFixed(3)}[gap${i}]`);
      filterParts.push(`[gap${i}]`);
    }
  });

  const concatN = streams.filter((s) => !s.includes("gap")).length + filterParts.length;
  const filter = `${streams.join("")}concat=n=${concatN}:v=0:a=1[out]`;

  execSync(
    `ffmpeg ${inputs} -filter_complex "${filter}" -map "[out]" "${outputPath}" -y 2>/dev/null`,
    { timeout: 60000 }
  );
}