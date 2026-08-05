import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { CardColor, CardRank, Room } from './types.ts';

const CACHE_DIR = path.join(process.cwd(), 'uploads', 'cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export async function generateCardBackImage(roomId: string): Promise<Buffer> {
  const cacheFile = path.join(CACHE_DIR, `${roomId}_back.png`);
  if (fs.existsSync(cacheFile)) {
    return fs.readFileSync(cacheFile);
  }

  const width = 300;
  const height = 440;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#1e3a8a');
  grad.addColorStop(1, '#2563eb');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const buffer = canvas.toBuffer('image/png');
  try {
    fs.writeFileSync(cacheFile, buffer);
  } catch {}

  return buffer;
}

/**
 * Returns ONLY the clean photo image buffer for the card (no outer card frames, borders, or rank badges).
 */
export async function generateCardImage(
  room: Room,
  color: CardColor,
  rank: CardRank
): Promise<Buffer> {
  const cacheFile = path.join(CACHE_DIR, `${room.id}_${color}_${rank}.png`);
  if (fs.existsSync(cacheFile)) {
    return fs.readFileSync(cacheFile);
  }

  let photoPath: string | null = null;

  if (room.deckMode === 'quick' || room.deckMode === 'cars') {
    photoPath = room.rankPhotoMap[rank] || null;
  } else {
    const key = `${color}_${rank}`;
    photoPath = room.rankPhotoMap[key] || room.rankPhotoMap[rank] || null;
  }

  if (!photoPath || !fs.existsSync(photoPath)) {
    const validPaths = Object.values(room.rankPhotoMap).filter((p) => p && fs.existsSync(p));
    if (validPaths.length > 0) {
      photoPath = validPaths[Math.abs(hashString(`${room.id}_${rank}`)) % validPaths.length];
    }
  }

  if (photoPath && fs.existsSync(photoPath)) {
    try {
      const buffer = fs.readFileSync(photoPath);
      try {
        fs.writeFileSync(cacheFile, buffer);
      } catch {}
      return buffer;
    } catch {}
  }

  // Fallback photo buffer
  const width = 300;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = 'bold 48px Quicksand, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(rank, width / 2, height / 2);

  const buffer = canvas.toBuffer('image/png');
  try {
    fs.writeFileSync(cacheFile, buffer);
  } catch {}

  return buffer;
}

export async function pregenerateRoomCardImages(room: Room): Promise<void> {
  const colors: CardColor[] = ['RED', 'YELLOW', 'GREEN', 'BLUE'];
  const ranks: CardRank[] = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'SKIP', 'REVERSE', 'DRAW2', 'WILD', 'WILD4'
  ];

  const tasks: Promise<Buffer>[] = [];
  colors.forEach((color) => {
    ranks.forEach((rank) => {
      tasks.push(generateCardImage(room, color, rank));
    });
  });

  await Promise.allSettled(tasks);
}

export function clearRoomImageCache(roomId: string): void {
  if (!fs.existsSync(CACHE_DIR)) return;
  const files = fs.readdirSync(CACHE_DIR);
  for (const f of files) {
    if (f.startsWith(`${roomId}_`)) {
      try {
        fs.unlinkSync(path.join(CACHE_DIR, f));
      } catch {}
    }
  }
}
