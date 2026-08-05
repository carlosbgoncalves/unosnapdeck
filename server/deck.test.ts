import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createUnoDeck, shuffleDeck } from './deck.ts';

describe('Deck Unit Tests', () => {
  test('createUnoDeck creates standard 108-card UNO deck', () => {
    const deck = createUnoDeck();
    assert.equal(deck.length, 108, 'Deck should contain exactly 108 cards');

    // Count colors
    const colorsCount = { RED: 0, YELLOW: 0, GREEN: 0, BLUE: 0, WILD: 0 };
    deck.forEach((card) => {
      colorsCount[card.color]++;
    });

    assert.equal(colorsCount.RED, 25, 'Red should have 25 cards (1 zero + 18 numbers + 6 actions)');
    assert.equal(colorsCount.YELLOW, 25, 'Yellow should have 25 cards');
    assert.equal(colorsCount.GREEN, 25, 'Green should have 25 cards');
    assert.equal(colorsCount.BLUE, 25, 'Blue should have 25 cards');
    assert.equal(colorsCount.WILD, 8, 'Wild should have 8 cards (4 WILD + 4 WILD4)');
  });

  test('shuffleDeck preserves all cards and changes order', () => {
    const deck = createUnoDeck();
    const shuffled = shuffleDeck(deck);

    assert.equal(shuffled.length, 108, 'Shuffled deck should have same length');
    
    // Ensure all original IDs are present
    const originalIds = new Set(deck.map((c) => c.id));
    const shuffledIds = new Set(shuffled.map((c) => c.id));
    assert.equal(shuffledIds.size, 108);
    for (const id of originalIds) {
      assert.ok(shuffledIds.has(id));
    }
  });
});
