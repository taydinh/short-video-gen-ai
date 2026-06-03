#!/usr/bin/env python
"""
Align scene voiceText to scene audio with stable-ts and emit phrase timings for
display subtitles. The displayed text intentionally comes from `subtitle`, while
alignment uses `voiceText` because that is the text spoken by TTS.
"""

from __future__ import annotations

import json
import math
import re
import sys
import traceback
from pathlib import Path


WORD_RE = re.compile(r"[\w\u00C0-\u024F\u1E00-\u1EFF]+", re.UNICODE)
SPLIT_RE = re.compile(r"(?<=[.!?…])\s+|[,;:]\s+", re.UNICODE)


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: align-subtitles-stable-ts.py <input.json> <output.json>", file=sys.stderr)
        return 2

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    payload = json.loads(input_path.read_text(encoding="utf-8"))
    config = payload.get("config") or {}
    scenes = payload.get("scenes") or []

    try:
        import stable_whisper
    except Exception as exc:
        print(f"stable-ts is not available: {exc}", file=sys.stderr)
        return 3

    model_name = config.get("model") or "base"
    language = config.get("language") or "vi"
    max_words = int(config.get("maxWordsPerCaption") or 6)
    timing_offset = as_float(config.get("timingOffsetSeconds"), 0.0)

    try:
        model = stable_whisper.load_model(model_name)
    except Exception as exc:
        print(f"failed to load stable-ts model '{model_name}': {exc}", file=sys.stderr)
        return 4

    result = {
        "provider": "stable-ts",
        "model": model_name,
        "language": language,
        "scenes": [],
        "warnings": [],
    }

    for scene in scenes:
        scene_id = scene.get("id")
        audio_path = scene.get("audioPath")
        voice_text = clean_text(scene.get("voiceText") or "")
        subtitle = clean_text(scene.get("subtitle") or "")
        scene_start = as_float(scene.get("startTime"), 0.0)
        scene_duration = as_float(scene.get("duration"), 0.0)
        scene_end = scene_start + max(scene_duration, 0.0)

        scene_result = {
            "sceneId": scene_id,
            "start": round(scene_start, 3),
            "end": round(scene_end, 3),
            "source": "aligned",
            "segments": [],
            "warnings": [],
        }

        if not audio_path or not Path(audio_path).exists():
            scene_result["source"] = "skipped"
            scene_result["warnings"].append("missing audio")
            result["scenes"].append(scene_result)
            continue

        if not voice_text:
            scene_result["source"] = "skipped"
            scene_result["warnings"].append("missing voiceText")
            result["scenes"].append(scene_result)
            continue

        if not subtitle:
            scene_result["source"] = "skipped"
            scene_result["warnings"].append("missing subtitle")
            result["scenes"].append(scene_result)
            continue

        try:
            aligned = model.align(audio_path, voice_text, language=language)
            words = extract_words(aligned)
            voice_phrases = split_phrases(voice_text, max_words)
            subtitle_phrases = split_phrases(subtitle, max_words)

            if not words:
                raise RuntimeError("stable-ts returned no word timestamps")

            if len(voice_phrases) != len(subtitle_phrases):
                scene_result["source"] = "aligned-proportional"
                scene_result["warnings"].append(
                    f"phrase count mismatch: voiceText={len(voice_phrases)}, subtitle={len(subtitle_phrases)}"
                )
                scene_result["segments"] = align_subtitle_phrases_proportionally(
                    subtitle_phrases,
                    words,
                    scene_start,
                    scene_end,
                )
            else:
                scene_result["segments"] = align_phrases_to_words(
                    voice_phrases,
                    subtitle_phrases,
                    words,
                    scene_start,
                    scene_end,
                )
                if len(scene_result["segments"]) != len(subtitle_phrases):
                    scene_result["source"] = "estimated"
                    scene_result["warnings"].append("word timestamp coverage incomplete")
                    scene_result["segments"] = estimate_segments(subtitle_phrases, scene_start, scene_end)
        except Exception as exc:
            scene_result["source"] = "estimated"
            scene_result["warnings"].append(str(exc))
            scene_result["segments"] = estimate_segments(split_phrases(subtitle, max_words), scene_start, scene_end)
            result["warnings"].append({"sceneId": scene_id, "error": traceback.format_exc(limit=2)})

        scene_result["segments"] = normalize_segments(scene_result["segments"], scene_start, scene_end, timing_offset)
        result["scenes"].append(scene_result)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def as_float(value, default: float) -> float:
    try:
        number = float(value)
        return number if math.isfinite(number) else default
    except Exception:
        return default


def words_in(text: str) -> list[str]:
    return WORD_RE.findall(text or "")


def split_phrases(text: str, max_words: int) -> list[str]:
    clean = clean_text(text)
    if not clean:
        return []

    rough = [part.strip() for part in SPLIT_RE.split(clean) if part.strip()]
    phrases: list[str] = []
    for part in rough or [clean]:
        words = part.split()
        for i in range(0, len(words), max(1, max_words)):
            chunk = " ".join(words[i : i + max_words]).strip()
            if chunk:
                phrases.append(chunk)
    return phrases


