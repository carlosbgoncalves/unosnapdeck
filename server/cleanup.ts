import fs from 'fs';
import path from 'path';
import { getRoom, deleteRoomState, getAllRooms } from './rooms.ts';
import { clearRoomImageCache } from './images.ts';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export function purgeRoom(roomId: string): void {
  const room = getRoom(roomId);
  if (!room) return;

  // Clear any pending timeout timer on the room
  if (room.purgeTimer) {
    clearTimeout(room.purgeTimer);
    room.purgeTimer = undefined;
  }

  // 1. Delete source photos
  const roomUploadsDir = path.join(UPLOADS_DIR, roomId);
  if (fs.existsSync(roomUploadsDir)) {
    try {
      fs.rmSync(roomUploadsDir, { recursive: true, force: true });
    } catch (err) {
      console.error(`Failed to delete uploads for room ${roomId}:`, err);
    }
  }

  // 2. Delete generated card images cache
  clearRoomImageCache(roomId);

  // 3. Remove room object from memory
  deleteRoomState(roomId);

  // 4. Log purge (room ID + timestamp only, no user details)
  console.log(`[PURGE] Room ${roomId} successfully purged at ${new Date().toISOString()}`);
}

export function scheduleWinPurge(roomId: string, delayMs = 5 * 60 * 1000): void {
  const room = getRoom(roomId);
  if (!room) return;

  if (room.purgeTimer) {
    clearTimeout(room.purgeTimer);
  }

  room.purgeTimer = setTimeout(() => {
    purgeRoom(roomId);
  }, delayMs);
}

// Abandoned room cleaner (runs periodically every 30 minutes to purge rooms with >2h inactivity)
export function startInactivityCleaner(checkIntervalMs = 30 * 60 * 1000, maxInactiveMs = 2 * 60 * 60 * 1000): void {
  setInterval(() => {
    const now = Date.now();
    const rooms = getAllRooms();

    rooms.forEach((room, roomId) => {
      if (now - room.lastActivityAt > maxInactiveMs) {
        console.log(`[PURGE] Auto-purging abandoned room ${roomId}`);
        purgeRoom(roomId);
      }
    });
  }, checkIntervalMs);
}
