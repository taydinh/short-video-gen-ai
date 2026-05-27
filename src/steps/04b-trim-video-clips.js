import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { logger } from "../utils/logger.js";

/**
 * Parses a timestamp string like "00:15:23.000" or "00:15:23,000" into seconds.
 */
function parseTimestampToSeconds(ts) {
  if (!ts) return 0;
  const parts = ts.replace(",", ".").split(":");
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(ts);
}

export async function trimVideoClips(storyboard, outputDir) {
  // Find scenes that either have scene.videoClip or a video visual in scene.visuals
  const scenesWithClips = storyboard.scenes.filter(s => {
    if (s.videoClip && s.videoClip.videoUrl) return true;
    if (Array.isArray(s.visuals)) {
      return s.visuals.some(v => (v.type === 'video' || v.type === 'video-clip-card') && v.videoUrl);
    }
    return false;
  });
  
  if (scenesWithClips.length === 0) {
    return storyboard; // No video clips to process
  }

  logger.info(`  🎬 Found ${scenesWithClips.length} scenes with video clips to trim...`);

  const clipsDir = path.join(outputDir, "video-clips");
  if (!existsSync(clipsDir)) {
    mkdirSync(clipsDir, { recursive: true });
  }

  const updatedStoryboard = { ...storyboard, scenes: [...storyboard.scenes] };

  for (let i = 0; i < updatedStoryboard.scenes.length; i++) {
    const scene = updatedStoryboard.scenes[i];
    
    // Collect all video clip configs from this scene
    const clipConfigs = [];
    if (scene.videoClip && scene.videoClip.videoUrl) {
      clipConfigs.push(scene.videoClip);
    }
    if (Array.isArray(scene.visuals)) {
      for (const v of scene.visuals) {
        if ((v.type === 'video' || v.type === 'video-clip-card') && v.videoUrl) {
          clipConfigs.push(v);
        }
      }
    }

    if (clipConfigs.length === 0) continue;

    for (let j = 0; j < clipConfigs.length; j++) {
      const clip = clipConfigs[j];
      
      // Resolve videoUrl path
      let videoSrc = clip.videoUrl;
      if (!path.isAbsolute(videoSrc)) {
        videoSrc = path.resolve(videoSrc);
      }

      if (!existsSync(videoSrc)) {
        logger.warn(`  ⚠️ Video clip source not found: ${videoSrc}`);
        continue;
      }

      const startTimeStr = clip.startTime || (clip.trim && clip.trim.start);
      const endTimeStr = clip.endTime || (clip.trim && clip.trim.end);
      
      const startSeconds = parseTimestampToSeconds(startTimeStr);
      const endSeconds = parseTimestampToSeconds(endTimeStr);
      const duration = Math.max(0.1, endSeconds - startSeconds);

      clip.duration = duration;
      clip.startTimeStr = startTimeStr;
      clip.endTimeStr = endTimeStr;

      const clipId = clipConfigs.length > 1 ? `${scene.id}-${j}` : scene.id;
      const trimmedPath = path.join(clipsDir, `clip-scene-${clipId}.mp4`);
      const trimmedAudioPath = path.join(clipsDir, `clip-scene-${clipId}-audio.wav`);

      logger.info(`  ✂️ Trimming clip for scene ${scene.id} (${duration.toFixed(2)}s)...`);

      try {
        // 1. Trim video
        execSync(
          `ffmpeg -ss ${clip.startTimeStr.replace(",", ".")} -to ${clip.endTimeStr.replace(",", ".")} -i "${videoSrc}" -c:v libx264 -c:a aac -y "${trimmedPath}"`,
          { stdio: "ignore" } // Hide ffmpeg output
        );

        // 2. Extract audio for merging
        execSync(
          `ffmpeg -ss ${clip.startTimeStr.replace(",", ".")} -to ${clip.endTimeStr.replace(",", ".")} -i "${videoSrc}" -vn -acodec pcm_s16le -ar 44100 -ac 2 -y "${trimmedAudioPath}"`,
          { stdio: "ignore" }
        );

        clip.trimmedPath = trimmedPath;
        clip.trimmedAudioPath = trimmedAudioPath;
        
      } catch (err) {
        logger.error(`  ❌ Failed to trim video clip for scene ${scene.id}: ${err.message}`);
      }
    }
  }

  return updatedStoryboard;
}
