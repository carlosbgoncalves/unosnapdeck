import { Card, CardColor, CardRank, Room, BroadcastPayload, RankPhotoMapping } from './types.ts';
import { createUnoDeck, shuffleDeck } from './deck.ts';

export function mapPhotosToRanks(room: Room): RankPhotoMapping {
  // Gather all photos for the room
  const allPhotos: string[] = room.themePhotos && room.themePhotos.length > 0
    ? [...room.themePhotos]
    : [];

  if (allPhotos.length === 0) {
    room.players.forEach((p) => {
      allPhotos.push(...p.uploadedPhotos);
    });
  }

  const shuffledPhotos = shuffleDeck(allPhotos);
  const mapping: RankPhotoMapping = {};

  if (room.deckMode === 'quick' || room.deckMode === 'cars') {
    // 15 ranks
    const ranks: CardRank[] = [
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
      'SKIP', 'REVERSE', 'DRAW2', 'WILD', 'WILD4'
    ];
    ranks.forEach((rank, idx) => {
      if (shuffledPhotos.length > 0) {
        mapping[rank] = shuffledPhotos[idx % shuffledPhotos.length];
      }
    });
  } else {
    // Full mode: 54 distinct combinations (13 per color x 4 + 2 wilds)
    const colors: CardColor[] = ['RED', 'YELLOW', 'GREEN', 'BLUE'];
    const ranks: CardRank[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'SKIP', 'REVERSE', 'DRAW2'];
    let idx = 0;

    colors.forEach((c) => {
      ranks.forEach((r) => {
        const key = `${c}_${r}`;
        if (shuffledPhotos[idx]) {
          mapping[key] = shuffledPhotos[idx];
          idx++;
        }
      });
    });

    if (shuffledPhotos[idx]) mapping['WILD'] = shuffledPhotos[idx++];
    if (shuffledPhotos[idx]) mapping['WILD4'] = shuffledPhotos[idx++];
  }

  return mapping;
}

export function startGame(room: Room): void {
  // Map photos
  room.rankPhotoMap = mapPhotosToRanks(room);

  // Build and shuffle deck
  let deck = shuffleDeck(createUnoDeck());

  // Deal 7 cards to each player
  room.players.forEach((player) => {
    player.hand = deck.splice(0, 7);
  });

  // Flip top card for discard pile (must not be Wild or Wild4)
  let initialCard = deck.pop()!;
  while (initialCard.color === 'WILD') {
    deck.unshift(initialCard);
    deck = shuffleDeck(deck);
    initialCard = deck.pop()!;
  }

  room.game = {
    status: 'PLAYING',
    currentTurnPlayerId: room.players[0].id,
    turnDirection: 1,
    drawPile: deck,
    drawPileCount: deck.length,
    discardPile: [initialCard],
    topDiscard: initialCard,
    activeColor: initialCard.color,
    turnCount: 1,
    winner: null,
  };
}

export function isCardPlayable(card: Card, topDiscard: Card, activeColor: CardColor | null): boolean {
  if (card.color === 'WILD') return true;
  const currentColor = activeColor || topDiscard.color;
  if (card.color === currentColor) return true;
  if (card.rank === topDiscard.rank) return true;
  return false;
}

function getNextPlayerIndex(currentIndex: number, step: number, totalPlayers: number): number {
  let nextIndex = (currentIndex + step) % totalPlayers;
  if (nextIndex < 0) nextIndex += totalPlayers;
  return nextIndex;
}

