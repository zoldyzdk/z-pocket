# Twitter / X link metadata — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend server-side `fetchMetadata` so tweet URLs on X/Twitter return rich title, description, and image when available, using HTML + Twitter Cards first, then publish.oEmbed, then an optional FixTweet-compatible JSON API — without X API keys.

**Architecture:** Pure URL detection and HTML parsing live in `src/lib/linkMetadata.ts` (testable without network). `src/actions/fetchMetadata.ts` orchestrates YouTube (unchanged) → tweet branch (HTML with browser-like headers → optional oEmbed merge → optional `TWITTER_EMBED_METADATA_BASE_URL` + `/status/{id}` JSON) → generic single-fetch path for all other URLs. Generic HTML parsing delegates to the same `parseLinkMetadataFromHtml` helper so Twitter Card tags benefit every link.

**Tech Stack:** Next.js 15 server actions, TypeScript, Vitest, native `fetch` / `AbortController`.

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/lib/linkMetadata.ts` | `parseTweetUrl`, `parseLinkMetadataFromHtml` (OG + `twitter:*` + `<title>`), oEmbed JSON/text extraction, FixTweet JSON mapping, `mergeFillEmpty`, `isGoodEnoughTweetHtmlMetadata`, shared `BROWSER_LIKE_FETCH_HEADERS`, `decodeHtmlEntities`. |
| `src/actions/fetchMetadata.ts` | Wire YouTube → tweet orchestration → generic fetch; import helpers from `linkMetadata.ts`; remove inlined duplicate of `parseMetadata` body in favor of shared parser. |
| `src/actions/__tests__/fetchMetadata.test.ts` | `vi.unmock('@/actions/fetchMetadata')`, stub `global.fetch`, assert orchestration and merge behavior. |
| `src/lib/__tests__/linkMetadata.test.ts` | Unit tests for pure helpers and HTML fixtures. |

---

### Task 1: Tweet URL parsing

**Files:**

- Create: `src/lib/linkMetadata.ts` (skeleton + `parseTweetUrl` only to start)
- Create: `src/lib/__tests__/linkMetadata.test.ts`
- Modify: (none beyond new files until Task 2)

- [ ] **Step 1: Write the failing test**

Add to `src/lib/__tests__/linkMetadata.test.ts`:

```typescript
import { describe, expect, test } from "vitest"
import { parseTweetUrl } from "@/lib/linkMetadata"

describe("parseTweetUrl", () => {
  test("returns canonical x.com URL and status id for twitter.com with www and query", () => {
    expect(parseTweetUrl("https://www.twitter.com/devcansado404/status/2044551211802664962?s=20")).toEqual({
      canonicalPageUrl: "https://x.com/devcansado404/status/2044551211802664962",
      statusId: "2044551211802664962",
    })
  })

  test("handles mobile.x.com", () => {
    expect(parseTweetUrl("https://mobile.x.com/foo/status/99")).toEqual({
      canonicalPageUrl: "https://x.com/foo/status/99",
      statusId: "99",
    })
  })

  test("returns null for profile URL", () => {
    expect(parseTweetUrl("https://x.com/foo")).toBeNull()
  })

  test("returns null for non-status path", () => {
    expect(parseTweetUrl("https://x.com/foo/status/foo")).toBeNull()
  })

  test("returns null for wrong host", () => {
    expect(parseTweetUrl("https://example.com/a/status/1")).toBeNull()
  })
})
```

Create `src/lib/linkMetadata.ts`:

```typescript
export type ParsedTweetUrl = {
  canonicalPageUrl: string
  statusId: string
}

/**
 * Detect X/Twitter single-tweet URLs. Returns canonical HTML fetch URL (https://x.com/.../status/{id}).
 * See docs/superpowers/specs/2026-04-15-twitter-link-metadata-design.md
 */
