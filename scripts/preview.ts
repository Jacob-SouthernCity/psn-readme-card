import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CardData } from "../lib/psn";
import { renderCard, type Variant } from "../lib/render";
import { resolveTheme, themeNames } from "../lib/themes";

const mockData: CardData = {
  onlineId: "Renya_Kojima",
  isPlus: true,
  trophyLevel: 412,
  progress: 67,
  earnedTrophies: {
    platinum: 23,
    gold: 187,
    silver: 642,
    bronze: 1893,
  },
  avatarDataUri: null,
  recentGames: [
    {
      name: "ELDEN RING",
      progress: 71,
      iconDataUri: null,
      earnedTrophies: { platinum: 0, gold: 2, silver: 12, bronze: 18 },
    },
    {
      name: "Final Fantasy VII Rebirth",
      progress: 43,
      iconDataUri: null,
      earnedTrophies: { platinum: 0, gold: 1, silver: 4, bronze: 24 },
    },
    {
      name: "Astro Bot",
      progress: 100,
      iconDataUri: null,
      earnedTrophies: { platinum: 1, gold: 5, silver: 11, bronze: 26 },
    },
  ],
};

const variants: Variant[] = ["compact", "default", "full"];

const outDir = join(__dirname, "..", "out");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const theme of themeNames) {
  for (const variant of variants) {
    const file = join(outDir, `preview-${theme}-${variant}.svg`);
    writeFileSync(file, renderCard(mockData, resolveTheme(theme), variant));
    console.log(`wrote ${file}`);
  }
}
