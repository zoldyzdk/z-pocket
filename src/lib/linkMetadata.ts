/**
 * Pure helpers for link preview metadata (Open Graph, Twitter Cards, X/Twitter URLs).
 * @see docs/superpowers/specs/2026-04-15-twitter-link-metadata-design.md
 */

export type ParsedTweetUrl = {
  canonicalPageUrl: string
  statusId: string
}

export type LinkMetadataFields = {
  title?: string
  description?: string
  imageUrl?: string
}

export const BROWSER_LIKE_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
} as const

/**
 * Detect X/Twitter single-tweet URLs. Returns canonical HTML fetch URL (https://x.com/.../status/{id}).
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

export function decodeHtmlEntities(text: string): string {
  const entities: { [key: string]: string } = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#34;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&#x27;": "'",
    "&nbsp;": " ",
    "&ndash;": "\u2013",
    "&mdash;": "\u2014",
    "&ldquo;": "\u201C",
    "&rdquo;": "\u201D",
    "&lsquo;": "\u2018",
    "&rsquo;": "\u2019",
    "&hellip;": "\u2026",
  }

  let decoded = text
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, "g"), char)
  }

  decoded = decoded.replace(/&#(\d+);/g, (_, num) => {
    return String.fromCharCode(parseInt(num, 10))
  })

  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16))
  })

  return decoded
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Read meta tag by property or name; supports content before or after the key attribute. */
function getMetaContent(html: string, key: string): string | null {
  const e = escapeRegExp(key)
  const patterns = [
    new RegExp(`<meta[^>]*(?:property|name)=["']${e}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${e}["']`, "i"),
  ]
  for (const re of patterns) {
    const match = html.match(re)
    if (match) {
      return decodeHtmlEntities(match[1])
    }
  }
  return null
}

function getTitleTag(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : null
}

/**
 * Parse Open Graph + Twitter Card + basic HTML title/description/image.
 */
export function parseLinkMetadataFromHtml(html: string, baseUrl: string): LinkMetadataFields {
  const metadata: LinkMetadataFields = {}

  metadata.title =
    getMetaContent(html, "og:title") ||
    getMetaContent(html, "twitter:title") ||
    getTitleTag(html) ||
    undefined

  metadata.description =
    getMetaContent(html, "og:description") ||
    getMetaContent(html, "twitter:description") ||
    getMetaContent(html, "description") ||
    undefined

  const imageUrl =
    getMetaContent(html, "og:image") ||
    getMetaContent(html, "twitter:image") ||
    getMetaContent(html, "twitter:image:src")

  if (imageUrl) {
    try {
      if (imageUrl.startsWith("http")) {
        metadata.imageUrl = imageUrl
      } else {
        const baseUrlObj = new URL(baseUrl)
        metadata.imageUrl = new URL(imageUrl, baseUrlObj.origin).href
      }
    } catch {
      // skip invalid image URL
    }
  }

  if (metadata.title) {
    metadata.title = metadata.title.replace(/\s+/g, " ").trim()
  }
  if (metadata.description) {
    metadata.description = metadata.description.replace(/\s+/g, " ").trim()
  }

  return metadata
}

function isEmptyField(v: string | undefined): boolean {
  return v === undefined || v.trim() === ""
}

export function mergeFillEmpty(
  base: LinkMetadataFields,
  delta: Partial<LinkMetadataFields>,
): LinkMetadataFields {
  const out: LinkMetadataFields = { ...base }
  if (isEmptyField(out.title) && delta.title?.trim()) {
    out.title = delta.title.replace(/\s+/g, " ").trim()
  }
  if (isEmptyField(out.description) && delta.description?.trim()) {
    out.description = delta.description.replace(/\s+/g, " ").trim()
  }
  if (isEmptyField(out.imageUrl) && delta.imageUrl?.trim()) {
    out.imageUrl = delta.imageUrl.trim()
  }
  return out
}

export function isGoodEnoughTweetHtmlMetadata(m: LinkMetadataFields): boolean {
  const hasTitle = !isEmptyField(m.title)
  const hasDesc = !isEmptyField(m.description)
  const hasImg = !isEmptyField(m.imageUrl)
  return hasTitle && (hasDesc || hasImg)
}

function stripHtmlTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function extractFirstParagraphText(htmlFragment: string): string | null {
  const m = htmlFragment.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
  if (!m) {
    return null
  }
  const text = stripHtmlTags(m[1])
  return text || null
}

function handleFromAuthorUrl(authorUrl: string): string | null {
  try {
    const u = new URL(authorUrl)
    const parts = u.pathname.split("/").filter(Boolean)
    const last = parts[parts.length - 1]
    return last ? `@${last}` : null
  } catch {
    return null
  }
}

export function extractTwitterOEmbedPartial(data: unknown): Partial<LinkMetadataFields> {
  if (!data || typeof data !== "object") {
    return {}
  }
  const o = data as Record<string, unknown>
  const authorName = typeof o.author_name === "string" ? o.author_name : ""
  const authorUrl = typeof o.author_url === "string" ? o.author_url : ""
  const html = typeof o.html === "string" ? o.html : ""

  const out: Partial<LinkMetadataFields> = {}

  const fromP = html ? extractFirstParagraphText(html) : null
  if (fromP) {
    out.title = decodeHtmlEntities(fromP).replace(/\s+/g, " ").trim()
  } else if (authorName) {
    out.title = `Tweet by ${authorName}`.replace(/\s+/g, " ").trim()
  }

  const handle = authorUrl ? handleFromAuthorUrl(authorUrl) : null
  if (handle) {
    out.description = handle
  } else if (authorName) {
    out.description = authorName
  }

  return out
}

/** FixTweet-compatible `GET {origin}/status/{id}` JSON (e.g. api.fxtwitter.com). */
export function mapFxTwitterApiToPartial(data: unknown): Partial<LinkMetadataFields> {
  if (!data || typeof data !== "object") {
    return {}
  }
  const root = data as { tweet?: Record<string, unknown> }
  const tweet = root.tweet
  if (!tweet || typeof tweet !== "object") {
    return {}
  }

  const author = tweet.author as Record<string, unknown> | undefined
  const name = typeof author?.name === "string" ? author.name : ""
  const screen = typeof author?.screen_name === "string" ? author.screen_name : ""
  const text = typeof tweet.text === "string" ? tweet.text : ""

  const media = tweet.media as { photos?: { url?: string }[] } | undefined
  const firstPhoto = media?.photos?.[0]?.url
  const imageUrl = typeof firstPhoto === "string" && firstPhoto.startsWith("http") ? firstPhoto : undefined

  const out: Partial<LinkMetadataFields> = {}

  if (name && screen) {
    out.title = `${name} (@${screen})`.replace(/\s+/g, " ").trim()
  } else if (name) {
    out.title = name.replace(/\s+/g, " ").trim()
  } else if (screen) {
    out.title = `@${screen}`
  }

  if (text) {
    out.description = text.replace(/\s+/g, " ").trim()
  }

  if (imageUrl) {
    out.imageUrl = imageUrl
  }

  return out
}
