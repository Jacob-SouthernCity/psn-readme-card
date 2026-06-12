import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fetchAvatarAsDataUri,
  pickExactAccountId,
  PublicError,
  type CardData,
} from "../lib/psn";
import { PSN_ID_PATTERN } from "../lib/psnId";
import { escapeXml, renderCard, renderErrorCard } from "../lib/render";
import { createSingleFlight } from "../lib/singleFlight";
import { resolveTheme, themeNames } from "../lib/themes";

const baseData: CardData = {
  onlineId: "Renya_Kojima",
  isPlus: true,
  trophyLevel: 412,
  progress: 67,
  earnedTrophies: { platinum: 23, gold: 187, silver: 642, bronze: 1893 },
  avatarDataUri: null,
};

function searchResult(onlineId: string, accountId: string) {
  return { socialMetadata: { onlineId, accountId } };
}

test("pickExactAccountId matches case-insensitively", () => {
  const results = [
    searchResult("renya_kojima", "111"),
    searchResult("Renya_Kojim4", "222"),
  ];
  assert.equal(pickExactAccountId(results, "Renya_Kojima"), "111");
});

test("pickExactAccountId never falls back to the first result", () => {
  const results = [searchResult("Renya_Kojim4", "222")];
  assert.throws(
    () => pickExactAccountId(results, "Renya_Kojim"),
    (e: unknown) => e instanceof PublicError && e.status === 404
  );
  assert.throws(() => pickExactAccountId([], "Renya_Kojim"), PublicError);
});

test("PublicError carries its status", () => {
  assert.equal(new PublicError("not found").status, 404);
  assert.equal(new PublicError("config", 500).status, 500);
});

test("fetchAvatarAsDataUri accepts whitelisted image types", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "image/png; charset=binary" },
      })
  );
  const uri = await fetchAvatarAsDataUri("https://example.com/a.png");
  assert.ok(uri?.startsWith("data:image/png;base64,"));
});

test("fetchAvatarAsDataUri rejects non-image content types", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response("<html/>", { headers: { "content-type": "text/html" } })
  );
  assert.equal(await fetchAvatarAsDataUri("https://example.com/a"), null);
});

test("fetchAvatarAsDataUri returns null on fetch failure", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("network down");
  });
  assert.equal(await fetchAvatarAsDataUri("https://example.com/a"), null);
});

test("createSingleFlight shares one in-flight call", async () => {
  let calls = 0;
  let release!: (value: string) => void;
  const shared = createSingleFlight(() => {
    calls++;
    return new Promise<string>((resolve) => {
      release = resolve;
    });
  });

  const [a, b] = [shared(), shared()];
  release("token");
  assert.equal(await a, "token");
  assert.equal(await b, "token");
  assert.equal(calls, 1);

  const c = shared();
  release("token2");
  assert.equal(await c, "token2");
  assert.equal(calls, 2);
});

test("escapeXml escapes all XML metacharacters", () => {
  assert.equal(
    escapeXml(`<a b="c" d='e'>&`),
    "&lt;a b=&quot;c&quot; d=&apos;e&apos;&gt;&amp;"
  );
});

test("renderCard escapes the online ID", () => {
  const svg = renderCard(
    { ...baseData, onlineId: `<script>"x"` },
    resolveTheme()
  );
  assert.ok(!svg.includes("<script>"));
  assert.ok(svg.includes("&lt;script&gt;"));
});

test("renderCard clamps progress to 0-100", () => {
  const over = renderCard({ ...baseData, progress: 250 }, resolveTheme());
  assert.ok(over.includes("100% to next"));
  const under = renderCard({ ...baseData, progress: -5 }, resolveTheme());
  assert.ok(under.includes("0% to next"));
  assert.ok(!under.includes('width="-'));
});

test("renderCard treats non-finite progress as 0", () => {
  for (const progress of [NaN, Infinity, -Infinity]) {
    const svg = renderCard({ ...baseData, progress }, resolveTheme());
    assert.ok(!svg.includes("NaN"), String(progress));
    assert.ok(!svg.includes("Infinity"), String(progress));
  }
});

test("renderCard includes all trophy counts", () => {
  const svg = renderCard(baseData, resolveTheme());
  for (const count of ["23", "187", "642", "1,893"]) {
    assert.ok(svg.includes(`>${count}</text>`));
  }
});

test("unknown theme falls back to default", () => {
  assert.deepEqual(resolveTheme("not-a-theme"), resolveTheme("default"));
  assert.deepEqual(resolveTheme(undefined), resolveTheme("default"));
  assert.ok(themeNames.includes("default"));
});

test("renderErrorCard escapes and truncates the message", () => {
  const svg = renderErrorCard(`<oops>${"x".repeat(200)}`, resolveTheme());
  assert.ok(!svg.includes("<oops>"));
  assert.ok(!svg.includes("x".repeat(100)));
});

test("renderErrorCard truncation never splits an XML entity", () => {
  // 79 chars then '<': escaping after the cut keeps the entity whole.
  const svg = renderErrorCard("x".repeat(79) + "<<<<<", resolveTheme());
  assert.ok(svg.includes("&lt;"));
  assert.ok(!/&(?!(amp|lt|gt|quot|apos);)/.test(svg));
});

test("PSN_ID_PATTERN accepts valid online IDs", () => {
  for (const id of ["abc", "Renya_Kojima", "A1-b2_c3", "a".repeat(16)]) {
    assert.ok(PSN_ID_PATTERN.test(id), id);
  }
});

test("PSN_ID_PATTERN rejects invalid input", () => {
  const invalid = [
    "",
    "ab",
    "1abc",
    "_abc",
    "a".repeat(17),
    "name with space",
    "<svg>",
    "a&b",
    "ナマエ",
  ];
  for (const id of invalid) {
    assert.ok(!PSN_ID_PATTERN.test(id), id);
  }
});
