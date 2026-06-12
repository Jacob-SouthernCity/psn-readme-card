import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CardData } from "../lib/psn";
import { renderCard } from "../lib/render";
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
};

const outDir = join(__dirname, "..", "out");
mkdirSync(outDir, { recursive: true });

for (const name of themeNames) {
  const file = join(outDir, `preview-${name}.svg`);
  writeFileSync(file, renderCard(mockData, resolveTheme(name)));
  console.log(`wrote ${file}`);
}
