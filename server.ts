import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { createRoom, getRoom, validateInviteToken, joinRoom, allPhotosCollected, notifyRoomChange } from './server/rooms.ts';
import { startGame, playCard, drawCard, quitPlayerFromGame, getBroadcastPayload } from './server/game.ts';
import { generateCardImage, generateCardBackImage, pregenerateRoomCardImages } from './server/images.ts';
import { purgeRoom, scheduleWinPurge, startInactivityCleaner } from './server/cleanup.ts';
import { setupWebSocketServer } from './server/ws.ts';
import { getAvailableThemes, getThemePhotos } from './server/themes.ts';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const roomId = req.params.roomId || 'temp';
    const playerId = (req.query.playerId as string) || (req.body.playerId as string) || 'p';
    const dir = path.join(UPLOADS_DIR, roomId, playerId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const photoId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, photoId);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Setup WebSockets
setupWebSocketServer(server);

// Start periodic background cleaner for inactive rooms
startInactivityCleaner();

// APP_URL helper
function getAppUrl(req: express.Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');
  const rawProto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const protocol = rawProto.split(',')[0].trim();
  const rawHost = (req.headers['x-forwarded-host'] as string) || req.headers.host || `localhost:${PORT}`;
  const host = rawHost.split(',')[0].trim();
  return `${protocol}://${host}`;
}

// ==================== API ROUTES ====================

// 0. Get available theme collections
app.get('/api/themes', (_req, res) => {
  res.json({ themes: getAvailableThemes() });
});

