import {
  exchangeAccessCodeForAuthTokens,
  exchangeNpssoForAccessCode,
  exchangeRefreshTokenForAuthTokens,
  getProfileFromAccountId,
  getProfileFromUserName,
  getUserTitles,
  getUserTrophyProfileSummary,
  makeUniversalSearch,
} from "psn-api";
import { createSingleFlight } from "./singleFlight";

// Error whose message is safe to show publicly; everything else is
// logged server-side and rendered as a generic message.
export class PublicError extends Error {
  constructor(message: string, public readonly status: number = 404) {
    super(message);
  }
}

export interface TrophyCounts {
  platinum: number;
  gold: number;
  silver: number;
  bronze: number;
}

export interface RecentGame {
  name: string;
  progress: number;
  iconDataUri: string | null;
  earnedTrophies: TrophyCounts;
}

export interface CardData {
  onlineId: string;
  isPlus: boolean;
  trophyLevel: number;
  progress: number;
  earnedTrophies: TrophyCounts;
  /** Inlined as a data URI — GitHub's image proxy (camo) won't load
   *  external references inside an SVG. Null if the fetch failed. */
  avatarDataUri: string | null;
  /** Only populated for the full variant. */
  recentGames?: RecentGame[];
}

interface CachedAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Serverless instances are reused between invocations, so warm requests
// skip the NPSSO exchange entirely.
let cachedAuth: CachedAuth | null = null;

async function renewAuth(): Promise<string> {
  const now = Date.now();

  if (cachedAuth) {
    try {
      const refreshed = await exchangeRefreshTokenForAuthTokens(
        cachedAuth.refreshToken
      );
      cachedAuth = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: now + refreshed.expiresIn * 1000,
      };
      return cachedAuth.accessToken;
    } catch {
      cachedAuth = null; // fall through to a fresh NPSSO exchange
    }
  }

  const npsso = process.env.PSN_NPSSO;
  if (!npsso) {
    throw new PublicError("Missing PSN configuration", 500);
  }

  const accessCode = await exchangeNpssoForAccessCode(npsso);
  const tokens = await exchangeAccessCodeForAuthTokens(accessCode);
  cachedAuth = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: now + tokens.expiresIn * 1000,
  };
  return cachedAuth.accessToken;
}

// Concurrent requests near token expiry share one renewal instead of
// each hitting Sony's auth endpoints.
const renewAuthShared = createSingleFlight(renewAuth);

async function getAccessToken(): Promise<string> {
  if (cachedAuth && Date.now() < cachedAuth.expiresAt - 60_000) {
    return cachedAuth.accessToken;
  }
  return renewAuthShared();
}

export interface AccountSearchResult {
  socialMetadata: {
    accountId: string;
    onlineId: string;
  };
}

// Exact match only — falling back to the closest search result would
// silently render someone else's card for a typo'd ID.
export function pickExactAccountId(
  results: AccountSearchResult[],
  psnId: string
): string {
  const match = results.find(
    (r) => r.socialMetadata.onlineId.toLowerCase() === psnId.toLowerCase()
  );
  if (!match) {
    throw new PublicError(`PSN user "${psnId}" not found`);
  }
  return match.socialMetadata.accountId;
}

const ALLOWED_AVATAR_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

// The content-type goes into the data URI verbatim, so only known image
// types are allowed through.
export async function fetchAvatarAsDataUri(
  url: string
): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_AVATAR_TYPES.has(contentType)) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

// Direct lookup first: it's exact by design, and universal search omits
// accounts with restrictive privacy/search settings. Search is the fallback.
async function resolveAccountId(
  auth: { accessToken: string },
  psnId: string
): Promise<string> {
  try {
    const { profile } = await getProfileFromUserName(auth, psnId);
    return String(profile.accountId);
  } catch {
    const search = await makeUniversalSearch(auth, psnId, "SocialAllAccounts");
    return pickExactAccountId(search.domainResponses[0]?.results ?? [], psnId);
  }
}

// "Recently played" approximated by most recently updated trophy titles —
// that's what getUserTitles sorts by, and it includes per-game progress.
async function fetchRecentGames(
  auth: { accessToken: string },
  accountId: string,
  count: number
): Promise<RecentGame[]> {
  try {
    const { trophyTitles } = await getUserTitles(auth, accountId, {
      limit: count,
    });
    return Promise.all(
      trophyTitles.map(async (title) => ({
        name: title.trophyTitleName,
        progress: title.progress,
        iconDataUri: await fetchAvatarAsDataUri(title.trophyTitleIconUrl),
        earnedTrophies: title.earnedTrophies,
      }))
    );
  } catch {
    return [];
  }
}

export async function fetchCardData(
  psnId: string,
  gamesCount = 0
): Promise<CardData> {
  const auth = { accessToken: await getAccessToken() };

  const accountId = await resolveAccountId(auth, psnId);

  const [summary, profile, recentGames] = await Promise.all([
    getUserTrophyProfileSummary(auth, accountId),
    getProfileFromAccountId(auth, accountId),
    gamesCount > 0
      ? fetchRecentGames(auth, accountId, gamesCount)
      : Promise.resolve(undefined),
  ]);

  // Prefer the largest avatar Sony offers (sizes: s, m, l, xl).
  const avatarUrl =
    profile.avatars?.find((a) => a.size === "xl")?.url ??
    profile.avatars?.at(-1)?.url ??
    null;

  return {
    onlineId: profile.onlineId ?? psnId,
    isPlus: Boolean(profile.isPlus),
    trophyLevel: Number(summary.trophyLevel) || 0,
    progress: Number(summary.progress) || 0,
    earnedTrophies: summary.earnedTrophies,
    avatarDataUri: avatarUrl ? await fetchAvatarAsDataUri(avatarUrl) : null,
    recentGames,
  };
}
