// ─────────────────────────────────────────────────────────────────────────────
// Insight Eleven Virtual Scout — Scouting Engine
// Motore principale che orchestra le chiamate all'LLM
// ─────────────────────────────────────────────────────────────────────────────

const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT, buildSinglePlayerPrompt, buildRankingPrompt, buildPremiumPrompt } = require('./prompts');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 8192;

/**
 * Genera una scheda scout singola per un giocatore.
 * Restituisce la risposta come stream per il frontend.
 */
async function generateScoutCard(playerName) {
  const userPrompt = buildSinglePlayerPrompt(playerName);
  
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  });

  return stream;
}

/**
 * Genera un ranking tra più giocatori.
 */
async function generateRanking(playerList) {
  const userPrompt = buildRankingPrompt(playerList);
  
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  });

  return stream;
}

/**
 * Genera un dossier Player Radar Premium.
 */
async function generatePremiumDossier(playerName) {
  const userPrompt = buildPremiumPrompt(playerName);

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  });

  return stream;
}

module.exports = {
  generateScoutCard,
  generateRanking,
  generatePremiumDossier
};
