const STEP_ICONS = ["", "📖", "🤖", "🎙️", "⏱️", "🏗️", "🎬", "🎵"];

export const logger = {
  info: (msg) => console.log(`  ${msg}`),
  warn: (msg) => console.warn(`  ⚠️  ${msg}`),
  error: (msg) => console.error(`  ❌ ${msg}`),
  step: (n, msg) => console.log(`\n${STEP_ICONS[n] || "▶️"} [Step ${n}/7] ${msg}`),
  success: (msg) => console.log(`  ✅ ${msg}`),
  debug: (msg) => process.env.DEBUG && console.log(`  🐛 ${msg}`),
};