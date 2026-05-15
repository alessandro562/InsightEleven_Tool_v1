// ─────────────────────────────────────────────────────────────────────────────
// Insight Eleven Virtual Scout — Scouting Engine
// Motore principale che orchestra le chiamate all'LLM
// ─────────────────────────────────────────────────────────────────────────────

const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT, buildSinglePlayerPrompt, buildRankingPrompt, buildPremiumPrompt } = require('./prompts');

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 8192;

function getClient() {
  const apiKey = process.env.SCOUT_API_KEY || process.env.ANTHROPIC_API_KEY;
  console.log('>>> getClient() - API KEY presente:', !!apiKey);
  return new Anthropic({ apiKey });
}

async function generateScoutCard(playerName) {
  const userPrompt = buildSinglePlayerPrompt(playerName);
  return getClient().messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }]
  });
}

async function generateRanking(playerList) {
  const userPrompt = buildRankingPrompt(playerList);
  return getClient().messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }]
  });
}

async function generatePremiumDossier(playerName) {
  const userPrompt = buildPremiumPrompt(playerName);
  return getClient().messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }]
  });
}

module.exports = {
  generateScoutCard,
  generateRanking,
  generatePremiumDossier
};
