/**
 * SRT Subtitle Generator
 * Tạo file .srt và burn subtitle trực tiếp vào video
 */

import { writeFileSync, existsSync, readFileSync } from "fs";
import path from "path";
import { execSync } from "child_process";
import { logger } from "./logger.js";
import { config } from "../config.js";

export function generateSRT(storyboard, audioFiles, outputDir) {
    const srtPath = path.join(outputDir, `${storyboard.slug}.srt`);
    let srtContent = '';
    let subtitleIndex = 1;

    logger.info("  Generating SRT subtitles from voiceText...");

    for (const scene of storyboard.scenes) {
        const voiceText = scene.voiceText;
        if (!voiceText || voiceText.trim() === '') {
            continue;
        }

        const audioFile = audioFiles.find(a => a.sceneId === scene.id);
        if (!audioFile || !audioFile.duration) {
            continue;
        }

        const startTime = scene.startTime;
        const words = voiceText.trim().split(/\s+/);
        const durationPerWord = scene.duration / words.length;

        let wordStartTime = startTime;

        for (let i = 0; i < words.length; i++) {
            const wordEndTime = wordStartTime + durationPerWord;

            srtContent += `${subtitleIndex}\n`;
            srtContent += `${formatTime(wordStartTime)} --> ${formatTime(wordEndTime)}\n`;
            srtContent += `${words[i]}\n\n`;

            subtitleIndex++;
            wordStartTime = wordEndTime;
        }
    }

    if (subtitleIndex > 1) {
        writeFileSync(srtPath, srtContent, 'utf-8');
        logger.info(`  ✅ SRT saved: ${srtPath}`);
        return srtPath;
    }

    return null;
}

