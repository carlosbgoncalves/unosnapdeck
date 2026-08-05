import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { CardColor, CardRank, Room } from './types.ts';

const COLOR_MAP: Record<CardColor, string> = {
  RED: '#E63946',
  YELLOW: '#F4A11D',
  GREEN: '#2A9D8F',
  BLUE: '#1D3557',
  WILD: '#5d3fd3',
};

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

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#451ebb');
  grad.addColorStop(1, '#5d3fd3');

  // Draw card body with rounded corners
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(10, 10, width - 20, height - 20, 24);
  ctx.fill();

  // White border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Inner pattern dots
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  for (let x = 30; x < width - 30; x += 30) {
    for (let y = 30; y < height - 30; y += 30) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // SD Logo in center
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px Quicksand, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SNAP', width / 2, height / 2 - 25);
  ctx.fillText('DECK', width / 2, height / 2 + 25);

  const buffer = canvas.toBuffer('image/png');
  try {
    fs.writeFileSync(cacheFile, buffer);
  } catch {}

  return buffer;
}

export async function generateCardImage(
  room: Room,
  color: CardColor,
  rank: CardRank
): Promise<Buffer> {
  const cacheFile = path.join(CACHE_DIR, `${room.id}_${color}_${rank}.png`);
  if (fs.existsSync(cacheFile)) {
    return fs.readFileSync(cacheFile);
  }

  const width = 300;
  const height = 440;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const hexColor = COLOR_MAP[color] || '#5d3fd3';

  // 1. Draw card outer background / border frame
  ctx.fillStyle = hexColor;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 20);
  ctx.fill();

  // 2. White inner margin border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 12;
  ctx.stroke();

  // 3. Find associated photo for rank
  let photoPath: string | null = null;

  if (room.deckMode === 'quick' || room.deckMode === 'cars') {
    photoPath = room.rankPhotoMap[rank] || null;
  } else {
    const key = `${color}_${rank}`;
    photoPath = room.rankPhotoMap[key] || room.rankPhotoMap[rank] || null;
  }

  // Fallback: If specific rank photo is missing or unreadable, pick any available theme photo from room
  if (!photoPath || !fs.existsSync(photoPath)) {
    const validPaths = Object.values(room.rankPhotoMap).filter((p) => p && fs.existsSync(p));
    if (validPaths.length > 0) {
      photoPath = validPaths[Math.abs(hashString(`${room.id}_${rank}`)) % validPaths.length];
    }
  }

  // Draw photo inside central card frame
  const frameX = 24;
  const frameY = 60;
  const frameW = width - 48;
  const frameH = height - 120;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(frameX, frameY, frameW, frameH, 16);
  ctx.clip();

  if (photoPath && fs.existsSync(photoPath)) {
    try {
      // Read buffer first to guarantee 100% compatibility with Windows paths & special characters
      const imageBuf = fs.readFileSync(photoPath);
      const img = await loadImage(imageBuf);

      // Crop / center image
      const imgAspect = img.width / img.height;
      const frameAspect = frameW / frameH;
      let drawW = frameW;
      let drawH = frameH;
      let drawX = frameX;
      let drawY = frameY;

      if (imgAspect > frameAspect) {
        drawW = frameH * imgAspect;
        drawX = frameX - (drawW - frameW) / 2;
      } else {
        drawH = frameW / imgAspect;
        drawY = frameY - (drawH - frameH) / 2;
      }

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } catch {
      drawPlaceholderPhoto(ctx, frameX, frameY, frameW, frameH, rank);
    }
  } else {
    drawPlaceholderPhoto(ctx, frameX, frameY, frameW, frameH, rank);
  }
  ctx.restore();

  // Inner frame border around photo
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(frameX, frameY, frameW, frameH, 16);
  ctx.stroke();

  // 4. Rank Badges in Top-Left and Bottom-Right Corners
  drawRankBadge(ctx, rank, 24, 24, false);
  drawRankBadge(ctx, rank, width - 24, height - 24, true);

  const buffer = canvas.toBuffer('image/png');
  try {
    fs.writeFileSync(cacheFile, buffer);
  } catch {}

  return buffer;
}

function drawPlaceholderPhoto(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  rank: CardRank
) {
  ctx.fillStyle = '#f1ecf8';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#20313f';
  ctx.font = 'bold 36px Quicksand, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(rank, x + w / 2, y + h / 2);
}

function drawRankBadge(
  ctx: any,
  rank: CardRank,
  x: number,
  y: number,
  inverted: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  if (inverted) ctx.rotate(Math.PI);

  // Badge Circle
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(18, 18, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ddd8e4';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Symbol or Number
  ctx.fillStyle = '#1c1a23';
  ctx.font = 'bold 20px Quicksand, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let symbol: string = rank;
  if (rank === 'SKIP') symbol = '🚫';
  if (rank === 'REVERSE') symbol = '🔄';
  if (rank === 'DRAW2') symbol = '+2';
  if (rank === 'WILD') symbol = '🌈';
  if (rank === 'WILD4') symbol = '+4';

  ctx.fillText(symbol, 18, 19);

  ctx.restore();
}

// Pre-generate all card images for a room in parallel when game starts
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
  const files = fs.readdirSync(CACHE_DIR);
  for (const f of files) {
    if (f.startsWith(`${roomId}_`)) {
      try {
        fs.unlinkSync(path.join(CACHE_DIR, f));
      } catch {}
    }
  }
}
