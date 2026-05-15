export function normalizeVoiceTextForTTS(input) {
  const text = String(input ?? "");
  if (!text) return text;

  // Convert times like "21:00" into spoken Vietnamese "21 giờ".
  // Only applies to exact ":00" minutes to avoid guessing how to speak other minute values.
  return text.replace(/\b([01]?\d|2[0-3]):00\b/g, (_match, hour) => {
    const h = Number.parseInt(hour, 10);
    if (!Number.isFinite(h)) return _match;
    return `${h} giờ`;
  });
}

