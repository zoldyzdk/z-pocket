"use server"

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

/**
 * Server function to fetch metadata from a URL.
 * YouTube links use the oEmbed API; other URLs use Open Graph / HTML tags.
 * @param url - The URL to fetch metadata from
 * @returns Promise with metadata or error
 */
export const fetchMetadata = async (url: string): Promise<MetadataResponse> => {
  try {
    // Validate URL
    if (!url || typeof url !== "string") {
      return { error: "Invalid URL provided" }
    }

    // Ensure URL has protocol
    const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`

    // Validate URL format
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

    // Fetch the HTML content with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

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

    // Parse metadata from HTML
    const metadata = parseMetadata(html, urlWithProtocol)

    return metadata
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

/**
 * Decode HTML entities to their text equivalents
 */
function decodeHtmlEntities(text: string): string {
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

  // Replace named entities
  let decoded = text
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, "g"), char)
  }

  // Replace numeric entities (decimal)
  decoded = decoded.replace(/&#(\d+);/g, (_, num) => {
    return String.fromCharCode(parseInt(num, 10))
  })

  // Replace numeric entities (hexadecimal)
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16))
  })

  return decoded
}

/**
 * Parse metadata from HTML content
 */
function parseMetadata(html: string, baseUrl: string): MetadataResponse {
  const metadata: MetadataResponse = {}

  // Helper function to extract meta tag content
  const getMetaContent = (property: string): string | null => {
    const regex = new RegExp(
      `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
      "i"
    )
    const match = html.match(regex)
    return match ? decodeHtmlEntities(match[1]) : null
  }

  // Helper function to extract title tag
  const getTitle = (): string | null => {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    return titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : null
  }

  // Extract Open Graph tags first (preferred)
  metadata.title = getMetaContent("og:title") || getTitle() || undefined
  metadata.description =
    getMetaContent("og:description") || getMetaContent("description") || undefined

  // Handle image URL - make it absolute if it's relative
  const imageUrl = getMetaContent("og:image")
  if (imageUrl) {
    try {
      // If it's already absolute, use as is
      if (imageUrl.startsWith("http")) {
        metadata.imageUrl = imageUrl
      } else {
        // Make relative URLs absolute
        const baseUrlObj = new URL(baseUrl)
        metadata.imageUrl = new URL(imageUrl, baseUrlObj.origin).href
      }
    } catch {
      // If URL construction fails, skip the image
    }
  }

  // Clean up extracted values
  if (metadata.title) {
    metadata.title = metadata.title.replace(/\s+/g, " ").trim()
  }
  if (metadata.description) {
    metadata.description = metadata.description.replace(/\s+/g, " ").trim()
  }

  return metadata
}