export function playCard(
  room: Room,
  playerId: string,
  cardId: string,
  chosenColor?: CardColor
): { success: boolean; message?: string } {
  const game = room.game;
  if (game.status !== 'PLAYING') return { success: false, message: 'Game is not in progress' };
  if (game.currentTurnPlayerId !== playerId) return { success: false, message: 'Not your turn' };

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { success: false, message: 'Player not found' };

  const cardIndex = player.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) return { success: false, message: 'Card not in hand' };

  const card = player.hand[cardIndex];
  if (!isCardPlayable(card, game.topDiscard!, game.activeColor)) {
    return { success: false, message: 'Card cannot be played on current top card' };
  }

  // Remove card from hand
  player.hand.splice(cardIndex, 1);

  // Put card on discard pile
  game.discardPile.push(card);
  game.topDiscard = card;

  // Set active color
  if (card.color === 'WILD') {
    if (!chosenColor || chosenColor === 'WILD') {
      return { success: false, message: 'Must specify chosen color for Wild card' };
    }
    game.activeColor = chosenColor;
  } else {
    game.activeColor = card.color;
  }

  // Check Win condition
  if (player.hand.length === 0) {
    game.status = 'FINISHED';
    const standings = room.players.map((p) => ({
      playerId: p.id,
      name: p.name,
      cardCount: p.hand.length,
    })).sort((a, b) => a.cardCount - b.cardCount);

    game.winner = {
      id: player.id,
      name: player.name,
      turnCount: game.turnCount,
      standings,
    };

    return { success: true };
  }

  // Handle action card effects and advance turn
  const totalPlayers = room.players.length;
  const currentPIdx = room.players.findIndex((p) => p.id === playerId);
  let step = game.turnDirection;

  if (card.rank === 'SKIP') {
    step = game.turnDirection * 2;
  } else if (card.rank === 'REVERSE') {
    if (totalPlayers === 2) {
      step = game.turnDirection * 2; // In 2-player mode, Reverse acts like Skip
    } else {
      game.turnDirection = (game.turnDirection * -1) as 1 | -1;
      step = game.turnDirection;
    }
  } else if (card.rank === 'DRAW2') {
    const nextPIdx = getNextPlayerIndex(currentPIdx, game.turnDirection, totalPlayers);
    const nextPlayer = room.players[nextPIdx];
    drawCardsToPlayer(room, nextPlayer, 2);
    step = game.turnDirection * 2; // skip next player after drawing
  } else if (card.rank === 'WILD4') {
    const nextPIdx = getNextPlayerIndex(currentPIdx, game.turnDirection, totalPlayers);
    const nextPlayer = room.players[nextPIdx];
    drawCardsToPlayer(room, nextPlayer, 4);
    step = game.turnDirection * 2; // skip next player
  }

  const nextPIdx = getNextPlayerIndex(currentPIdx, step, totalPlayers);
  game.currentTurnPlayerId = room.players[nextPIdx].id;
  game.turnCount++;

  return { success: true };
}

export function quitPlayerFromGame(room: Room, playerId: string): { success: boolean; message?: string } {
  const playerIndex = room.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return { success: false, message: 'Player not found in room' };

  const player = room.players[playerIndex];

  // If game is playing
  if (room.game.status === 'PLAYING') {
    // Return player's hand cards to draw pile and shuffle
    if (player.hand && player.hand.length > 0) {
      room.game.drawPile.push(...player.hand);
      room.game.drawPile = shuffleDeck(room.game.drawPile);
      room.game.drawPileCount = room.game.drawPile.length;
      player.hand = [];
    }

    const wasCurrentTurn = room.game.currentTurnPlayerId === playerId;

    // Remove player
    room.players.splice(playerIndex, 1);
    room.nPlayers = room.players.length;

    // If only 1 player remains, that player automatically wins!
    if (room.players.length <= 1) {
      const winner = room.players[0] || { id: 'none', name: 'Nobody', hand: [] };
      room.game.status = 'FINISHED';
      room.game.winner = {
        id: winner.id,
        name: winner.name,
        turnCount: room.game.turnCount,
        standings: [
          { playerId: winner.id, name: winner.name, cardCount: winner.hand ? winner.hand.length : 0 },
          { playerId: player.id, name: `${player.name} (Quit)`, cardCount: 0 },
        ],
      };
      return { success: true };
    }

    // If 2 or more players remain and it was the quitting player's turn, advance turn
    if (wasCurrentTurn) {
      const nextIdx =
        room.game.turnDirection === 1
          ? playerIndex % room.players.length
          : (playerIndex - 1 + room.players.length) % room.players.length;

      room.game.currentTurnPlayerId = room.players[nextIdx].id;
    } else {
      // Make sure currentTurnPlayerId is still valid
      const currentExists = room.players.some((p) => p.id === room.game.currentTurnPlayerId);
      if (!currentExists && room.players.length > 0) {
        room.game.currentTurnPlayerId = room.players[0].id;
      }
    }

    // Handle host transfer if host quit
    if (player.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
    }

    return { success: true };
  }

  // If game is in LOBBY or UPLOAD
  room.players.splice(playerIndex, 1);
  room.nPlayers = room.players.length;

  if (room.players.length > 0 && player.isHost) {
    room.players[0].isHost = true;
  }

  return { success: true };
}