export async function burnSubtitlesToVideo(videoPath, srtPath, outputPath) {
    if (!existsSync(videoPath)) {
        throw new Error(`Video not found: ${videoPath}`);
    }

    if (!existsSync(srtPath)) {
        throw new Error(`SRT not found: ${srtPath}`);
    }

    logger.info(`  Burning subtitles into video (hardcode)...`);

    // Chuẩn hóa đường dẫn - quan trọng cho Windows
    const normalizedVideoPath = path.resolve(videoPath);
    const normalizedSrtPath = path.resolve(srtPath);
    const normalizedOutputPath = path.resolve(outputPath);

    logger.info(`    Video: ${normalizedVideoPath}`);
    logger.info(`    SRT: ${normalizedSrtPath}`);
    logger.info(`    Output: ${normalizedOutputPath}`);

    const style = config.video.subtitles.style;

    // Cách 1: Dùng subtitles filter với style (đơn giản hơn, ít lỗi hơn)
    try {
        logger.info(`  Method 1: Using subtitles filter...`);

        // Escape đường dẫn cho Windows
        const escapedVideoPath = escapePathForFFmpeg(normalizedVideoPath);
        const escapedSrtPath = escapePathForFFmpeg(normalizedSrtPath);
        const escapedOutputPath = escapePathForFFmpeg(normalizedOutputPath);

        const subtitleFilter = `subtitles='${escapedSrtPath}':force_style='FontName=${style.font},FontSize=${style.fontSize},PrimaryColour=&H${hexToBgr(style.color.replace('#', ''))},BorderStyle=1,Outline=${style.outlineWidth},Shadow=1'`;

        const cmd = `ffmpeg -i "${escapedVideoPath}" -vf "${subtitleFilter}" -c:a copy "${escapedOutputPath}" -y`;
        logger.info(`    Running: ffmpeg -i "${path.basename(normalizedVideoPath)}" -vf "subtitles=..." -c:a copy "${path.basename(normalizedOutputPath)}" -y`);

        execSync(cmd, {
            timeout: 120000,
            stdio: 'pipe',
            cwd: path.dirname(normalizedVideoPath) // Chạy trong cùng thư mục để đường dẫn ngắn hơn
        });

        if (existsSync(normalizedOutputPath)) {
            const stats = require('fs').statSync(normalizedOutputPath);
            logger.info(`  ✅ Subtitles burned successfully! (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
            return normalizedOutputPath;
        }
    } catch (err) {
        logger.warn(`  Method 1 failed: ${err.message}`);
    }

    // Cách 2: Copy SRT vào cùng thư mục với tên đơn giản
    try {
        logger.info(`  Method 2: Using simple filename...`);

        const tempDir = path.dirname(normalizedVideoPath);
        const simpleSrtName = `subtitle_${Date.now()}.srt`;
        const simpleSrtPath = path.join(tempDir, simpleSrtName);

        // Copy SRT với tên đơn giản
        writeFileSync(simpleSrtPath, readFileSync(normalizedSrtPath));

        const escapedVideoPath = escapePathForFFmpeg(normalizedVideoPath);
        const escapedSimpleSrtPath = escapePathForFFmpeg(simpleSrtPath);
        const escapedOutputPath = escapePathForFFmpeg(normalizedOutputPath);

        const subtitleFilter = `subtitles='${escapedSimpleSrtPath}':force_style='FontName=${style.font},FontSize=${style.fontSize},PrimaryColour=&H${hexToBgr(style.color.replace('#', ''))},BorderStyle=1,Outline=${style.outlineWidth},Shadow=1'`;

        execSync(
            `ffmpeg -i "${escapedVideoPath}" -vf "${subtitleFilter}" -c:a copy "${escapedOutputPath}" -y`,
            { timeout: 120000, stdio: 'pipe' }
        );

        // Cleanup temp file
        try { require('fs').unlinkSync(simpleSrtPath); } catch (e) { }

        if (existsSync(normalizedOutputPath)) {
            logger.info(`  ✅ Subtitles burned successfully (method 2)!`);
            return normalizedOutputPath;
        }
    } catch (err) {
        logger.warn(`  Method 2 failed: ${err.message}`);
    }

    // Cách 3: Dùng filter đơn giản nhất, không style
    try {
        logger.info(`  Method 3: Using simple subtitles filter (no style)...`);

        const tempDir = path.dirname(normalizedVideoPath);
        const simpleSrtName = `sub_${Date.now()}.srt`;
        const simpleSrtPath = path.join(tempDir, simpleSrtName);

        writeFileSync(simpleSrtPath, readFileSync(normalizedSrtPath));

        const escapedVideoPath = escapePathForFFmpeg(normalizedVideoPath);
        const escapedSimpleSrtPath = escapePathForFFmpeg(simpleSrtPath);
        const escapedOutputPath = escapePathForFFmpeg(normalizedOutputPath);

        execSync(
            `ffmpeg -i "${escapedVideoPath}" -vf "subtitles='${escapedSimpleSrtPath}'" -c:a copy "${escapedOutputPath}" -y`,
            { timeout: 120000, stdio: 'pipe' }
        );

        try { require('fs').unlinkSync(simpleSrtPath); } catch (e) { }

        if (existsSync(normalizedOutputPath)) {
            logger.info(`  ✅ Subtitles burned successfully (method 3)!`);
            return normalizedOutputPath;
        }
    } catch (err) {
        logger.warn(`  Method 3 failed: ${err.message}`);
    }

    throw new Error(`All subtitle burning methods failed`);
}

// Helper: Escape đường dẫn cho ffmpeg trên Windows
function escapePathForFFmpeg(filePath) {
    // Thay backslash bằng forward slash (ffmpeg trên Windows vẫn hiểu)
    let escaped = filePath.replace(/\\/g, '/');
    // Escape dấu nháy đơn
    escaped = escaped.replace(/'/g, "'\\''");
    return escaped;
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function hexToBgr(hex) {
    if (hex.length === 6) {
        const r = hex.slice(0, 2);
        const g = hex.slice(2, 4);
        const b = hex.slice(4, 6);
        return `${b}${g}${r}`;
    }
    return "FFFFFF";
}