export function normalizeVoiceTextForTTS(input) {
  const text = String(input ?? "");
  if (!text) return text;

  return text
    .replace(/\bhai nghìn không trăm (mười(?: một| hai| ba| bốn| lăm| năm| sáu| bảy| tám| chín)?)\b/gi, (_match, teen) => {
      return `hai không ${normalizeVietnameseTeenWord(teen)}`;
    })
    .replace(/\bhai nghìn không trăm (hai|ba|bốn|năm|sáu|bảy|tám|chín) mươi(?: (mốt|một|hai|ba|bốn|lăm|năm|sáu|bảy|tám|chín))?\b/gi, (_match, tens, ones) => {
      const normalizedOnes = ones ? ` ${normalizeVietnameseDigitWord(ones)}` : " không";
      return `hai không ${normalizeVietnameseDigitWord(tens)}${normalizedOnes}`;
    })
    .replace(/\bhai nghìn không trăm (?:(?:lẻ|linh) )?(một|hai|ba|bốn|năm|sáu|bảy|tám|chín)\b/gi, (_match, ones) => {
      return `hai không lẻ ${normalizeVietnameseDigitWord(ones)}`;
    })
    .replace(/\bmột nghìn chín trăm (một|hai|ba|bốn|năm|sáu|bảy|tám|chín) mươi(?: (mốt|một|hai|ba|bốn|lăm|năm|sáu|bảy|tám|chín))?\b/gi, (_match, tens, ones) => {
      const normalizedOnes = ones ? ` ${normalizeVietnameseDigitWord(ones)}` : " không";
      return `một chín ${normalizeVietnameseDigitWord(tens)}${normalizedOnes}`;
    })
    .replace(/\b(19\d{2}|20\d{2})\b/g, speakVietnameseYear)
    // Convert times like "21:00" into spoken Vietnamese "21 giờ".
    // Only applies to exact ":00" minutes to avoid guessing how to speak other minute values.
    .replace(/\b([01]?\d|2[0-3]):00\b/g, (_match, hour) => {
      const h = Number.parseInt(hour, 10);
      if (!Number.isFinite(h)) return _match;
      return `${h} giờ`;
    });
}

const DIGIT_WORDS = {
  "0": "không",
  "1": "một",
  "2": "hai",
  "3": "ba",
  "4": "bốn",
  "5": "năm",
  "6": "sáu",
  "7": "bảy",
  "8": "tám",
  "9": "chín",
};

const VIETNAMESE_DIGIT_WORDS = {
  "một": "một",
  "mốt": "một",
  "hai": "hai",
  "ba": "ba",
  "bốn": "bốn",
  "năm": "năm",
  "lăm": "năm",
  "sáu": "sáu",
  "bảy": "bảy",
  "tám": "tám",
  "chín": "chín",
};

const TEEN_WORDS = {
  "10": "mười",
  "11": "mười một",
  "12": "mười hai",
  "13": "mười ba",
  "14": "mười bốn",
  "15": "mười lăm",
  "16": "mười sáu",
  "17": "mười bảy",
  "18": "mười tám",
  "19": "mười chín",
};

function normalizeVietnameseDigitWord(word) {
  return VIETNAMESE_DIGIT_WORDS[String(word || "").toLowerCase()] || word;
}

function normalizeVietnameseTeenWord(phrase) {
  return String(phrase || "").toLowerCase().replace(/\blăm\b/g, "năm");
}

function speakVietnameseYear(match) {
  const year = String(match);
  const [a, b, c, d] = year;

  if (a === "1" && b === "9") {
    return [a, b, c, d].map(digit => DIGIT_WORDS[digit]).join(" ");
  }

  if (a === "2" && b === "0") {
    if (c === "0") return `hai không lẻ ${DIGIT_WORDS[d]}`;
    if (c === "1") return `hai không ${TEEN_WORDS[`${c}${d}`]}`;
    return `hai không ${DIGIT_WORDS[c]} ${DIGIT_WORDS[d]}`;
  }

  return match;
}