export function parseTweetUrl(raw: string): ParsedTweetUrl | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  let host = url.hostname.toLowerCase()
  if (host.startsWith("www.")) {
    host = host.slice(4)
  }
  if (host.startsWith("mobile.")) {
    host = host.slice(7)
  }

  if (host !== "twitter.com" && host !== "x.com") {
    return null
  }

  const parts = url.pathname.split("/").filter(Boolean)
  if (parts.length < 3) {
    return null
  }
  const id = parts[parts.length - 1]
  const middle = parts[parts.length - 2]
  const screen = parts[parts.length - 3]
  if (middle.toLowerCase() !== "status" || !/^\d+$/.test(id) || !screen) {
    return null
  }

  const canonicalPageUrl = `https://x.com/${screen}/status/${id}`
  return { canonicalPageUrl, statusId: id }
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/__tests__/linkMetadata.test.ts -t parseTweetUrl`

Expected: PASS (red-green: if you wrote test first without impl, expect FAIL then add impl — here impl is included in Step 1 for brevity; run until PASS)

- [ ] **Step 3: Commit**

```bash
git add src/lib/linkMetadata.ts src/lib/__tests__/linkMetadata.test.ts
git commit -m "feat(link-metadata): parse X/Twitter status URLs"
```

---

### Task 2: Shared HTML metadata parser (OG + Twitter Cards)

**Files:**

- Modify: `src/lib/linkMetadata.ts` — add `decodeHtmlEntities`, `parseLinkMetadataFromHtml(html, baseUrl)`
- Modify: `src/lib/__tests__/linkMetadata.test.ts` — add parser tests
- Modify: `src/actions/fetchMetadata.ts` — replace body of `parseMetadata` with call to `parseLinkMetadataFromHtml`; keep `parseMetadata` as a one-line wrapper or delete and call lib directly from `fetchMetadata`

- [ ] **Step 1: Write failing tests for parser**

Append to `src/lib/__tests__/linkMetadata.test.ts`:

```typescript
import { parseLinkMetadataFromHtml } from "@/lib/linkMetadata"

describe("parseLinkMetadataFromHtml", () => {
  test("twitter:title when og:title missing", () => {
    const html = `
      <head>
        <meta name="twitter:title" content="Hello &amp; world" />
        <meta name="twitter:description" content="Desc" />
        <meta name="twitter:image" content="https://cdn.example.com/i.png" />
      </head>
    `
    expect(parseLinkMetadataFromHtml(html, "https://x.com/u/status/1")).toEqual({
      title: "Hello & world",
      description: "Desc",
      imageUrl: "https://cdn.example.com/i.png",
    })
  })

  test("og tags win over twitter tags", () => {
    const html = `
      <meta property="og:title" content="OG Title" />
      <meta name="twitter:title" content="TW Title" />
    `
    expect(parseLinkMetadataFromHtml(html, "https://a.com")).toMatchObject({ title: "OG Title" })
  })

  test("twitter:image:src fallback", () => {
    const html = `<meta property="twitter:image:src" content="/rel.png" />`
    expect(parseLinkMetadataFromHtml(html, "https://x.com")).toMatchObject({
      imageUrl: "https://x.com/rel.png",
    })
  })
})
```

- [ ] **Step 2: Implement `decodeHtmlEntities` + `parseLinkMetadataFromHtml`**

Move the existing `decodeHtmlEntities` implementation from `fetchMetadata.ts` into `src/lib/linkMetadata.ts` (same entity map). Implement `parseLinkMetadataFromHtml` by copying the regex-based `getMetaContent` / `getTitle` pattern from `fetchMetadata.ts`, then set:

- `title` = `og:title` OR `twitter:title` OR `<title>` (unchanged decode/trim pipeline)
- `description` = `og:description` OR `twitter:description` OR `name="description"`
- `image` = first available of `og:image`, `twitter:image`, `twitter:image:src` with the same absolute-URL rules as today

Export `parseLinkMetadataFromHtml` and `decodeHtmlEntities` if tests need the latter (optional).

- [ ] **Step 3: Refactor `fetchMetadata.ts`**

Remove inlined `decodeHtmlEntities` and `parseMetadata` implementations. Import `parseLinkMetadataFromHtml` from `@/lib/linkMetadata` and use:

```typescript
const metadata = parseLinkMetadataFromHtml(html, urlWithProtocol)
```

Ensure the generic branch behavior stays identical for normal sites (existing OG-only pages).

Run: `pnpm exec vitest run src/lib/__tests__/linkMetadata.test.ts`

Expected: PASS

Run: `pnpm exec vitest run` (full suite)

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/linkMetadata.ts src/lib/__tests__/linkMetadata.test.ts src/actions/fetchMetadata.ts
git commit -m "refactor: centralize link HTML metadata parsing with Twitter Card fallbacks"
```

