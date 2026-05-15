// ─────────────────────────────────────────────────────────────────────────────
// Insight Eleven Virtual Scout — Server Express v1.1
// Backend API per il motore di scouting
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();

const express = require('express');
const path = require('path');
const { generateScoutCard, generateRanking, generatePremiumDossier } = require('./src/engine/scout');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('>>> API KEY presente:', !!process.env.ANTHROPIC_API_KEY);
console.log('>>> PORT:', PORT);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ──────────────────────────────────────────────────────────────

/**
 * POST /api/scout
 * Genera una scheda scout singola con streaming.
 * Body: { playerName: string }
 */
app.post('/api/scout', async (req, res) => {
  const { playerName } = req.body;

  if (!playerName || playerName.trim().length === 0) {
    return res.status(400).json({ error: 'Nome del giocatore richiesto.' });
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const stream = await generateScoutCard(playerName.trim());

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
    });

    stream.on('message', (message) => {
      res.write(`data: ${JSON.stringify({ type: 'done', usage: message.usage })}\n\n`);
      res.end();
    });

    stream.on('error', (error) => {
      console.error('Stream error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('Scout error:', error);
    res.status(500).json({ error: 'Errore nella generazione della scheda scout.' });
  }
});

/**
 * POST /api/ranking
 * Genera un ranking tra più giocatori con streaming.
 * Body: { players: string[] }
 */
app.post('/api/ranking', async (req, res) => {
  const { players } = req.body;

  if (!players || !Array.isArray(players) || players.length < 2) {
    return res.status(400).json({ error: 'Fornire almeno 2 giocatori per il ranking.' });
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const stream = await generateRanking(players.map(p => p.trim()));

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
    });

    stream.on('message', (message) => {
      res.write(`data: ${JSON.stringify({ type: 'done', usage: message.usage })}\n\n`);
      res.end();
    });

    stream.on('error', (error) => {
      console.error('Stream error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('Ranking error:', error);
    res.status(500).json({ error: 'Errore nella generazione del ranking.' });
  }
});

/**
 * POST /api/premium
 * Genera un dossier Player Radar Premium con streaming.
 * Body: { playerName: string }
 */
app.post('/api/premium', async (req, res) => {
  const { playerName } = req.body;

  if (!playerName || playerName.trim().length === 0) {
    return res.status(400).json({ error: 'Nome del giocatore richiesto.' });
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const stream = await generatePremiumDossier(playerName.trim());

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
    });

    stream.on('message', (message) => {
      res.write(`data: ${JSON.stringify({ type: 'done', usage: message.usage })}\n\n`);
      res.end();
    });

    stream.on('error', (error) => {
      console.error('Stream error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('Premium error:', error);
    res.status(500).json({ error: 'Errore nella generazione del dossier premium.' });
  }
});

// ─── Serve frontend ──────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n⚽ Insight Eleven Virtual Scout`);
  console.log(`   Server avviato su http://localhost:${PORT}`);
  console.log(`   Pronto per lo scouting.\n`);
});