def extract_words(aligned) -> list[dict]:
    if hasattr(aligned, "to_dict"):
        data = aligned.to_dict()
    elif isinstance(aligned, dict):
        data = aligned
    else:
        data = json.loads(aligned.to_json())

    out: list[dict] = []
    for segment in data.get("segments") or []:
        for word in segment.get("words") or []:
            start = word.get("start")
            end = word.get("end")
            text = clean_text(word.get("word") or word.get("text") or "")
            if start is None or end is None or not text:
                continue
            out.append({"word": text, "start": float(start), "end": float(end)})
    return out


def align_phrases_to_words(
    voice_phrases: list[str],
    subtitle_phrases: list[str],
    words: list[dict],
    scene_start: float,
    scene_end: float,
) -> list[dict]:
    segments: list[dict] = []
    cursor = 0

    for voice_phrase, subtitle_phrase in zip(voice_phrases, subtitle_phrases):
        count = max(1, len(words_in(voice_phrase)))
        phrase_words = words[cursor : cursor + count]
        cursor += count
        if not phrase_words:
            continue

        start = scene_start + as_float(phrase_words[0].get("start"), 0.0)
        end = scene_start + as_float(phrase_words[-1].get("end"), 0.0)
        start = clamp(start, scene_start, scene_end)
        end = clamp(max(end, start + 0.08), scene_start, scene_end)
        segments.append(
            {
                "start": round(start, 3),
                "end": round(end, 3),
                "text": subtitle_phrase,
            }
        )

    return segments


def align_subtitle_phrases_proportionally(
    subtitle_phrases: list[str],
    words: list[dict],
    scene_start: float,
    scene_end: float,
) -> list[dict]:
    """Map display subtitle chunks onto stable-ts word timestamps.

    `subtitle` may use readable forms such as "PSG" while `voiceText` says
    "Pi S Ji". When phrase boundaries no longer match exactly, word-count
    proportions keep the display text close to the spoken position without
    discarding stable-ts timing entirely.
    """
    if not subtitle_phrases or not words:
        return []

    counts = [max(1, len(words_in(phrase))) for phrase in subtitle_phrases]
    total = sum(counts) or 1
    word_count = len(words)
    segments: list[dict] = []
    cursor = 0

    for index, phrase in enumerate(subtitle_phrases):
        start_ratio = cursor / total
        cursor += counts[index]
        end_ratio = cursor / total

        start_idx = min(word_count - 1, max(0, math.floor(start_ratio * word_count)))
        end_idx = min(word_count - 1, max(start_idx, math.ceil(end_ratio * word_count) - 1))

        start = scene_start + as_float(words[start_idx].get("start"), 0.0)
        end = scene_start + as_float(words[end_idx].get("end"), 0.0)
        start = clamp(start, scene_start, scene_end)
        end = clamp(max(end, start + 0.08), scene_start, scene_end)
        segments.append({"start": round(start, 3), "end": round(end, 3), "text": phrase})

    return segments


def estimate_segments(phrases: list[str], scene_start: float, scene_end: float) -> list[dict]:
    if not phrases or scene_end <= scene_start:
        return []

    counts = [max(1, len(words_in(phrase))) for phrase in phrases]
    total = sum(counts) or 1
    duration = scene_end - scene_start
    cursor = scene_start
    out = []

    for index, phrase in enumerate(phrases):
        alloc = duration * (counts[index] / total)
        start = cursor
        end = scene_end if index == len(phrases) - 1 else min(scene_end, cursor + alloc)
        cursor = end
        out.append({"start": round(start, 3), "end": round(end, 3), "text": phrase})
    return out


def normalize_segments(
    segments: list[dict],
    scene_start: float,
    scene_end: float,
    timing_offset: float,
) -> list[dict]:
    if not segments:
        return []

    normalized: list[dict] = []
    for segment in segments:
        start = clamp(as_float(segment.get("start"), scene_start) + timing_offset, scene_start, scene_end)
        end = clamp(as_float(segment.get("end"), start + 0.08) + timing_offset, scene_start, scene_end)
        text = clean_text(segment.get("text") or "")
        if not text:
            continue
        if end <= start:
            end = clamp(start + 0.08, scene_start, scene_end)
        normalized.append({"start": start, "end": end, "text": text})

    for index in range(len(normalized) - 1):
        current = normalized[index]
        nxt = normalized[index + 1]
        if current["end"] > nxt["start"]:
            boundary = (current["end"] + nxt["start"]) / 2.0
            current["end"] = max(current["start"] + 0.04, boundary)
            nxt["start"] = min(nxt["end"] - 0.04, boundary)

    return [
        {
            "start": round(clamp(segment["start"], scene_start, scene_end), 3),
            "end": round(clamp(segment["end"], scene_start, scene_end), 3),
            "text": segment["text"],
        }
        for segment in normalized
        if segment["end"] > segment["start"]
    ]


def clamp(value: float, low: float, high: float) -> float:
    return min(max(value, low), high)


if __name__ == "__main__":
    raise SystemExit(main())