---

### Task 3: oEmbed extraction + merge + good-enough check + FixTweet mapper

**Files:**

- Modify: `src/lib/linkMetadata.ts`
- Modify: `src/lib/__tests__/linkMetadata.test.ts`

- [ ] **Step 1: Write tests**

Append:

```typescript
import {
  extractTwitterOEmbedPartial,
  mergeFillEmpty,
  isGoodEnoughTweetHtmlMetadata,
  mapFxTwitterApiToPartial,
} from "@/lib/linkMetadata"

describe("extractTwitterOEmbedPartial", () => {
  test("parses jack first tweet oembed shape", () => {
    const json = {
      author_name: "jack",
      author_url: "https://twitter.com/jack",
      html: '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">just setting up my twttr</p>&mdash; jack',
    }
    expect(extractTwitterOEmbedPartial(json)).toEqual({
      title: "just setting up my twttr",
      description: "@jack",
    })
  })

  test("fallback title when no p tag", () => {
    const json = { author_name: "Ada", author_url: "https://x.com/ada", html: "<blockquote></blockquote>" }
    expect(extractTwitterOEmbedPartial(json)).toMatchObject({ title: "Tweet by Ada" })
  })
})

describe("mergeFillEmpty", () => {
  test("does not overwrite non-empty base", () => {
    expect(
      mergeFillEmpty(
        { title: "A", description: "", imageUrl: "" },
        { title: "B", description: "d", imageUrl: "https://i" },
      ),
    ).toEqual({ title: "A", description: "d", imageUrl: "https://i" })
  })
})

describe("isGoodEnoughTweetHtmlMetadata", () => {
  test("true when title and description", () => {
    expect(isGoodEnoughTweetHtmlMetadata({ title: "T", description: "D" })).toBe(true)
  })
  test("true when title and image", () => {
    expect(isGoodEnoughTweetHtmlMetadata({ title: "T", imageUrl: "https://x" })).toBe(true)
  })
  test("false when only title", () => {
    expect(isGoodEnoughTweetHtmlMetadata({ title: "T" })).toBe(false)
  })
})

describe("mapFxTwitterApiToPartial", () => {
  test("maps api.fxtwitter.com sample", () => {
    const body = {
      code: 200,
      tweet: {
        text: "just setting up my twttr",
        author: { name: "jack", screen_name: "jack" },
        media: { photos: [{ url: "https://pbs.twimg.com/media/x.png" }] },
      },
    }
    expect(mapFxTwitterApiToPartial(body)).toEqual({
      title: "jack (@jack)",
      description: "just setting up my twttr",
      imageUrl: "https://pbs.twimg.com/media/x.png",
    })
  })
})
```

- [ ] **Step 2: Implement functions in `linkMetadata.ts`**

Export a minimal shared shape (same fields as `MetadataResponse` minus `error`):

```typescript
export type LinkMetadataFields = {
  title?: string
  description?: string
  imageUrl?: string
}
```

Implement:

1. **`extractTwitterOEmbedPartial(data: unknown): Partial<LinkMetadataFields>`**  
   - Validate object; read `author_name`, `author_url`, `html` strings.  
   - Title: run regex on `html` for first `<p[^>]*>([\s\S]*?)</p>` (case-insensitive), strip inner tags with `.replace(/<[^>]+>/g, "")`, decode entities, trim. If empty, `Tweet by ${author_name}`.  
   - Description: parse `author_url` with `new URL`; last non-empty path segment → `@${segment}`; if missing, use `author_name`.

2. **`mergeFillEmpty(base, delta)`** — for each key in `title`, `description`, `imageUrl`, if `base[key]` is missing or empty string after trim, copy from `delta`.

3. **`isGoodEnoughTweetHtmlMetadata(m)`** — Boolean: non-empty `title` AND (non-empty `description` OR non-empty `imageUrl`).

