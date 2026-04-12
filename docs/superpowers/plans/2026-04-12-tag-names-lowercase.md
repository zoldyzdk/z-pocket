# Tag names lowercase + migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store every tag (`categories.name`) as trimmed lowercase text, align the link modal `TagInput` with that rule, and run a one-time migration that merges case-only duplicate categories per user then lowercases all names.

**Architecture:** Extend the existing shared helpers in `src/lib/categories.ts` so all server actions (`addLink`, `updateLink`, `createCategory`, `renameCategory`) normalize consistently without duplicated logic. Import the same helper in `TagInput` for client-side chips. Ship a standalone Bun/TypeScript script that connects to Turso/libSQL, repoints `link_categories`, deduplicates junction rows, deletes merged category ids, and lowercases remaining names—idempotent and safe to run once per environment.

**Tech Stack:** Next.js 15, TypeScript, Drizzle (libSQL/Turso), Vitest, Bun, `@libsql/client`.

---

## File structure

| Path | Responsibility |
|------|----------------|
| `src/lib/categories.ts` | `normalizeCategoryName` (trim + lowercase); `normalizeCategoryKey` delegates to it. |
| `src/lib/__tests__/categories.test.ts` | Unit tests for normalization. |
| `src/components/ui/tag-input.tsx` | Uses `normalizeCategoryName` whenever a tag enters `value`. |
| `src/actions/__tests__/addLink.updateLink.categories.test.ts` | Assert new category inserts use lowercase `name`. |
| `src/actions/__tests__/manageCategories.test.ts` | Assert create/rename persist lowercase `name`. |
| `scripts/normalize-category-names.ts` | One-time data migration (merge + lowercase). |
| `package.json` | Optional script alias `db:normalize-tags` → `bun scripts/normalize-category-names.ts`. |

No changes to `addLink.ts`, `updateLink.ts`, or `manageCategories.ts` **bodies** are required if they already use `normalizeCategoryName` for inserted/updated `name` fields (verify after helper change).

---

### Task 1: Lowercase `normalizeCategoryName` (TDD)

**Files:**
- Modify: `src/lib/categories.ts`
- Modify: `src/lib/__tests__/categories.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace the contents of `src/lib/__tests__/categories.test.ts` with:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test src/lib/__tests__/categories.test.ts`  
Expected: FAIL — `normalizeCategoryName("  Books  ")` is `"Books"` not `"books"`.

- [ ] **Step 3: Implement**

Replace `src/lib/categories.ts` with:

```ts
export function normalizeCategoryName(input: string): string {
  return input.trim().toLowerCase()
}

export function normalizeCategoryKey(input: string): string {
  return normalizeCategoryName(input)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test src/lib/__tests__/categories.test.ts`  
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/categories.ts src/lib/__tests__/categories.test.ts
git commit -m "fix(categories): store canonical tag names as lowercase"
```

---

### Task 2: `TagInput` uses shared normalizer

**Files:**
- Modify: `src/components/ui/tag-input.tsx`

- [ ] **Step 1: Import and refactor**

Add:

```ts
import { normalizeCategoryName } from "@/lib/categories"
```

Replace `addTag` with:

```ts
const addTag = (tag: string) => {
  const canonical = normalizeCategoryName(tag)
  const hasSelectedMatch = value.some(
    (selectedTag) => normalizeCategoryName(selectedTag) === canonical,
  )

  if (canonical && !hasSelectedMatch) {
    onChange([...value, canonical])
  }
  setInputValue("")
  setOpen(false)
}
```

Replace the block from `const normalizedInput = inputValue.trim()` through `const showCreateOption =` (inclusive) with:

```ts
const canonicalInput = normalizeCategoryName(inputValue)
const selectedTagLookup = new Set(value.map((tag) => normalizeCategoryName(tag)))
const filteredSuggestions: string[] = []
let hasExactSuggestionMatch = false

