import { describe, expect, test } from "vitest"
import {
  extractTwitterOEmbedPartial,
  isGoodEnoughTweetHtmlMetadata,
  mapFxTwitterApiToPartial,
  mergeFillEmpty,
  parseLinkMetadataFromHtml,
  parseTweetUrl,
} from "@/lib/linkMetadata"

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

  test("reads meta when content attribute precedes name", () => {
    const html = `<meta content="Later order" name="twitter:title" />`
    expect(parseLinkMetadataFromHtml(html, "https://x.com")).toMatchObject({
      title: "Later order",
    })
  })
})

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
