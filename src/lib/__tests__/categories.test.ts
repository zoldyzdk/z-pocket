import { expect, test } from "vitest"
import { normalizeCategoryKey, normalizeCategoryName } from "@/lib/categories"

test("normalizeCategoryName trims and lowercases", () => {
  expect(normalizeCategoryName("  Books  ")).toBe("books")
})

test("normalizeCategoryKey matches normalizeCategoryName for non-empty input", () => {
  expect(normalizeCategoryKey("  My Tag  ")).toBe("my tag")
})

test("normalizeCategoryKey is empty for whitespace-only names", () => {
  expect(normalizeCategoryKey("   \t  ")).toBe("")
})
