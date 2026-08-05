import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeQuotas, createRoom, validateInviteToken, joinRoom, allPhotosCollected, getRoom, deleteRoomState } from './rooms.ts';

describe('Rooms Unit Tests', () => {
  test('computeQuotas divides total photos correctly across player slots', () => {
    // 15 photos, 4 players => base 3, remainder 3 => [4, 4, 4, 3]
    const q15_4 = computeQuotas(15, 4);
    assert.deepEqual(q15_4, [4, 4, 4, 3]);
    assert.equal(q15_4.reduce((a, b) => a + b, 0), 15);

    // 15 photos, 2 players => base 7, remainder 1 => [8, 7]
    const q15_2 = computeQuotas(15, 2);
    assert.deepEqual(q15_2, [8, 7]);
    assert.equal(q15_2.reduce((a, b) => a + b, 0), 15);

    // 54 photos, 4 players => base 13, remainder 2 => [14, 14, 13, 13]
    const q54_4 = computeQuotas(54, 4);
    assert.deepEqual(q54_4, [14, 14, 13, 13]);
    assert.equal(q54_4.reduce((a, b) => a + b, 0), 54);
  });

  test('createRoom initializes host and unjoined player slots', () => {
    const result = createRoom('Alice', 3, 'quick', 'http://localhost:3000');
    const { room, inviteLinks, hostPlayerId } = result;

    assert.ok(room.id, 'Room ID should be generated');
    assert.equal(room.nPlayers, 3);
    assert.equal(room.players.length, 3);
    assert.equal(inviteLinks.length, 3);

    // Host slot 0
    const host = room.players[0];
    assert.equal(host.id, hostPlayerId);
    assert.equal(host.name, 'Alice');
    assert.equal(host.isHost, true);
    assert.equal(host.joined, true);

    // Guest slots 1 & 2
    assert.equal(room.players[1].joined, false);
    assert.equal(room.players[2].joined, false);

    // Clean up
    deleteRoomState(room.id);
  });

  test('validateInviteToken and joinRoom work as expected', () => {
    const { room, inviteLinks } = createRoom('BobHost', 2, 'quick', 'http://localhost:3000');
    const guestLink = inviteLinks[1];

    // Validate invalid room
    const invalidRoomVal = validateInviteToken('nonexistent', guestLink.inviteToken);
    assert.equal(invalidRoomVal.valid, false);

    // Validate valid token
    const validVal = validateInviteToken(room.id, guestLink.inviteToken);
    assert.equal(validVal.valid, true);
    assert.equal(validVal.slotIndex, 1);

    // Join room
    const joinResult = joinRoom(room.id, guestLink.inviteToken, 'Charlie');
    assert.equal(joinResult.success, true);
    assert.equal(joinResult.player?.name, 'Charlie');
    assert.equal(joinResult.player?.joined, true);

    // Clean up
    deleteRoomState(room.id);
  });

  test('allPhotosCollected reports true only when all player quotas are met', () => {
    const { room } = createRoom('Host', 2, 'quick', 'http://localhost:3000');
    // 15 photos, 2 players => quotas [8, 7]
    assert.equal(allPhotosCollected(room), false);

    // Simulate filling photos
    const p1 = room.players[0];
    const p2 = room.players[1];

    for (let i = 0; i < p1.quota; i++) p1.uploadedPhotos.push(`photo_${i}.jpg`);
    assert.equal(allPhotosCollected(room), false);

    for (let i = 0; i < p2.quota; i++) p2.uploadedPhotos.push(`photo_${i}.jpg`);
    assert.equal(allPhotosCollected(room), true);

    // Clean up
    deleteRoomState(room.id);
  });

  test('room lookup is case-insensitive and generated room IDs are unique', () => {
    const { room: r1 } = createRoom('User1', 2, 'quick', 'http://localhost:3000');
    const { room: r2 } = createRoom('User2', 2, 'quick', 'http://localhost:3000');

    assert.notEqual(r1.id, r2.id, 'Each session must have a completely unique room ID');

    // Case-insensitive lookup test
    const fetchedLower = getRoom(r1.id.toLowerCase());
    const fetchedUpper = getRoom(r1.id.toUpperCase());
    assert.ok(fetchedLower, 'Lookup by lowercase ID should succeed');
    assert.ok(fetchedUpper, 'Lookup by uppercase ID should succeed');
    assert.equal(fetchedLower?.id, r1.id);
    assert.equal(fetchedUpper?.id, r1.id);

    deleteRoomState(r1.id);
    deleteRoomState(r2.id);
  });
});
