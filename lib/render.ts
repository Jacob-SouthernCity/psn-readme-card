import type { CardData } from "./psn";
import { trophyColors, type Theme } from "./themes";

const WIDTH = 440;
const HEIGHT = 158;

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

// Material Design "emoji_events" icon, 24x24 viewBox.
const TROPHY_PATH =
  "M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z";

const TROPHY_TIERS = ["platinum", "gold", "silver", "bronze"] as const;

function avatarMarkup(data: CardData, theme: Theme): string {
  if (data.avatarDataUri) {
    return `
    <clipPath id="avatarClip"><circle cx="79" cy="67" r="36"/></clipPath>
    <image href="${escapeXml(data.avatarDataUri)}" x="43" y="31" width="72" height="72"
           clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>
    <circle cx="79" cy="67" r="36" fill="none" stroke="${theme.border}" stroke-width="2"/>`;
  }
  return `
    <circle cx="79" cy="67" r="36" fill="${theme.barBg}" stroke="${theme.border}" stroke-width="2"/>
    <circle cx="79" cy="58" r="13" fill="${theme.subtext}"/>
    <path d="M56 95a23 23 0 0 1 46 0z" fill="${theme.subtext}"/>`;
}

function trophyGroup(
  x: number,
  color: string,
  count: number,
  theme: Theme
): string {
  return `
    <g transform="translate(${x}, 113)">
      <path d="${TROPHY_PATH}" transform="scale(0.75)" fill="${color}"/>
      <text x="23" y="14" font-size="14" font-weight="600" fill="${theme.text}">${formatCount(count)}</text>
    </g>`;
}

export function renderCard(data: CardData, theme: Theme): string {
  const onlineId = escapeXml(data.onlineId);
  const progress = Math.max(
    0,
    Math.min(100, Number.isFinite(data.progress) ? data.progress : 0)
  );

  const barX = 139;
  const barY = 84;
  const barWidth = 270;
  const barFill = Math.round((barWidth * progress) / 100);

  const trophyRow = TROPHY_TIERS.map((tier, i) =>
    trophyGroup(139 + i * 75, trophyColors[tier], data.earnedTrophies[tier], theme)
  ).join("");

  const plusBadge = data.isPlus
    ? `<g transform="translate(0, -13)">
         <circle cx="8" cy="8" r="8" fill="#f3c117"/>
         <path d="M4.5 8h7M8 4.5v7" stroke="#000000" stroke-width="2" stroke-linecap="round"/>
       </g>`
    : "";

  // No text measurement server-side; estimate ~12.5px/char. IDs are
  // capped at 16 chars by validation, so the badge stays in bounds.
  const plusX = 139 + Math.min(onlineId.length, 18) * 12.5 + 10;

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="PlayStation Network trophy card for ${onlineId}">
  <style>
    text { font-family: 'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif; }
    .fade { animation: fadeIn 0.6s ease both; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  </style>
  <rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="10" fill="${theme.bg}" stroke="${theme.border}"/>
  <g class="fade">
    ${avatarMarkup(data, theme)}
    <text x="139" y="50" font-size="21" font-weight="700" fill="${theme.text}">${onlineId}</text>
    <g transform="translate(${plusX}, 37)">${plusBadge}</g>
    <text x="139" y="74" font-size="13" fill="${theme.subtext}">Level <tspan font-weight="700" fill="${theme.accent}">${data.trophyLevel}</tspan> · ${progress}% to next</text>
    <rect x="${barX}" y="${barY}" width="${barWidth}" height="8" rx="4" fill="${theme.barBg}"/>
    ${barFill > 0 ? `<rect x="${barX}" y="${barY}" width="${barFill}" height="8" rx="4" fill="${theme.accent}"/>` : ""}
    ${trophyRow}
  </g>
</svg>`;
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
