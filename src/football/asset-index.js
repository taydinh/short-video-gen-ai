import fs from "fs";
import path from "path";

function stripDiacritics(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function normalizeKey(str) {
  return stripDiacritics(str)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function loadFootballAssetIndex(options = {}) {
  const indexPath = options.indexPath
    || path.join(process.cwd(), "assets", "football", "index.json");
  const raw = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  const records = Array.isArray(raw.records) ? raw.records : [];
  return { indexPath, raw, records };
}

export function findFootballAssetForTeam(team, index, hints = {}) {
  const name = team?.name || team?.title || "";
  const code = team?.code || "";
  const teamType = String(team?.teamType || hints.teamType || "").toLowerCase();
  const wantKind = teamType === "national" ? "national" : teamType === "club" ? "club" : null;

  const candidates = index.records;
  const codeKey = normalizeKey(code);
  const nameKey = normalizeKey(name);

  const matchScore = (rec) => {
    let score = 0;
    if (wantKind && rec.kind === wantKind) score += 5;
    if (rec.codes) {
      const codes = Object.values(rec.codes).filter(Boolean).map((c) => normalizeKey(c));
      if (codeKey && codes.includes(codeKey)) score += 10;
    }
    const recNameKey = normalizeKey(rec.name);
    if (nameKey && recNameKey === nameKey) score += 9;
    if (nameKey && recNameKey && (recNameKey.includes(nameKey) || nameKey.includes(recNameKey))) score += 4;
    if (Array.isArray(rec.aliases)) {
      const aliasKeys = rec.aliases.map(normalizeKey);
      if (nameKey && aliasKeys.includes(nameKey)) score += 8;
      if (codeKey && aliasKeys.includes(codeKey)) score += 6;
    }
    return score;
  };

  let best = null;
  let bestScore = 0;
  for (const rec of candidates) {
    const s = matchScore(rec);
    if (s > bestScore) {
      bestScore = s;
      best = rec;
    }
  }

  if (!best || bestScore < 6) return null;

  // Resolve badge path
  const badgePath = best.badge?.path ? String(best.badge.path) : null;
  if (!badgePath) return null;

  const isNational = best.kind === "national";
  return {
    record: best,
    badgeType: isNational ? "national" : "club",
    badgeSrc: badgePath.replace(/\\/g, "/"),
    flagSrc: isNational ? badgePath.replace(/\\/g, "/") : null,
    logoSrc: !isNational ? badgePath.replace(/\\/g, "/") : null,
  };
}

