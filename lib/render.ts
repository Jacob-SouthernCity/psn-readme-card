import type { CardData, RecentGame } from "./psn";
import { trophyColors, type Theme } from "./themes";

// Matches github-readme-stats' default stats card (467x195) so the two
// cards align when placed together in a README.
const WIDTH = 467;
const HEIGHT_DEFAULT = 195;
const HEIGHT_COMPACT = 70;
const GAME_ROW_HEIGHT = 56;

export type Variant = "compact" | "default" | "full";

const VARIANTS = new Set<Variant>(["compact", "default", "full"]);

export function resolveVariant(name?: string): Variant {
  return VARIANTS.has(name as Variant) ? (name as Variant) : "default";
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

// Material Design "emoji_events" icon, 24x24 viewBox.
const TROPHY_PATH =
  "M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z";

const TROPHY_TIERS = ["platinum", "gold", "silver", "bronze"] as const;

function avatarMarkup(
  dataUri: string | null,
  theme: Theme,
  cx: number,
  cy: number,
  r: number,
  clipId: string
): string {
  if (dataUri) {
    return `
    <clipPath id="${clipId}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
    <image href="${escapeXml(dataUri)}" x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}"
           clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${theme.border}" stroke-width="2"/>`;
  }
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${theme.barBg}" stroke="${theme.border}" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy - 0.25 * r}" r="${0.36 * r}" fill="${theme.subtext}"/>
    <path d="M${cx - 0.64 * r} ${cy + 0.78 * r}a${0.64 * r} ${0.64 * r} 0 0 1 ${1.28 * r} 0z" fill="${theme.subtext}"/>`;
}

function trophyGroup(
  x: number,
  y: number,
  color: string,
  count: number,
  theme: Theme,
  scale: number,
  fontSize: number
): string {
  return `
    <g transform="translate(${x}, ${y})">
      <path d="${TROPHY_PATH}" transform="scale(${scale})" fill="${color}"/>
      <text x="${24 * scale + 5}" y="${24 * scale * 0.78}" font-size="${fontSize}" font-weight="600" fill="${theme.text}">${formatCount(count)}</text>
    </g>`;
}

// PlayStation Plus branding: bold yellow cross on a black disc.
function plusBadge(x: number, y: number): string {
  return `<g transform="translate(${x}, ${y})">
       <circle cx="10" cy="10" r="10" fill="#000000"/>
       <path d="M10 4.6v10.8M4.6 10h10.8" stroke="#ffd400" stroke-width="3.4"/>
     </g>`;
}

function svgOpen(height: number, onlineId: string): string {
  return `<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="PlayStation Network trophy card for ${onlineId}">
  <style>
    text { font-family: 'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif; }
    .fade { animation: fadeIn 0.6s ease both; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  </style>`;
}

function cardFrame(height: number, theme: Theme): string {
  return `<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${height - 1}" rx="10" fill="${theme.bg}" stroke="${theme.border}"/>`;
}

function renderCompactCard(data: CardData, theme: Theme): string {
  const onlineId = escapeXml(data.onlineId);
  const progress = clampProgress(data.progress);

  const trophyRow = TROPHY_TIERS.map((tier, i) =>
    trophyGroup(
      210 + i * 64,
      27,
      trophyColors[tier],
      data.earnedTrophies[tier],
      theme,
      0.6,
      12
    )
  ).join("");

  return `${svgOpen(HEIGHT_COMPACT, onlineId)}
  ${cardFrame(HEIGHT_COMPACT, theme)}
  <g class="fade">
    ${avatarMarkup(data.avatarDataUri, theme, 42, 35, 22, "avatarClip")}
    <text x="78" y="31" font-size="15" font-weight="700" fill="${theme.text}">${onlineId}</text>
    <text x="78" y="50" font-size="11" fill="${theme.subtext}">Level <tspan font-weight="700" fill="${theme.accent}">${data.trophyLevel}</tspan> · ${progress}%</text>
    ${trophyRow}
  </g>
</svg>`;
}

function gameRow(game: RecentGame, y: number, theme: Theme, index: number): string {
  const progress = clampProgress(game.progress);
  const hasPlatinum = game.earnedTrophies.platinum > 0;
  // A platinum-colored bar marks completed games at a glance.
  const barColor = hasPlatinum ? trophyColors.platinum : theme.accent;
  const barWidth = 250;
  const barFill = Math.round((barWidth * progress) / 100);
  const icon = game.iconDataUri
    ? `<clipPath id="gameClip${index}"><rect x="24" y="${y}" width="40" height="40" rx="8"/></clipPath>
       <image href="${escapeXml(game.iconDataUri)}" x="24" y="${y}" width="40" height="40"
              clip-path="url(#gameClip${index})" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="24" y="${y}" width="40" height="40" rx="8" fill="${theme.barBg}"/>`;

  const miniCounts = TROPHY_TIERS.map((tier, i) =>
    trophyGroup(
      308 + i * 35,
      y + 4,
      trophyColors[tier],
      game.earnedTrophies[tier],
      theme,
      0.45,
      10
    )
  ).join("");

  return `
    ${icon}
    <text x="76" y="${y + 16}" font-size="15" font-weight="600" fill="${theme.text}">${escapeXml(truncate(game.name, 28))}</text>
    ${miniCounts}
    <rect x="76" y="${y + 26}" width="${barWidth}" height="8" rx="4" fill="${theme.barBg}"/>
    ${barFill > 0 ? `<rect x="76" y="${y + 26}" width="${barFill}" height="8" rx="4" fill="${barColor}"/>` : ""}
    <text x="${76 + barWidth + 12}" y="${y + 34}" font-size="12" font-weight="600" fill="${hasPlatinum ? trophyColors.platinum : theme.subtext}">${progress}%</text>`;
}

function renderStandardCard(data: CardData, theme: Theme, games: RecentGame[]): string {
  const onlineId = escapeXml(data.onlineId);
  const progress = clampProgress(data.progress);

  const height = games.length
    ? HEIGHT_DEFAULT + 14 + games.length * GAME_ROW_HEIGHT + 8
    : HEIGHT_DEFAULT;

  const barX = 160;
  const barY = 118;
  const barWidth = 283;
  const barFill = Math.round((barWidth * progress) / 100);

  const trophyRow = TROPHY_TIERS.map((tier, i) =>
    trophyGroup(
      160 + i * 71,
      144,
      trophyColors[tier],
      data.earnedTrophies[tier],
      theme,
      0.85,
      15
    )
  ).join("");

  // No text measurement server-side; estimate ~14px/char at 24px font.
  // IDs are capped at 16 chars by validation, so the badge stays in bounds.
  const plusX = 160 + Math.min(onlineId.length, 18) * 14 + 12;

  const gamesSection = games.length
    ? `<line x1="24" y1="${HEIGHT_DEFAULT - 4}" x2="${WIDTH - 24}" y2="${HEIGHT_DEFAULT - 4}" stroke="${theme.border}"/>` +
      games
        .map((game, i) =>
          gameRow(game, HEIGHT_DEFAULT + 10 + i * GAME_ROW_HEIGHT, theme, i)
        )
        .join("")
    : "";

  return `${svgOpen(height, onlineId)}
  ${cardFrame(height, theme)}
  <g class="fade">
    ${avatarMarkup(data.avatarDataUri, theme, 84, 98, 48, "avatarClip")}
    <text x="160" y="74" font-size="24" font-weight="700" fill="${theme.text}">${onlineId}</text>
    ${data.isPlus ? plusBadge(plusX, 56) : ""}
    <text x="160" y="104" font-size="15" fill="${theme.subtext}">Level <tspan font-weight="700" fill="${theme.accent}">${data.trophyLevel}</tspan> · ${progress}% to next</text>
    <rect x="${barX}" y="${barY}" width="${barWidth}" height="10" rx="5" fill="${theme.barBg}"/>
    ${barFill > 0 ? `<rect x="${barX}" y="${barY}" width="${barFill}" height="10" rx="5" fill="${theme.accent}"/>` : ""}
    ${trophyRow}
    ${gamesSection}
  </g>
</svg>`;
}

export function renderCard(
  data: CardData,
  theme: Theme,
  variant: Variant = "default"
): string {
  if (variant === "compact") {
    return renderCompactCard(data, theme);
  }
  const games = variant === "full" ? data.recentGames ?? [] : [];
  return renderStandardCard(data, theme, games);
}

export function renderErrorCard(message: string, theme: Theme): string {
  // Truncate before escaping — slicing escaped text could cut an XML
  // entity in half and produce an unparseable SVG.
  const safeMessage = escapeXml(message.slice(0, 80));
  return `<svg width="${WIDTH}" height="100" viewBox="0 0 ${WIDTH} 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Error">
  <style>text { font-family: 'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif; }</style>
  <rect x="0.5" y="0.5" width="${WIDTH - 1}" height="99" rx="10" fill="${theme.bg}" stroke="${theme.border}"/>
  <text x="24" y="44" font-size="16" font-weight="700" fill="#e5534b">Something went wrong</text>
  <text x="24" y="70" font-size="13" fill="${theme.subtext}">${safeMessage}</text>
</svg>`;
}
