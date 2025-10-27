"use server"

type MetadataResponse = {
  title?: string
  description?: string
  imageUrl?: string
  error?: string
}

/**
 * Server function to fetch metadata from a URL.
 * Extracts Open Graph tags and falls back to standard HTML tags.
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
