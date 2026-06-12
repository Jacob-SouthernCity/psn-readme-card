# 🎮 psn-readme-card

Show off your PlayStation Network profile — trophy level, platinum/gold/silver/bronze counts, and PS Plus status — as a live card in your GitHub README.

GitHub READMEs can't run JavaScript, so the "component" is a dynamically generated SVG served by a tiny serverless function. GitHub fetches it like any image; your visitors see live stats.

```markdown
[![My PSN Card](https://psn-readme-card.vercel.app/api/card?psnId=Renya_Kojima&variant=full)](https://github.com/Jacob-SouthernCity/psn-readme-card)
```

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FJacob-SouthernCity%2Fpsn-readme-card&env=PSN_NPSSO&envDescription=Your%20PSN%20NPSSO%20token)

Or manually:

1. **Fork / clone this repo** and push it to your GitHub.
2. **Get your NPSSO token** (this authenticates the card against PSN):
   - Sign in at [playstation.com](https://www.playstation.com/)
   - In the same browser, open <https://ca.account.sony.com/api/v1/ssocookie>
   - Copy the 64-character `npsso` value from the JSON response
   - ⚠️ **Treat it like a password.** Never commit it or share it.
3. **Deploy to Vercel** (free tier is plenty):
   ```bash
   npm i -g vercel
   vercel
   ```
4. **Set the env var** in your Vercel project settings (or via CLI):
   ```bash
   vercel env add PSN_NPSSO
   ```
5. **Add the card to your README**:
   ```markdown
   [![PSN Card](https://psn-readme-card.vercel.app/api/card?psnId=Renya_Kojima)](https://github.com/Jacob-SouthernCity/psn-readme-card)
   ```

## Options

| Query param | Description                                                          | Default   |
| ----------- | -------------------------------------------------------------------- | --------- |
| `psnId`     | The PSN online ID to display (**required**)                          | —         |
| `theme`     | One of `default`, `light`, `blue`, `midnight`                        | `default` |
| `variant`   | `compact` (slim strip; omits the PS Plus badge), `default`, or `full` (+ 3 most recent trophy titles — ordered by last trophy earned — with per-game trophy counts and completion %; platinum'd games highlighted in platinum) | `default` |

The `default` variant is exactly **467×195** — the same size as a
[github-readme-stats](https://github.com/anuraghazra/github-readme-stats) stats card, so the two align
side by side or stacked. `compact` and `full` share the same 467px width.

## Local development

```bash
npm install

# Render sample cards with mock data (no PSN auth needed) into ./out
npm run preview

# Run the real endpoint locally (needs PSN_NPSSO in .env)
cp .env.example .env   # then paste your NPSSO into .env
npm run dev            # → http://localhost:3000/api/card?psnId=...
```

## How it works

1. The serverless function exchanges your `PSN_NPSSO` for PSN access/refresh tokens via [psn-api](https://github.com/achievements-app/psn-api) (cached between warm invocations).
2. It resolves the requested online ID to an account ID, then fetches the trophy profile summary and account profile.
3. The avatar is fetched and **inlined as a base64 data URI** — GitHub's image proxy (camo) won't load external references inside an SVG.
4. Everything is rendered into an SVG template and returned with `Cache-Control: s-maxage=3600`, so PSN only gets hit about once an hour per card.

## Caveats

- **NPSSO tokens expire after ~2 months.** When the card starts erroring, grab a fresh NPSSO and update the env var in Vercel. The refresh-token flow keeps things alive between cold starts in the meantime.
- **Privacy settings** on the target account must allow trophy visibility.
- Sony has **no official public API** — psn-api uses the same endpoints the PlayStation mobile app does. It's been stable for years, but it could break someday.
- Stats are cached for up to an hour (plus GitHub's own image caching), so they won't update the second you earn a trophy.

## License

[MIT](LICENSE)
