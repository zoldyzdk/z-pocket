import { expect, test } from "vitest"
import { normalizeCategoryKey, normalizeCategoryName } from "@/lib/categories"

test("normalizeCategoryName trims display name", () => {
  expect(normalizeCategoryName("  Books  ")).toBe("Books")
})

test("normalizeCategoryKey is case-insensitive for the same logical name", () => {
  expect(normalizeCategoryKey("My Tag")).toBe(normalizeCategoryKey("my tag"))
})

test("normalizeCategoryKey is empty for whitespace-only names", () => {
  expect(normalizeCategoryKey("   \t  ")).toBe("")
})