export function drawCard(room: Room, playerId: string): { success: boolean; message?: string } {
  const game = room.game;
  if (game.status !== 'PLAYING') return { success: false, message: 'Game is not in progress' };
  if (game.currentTurnPlayerId !== playerId) return { success: false, message: 'Not your turn' };

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { success: false, message: 'Player not found' };

  drawCardsToPlayer(room, player, 1);

  // Advance turn to next player
  const currentPIdx = room.players.findIndex((p) => p.id === playerId);
  const nextPIdx = getNextPlayerIndex(currentPIdx, game.turnDirection, room.players.length);
  game.currentTurnPlayerId = room.players[nextPIdx].id;
  game.turnCount++;

  return { success: true };
}

function drawCardsToPlayer(room: Room, player: { hand: Card[] }, count: number): void {
  const game = room.game;
  for (let i = 0; i < count; i++) {
    if (game.drawPile.length === 0) {
      // Reshuffle discard pile into draw pile
      if (game.discardPile.length <= 1) break; // no cards available
      const topCard = game.discardPile.pop()!;
      game.drawPile = shuffleDeck(game.discardPile);
      game.discardPile = [topCard];
    }
    if (game.drawPile.length > 0) {
      player.hand.push(game.drawPile.pop()!);
    }
  }
  game.drawPileCount = game.drawPile.length;
}

export function getBroadcastPayload(room: Room, targetPlayerId: string): BroadcastPayload {
  const targetPlayer = room.players.find((p) => p.id === targetPlayerId);

  const totalPhotosRequired = room.totalPhotos;
  const totalPhotosCollected = room.players.reduce((sum, p) => sum + p.uploadedPhotos.length, 0);
  const allPhotosCollected = room.players.every((p) => p.uploadedPhotos.length >= p.quota);

  const sanitizedPlayers = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    slotIndex: p.slotIndex,
    isHost: p.isHost,
    joined: p.joined,
    disconnected: p.disconnected,
    cardCount: p.hand ? p.hand.length : 0,
    uploadCount: p.uploadedPhotos.length,
    quota: p.quota,
    selectedTheme: p.selectedTheme,
  }));

  // Safety check on currentTurnPlayerId
  let currentTurnPlayerId = room.game.currentTurnPlayerId;
  if (room.game.status === 'PLAYING' && room.players.length > 0) {
    const currentTurnExists = room.players.some((p) => p.id === currentTurnPlayerId);
    if (!currentTurnExists) {
      currentTurnPlayerId = room.players[0].id;
      room.game.currentTurnPlayerId = currentTurnPlayerId;
    }
  }

  return {
    roomId: room.id,
    status: room.game.status || 'LOBBY',
    deckMode: room.deckMode,
    nPlayers: room.nPlayers,
    totalPhotosRequired,
    totalPhotosCollected,
    allPhotosCollected,
    players: sanitizedPlayers,
    self: {
      id: targetPlayer ? targetPlayer.id : '',
      name: targetPlayer ? targetPlayer.name : '',
      isHost: targetPlayer ? targetPlayer.isHost : false,
      quota: targetPlayer ? targetPlayer.quota : 0,
      uploadedPhotos: targetPlayer ? targetPlayer.uploadedPhotos : [],
      selectedTheme: targetPlayer ? targetPlayer.selectedTheme : undefined,
      hand: targetPlayer ? targetPlayer.hand : [], // ONLY target player gets their actual hand!
    },
    game: {
      currentTurnPlayerId: room.game.currentTurnPlayerId,
      turnDirection: room.game.turnDirection,
      drawPileCount: room.game.drawPile ? room.game.drawPile.length : 0,
      topDiscard: room.game.topDiscard,
      activeColor: room.game.activeColor,
      turnCount: room.game.turnCount,
      winner: room.game.winner,
    },
  };
}
