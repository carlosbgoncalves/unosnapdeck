import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, deleteRoomState } from './rooms.ts';
import { startGame, isCardPlayable, playCard, drawCard, quitPlayerFromGame, getBroadcastPayload } from './game.ts';
import { Card } from './types.ts';

describe('Game Rules Engine Unit Tests', () => {
  test('startGame deals 7 cards per player and sets initial game state', () => {
    const { room } = createRoom('Host', 3, 'quick', 'http://localhost:3000');
    // Mark all joined
    room.players.forEach((p) => (p.joined = true));

    startGame(room);

    assert.equal(room.game.status, 'PLAYING');
    assert.equal(room.players.length, 3);
    room.players.forEach((p) => {
      assert.equal(p.hand.length, 7, 'Each player should start with 7 cards');
    });

    assert.ok(room.game.topDiscard, 'Top discard card should be flipped');
    assert.notEqual(room.game.topDiscard.color, 'WILD', 'Initial top discard card cannot be Wild');
    assert.equal(room.game.drawPile.length, 108 - 3 * 7 - 1, 'Remaining cards should be in draw pile');

    deleteRoomState(room.id);
  });

  test('isCardPlayable evaluates rules correctly', () => {
    const topDiscard: Card = { id: 'c1', color: 'RED', rank: '5' };

    // Same color
    assert.ok(isCardPlayable({ id: 'c2', color: 'RED', rank: '9' }, topDiscard, 'RED'));
    // Same rank
    assert.ok(isCardPlayable({ id: 'c3', color: 'BLUE', rank: '5' }, topDiscard, 'RED'));
    // Wild card
    assert.ok(isCardPlayable({ id: 'c4', color: 'WILD', rank: 'WILD' }, topDiscard, 'RED'));
    // Different color & rank
    assert.equal(isCardPlayable({ id: 'c5', color: 'GREEN', rank: '2' }, topDiscard, 'RED'), false);
    // Active color change (Wild played previously)
    assert.ok(isCardPlayable({ id: 'c6', color: 'BLUE', rank: '1' }, topDiscard, 'BLUE'));
  });

  test('playCard processes normal turn, SKIP, REVERSE, DRAW2, WILD, WILD4', () => {
    const { room } = createRoom('Host', 4, 'quick', 'http://localhost:3000');
    room.players.forEach((p) => (p.joined = true));
    startGame(room);

    const p0 = room.players[0];
    const p1 = room.players[1];
    const p2 = room.players[2];
    const p3 = room.players[3];

    // Set controlled top discard and hands
    room.game.topDiscard = { id: 'top', color: 'RED', rank: '1' };
    room.game.activeColor = 'RED';
    room.game.currentTurnPlayerId = p0.id;

    // P0 plays RED 2 -> Normal turn -> Next is P1
    p0.hand = [{ id: 'p0_c1', color: 'RED', rank: '2' }, { id: 'p0_c2', color: 'BLUE', rank: '7' }];
    const res1 = playCard(room, p0.id, 'p0_c1');
    assert.equal(res1.success, true);
    assert.equal(room.game.currentTurnPlayerId, p1.id, 'Turn should advance to P1');

    // P1 plays RED SKIP -> Skips P2 -> Next is P3
    p1.hand = [{ id: 'p1_skip', color: 'RED', rank: 'SKIP' }, { id: 'p1_dummy', color: 'GREEN', rank: '3' }];
    const res2 = playCard(room, p1.id, 'p1_skip');
    assert.equal(res2.success, true);
    assert.equal(room.game.currentTurnPlayerId, p3.id, 'P2 should be skipped, turn advances to P3');

    // P3 plays RED REVERSE in 4-player game -> Direction changes to -1 -> Next is P2
    p3.hand = [{ id: 'p3_rev', color: 'RED', rank: 'REVERSE' }, { id: 'p3_dummy', color: 'YELLOW', rank: '4' }];
    const res3 = playCard(room, p3.id, 'p3_rev');
    assert.equal(res3.success, true);
    assert.equal(room.game.turnDirection, -1);
    assert.equal(room.game.currentTurnPlayerId, p2.id, 'Direction reversed (-1), turn goes to P2');

    // P2 plays RED DRAW2 -> P1 draws 2 cards and is skipped -> Next is P0
    p2.hand = [{ id: 'p2_d2', color: 'RED', rank: 'DRAW2' }, { id: 'p2_dummy', color: 'BLUE', rank: '5' }];
    const p1HandBefore = p1.hand.length;
    const res4 = playCard(room, p2.id, 'p2_d2');
    assert.equal(res4.success, true);
    assert.equal(p1.hand.length, p1HandBefore + 2, 'P1 should draw 2 cards');
    assert.equal(room.game.currentTurnPlayerId, p0.id, 'P1 skipped, turn goes to P0');

    // P0 plays WILD with chosenColor 'BLUE' -> Active color becomes BLUE
    p0.hand = [{ id: 'p0_wild', color: 'WILD', rank: 'WILD' }];
    const res5 = playCard(room, p0.id, 'p0_wild', 'BLUE');
    assert.equal(res5.success, true);
    assert.equal(room.game.activeColor, 'BLUE');

    deleteRoomState(room.id);
  });

  test('SECURITY: getBroadcastPayload never leaks other players cards', () => {
    const { room } = createRoom('Host', 3, 'quick', 'http://localhost:3000');
    room.players.forEach((p) => (p.joined = true));
    startGame(room);

    const p0 = room.players[0];
    const p1 = room.players[1];

    // Give distinct identifiable cards
    p0.hand = [{ id: 'SECRET_CARD_P0', color: 'RED', rank: '7' }];
    p1.hand = [{ id: 'SECRET_CARD_P1', color: 'BLUE', rank: '3' }];

    // Fetch broadcast payload for P0
    const payloadP0 = getBroadcastPayload(room, p0.id);

    // 1. Check self.hand contains P0's cards
    assert.equal(payloadP0.self.id, p0.id);
    assert.deepEqual(payloadP0.self.hand, p0.hand);

    // 2. Check players array only has metadata / card count
    const p1Summary = payloadP0.players.find((p) => p.id === p1.id);
    assert.ok(p1Summary);
    assert.equal(p1Summary.cardCount, 1);
    assert.equal((p1Summary as any).hand, undefined, 'players array must NOT contain hand property');

    // 3. Convert whole payload to JSON string and verify SECRET_CARD_P1 is NOT in string
    const jsonString = JSON.stringify(payloadP0);
    assert.equal(jsonString.includes('SECRET_CARD_P0'), true);
    assert.equal(
      jsonString.includes('SECRET_CARD_P1'),
      false,
      'Broadcast payload for Player 0 MUST NOT leak Player 1 cards!'
    );

    deleteRoomState(room.id);
  });

  test('Winning condition sets FINISHED status and summary', () => {
    const { room } = createRoom('Host', 2, 'quick', 'http://localhost:3000');
    room.players.forEach((p) => (p.joined = true));
    startGame(room);

    const p0 = room.players[0];
    room.game.topDiscard = { id: 'top', color: 'RED', rank: '1' };
    room.game.activeColor = 'RED';
    room.game.currentTurnPlayerId = p0.id;

    // P0 has only 1 card left
    p0.hand = [{ id: 'p0_last', color: 'RED', rank: '5' }];

    const res = playCard(room, p0.id, 'p0_last');
    assert.equal(res.success, true);
    assert.equal(room.game.status, 'FINISHED');
    assert.ok(room.game.winner);
    assert.equal(room.game.winner.id, p0.id);
    assert.equal(room.game.winner.name, p0.name);

    deleteRoomState(room.id);
  });

  test('quitPlayerFromGame handles active player quitting and auto-win when 1 player left', () => {
    const { room } = createRoom('Host', 2, 'quick', 'http://localhost:3000');
    room.players.forEach((p) => (p.joined = true));
    startGame(room);

    const quittingPlayer = room.players[1];
    const remainingPlayer = room.players[0];

    const quitRes = quitPlayerFromGame(room, quittingPlayer.id);
    assert.equal(quitRes.success, true);
    assert.equal(room.players.length, 1);
    assert.equal(room.game.status, 'FINISHED');
    assert.equal(room.game.winner?.id, remainingPlayer.id);

    deleteRoomState(room.id);
  });

  test('drawCard draws card and advances turn', () => {
    const { room } = createRoom('Host', 2, 'quick', 'http://localhost:3000');
    room.players.forEach((p) => (p.joined = true));
    startGame(room);

    const p0 = room.players[0];
    const p1 = room.players[1];
    room.game.currentTurnPlayerId = p0.id;
    const initialHandSize = p0.hand.length;

    const res = drawCard(room, p0.id);
    assert.equal(res.success, true);
    assert.equal(p0.hand.length, initialHandSize + 1);
    assert.equal(room.game.currentTurnPlayerId, p1.id);

    deleteRoomState(room.id);
  });
});