4. **`mapFxTwitterApiToPartial(data: unknown)`** — Narrow cast; read `tweet.text`, `tweet.author.name`, `tweet.author.screen_name`, `tweet.media.photos[0].url`. Title = `` `${name} (@${screen_name})` `` when both exist, else `name` or `screen_name` or omit. Description = `text`. Image = first photo URL starting with `https`.

- [ ] **Step 3: Run tests**

Run: `pnpm exec vitest run src/lib/__tests__/linkMetadata.test.ts`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/linkMetadata.ts src/lib/__tests__/linkMetadata.test.ts
git commit -m "feat(link-metadata): oEmbed extraction, merge, and FixTweet JSON mapping"
```

---

### Task 4: Tweet orchestration inside `fetchMetadata`

**Files:**

- Modify: `src/actions/fetchMetadata.ts`

- [ ] **Step 1: Write integration test (mocked fetch)**

Create `src/actions/__tests__/fetchMetadata.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

vi.unmock("@/actions/fetchMetadata")

import { fetchMetadata } from "@/actions/fetchMetadata"

describe("fetchMetadata tweet branch", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString()
        if (url.startsWith("https://x.com/user/status/1")) {
          return new Response("<html><head></head></html>", { status: 200 })
        }
        if (url.includes("publish.twitter.com/oembed")) {
          return Response.json({
            author_name: "User",
            author_url: "https://x.com/user",
            html: '<p lang="en">Hello tweet</p>',
          })
        }
        throw new Error(`unexpected fetch: ${url}`)
      }) as typeof fetch,
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    globalThis.fetch = originalFetch
  })

  test("thin HTML triggers oEmbed merge", async () => {
    const result = await fetchMetadata("https://twitter.com/user/status/1")
    expect(result.error).toBeUndefined()
    expect(result.title).toBe("Hello tweet")
    expect(result.description).toBe("@user")
  })
})
```

Use **empty** HTML (`<html><head></head></html>`) so Step 1 yields no good-enough metadata; oEmbed fills `title` and `description`. Expect `title: "Hello tweet"`, `description: "@user"`.

- [ ] **Step 2: Implement orchestration in `fetchMetadata.ts`**

Add constant re-export or local:

```typescript
import {
  parseTweetUrl,
  parseLinkMetadataFromHtml,
  extractTwitterOEmbedPartial,
  mergeFillEmpty,
  isGoodEnoughTweetHtmlMetadata,
  mapFxTwitterApiToPartial,
} from "@/lib/linkMetadata"