for (const suggestion of suggestions) {
  const normalizedSuggestion = normalizeCategoryName(suggestion)

  if (selectedTagLookup.has(normalizedSuggestion)) {
    continue
  }

  if (normalizedSuggestion === canonicalInput) {
    hasExactSuggestionMatch = true
  }

  if (canonicalInput === "" || normalizedSuggestion.includes(canonicalInput)) {
    filteredSuggestions.push(suggestion)
  }
}

const showCreateOption =
  canonicalInput.length > 0 &&
  !selectedTagLookup.has(canonicalInput) &&
  !hasExactSuggestionMatch
```

In `commandContent`, replace uses of `normalizedInput` for empty-state checks and create labels with `canonicalInput` where you mean “meaningful typed value,” e.g.:

- `filteredSuggestions.length === 0 && canonicalInput.length === 0` (no categories message)
- `filteredSuggestions.length === 0 && canonicalInput.length > 0` (press Enter hint)
- Create row: `value={canonicalInput}`, `onSelect={() => addTag(inputValue)}`, and display `Create "{canonicalInput}"` (still call `addTag(inputValue)` so trimming matches the helper).

Keep `handleKeyDown` as-is (`addTag(inputValue)`); normalization stays inside `addTag`.

- [ ] **Step 2: Manual smoke check**

Run: `bun run dev`, open add-link modal, type `AI` + Enter — chip should show `ai`. Pick a suggestion from the list — the chip text should be the normalized (lowercase) form.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/tag-input.tsx
git commit -m "fix(ui): normalize tag input chips to lowercase"
```

---

### Task 3: Server tests — `addLink` creates lowercase category names

**Files:**
- Modify: `src/actions/__tests__/addLink.updateLink.categories.test.ts`

- [ ] **Step 1: Add failing test**

Inside `describe("addLink category matching", ...)`, add:

```ts
test("creates new category with lowercase name when input has mixed case", async () => {
  mockSession("user-1")
  enqueueSelect([])

  const result = await addLink({
    url: "https://new.example.com",
    categories: ["RuSt"],
  })
  expect(result.success).toBe(true)

  const categoryInserts = insertValuesMock.mock.calls.map((c) => c[0]).filter(isCategoryInsert)
  expect(categoryInserts).toContainEqual(
    expect.objectContaining({
      name: "rust",
    }),
  )
})
```

- [ ] **Step 2: Run test**

Run: `bun run test src/actions/__tests__/addLink.updateLink.categories.test.ts`  
Expected: PASS after Task 1 (if Task 1 not done, FAIL on `name: "rust"`).

- [ ] **Step 3: Commit**

```bash
git add src/actions/__tests__/addLink.updateLink.categories.test.ts
git commit -m "test(addLink): assert new category name is lowercase"
```

---

### Task 4: Server tests — `manageCategories` create/rename lowercase

**Files:**
- Modify: `src/actions/__tests__/manageCategories.test.ts`

- [ ] **Step 1: Tighten create test assertion**

In `createCategory inserts inside a transaction when name is new`, after `expect(insertValuesMock).toHaveBeenCalled()`, add:

```ts
expect(insertValuesMock).toHaveBeenCalledWith(
  expect.objectContaining({
    name: "fresh",
  }),
)
```

(Replace `"Fresh"` input is still `createCategory({ name: "Fresh" })`; stored name must be `fresh`.)

- [ ] **Step 2: Tighten rename test assertion**

In `renameCategory updates owned category name`, change:

```ts
expect(updateSetMock).toHaveBeenCalledWith(
  expect.objectContaining({ name: "typescript" }),
)
```

(Input remains `newName: "TypeScript"`.)

- [ ] **Step 3: Run tests**

Run: `bun run test src/actions/__tests__/manageCategories.test.ts`  
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/actions/__tests__/manageCategories.test.ts
git commit -m "test(manageCategories): expect lowercase persisted names"
```

---

### Task 5: One-time migration script

**Files:**
- Create: `scripts/normalize-category-names.ts`
- Modify: `package.json` (scripts section)

- [ ] **Step 1: Add script file**

Create `scripts/normalize-category-names.ts`:

```ts
/**
 * One-time migration: merge categories that differ only by case (per user),
 * dedupe link_categories rows, delete merged category rows, lowercase all names.
 *
 * Run: `bun scripts/normalize-category-names.ts`
 * Requires TURSO_CONNECTION_URL and TURSO_AUTH_TOKEN in the environment.
 */
