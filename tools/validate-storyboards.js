import fs from 'fs';
import path from 'path';

const storyboardsDir = 'd:/Vibe Coding/short-video-gen-ai/storyboards/25-06-2026';
const files = [
  'curacao-vs-cote-divoire-world-cup-2026-preview.json',
  'ecuador-vs-germany-world-cup-2026-preview.json',
  'japan-vs-sweden-world-cup-2026-preview.json',
  'tunisia-vs-netherlands-world-cup-2026-preview.json'
];

let hasErrors = false;

const expectedOutro = "Tôi là Méo bình luận, đừng quên follow để cập nhật các thông tin bóng đá mới nhất nhé!";
const expectedLogo = "assets/football/tournaments/tournaments_fifa-world-cup-2026.football-logos.cc.svg";

files.forEach(filename => {
  const filePath = path.join(storyboardsDir, filename);
  console.log(`\nValidating ${filename}...`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File does not exist at ${filePath}`);
    hasErrors = true;
    return;
  }

  try {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawContent);

    // 1. Basic validation
    if (data.preset !== 'Preset Football Preview') {
      console.error(`❌ Invalid preset: ${data.preset}`);
      hasErrors = true;
    }
    if (data.totalDuration !== 43) {
      console.error(`❌ Invalid totalDuration: ${data.totalDuration} (expected 43)`);
      hasErrors = true;
    }
    if (!data.scenes || data.scenes.length !== 7) {
      console.error(`❌ Expected exactly 7 scenes, found ${data.scenes ? data.scenes.length : 0}`);
      hasErrors = true;
      return;
    }

    // 2. Validate each scene
    data.scenes.forEach((scene, index) => {
      const sceneId = scene.id;
      const expectedCompositions = [
        'football-match-card',
        'football-tournament-intro',
        'football-lineup',
        'football-odds-h2h',
        'quote-attrib',
        'football-standings-table',
        'promo-card'
      ];
      
      const expectedComp = expectedCompositions[index];
      if (scene.composition !== expectedComp) {
        console.error(`❌ Scene ${sceneId}: expected composition '${expectedComp}', but got '${scene.composition}'`);
        hasErrors = true;
      }

      // Check tournament intro logo path
      if (scene.composition === 'football-tournament-intro') {
        if (scene.tournamentLogoSrc !== expectedLogo) {
          console.error(`❌ Scene ${sceneId}: tournamentLogoSrc is '${scene.tournamentLogoSrc}', expected '${expectedLogo}'`);
          hasErrors = true;
        }
      }

      // Check lineup player count
      if (scene.composition === 'football-lineup') {
        const homePlayers = scene.lineups?.home?.players || [];
        const awayPlayers = scene.lineups?.away?.players || [];
        if (homePlayers.length !== 11) {
          console.error(`❌ Scene ${sceneId}: home team has ${homePlayers.length} players (expected 11)`);
          hasErrors = true;
        }
        if (awayPlayers.length !== 11) {
          console.error(`❌ Scene ${sceneId}: away team has ${awayPlayers.length} players (expected 11)`);
          hasErrors = true;
        }
      }

      // Check H2H matches array is not empty
      if (scene.composition === 'football-odds-h2h') {
        const matches = scene.h2hMatches || [];
        if (matches.length === 0) {
          console.error(`❌ Scene ${sceneId}: h2hMatches is empty`);
          hasErrors = true;
        }
      }

      // Check quote image path
      if (scene.composition === 'quote-attrib') {
        if (scene.imageUrl !== 'assets/images/meo-bl-wc-room.png') {
          console.error(`❌ Scene ${sceneId}: quote imageUrl is '${scene.imageUrl}', expected 'assets/images/meo-bl-wc-room.png'`);
          hasErrors = true;
        }
      }

      // Check standings table structure
      if (scene.composition === 'football-standings-table') {
        const standings = scene.standings || [];
        if (standings.length !== 4) {
          console.error(`❌ Scene ${sceneId}: standings table has ${standings.length} teams (expected 4)`);
          hasErrors = true;
        }
        standings.forEach(row => {
          if (!row.team || typeof row.team !== 'object' || !row.team.name || !row.team.code || !row.team.flagSrc) {
            console.error(`❌ Scene ${sceneId}: invalid team object in standings:`, row.team);
            hasErrors = true;
          }
        });
      }

      // Check outro promo voiceText
      if (scene.composition === 'promo-card') {
        if (!scene.voiceText.includes(expectedOutro)) {
          console.error(`❌ Scene ${sceneId}: voiceText does not contain expected outro phrase`);
          hasErrors = true;
        }
      }
    });

    console.log(`✅ ${filename} passed all checks.`);
  } catch (err) {
    console.error(`❌ Failed to parse/validate ${filename}: ${err.message}`);
    hasErrors = true;
  }
});

if (hasErrors) {
  console.log('\n❌ Verification failed.');
  process.exit(1);
} else {
  console.log('\n✅ Verification succeeded. All storyboards look perfect!');
}
