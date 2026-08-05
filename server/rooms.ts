import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { Room, Player } from './types.ts';
import { getBroadcastPayload } from './game.ts';
import { broadcastToRoom } from './ws.ts';
import { getThemePhotos } from './themes.ts';

const rooms: Map<string, Room> = new Map();

// Persistence path — stored inside uploads/ which is gitignored
const ROOMS_PERSIST_PATH = path.join(process.cwd(), 'uploads', '.rooms.json');

function saveRooms(): void {
  try {
    const dir = path.dirname(ROOMS_PERSIST_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const serializable = Array.from(rooms.entries()).map(([id, room]) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { purgeTimer, ...rest } = room as Room & { purgeTimer?: unknown };
      return [id, rest];
    });
    fs.writeFileSync(ROOMS_PERSIST_PATH, JSON.stringify(serializable), 'utf-8');
  } catch {
    // Non-critical — don't crash the server
  }
}

function loadRooms(): void {
  try {
    if (!fs.existsSync(ROOMS_PERSIST_PATH)) return;
    const raw = fs.readFileSync(ROOMS_PERSIST_PATH, 'utf-8');
    const entries: [string, Room][] = JSON.parse(raw);
    for (const [id, room] of entries) {
      // Discard rooms older than 12 hours
      if (Date.now() - room.lastActivityAt < 12 * 60 * 60 * 1000) {
        rooms.set(id, room);
      }
    }
    console.log(`[rooms] Restored ${rooms.size} room(s) from disk.`);
  } catch {
    // If persist file is corrupted, start fresh
  }
}

// Load saved rooms immediately on module init
loadRooms();

// Generate random URL-safe token
export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

// Generate guaranteed unique room ID that never repeats or collides
export function generateUniqueRoomId(): string {
  let id = '';
  do {
    id = crypto.randomBytes(6).toString('hex').toLowerCase();
  } while (rooms.has(id));
  return id;
}

// Compute player quotas using equal split with remainder
export function computeQuotas(totalPhotos: number, nPlayers: number): number[] {
  const base = Math.floor(totalPhotos / nPlayers);
  const remainder = totalPhotos % nPlayers;
  const quotas: number[] = [];

  for (let slot = 0; slot < nPlayers; slot++) {
    quotas.push(slot < remainder ? base + 1 : base);
  }

  return quotas;
}

export function createRoom(hostName: string, nPlayers: number, deckMode: 'quick' | 'cars' | 'full', appUrl: string, themeId?: string): {
  room: Room;
  inviteLinks: Array<{ slotIndex: number; inviteToken: string; inviteUrl: string }>;
  hostToken: string;
  hostPlayerId: string;
} {
  const roomId = generateUniqueRoomId();
  const hostToken = generateToken(32);
  const totalPhotos = deckMode === 'full' ? 54 : 15;
  const quotas = computeQuotas(totalPhotos, nPlayers);

  // Resolve the theme to use: themeId takes priority, fallback to muscle_cars for 'cars' mode
  const resolvedThemeId = deckMode === 'cars' ? (themeId || 'muscle_cars') : undefined;
  const themePhotos = resolvedThemeId ? getThemePhotos(resolvedThemeId, 15) : [];

  const players: Player[] = [];
  const inviteLinks: Array<{ slotIndex: number; inviteToken: string; inviteUrl: string }> = [];

  let photoIndex = 0;
  for (let slot = 0; slot < nPlayers; slot++) {
    const inviteToken = generateToken(32);
    const isHostSlot = slot === 0;
    const playerId = generateToken(24);

    const slotQuota = quotas[slot];
    const initialPhotos = themePhotos.length > 0
      ? themePhotos.slice(photoIndex, photoIndex + slotQuota)
      : [];
    photoIndex += slotQuota;

    const selectedTheme = resolvedThemeId;

    players.push({
      id: playerId,
      slotIndex: slot,
      name: isHostSlot ? hostName || 'Host' : `Player ${slot + 1}`,
      isHost: isHostSlot,
      inviteToken,
      joined: isHostSlot, // Host automatically joins slot 0
      quota: slotQuota,
      uploadedPhotos: initialPhotos,
      selectedTheme,
      hand: [],
      disconnected: false,
    });

    const inviteUrl = `${appUrl}/join/${roomId}/${inviteToken}`;
    inviteLinks.push({
      slotIndex: slot,
      inviteToken,
      inviteUrl,
    });
  }

  const room: Room = {
    id: roomId,
    hostToken,
    nPlayers,
    deckMode,
    totalPhotos,
    players,
    rankPhotoMap: {},
    themePhotos,
    game: {
      status: 'LOBBY',
      currentTurnPlayerId: players[0].id,
      turnDirection: 1,
      drawPile: [],
      drawPileCount: 0,
      discardPile: [],
      topDiscard: null,
      activeColor: null,
      turnCount: 0,
      winner: null,
    },
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
  };

  rooms.set(roomId, room);
  saveRooms();

  return {
    room,
    inviteLinks,
    hostToken,
    hostPlayerId: players[0].id,
  };
}

export function getRoom(roomId: string): Room | undefined {
  if (!roomId) return undefined;
  const normalizedId = roomId.toLowerCase().trim();
  const room = rooms.get(normalizedId);
  if (room) {
    room.lastActivityAt = Date.now();
  }
  return room;
}

export function deleteRoomState(roomId: string): void {
  if (!roomId) return;
  rooms.delete(roomId.toLowerCase().trim());
  saveRooms();
}

export function validateInviteToken(roomId: string, inviteToken: string): {
  valid: boolean;
  room?: Room;
  slotIndex?: number;
  player?: Player;
  message?: string;
} {
  const room = getRoom(roomId);
  if (!room) return { valid: false, message: 'Room not found or expired' };

  const player = room.players.find((p) => p.inviteToken === inviteToken);
  if (!player) return { valid: false, message: 'Invalid invite token' };

  return {
    valid: true,
    room,
    slotIndex: player.slotIndex,
    player,
  };
}

export function joinRoom(roomId: string, inviteToken: string, playerName: string): {
  success: boolean;
  player?: Player;
  message?: string;
} {
  const validation = validateInviteToken(roomId, inviteToken);
  if (!validation.valid || !validation.player || !validation.room) {
    return { success: false, message: validation.message || 'Invalid join link' };
  }

  const player = validation.player;

  player.name = playerName || `Player ${player.slotIndex + 1}`;
  player.joined = true;
  player.disconnected = false;

  saveRooms();
  notifyRoomChange(roomId);

  return {
    success: true,
    player,
  };
}

export function allPhotosCollected(room: Room): boolean {
  return room.players.every((p) => p.uploadedPhotos.length >= p.quota);
}

export function notifyRoomChange(roomId: string): void {
  const room = getRoom(roomId);
  if (!room) return;

  saveRooms();

  room.players.forEach((player) => {
    const payload = getBroadcastPayload(room, player.id);
    broadcastToRoom(roomId, player.id, payload);
  });
}

export function getAllRooms(): Map<string, Room> {
  return rooms;
}
