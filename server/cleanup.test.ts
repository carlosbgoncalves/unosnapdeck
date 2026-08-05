import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { createRoom, getRoom } from './rooms.ts';
import { purgeRoom, scheduleWinPurge } from './cleanup.ts';

describe('Cleanup & Data Lifecycle Unit Tests', () => {
  test('purgeRoom deletes uploaded files, card cache, and room state', () => {
    const { room } = createRoom('Host', 2, 'quick', 'http://localhost:3000');
    const roomId = room.id;

    // Create dummy upload dir and file
    const uploadDir = path.join(process.cwd(), 'uploads', roomId);
    fs.mkdirSync(uploadDir, { recursive: true });
    const dummyFile = path.join(uploadDir, 'photo1.jpg');
    fs.writeFileSync(dummyFile, 'dummy photo content');

    // Create dummy cache file
    const cacheDir = path.join(process.cwd(), 'uploads', 'cache');
    fs.mkdirSync(cacheDir, { recursive: true });
    const dummyCache = path.join(cacheDir, `${roomId}_RED_7.png`);
    fs.writeFileSync(dummyCache, 'dummy card image');

    assert.ok(fs.existsSync(dummyFile));
    assert.ok(fs.existsSync(dummyCache));
    assert.ok(getRoom(roomId));

    // Purge room
    purgeRoom(roomId);

    // Verify room is removed from memory and files are deleted
    assert.equal(getRoom(roomId), undefined, 'Room should be deleted from memory');
    assert.equal(fs.existsSync(uploadDir), false, 'Upload directory should be deleted');
    assert.equal(fs.existsSync(dummyCache), false, 'Cache file should be deleted');
  });

  test('scheduleWinPurge sets a timer to purge room', async () => {
    const { room } = createRoom('Host', 2, 'quick', 'http://localhost:3000');
    const roomId = room.id;

    // Schedule purge with 100ms delay
    scheduleWinPurge(roomId, 100);

    assert.ok(getRoom(roomId));
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(getRoom(roomId), undefined, 'Room should be purged after delay');
  });
});