// 0b. Get current room broadcast state for a player (used by upload screen refresh)
app.get('/api/rooms/:roomId/state', (req, res) => {
  const { roomId } = req.params;
  const { playerId } = req.query as { playerId: string };

  const room = getRoom(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const payload = getBroadcastPayload(room, playerId);
  res.json(payload);
});

// 1. Host creates room
app.post('/api/rooms', (req, res) => {
  const { hostName, nPlayers, deckMode, themeId } = req.body;
  const numP = parseInt(nPlayers, 10) || 4;
  const mode = deckMode === 'cars' ? 'cars' : deckMode === 'full' ? 'full' : 'quick';
  const appUrl = getAppUrl(req);

  const result = createRoom(hostName, numP, mode, appUrl, themeId);
  res.json({
    roomId: result.room.id,
    inviteLinks: result.inviteLinks,
    hostToken: result.hostToken,
    hostPlayerId: result.hostPlayerId,
  });
});

// 2. Validate invite token
app.get('/api/rooms/:roomId/join/:inviteToken', (req, res) => {
  const { roomId, inviteToken } = req.params;
  const validation = validateInviteToken(roomId, inviteToken);

  if (!validation.valid || !validation.room || !validation.player) {
    console.warn(`[JOIN-VALIDATE] FAILED — roomId="${roomId}", token="${inviteToken.slice(0, 8)}…", reason="${validation.message}"`);
    return res.status(404).json({ error: validation.message || 'Invalid invite token' });
  }

  console.log(`[JOIN-VALIDATE] OK — roomId="${roomId}", slot=${validation.player.slotIndex}, player="${validation.player.name}"`);
  res.json({
    roomId: validation.room.id,
    slotIndex: validation.player.slotIndex,
    isJoined: validation.player.joined,
    existingName: validation.player.name,
    deckMode: validation.room.deckMode,
    nPlayers: validation.room.nPlayers,
  });
});

// 3. Join room via invite token
app.post('/api/rooms/:roomId/join/:inviteToken', (req, res) => {
  const { roomId, inviteToken } = req.params;
  const { playerName } = req.body;

  const result = joinRoom(roomId, inviteToken, playerName);
  if (!result.success || !result.player) {
    return res.status(400).json({ error: result.message || 'Could not join room' });
  }

  res.json({
    playerId: result.player.id,
    slotIndex: result.player.slotIndex,
    name: result.player.name,
    quota: result.player.quota,
  });
});

// Select Theme for a player
app.post('/api/rooms/:roomId/theme', (req, res) => {
  const { roomId } = req.params;
  const { playerId, themeId } = req.body;

  const room = getRoom(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  if (!themeId) {
    player.selectedTheme = undefined;
    player.uploadedPhotos = [];
    notifyRoomChange(roomId);
    return res.json({ success: true, uploadedPhotos: [], selectedTheme: undefined });
  }

  const themePhotos = getThemePhotos(themeId, player.quota);
  if (themePhotos.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty theme' });
  }

  // Clear user uploaded files safely
  player.uploadedPhotos.forEach((pPath) => {
    if (fs.existsSync(pPath) && pPath.includes('uploads')) {
      try { fs.unlinkSync(pPath); } catch {}
    }
  });

  player.selectedTheme = themeId;
  player.uploadedPhotos = themePhotos;
  notifyRoomChange(roomId);

  res.json({
    success: true,
    uploadedCount: player.uploadedPhotos.length,
    quota: player.quota,
    selectedTheme: player.selectedTheme,
    allCollected: allPhotosCollected(room),
  });
});

// Clear photos for a player
app.post('/api/rooms/:roomId/clear-photos', (req, res) => {
  const { roomId } = req.params;
  const { playerId } = req.body;

  const room = getRoom(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  player.uploadedPhotos.forEach((pPath) => {
    if (fs.existsSync(pPath) && pPath.includes('uploads')) {
      try { fs.unlinkSync(pPath); } catch {}
    }
  });

  player.uploadedPhotos = [];
  player.selectedTheme = undefined;
  notifyRoomChange(roomId);

  res.json({ success: true, uploadedCount: 0, quota: player.quota });
});

// 4. Upload photo
app.post('/api/rooms/:roomId/photos', upload.single('photo'), (req, res) => {
  const { roomId } = req.params;
  const playerId = (req.query.playerId as string) || (req.body.playerId as string);

  const room = getRoom(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  if (player.uploadedPhotos.length >= player.quota) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: `Upload limit reached for your quota (${player.quota} photos)` });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No photo provided' });
  }

  // If user uploads a photo, clear preset theme flag if quota was filled by theme
  if (player.selectedTheme) {
    player.selectedTheme = undefined;
    player.uploadedPhotos = [];
  }

  player.uploadedPhotos.push(req.file.path);
  notifyRoomChange(roomId);

  res.json({
    success: true,
    uploadedCount: player.uploadedPhotos.length,
    quota: player.quota,
    photoPath: `/api/rooms/${roomId}/photos/${path.basename(req.file.path)}`,
    allCollected: allPhotosCollected(room),
  });
});

// Delete uploaded photo
app.delete('/api/rooms/:roomId/photos/:filename', (req, res) => {
  const { roomId, filename } = req.params;
  const playerId = req.query.playerId as string;
  const decodedFilename = decodeURIComponent(filename);

  const room = getRoom(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const photoIndex = player.uploadedPhotos.findIndex(
    (pPath) => path.basename(pPath) === filename || path.basename(pPath) === decodedFilename
  );
  if (photoIndex !== -1) {
    const filePath = player.uploadedPhotos[photoIndex];
    if (fs.existsSync(filePath) && filePath.includes('uploads')) {
      fs.unlinkSync(filePath);
    }
    player.uploadedPhotos.splice(photoIndex, 1);
    if (player.uploadedPhotos.length < player.quota) {
      player.selectedTheme = undefined;
    }
    notifyRoomChange(roomId);
  }

  res.json({ success: true, uploadedCount: player.uploadedPhotos.length, quota: player.quota });
});

// Get photo image file
app.get('/api/rooms/:roomId/photos/:filename', (req, res) => {
  const { roomId, filename } = req.params;
  const decodedFilename = decodeURIComponent(filename);
  const room = getRoom(roomId);
  if (!room) return res.status(404).send('Not found');

  for (const player of room.players) {
    for (const photoPath of player.uploadedPhotos) {
      if (
        (path.basename(photoPath) === filename || path.basename(photoPath) === decodedFilename) &&
        fs.existsSync(photoPath)
      ) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(photoPath);
      }
    }
  }

  res.status(404).send('Photo not found');
});

// Render formatted card image
app.get('/api/rooms/:roomId/card-image/:color/:rank', async (req, res) => {
  const { roomId, color, rank } = req.params;
  const room = getRoom(roomId);

  try {
    if (!room) {
      const buffer = await generateCardBackImage(roomId);
      res.setHeader('Content-Type', 'image/png');
      return res.status(200).send(buffer);
    }

    const buffer = await generateCardImage(room, color as any, rank as any);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error(`Error generating card image ${color}_${rank}:`, err);
    try {
      const backBuf = await generateCardBackImage(roomId);
      res.setHeader('Content-Type', 'image/png');
      return res.status(200).send(backBuf);
    } catch {
      return res.status(200).send(Buffer.from(''));
    }
  }
});

// 5. Host starts game
app.post('/api/rooms/:roomId/start', async (req, res) => {
  const { roomId } = req.params;
  const { hostToken } = req.body;

  const room = getRoom(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.hostToken !== hostToken) return res.status(403).json({ error: 'Unauthorized: host token required' });

  startGame(room);
  await pregenerateRoomCardImages(room);
  notifyRoomChange(roomId);

  res.json({ success: true, status: room.game.status });
});

// 6. Play card
app.post('/api/rooms/:roomId/play', (req, res) => {
  const { roomId } = req.params;
  const { playerId, cardId, chosenColor } = req.body;

  const room = getRoom(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const result = playCard(room, playerId, cardId, chosenColor);
  if (!result.success) {
    return res.status(400).json({ error: result.message || 'Invalid play' });
  }

  notifyRoomChange(roomId);

  if (room.game.status === 'FINISHED') {
    scheduleWinPurge(roomId, 5 * 60 * 1000); // Purge 5 minutes after win
  }

  const payload = getBroadcastPayload(room, playerId);
  res.json({ success: true, payload });
});

// 7. Draw card
app.post('/api/rooms/:roomId/draw', (req, res) => {
  const { roomId } = req.params;
  const { playerId } = req.body;

  const room = getRoom(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const result = drawCard(room, playerId);
  if (!result.success) {
    return res.status(400).json({ error: result.message || 'Invalid draw' });
  }

  notifyRoomChange(roomId);
  const payload = getBroadcastPayload(room, playerId);
  res.json({ success: true, payload });
});

// 8. Quit game during play or lobby
app.post('/api/rooms/:roomId/quit', (req, res) => {
  const { roomId } = req.params;
  const { playerId } = req.body;

  const room = getRoom(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const result = quitPlayerFromGame(room, playerId);
  notifyRoomChange(roomId);

  if (room.players.length === 0) {
    purgeRoom(roomId);
  } else if (room.game.status === 'FINISHED') {
    scheduleWinPurge(roomId, 5 * 60 * 1000);
  }

  res.json({ success: true, status: room.game.status });
});

// 9. Leave / Purge room
app.post('/api/rooms/:roomId/leave', (req, res) => {
  const { roomId } = req.params;
  const { playerId } = req.body;

  const room = getRoom(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  quitPlayerFromGame(room, playerId);
  notifyRoomChange(roomId);

  if (room.players.length === 0) {
    purgeRoom(roomId);
  }

  res.json({ success: true });
});


// 10. Card back image route
app.get('/api/rooms/:roomId/card-back', async (req, res) => {
  const { roomId } = req.params;
  try {
    const buffer = await generateCardBackImage(roomId);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    console.error('Error generating card back:', err);
    res.status(500).send('Error rendering card back');
  }
});

// 11. Final Summary payload route
app.get('/api/rooms/:roomId/summary', (req, res) => {
  const { roomId } = req.params;
  const room = getRoom(roomId);
  if (!room || !room.game.winner) {
    return res.status(404).json({ error: 'Summary not available or room already purged' });
  }
  res.json(room.game.winner);
});

// ==================== VITE / STATIC MIDDLEWARE ====================
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Snap Deck server running on http://0.0.0.0:${PORT}`);
  });
}

start();
