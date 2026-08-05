import { Card, CardColor, CardRank } from './types.ts';

export function createUnoDeck(): Card[] {
  const deck: Card[] = [];
  const colors: CardColor[] = ['RED', 'YELLOW', 'GREEN', 'BLUE'];
  const numberRanks: CardRank[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const actionRanks: CardRank[] = ['SKIP', 'REVERSE', 'DRAW2'];

  let idCounter = 1;

  colors.forEach((color) => {
    // One '0'
    deck.push({ id: `card_${idCounter++}`, color, rank: '0' });

    // Two each of '1'-'9'
    numberRanks.forEach((rank) => {
      deck.push({ id: `card_${idCounter++}`, color, rank });
      deck.push({ id: `card_${idCounter++}`, color, rank });
    });

    // Two each of SKIP, REVERSE, DRAW2
    actionRanks.forEach((rank) => {
      deck.push({ id: `card_${idCounter++}`, color, rank });
      deck.push({ id: `card_${idCounter++}`, color, rank });
    });
  });

  // 4 WILD
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `card_${idCounter++}`, color: 'WILD', rank: 'WILD' });
  }

  // 4 WILD4
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `card_${idCounter++}`, color: 'WILD', rank: 'WILD4' });
  }

  return deck;
}

export function shuffleDeck<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
