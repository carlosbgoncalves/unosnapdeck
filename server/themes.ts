import fs from 'fs';
import path from 'path';
import { ThemeOption } from './types.ts';

export const THEME_REGISTRY: Array<Omit<ThemeOption, 'photoCount'>> = [
  {
    id: 'dream_houses',
    name: 'Dream Houses',
    description: 'Architectural dream homes & luxury mansions.',
    icon: 'villa',
  },
  {
    id: 'muscle_cars',
    name: 'Muscle Cars',
    description: 'Classic & modern high-performance muscle cars.',
    icon: 'directions_car',
  },
  {
    id: 'professional_monkeys',
    name: 'Professional Monkeys',
    description: 'Fun monkeys working various careers & professions.',
    icon: 'smart_toy',
  },
  {
    id: 'tropical_beaches',
    name: 'Tropical Beaches',
    description: 'Stunning tropical beaches & island lagoons.',
    icon: 'beach_access',
  },
];

export function getThemeDirectory(themeId: string): string | null {
  const candidates = [
    path.join(process.cwd(), 'themes', themeId),
    path.join(process.cwd(), 'public', 'themes', themeId),
    path.join(process.cwd(), themeId),
  ];

  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      return cand;
    }
  }

  return null;
}

export function getAvailableThemes(): ThemeOption[] {
  return THEME_REGISTRY.map((theme) => {
    const dir = getThemeDirectory(theme.id);
    let count = 0;
    if (dir) {
      count = fs.readdirSync(dir).filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
      }).length;
    }
    return {
      ...theme,
      photoCount: count,
    };
  });
}

export function getThemePhotos(themeId: string, count: number): string[] {
  const themeDir = getThemeDirectory(themeId);
  if (!themeDir) return [];

  const files = fs.readdirSync(themeDir).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
  });

  if (files.length === 0) return [];

  // Shuffle files to give random photos from theme
  const shuffled = [...files].sort(() => Math.random() - 0.5);
  const selectedFiles = shuffled.slice(0, count);

  return selectedFiles.map((file) => path.resolve(themeDir, file));
}
