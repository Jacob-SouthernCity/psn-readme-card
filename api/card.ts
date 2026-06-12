import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchCardData, PublicError } from "../lib/psn";
import { isValidPsnId } from "../lib/psnId";
import { renderCard, renderErrorCard, resolveVariant } from "../lib/render";
import { resolveTheme } from "../lib/themes";

const FULL_VARIANT_GAMES = 3;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const psnId =
    typeof req.query.psnId === "string" ? req.query.psnId.trim() : "";
  const theme = resolveTheme(
    typeof req.query.theme === "string" ? req.query.theme : undefined
  );
  const variant = resolveVariant(
    typeof req.query.variant === "string" ? req.query.variant : undefined
  );

  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");

  if (!isValidPsnId(psnId)) {
    res.setHeader("Cache-Control", "no-store");
    res
      .status(400)
      .send(renderErrorCard("Missing or invalid psnId parameter", theme));
    return;
  }

  try {
    const data = await fetchCardData(
      psnId,
      variant === "full" ? FULL_VARIANT_GAMES : 0
    );
    // One hour of freshness keeps PSN traffic low without going stale.
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );
    res.status(200).send(renderCard(data, theme, variant));
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    if (error instanceof PublicError) {
      res.status(error.status).send(renderErrorCard(error.message, theme));
      return;
    }
    console.error(error);
    res.status(500).send(renderErrorCard("Unable to fetch PSN data", theme));
  }
}
