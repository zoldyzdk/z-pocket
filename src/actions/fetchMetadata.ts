"use server"

import {
  BROWSER_LIKE_FETCH_HEADERS,
  extractTwitterOEmbedPartial,
  mapFxTwitterApiToPartial,
  mergeFillEmpty,
  isGoodEnoughTweetHtmlMetadata,
  parseLinkMetadataFromHtml,
  parseTweetUrl,
  type ParsedTweetUrl,
} from "@/lib/linkMetadata"

type MetadataResponse = {
  title?: string
  description?: string
  imageUrl?: string
  error?: string
}

const YOUTUBE_VIDEO_ID = /^[\w-]{11}$/

/**
 * Extract a YouTube video ID from common URL shapes (watch, youtu.be, embed, shorts, live).
 */
function extractYouTubeVideoId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl)
    const host = url.hostname.replace(/^www\./, "")

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0]?.split("?")[0]
      return id && YOUTUBE_VIDEO_ID.test(id) ? id : null
    }

    if (host !== "youtube.com" && !host.endsWith(".youtube.com") && host !== "youtube-nocookie.com") {
      return null
    }

    const fromQuery = url.searchParams.get("v")
    if (fromQuery && YOUTUBE_VIDEO_ID.test(fromQuery)) {
      return fromQuery
    }

    const pathMatch = url.pathname.match(/^\/(embed|shorts|live)\/([\w-]{11})/)
    if (pathMatch) {
      return pathMatch[2]
    }

    const legacy = url.pathname.match(/^\/v\/([\w-]{11})/)
    if (legacy) {
      return legacy[1]
    }

    return null
  } catch {
    return null
  }
}

/**
 * Fetch title, thumbnail, and channel name via YouTube's public oEmbed endpoint (no API key).
 */
async function fetchYouTubeMetadata(videoId: string): Promise<MetadataResponse | null> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const oembedUrl = new URL("https://www.youtube.com/oembed")
    oembedUrl.searchParams.set("url", watchUrl)
    oembedUrl.searchParams.set("format", "json")

    const response = await fetch(oembedUrl.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; LinkMetadataBot/1.0)",
      },
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as {
      title?: string
      author_name?: string
      thumbnail_url?: string
    }

    const metadata: MetadataResponse = {}

    if (data.title) {
      metadata.title = data.title.replace(/\s+/g, " ").trim()
    }
    if (data.thumbnail_url?.startsWith("http")) {
      metadata.imageUrl = data.thumbnail_url
    }
    if (data.author_name) {
      metadata.description = `Video by ${data.author_name}`.replace(/\s+/g, " ").trim()
    }

    return Object.keys(metadata).length > 0 ? metadata : null
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

function resolveTweetEmbedHelperOrigin(): string | null {
  const raw = process.env.TWITTER_EMBED_METADATA_BASE_URL?.trim()
  if (!raw) {
    return null
  }
  try {
    const u = new URL(raw)
    if (u.protocol !== "https:") {
      return null
    }
    if (u.pathname !== "/" && u.pathname !== "") {
      return null
    }
    return u.origin
  } catch {
    return null
  }
}

/**
 * X/Twitter status: HTML (browser-like UA) → publish oEmbed → optional FixTweet-style JSON API.
 * TWITTER_EMBED_METADATA_BASE_URL — optional HTTPS origin only (e.g. https://api.fxtwitter.com).
 * When set, GET {origin}/status/{tweetId} for JSON. Off by default.
 */
async function fetchTweetMetadata(tweet: ParsedTweetUrl): Promise<MetadataResponse> {
  let partial: MetadataResponse = {}

  try {
    const htmlController = new AbortController()
    const htmlTimeout = setTimeout(() => htmlController.abort(), 10_000)
    try {
      const pageRes = await fetch(tweet.canonicalPageUrl, {
        signal: htmlController.signal,
        headers: BROWSER_LIKE_FETCH_HEADERS,
      })

      if (pageRes.ok) {
        const html = await pageRes.text()
        partial = parseLinkMetadataFromHtml(html, tweet.canonicalPageUrl)
        if (isGoodEnoughTweetHtmlMetadata(partial)) {
          return partial
        }
      }
    } finally {
      clearTimeout(htmlTimeout)
    }
  } catch (e) {
    console.error("Twitter HTML metadata fetch failed:", e)
  }

  try {
    const oembedController = new AbortController()
    const oembedTimeout = setTimeout(() => oembedController.abort(), 10_000)
    try {
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

      if (oembedRes.ok) {
        const json: unknown = await oembedRes.json()
        partial = mergeFillEmpty(partial, extractTwitterOEmbedPartial(json))
      }
    } finally {
      clearTimeout(oembedTimeout)
    }
  } catch (e) {
    console.error("Twitter oEmbed failed:", e)
  }

  const helperOrigin = resolveTweetEmbedHelperOrigin()
  if (!partial.imageUrl && helperOrigin) {
    try {
      const fxController = new AbortController()
      const fxTimeout = setTimeout(() => fxController.abort(), 10_000)
      try {
        const fxUrl = `${helperOrigin}/status/${tweet.statusId}`
        const fxRes = await fetch(fxUrl, {
          signal: fxController.signal,
          headers: {
            Accept: "application/json",
            "User-Agent": BROWSER_LIKE_FETCH_HEADERS["User-Agent"],
          },
        })

        if (fxRes.ok) {
          const fxJson: unknown = await fxRes.json()
          partial = mergeFillEmpty(partial, mapFxTwitterApiToPartial(fxJson))
        }
      } finally {
        clearTimeout(fxTimeout)
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

/**
 * Server function to fetch metadata from a URL.
 * YouTube links use the oEmbed API; X/Twitter status URLs use HTML + oEmbed (+ optional helper); other URLs use Open Graph / HTML tags.
 * @param url - The URL to fetch metadata from
 * @returns Promise with metadata or error
 */
export const fetchMetadata = async (url: string): Promise<MetadataResponse> => {
  try {
    if (!url || typeof url !== "string") {
      return { error: "Invalid URL provided" }
    }

    const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`

    try {
      new URL(urlWithProtocol)
    } catch {
      return { error: "Invalid URL format" }
    }

    const youtubeId = extractYouTubeVideoId(urlWithProtocol)
    if (youtubeId) {
      const fromOembed = await fetchYouTubeMetadata(youtubeId)
      if (fromOembed) {
        return fromOembed
      }
    }

    const tweet = parseTweetUrl(urlWithProtocol)
    if (tweet) {
      return await fetchTweetMetadata(tweet)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(urlWithProtocol, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LinkMetadataBot/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return { error: `Failed to fetch URL: ${response.status} ${response.statusText}` }
    }

    const html = await response.text()
    return parseLinkMetadataFromHtml(html, urlWithProtocol)
  } catch (error) {
    console.error("Error fetching metadata:", error)

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return { error: "Request timeout - URL took too long to respond" }
      }
      return { error: error.message }
    }

    return { error: "Failed to fetch metadata" }
  }
}
