# Twitter / X link metadata — design

**Date:** 2026-04-15  
**Status:** Approved (conversation)  
**Scope:** Server-side metadata for saved links in z-pocket (`fetchMetadata` server action), aligned with existing YouTube special-case and generic Open Graph parsing.

## Problem

Tweet URLs (`x.com`, `twitter.com`, mobile hosts) rarely yield useful previews when handled only by a single naive HTML `fetch` plus OG parsing: responses can be bot-gated or minimal, and `publish.twitter.com/oembed` JSON does not expose a stable thumbnail field like YouTube oEmbed. Users expect previews comparable to WhatsApp or Discord (title, body text, image when available).

## Constraints

- **No Twitter/X API keys** (no official developer API). Public HTTP only.
- **Optional** third-party JSON “embed helper” is allowed only when explicitly enabled via environment configuration (off by default).
- Match existing patterns in `src/actions/fetchMetadata.ts` (timeouts, server action, `MetadataResponse` shape).

## In scope

- HTTPS links to a **single tweet** identified by a **numeric status id** in the path.
- Hosts: `twitter.com`, `www.twitter.com`, `x.com`, `www.x.com`, `mobile.twitter.com`, `mobile.x.com` (case-insensitive hostname).
- Query strings and fragments on the URL are ignored for detection; status id is taken from the path (e.g. `?s=20` is fine).

## Out of scope

- Profiles, lists, communities, Spaces, hashtags-only URLs, non-status paths.
- Client-side fetching or browser automation (Puppeteer/Playwright).
- Changing database schema or link card UI beyond what existing `title` / `description` / `imageUrl` already support.

## URL detection and normalization

1. Parse URL; require `https` (or normalize `http` to `https` per existing `fetchMetadata` behavior for the overall action).
2. Classify as a **tweet URL** if hostname matches the allowlist after stripping leading `www.` and optional `mobile.` prefix, and pathname matches a status pattern: `/{segment}/status/{numericId}` where `numericId` is one or more ASCII digits (reject empty or non-numeric).
3. **Canonical fetch URL** for the HTML step: `https://x.com/{screenName}/status/{id}` using the same `screenName` and `id` from the user URL path (preserve screen name segment as-is for encoding; do not resolve redirects for canonicalization in v1).

If the URL is not a tweet URL, the implementation must not add extra Twitter-specific network calls; behavior remains the current generic path.

## Fetch and parse order (tweet URLs only)

For tweet URLs, run the following in order. **Do not** run the legacy “single generic fetch” path in addition to step 1 for the same request (the tweet branch subsumes generic HTML fetch for that URL).

### Step 1 — HTML on X

- `GET` the canonical tweet page from section above.
- Use **browser-like** request headers (realistic `User-Agent`, sensible `Accept`, optional `Accept-Language`). Exact values are an implementation detail; they must be centralized for easy adjustment.
- **Timeout:** reuse the same abort window as existing metadata fetch (10 seconds), shared pattern with YouTube helper.
- On **2xx**, parse HTML into `MetadataResponse` using the **extended** parser (below).
- **Good enough to return immediately:** at least a non-empty **title** (from `og:title`, `twitter:title`, or `<title>` after existing decode/trim rules) **and** at least one of: non-empty **description**, non-empty **imageUrl**. If this condition is met, return the parsed object (trimming/cleanup consistent with `parseMetadata` today).
- On **non-2xx**, timeout, or abort: proceed to Step 2 without surfacing a final error yet.
- On **2xx** but not good enough: proceed to Step 2; implementation may **merge** later steps into missing fields rather than discarding Step 1 data.

### Step 2 — Publish oEmbed

- Request `https://publish.twitter.com/oembed` with query parameters: tweet URL (implementation may pass the user’s original HTTPS URL or the canonical `x.com` URL—both must be HTTPS), `omit_script=true`, and require JSON via `Accept: application/json`.
- Parse JSON fields: `author_name`, `author_url`, `html`, `url`.
- **Title:** prefer plain text from the first `<p …>` inside `html` (decode entities, collapse whitespace). If missing or empty, use `Tweet by {author_name}` when `author_name` is present.
- **Description:** prefer `@handle` parsed from `author_url` path (last path segment that looks like a handle, without `@` in URL); fallback to `author_name` only if handle extraction fails.
- **Image:** oEmbed alone typically does not provide a thumbnail URL; do not invent image URLs from embed HTML in v1.
- **Merge rule:** for each of `title`, `description`, `imageUrl`, if Step 1 left that field empty and Step 2 supplies a value, set it. If Step 1 already filled a field, do not overwrite with oEmbed unless product decision prefers oEmbed text—in v1 **do not overwrite** non-empty Step 1 fields.

### Step 3 — Optional third-party JSON helper

- **Gate:** only if `process.env.TWITTER_EMBED_METADATA_BASE_URL` is set to an absolute HTTPS origin (exact env name frozen at implementation time; document in code comment and this spec). Trailing slash stripped; no request is made if unset.
- **When:** invoke only if, after Step 2, **`imageUrl` is still empty** (primary trigger). Do not call for every tweet if Step 1 already returned an image.
- **How:** `GET` a single documented path relative to that base, using only the **status id** (and no user secrets). Response mapping is provider-specific; implementation must document the expected JSON shape in the implementation plan. Map into missing `title` / `description` / `imageUrl` using the same merge rule as Step 2 (fill empty fields only).
- **Failure:** non-2xx, invalid JSON, or timeout → ignore and continue with whatever fields exist.

### Final return

- Return the best-effort `MetadataResponse` (partial fields allowed). Do not add a new `error` solely because the image is missing if at least title or description was obtained.
- Preserve existing **invalid URL** validation and error strings for malformed input.

## Extended HTML metadata parser

Extend the existing HTML metadata extraction (same file or extracted helper as decided in implementation) so that for **any** HTML parse path used by tweet Step 1, the following are considered **after** Open Graph tags, with sensible fallbacks:

| Priority | Keys |
|----------|------|
| Title | `og:title`, then `twitter:title`, then `<title>` (existing) |
| Description | `og:description`, then `twitter:description`, then `name="description"` (existing) |
| Image | `og:image`, then `twitter:image`, then `twitter:image:src` |

Rules for absolute image URLs and HTML entity decoding remain consistent with current `parseMetadata` behavior.

## Errors and logging

- Network errors inside the tweet branch follow the same philosophy as the rest of `fetchMetadata`: log with `console.error`, prefer returning partial metadata over a hard failure when any step succeeded.
- Do not log full URLs in production logs if the codebase adopts a stricter privacy posture elsewhere; at minimum avoid logging query strings containing sensitive tokens (tweet URLs are usually public; still avoid duplicating user paste into logs unnecessarily).

## Testing

- **Unit tests (no live network):**
  - Tweet URL classification and normalization (hosts, `www`, `mobile`, query params, rejection of wrong paths).
  - Parser fixtures: OG-only, Twitter Card-only, both, neither, relative vs absolute images.
  - Orchestration with mocked `global.fetch`: HTML thin → oEmbed fills title; HTML with image → no oEmbed call optional optimization (not required for v1); env helper called only when base URL set and image still missing.

## Non-goals

- Guaranteeing parity with WhatsApp/Discord for every server IP or every tweet (X may still omit tags for some bots).
- Caching or rate limiting beyond what Next/fetch already provide (can be a follow-up).

## Related code

- `src/actions/fetchMetadata.ts` — primary change location.
- `src/components/add-link-modal.tsx` — consumer of `fetchMetadata` (no API change required if `MetadataResponse` is unchanged).