const BROWSER_LIKE_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
} as const
```

After YouTube block, before generic fetch:

```typescript
const tweet = parseTweetUrl(urlWithProtocol)
if (tweet) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000)
  let partial: MetadataResponse = {}
  try {
    const pageRes = await fetch(tweet.canonicalPageUrl, {
      signal: controller.signal,
      headers: BROWSER_LIKE_FETCH_HEADERS,
    })
    if (pageRes.ok) {
      const html = await pageRes.text()
      partial = parseLinkMetadataFromHtml(html, tweet.canonicalPageUrl)
      if (isGoodEnoughTweetHtmlMetadata(partial)) {
        clearTimeout(timeoutId)
        return partial
      }
    }
  } catch (e) {
    console.error("Twitter HTML metadata fetch failed:", e)
  } finally {
    clearTimeout(timeoutId)
  }

  // oEmbed
  try {
    const oembedController = new AbortController()
    const oembedTimeout = setTimeout(() => oembedController.abort(), 10_000)
    const oembedUrl = new URL("https://publish.twitter.com/oembed")
    oembedUrl.searchParams.set("url", tweet.canonicalPageUrl)
    oembedUrl.searchParams.set("omit_script", "true")
    const oembedRes = await fetch(oembedUrl.toString(), {
      signal: oembedController.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": BROWSER_LIKE_FETCH_HEADERS["User-Agent"],
      },
    })
    clearTimeout(oembedTimeout)
    if (oembedRes.ok) {
      const json = await oembedRes.json()
      partial = mergeFillEmpty(partial, extractTwitterOEmbedPartial(json))
    }
  } catch (e) {
    console.error("Twitter oEmbed failed:", e)
  }

  // Optional FixTweet-compatible API (HTTPS origin only, path /status/{id})
  const fxBase = process.env.TWITTER_EMBED_METADATA_BASE_URL?.trim()
  if (!partial.imageUrl && fxBase) {
    try {
      const baseUrl = new URL(fxBase)
      if (baseUrl.protocol === "https:" && (baseUrl.pathname === "/" || baseUrl.pathname === "")) {
        const fxUrl = `${baseUrl.origin}/status/${tweet.statusId}`
        const fxController = new AbortController()
        const fxT = setTimeout(() => fxController.abort(), 10_000)
        const fxRes = await fetch(fxUrl, {
          signal: fxController.signal,
          headers: { Accept: "application/json", "User-Agent": BROWSER_LIKE_FETCH_HEADERS["User-Agent"] },
        })
        clearTimeout(fxT)
        if (fxRes.ok) {
          const fxJson = await fxRes.json()
          partial = mergeFillEmpty(partial, mapFxTwitterApiToPartial(fxJson))
        }
      }
    } catch (e) {
      console.error("Twitter embed helper failed:", e)
    }
  }

  if (partial.title || partial.description || partial.imageUrl) {
    return partial
  }
  return { error: "Failed to fetch metadata" }
}
```

**Important:** Use two separate `AbortController` instances for HTML vs oEmbed vs FX (as above) so clearing timeouts does not cross wires.

**Env comment** above FX block:

```typescript
// TWITTER_EMBED_METADATA_BASE_URL — optional HTTPS origin (e.g. https://api.fxtwitter.com).
// When set, GET {origin}/status/{tweetId} for JSON (FixTweet-compatible). Off by default.
```

- [ ] **Step 3: Run tests**

Run: `pnpm exec vitest run src/actions/__tests__/fetchMetadata.test.ts`

Expected: PASS

Run: `pnpm exec vitest run`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/actions/fetchMetadata.ts src/actions/__tests__/fetchMetadata.test.ts
git commit -m "feat: fetch X/Twitter link metadata via HTML, oEmbed, and optional helper"
```

---

### Task 5: Extra coverage + polish

**Files:**

- Modify: `src/lib/__tests__/linkMetadata.test.ts`
- Modify: `src/actions/__tests__/fetchMetadata.test.ts`

- [ ] **Step 1: Add test — rich HTML short-circuits oEmbed**

Extend fetch mock: HTML response includes `og:title`, `og:description`, and `og:image`. Assert `fetch` call count or that `publish.twitter.com` was never requested (`expect(fetchMock).toHaveBeenCalledTimes(1)` if only HTML).

- [ ] **Step 2: Add test — `TWITTER_EMBED_METADATA_BASE_URL` triggers third call**

```typescript
beforeEach(() => {
  process.env.TWITTER_EMBED_METADATA_BASE_URL = "https://api.fxtwitter.com"
})
afterEach(() => {
  delete process.env.TWITTER_EMBED_METADATA_BASE_URL
})
```

Mock: HTML thin, oEmbed thin (no image), FX returns JSON with image → expect `imageUrl` present.

- [ ] **Step 3: Run full suite and lint**

Run:

```bash
pnpm exec vitest run
pnpm run lint
```

Expected: all PASS / no new errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/__tests__/linkMetadata.test.ts src/actions/__tests__/fetchMetadata.test.ts
git commit -m "test: expand Twitter metadata branch coverage"
```

---

## Spec coverage checklist (self-review)

| Spec section | Task |
|--------------|------|
| URL detection + canonical | Task 1 |
| Extended OG / Twitter Card parser | Task 2 |
| Step order HTML → oEmbed → FX | Task 4 |
| Good-enough early return | Tasks 3–4 |
| Merge fill-empty only | Task 3 |
| FX gated on env + HTTPS origin + `/status/{id}` | Task 4 |
| Partial success, final error only when nothing | Task 4 |
| Tests (unit + orchestration) | Tasks 1–5 |

**Placeholder scan:** None intentional; FixTweet JSON shape is pinned to live `api.fxtwitter.com` sample for tweet `20` (author + text; photos optional).

**Type consistency:** `MetadataResponse` in `fetchMetadata.ts` should align with `LinkMetadataFields` — either export a shared type from `linkMetadata.ts` or have `Partial<MetadataResponse>` in mappers; avoid duplicate incompatible shapes.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-15-twitter-link-metadata.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
