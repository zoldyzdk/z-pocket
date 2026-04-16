import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

vi.unmock("@/actions/fetchMetadata")

import { fetchMetadata } from "@/actions/fetchMetadata"

describe("fetchMetadata tweet branch", () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    vi.unstubAllGlobals()
    globalThis.fetch = originalFetch
    delete process.env.TWITTER_EMBED_METADATA_BASE_URL
  })

  test("thin HTML triggers oEmbed merge", async () => {
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

    const result = await fetchMetadata("https://twitter.com/user/status/1")
    expect(result.error).toBeUndefined()
    expect(result.title).toBe("Hello tweet")
    expect(result.description).toBe("@user")
  })

  test("rich HTML returns without calling oEmbed", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString()
      if (url.startsWith("https://x.com/rich/status/2")) {
        const html = `
          <meta property="og:title" content="OG T" />
          <meta property="og:description" content="OG D" />
          <meta property="og:image" content="https://img.example/a.png" />
        `
        return new Response(html, { status: 200 })
      }
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchMetadata("https://x.com/rich/status/2")
    expect(result).toMatchObject({
      title: "OG T",
      description: "OG D",
      imageUrl: "https://img.example/a.png",
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test("TWITTER_EMBED_METADATA_BASE_URL fetches helper when image still missing", async () => {
    process.env.TWITTER_EMBED_METADATA_BASE_URL = "https://api.fxtwitter.com"

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString()
      if (url.startsWith("https://x.com/nopic/status/3")) {
        return new Response("<html><head></head></html>", { status: 200 })
      }
      if (url.includes("publish.twitter.com/oembed")) {
        return Response.json({
          author_name: "Someone",
          author_url: "https://x.com/someone",
          html: "<p>Text only</p>",
        })
      }
      if (url === "https://api.fxtwitter.com/status/3") {
        return Response.json({
          tweet: {
            text: "Text only",
            author: { name: "Someone", screen_name: "someone" },
            media: { photos: [{ url: "https://cdn.example/photo.jpg" }] },
          },
        })
      }
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchMetadata("https://x.com/nopic/status/3")
    expect(result.imageUrl).toBe("https://cdn.example/photo.jpg")
    expect(result.title).toBe("Text only")
    expect(result.description).toBe("@someone")
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