import { createClient } from "@libsql/client"

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    throw new Error(`Missing required env: ${name}`)
  }
  return v
}

type CatRow = { id: string; user_id: string; name: string }

async function main() {
  const url = requireEnv("TURSO_CONNECTION_URL")
  const authToken = requireEnv("TURSO_AUTH_TOKEN")

  const client = createClient({ url, authToken })

  const { rows } = await client.execute("SELECT id, user_id, name FROM categories")
  const list = rows as unknown as CatRow[]

  const groups = new Map<string, CatRow[]>()
  for (const row of list) {
    const key = `${row.user_id}\0${row.name.trim().toLowerCase()}`
    const g = groups.get(key)
    if (g) {
      g.push(row)
    } else {
      groups.set(key, [row])
    }
  }

  const losers: string[] = []

  for (const [, group] of groups) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id))
    const keeper = sorted[0]!
    for (const row of sorted.slice(1)) {
      losers.push(row.id)
      await client.execute({
        sql: "UPDATE link_categories SET category_id = ? WHERE category_id = ?",
        args: [keeper.id, row.id],
      })
    }
  }

  await client.execute(`
    DELETE FROM link_categories
    WHERE rowid NOT IN (
      SELECT MIN(rowid) FROM link_categories GROUP BY link_id, category_id
    )
  `)

  if (losers.length > 0) {
    const placeholders = losers.map(() => "?").join(", ")
    await client.execute({
      sql: `DELETE FROM categories WHERE id IN (${placeholders})`,
      args: losers,
    })
  }

  await client.execute(`UPDATE categories SET name = lower(trim(name))`)

  console.log(
    `normalize-category-names: removed ${losers.length} duplicate category row(s); all names lower(trim).`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

The final `UPDATE` applies to every category row (idempotent if names are already `lower(trim)`).

- [ ] **Step 2: Add package script**

In `package.json`, under `"scripts"`, add:

```json
"db:normalize-tags": "bun scripts/normalize-category-names.ts"
```

- [ ] **Step 3: Dry-run on local DB**

Load env (e.g. `export $(grep -v '^#' .env.local | xargs)` or your usual method), then:

Run: `bun run db:normalize-tags`  
Expected: success log; verify with SQL or UI that duplicate case tags collapsed and names are lowercase.

- [ ] **Step 4: Commit**

```bash
git add scripts/normalize-category-names.ts package.json
git commit -m "chore(db): script to merge case-duplicate tags and lowercase names"
```

---

### Task 6: Full verification

**Files:** (none — commands only)

- [ ] **Step 1: Lint**

Run: `bun run lint`  
Expected: no new errors.

- [ ] **Step 2: Full test suite**

Run: `bun run test`  
Expected: all tests pass.

- [ ] **Step 3: Commit** (only if fixes were needed)

If lint/tests required small fixes, commit them with a clear message.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| `normalizeCategoryName` trim + lowercase | Task 1 |
| `normalizeCategoryKey` aligned | Task 1 |
| Server actions pick up via shared helper | Task 1 (no extra edits if already wired) |
| `TagInput` lowercase chips | Task 2 |
| Migration: keeper = lexicographically smallest `id`, repoint, dedupe junction, delete losers, lowercase all | Task 5 |
| Tests: lib + addLink new category + migration verification | Tasks 1, 3, 4, 5 (manual/DB); Task 6 suite |
| Rollout: run script per environment | Documented in Task 5 + operator runs `db:normalize-tags` |

No placeholder steps; all snippets are complete.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-12-tag-names-lowercase.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Run tasks in this session using executing-plans, batch execution with checkpoints.

Which approach do you want?
