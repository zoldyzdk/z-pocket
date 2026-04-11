# Tag Management CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship V1 tag management with sidebar quick actions (rename/delete) and a dedicated `/dashboard/tags` page, while preserving data integrity and alphabetical ordering.

**Architecture:** Reuse existing `categories` + `link_categories` tables, add focused server actions for create/rename/delete, and expose management UI in both sidebar and a dedicated page. Keep mutations server-authoritative with `revalidatePath`, and use shared normalization logic to enforce case-insensitive uniqueness consistently.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Drizzle ORM (SQLite), Vitest + Testing Library, Radix UI.

---

## File Structure (Planned Changes)

**Create**
- `src/actions/manageCategories.ts` - server actions for create/rename/delete and delete preview count.
- `src/actions/__tests__/manageCategories.test.ts` - unit tests for category management action contracts.
- `src/lib/categories.ts` - shared normalization and case-insensitive compare helpers.
- `src/lib/__tests__/categories.test.ts` - unit tests for helper behavior.
- `src/components/category-actions-menu.tsx` - sidebar row dropdown and rename/delete dialogs.
- `src/components/tags-management.tsx` - client table/list UI for `/dashboard/tags`.
- `src/components/__tests__/tags-management.test.tsx` - client component behavior tests.
- `src/app/(private)/dashboard/tags/page.tsx` - dedicated management route.

**Modify**
- `src/lib/queries.ts` - add category usage-count query and alphabetic ordering support.
- `src/actions/getCategories.ts` - enforce alphabetical return.
- `src/actions/addLink.ts` - use shared normalization/case-insensitive lookup.
- `src/actions/updateLink.ts` - same normalization/case-insensitive logic.
- `src/components/category-menu-item.tsx` - include row action menu while preserving filter click behavior.
- `src/components/categories-section.tsx` - pass category id/name and allow row actions.
- `src/components/app-sidebar.tsx` - ensure category payload includes ids and sorted input.

**Verification**
- `package.json` scripts already provide `test` and `lint`; no script changes needed.

---

### Task 1: Add shared category normalization helpers

**Files:**
- Create: `src/lib/categories.ts`
- Test: `src/lib/__tests__/categories.test.ts`

- [ ] **Step 1: Write the failing helper tests**

```ts
import { describe, expect, it } from "vitest"
import { normalizeCategoryName, normalizeCategoryKey } from "@/lib/categories"

describe("categories helpers", () => {
  it("trims display name", () => {
    expect(normalizeCategoryName("  React  ")).toBe("React")
  })

  it("builds case-insensitive key", () => {
    expect(normalizeCategoryKey("  ReAcT  ")).toBe("react")
  })

  it("returns empty key for whitespace-only names", () => {
    expect(normalizeCategoryKey("   ")).toBe("")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/lib/__tests__/categories.test.ts`  
Expected: FAIL with module/function-not-found errors.

- [ ] **Step 3: Write minimal implementation**

```ts
export function normalizeCategoryName(input: string): string {
  return input.trim()
}

export function normalizeCategoryKey(input: string): string {
  return normalizeCategoryName(input).toLowerCase()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/lib/__tests__/categories.test.ts`  
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/categories.ts src/lib/__tests__/categories.test.ts
git commit -m "test(categories): add normalization helpers"
```

---

### Task 2: Add category usage-count query in `queries.ts`

**Files:**
- Modify: `src/lib/queries.ts`
- Test: `src/actions/__tests__/manageCategories.test.ts` (query mocked through action tests)

- [ ] **Step 1: Write failing assertion in action test for alphabetical usage list**

```ts
it("returns categories with usage count sorted alphabetically", async () => {
  mockDbCategoryUsageRows([
    { id: "2", name: "zod", usageCount: 1 },
    { id: "1", name: "react", usageCount: 3 },
  ])

  const result = await getCategoriesWithUsageForCurrentUser()

  expect(result.map((row) => row.name)).toEqual(["react", "zod"])
  expect(result[0].usageCount).toBe(3)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/actions/__tests__/manageCategories.test.ts -t "usage count sorted"`  
Expected: FAIL because `getCategoriesWithUsageForCurrentUser` does not exist.

- [ ] **Step 3: Implement query in `src/lib/queries.ts`**

```ts
export async function getUserCategoriesWithUsage(userId: string) {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      usageCount: sql<number>`count(${linkCategories.id})`,
    })
    .from(categories)
    .leftJoin(linkCategories, eq(categories.id, linkCategories.categoryId))
    .where(eq(categories.userId, userId))
    .groupBy(categories.id)
    .orderBy(asc(categories.name))

  return rows.map((row) => ({
    ...row,
    usageCount: Number(row.usageCount),
  }))
}
```

- [ ] **Step 4: Run targeted tests**

Run: `bun run test src/actions/__tests__/manageCategories.test.ts -t "usage count sorted"`  
Expected: PASS for query-consumer assertion.

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries.ts src/actions/__tests__/manageCategories.test.ts
git commit -m "feat(categories): add usage-count query sorted by name"
```

---

### Task 3: Implement category management server actions (create/rename/delete)

**Files:**
- Create: `src/actions/manageCategories.ts`
- Modify: `src/actions/getCategories.ts`
- Test: `src/actions/__tests__/manageCategories.test.ts`

- [ ] **Step 1: Write failing tests for action contracts**

```ts
it("createCategory rejects duplicate names case-insensitively", async () => {
  mockSession("user-1")
  mockExistingCategory({ id: "cat-1", name: "React" })

  const result = await createCategory({ name: "react" })

  expect(result.ok).toBe(false)
  expect(result.error).toBe("Tag already exists.")
})

it("renameCategory updates owned category name", async () => {
  mockSession("user-1")
  mockOwnedCategory("cat-1")
  mockNoConflicts()

  const result = await renameCategory({ categoryId: "cat-1", newName: "TypeScript" })

  expect(result.ok).toBe(true)
  expect(mockDbUpdate).toHaveBeenCalled()
})

it("deleteCategory removes links associations and category", async () => {
  mockSession("user-1")
  mockOwnedCategory("cat-1")
  mockDetachedCount(7)

  const result = await deleteCategory({ categoryId: "cat-1" })

  expect(result.ok).toBe(true)
  expect(result.detachedLinks).toBe(7)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/actions/__tests__/manageCategories.test.ts`  
Expected: FAIL with missing exports and unmet mocks.

- [ ] **Step 3: Implement `manageCategories.ts` with minimal passing logic**

```ts
export async function createCategory(input: { name: string }) {
  const session = await requireSession()
  const name = normalizeCategoryName(input.name)
  const key = normalizeCategoryKey(input.name)
  if (!key) return { ok: false, error: "Tag name is required." as const }

  const existing = await findCategoryByKey(session.user.id, key)
  if (existing) return { ok: false, error: "Tag already exists." as const }

  await db.insert(categories).values({
    id: nanoid(),
    userId: session.user.id,
    name,
    color: null,
    icon: null,
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/tags")
  return { ok: true as const }
}
```

- [ ] **Step 4: Implement alphabetical `getCategories` ordering**

```ts
const userCategories = await db
  .select({ name: categories.name })
  .from(categories)
  .where(eq(categories.userId, session.user.id))
  .orderBy(asc(categories.name))

return userCategories.map((cat) => cat.name)
```

- [ ] **Step 5: Run tests + lint**

Run: `bun run test src/actions/__tests__/manageCategories.test.ts`  
Expected: PASS  

Run: `bun run lint`  
Expected: PASS (or no new lint errors in modified files).

- [ ] **Step 6: Commit**

```bash
git add src/actions/manageCategories.ts src/actions/getCategories.ts src/actions/__tests__/manageCategories.test.ts
git commit -m "feat(categories): add create rename delete server actions"
```

---

### Task 4: Refactor link mutations to use shared normalization and case-insensitive lookup

**Files:**
- Modify: `src/actions/addLink.ts`
- Modify: `src/actions/updateLink.ts`
- Test: `src/actions/__tests__/manageCategories.test.ts` (add integration-style mocked tests)

- [ ] **Step 1: Add failing tests for normalization in link actions**

```ts
it("addLink reuses existing category when casing differs", async () => {
  mockSession("user-1")
  mockExistingCategory({ id: "cat-1", name: "React" })

  await addLink({
    url: "https://example.com",
    categories: [" react "],
  })

  expect(mockDbInsertCategory).not.toHaveBeenCalled()
  expect(mockDbInsertLinkCategory).toHaveBeenCalledWith(
    expect.objectContaining({ categoryId: "cat-1" })
  )
})
```

- [ ] **Step 2: Run targeted test to verify it fails**

Run: `bun run test src/actions/__tests__/manageCategories.test.ts -t "casing differs"`  
Expected: FAIL due to exact-case equality lookup.

- [ ] **Step 3: Update category lookup logic in both actions**

```ts
const normalizedName = normalizeCategoryName(categoryName)
const normalizedKey = normalizeCategoryKey(categoryName)
if (!normalizedKey) continue

const existingCategory = await db
  .select()
  .from(categories)
  .where(
    and(
      eq(categories.userId, session.user.id),
      sql`lower(${categories.name}) = ${normalizedKey}`
    )
  )
  .limit(1)
```

- [ ] **Step 4: Run relevant tests**

Run: `bun run test src/actions/__tests__/manageCategories.test.ts`  
Expected: PASS for link action normalization scenarios.

- [ ] **Step 5: Commit**

```bash
git add src/actions/addLink.ts src/actions/updateLink.ts src/actions/__tests__/manageCategories.test.ts
git commit -m "fix(categories): normalize tag matching in link mutations"
```

---

### Task 5: Add sidebar row actions menu with rename/delete dialogs

**Files:**
- Create: `src/components/category-actions-menu.tsx`
- Modify: `src/components/category-menu-item.tsx`
- Modify: `src/components/categories-section.tsx`
- Test: `src/components/__tests__/tags-management.test.tsx`

- [ ] **Step 1: Write failing component tests for action menu rendering**

```tsx
it("renders rename and delete actions for each category row", () => {
  render(
    <CategoryMenuItem category={{ id: "cat-1", name: "React" }} />
  )

  fireEvent.click(screen.getByRole("button", { name: /category actions/i }))

  expect(screen.getByText("Rename")).toBeInTheDocument()
  expect(screen.getByText("Delete")).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/components/__tests__/tags-management.test.tsx -t "category actions"`  
Expected: FAIL because row action UI does not exist.

- [ ] **Step 3: Implement `category-actions-menu.tsx`**

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" aria-label="Category actions">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onSelect={() => setRenameOpen(true)}>Rename</DropdownMenuItem>
    <DropdownMenuItem className="text-destructive" onSelect={() => setDeleteOpen(true)}>
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

- [ ] **Step 4: Integrate menu into category rows without breaking filter click**

```tsx
<SidebarMenuButton onClick={handleFilterToggle} className={cn("w-full justify-start", isActive && "bg-accent font-medium")}>
  <span className="truncate">{category.name}</span>
</SidebarMenuButton>
<CategoryActionsMenu categoryId={category.id} categoryName={category.name} />
```

- [ ] **Step 5: Run tests**

Run: `bun run test src/components/__tests__/tags-management.test.tsx`  
Expected: PASS for menu visibility and action entry points.

- [ ] **Step 6: Commit**

```bash
git add src/components/category-actions-menu.tsx src/components/category-menu-item.tsx src/components/categories-section.tsx src/components/__tests__/tags-management.test.tsx
git commit -m "feat(sidebar): add per-tag rename and delete actions"
```

---

### Task 6: Build dedicated tags management page (`/dashboard/tags`)

**Files:**
- Create: `src/app/(private)/dashboard/tags/page.tsx`
- Create: `src/components/tags-management.tsx`
- Modify: `src/components/app-sidebar.tsx` (add link entry to tags page nav)
- Test: `src/components/__tests__/tags-management.test.tsx`

- [ ] **Step 1: Write failing tests for tags management list rendering**

```tsx
it("renders alphabetical tags with usage counts", () => {
  render(
    <TagsManagement
      categories={[
        { id: "2", name: "zod", usageCount: 1 },
        { id: "1", name: "react", usageCount: 3 },
      ]}
    />
  )

  const rows = screen.getAllByRole("row")
  expect(rows[1]).toHaveTextContent("react")
  expect(rows[1]).toHaveTextContent("3")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/components/__tests__/tags-management.test.tsx -t "usage counts"`  
Expected: FAIL because component/route do not exist.

- [ ] **Step 3: Implement server page and client management component**

```tsx
// src/app/(private)/dashboard/tags/page.tsx
export default async function TagsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return null

  const categories = await getUserCategoriesWithUsage(session.user.id)
  return <TagsManagement categories={categories} />
}
```

```tsx
// src/components/tags-management.tsx
<div className="p-4 space-y-4">
  <div className="flex items-center justify-between">
    <h1 className="text-2xl font-semibold">Tags</h1>
    <CreateTagDialog />
  </div>
  <table className="w-full text-sm">
    {/* name, usage count, actions */}
  </table>
</div>
```

- [ ] **Step 4: Add sidebar nav link to tags page**

```ts
const items = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Tags", url: "/dashboard/tags", icon: Tags },
  { title: "Archived", url: "/dashboard/archived", icon: Archive },
]
```

- [ ] **Step 5: Run tests**

Run: `bun run test src/components/__tests__/tags-management.test.tsx`  
Expected: PASS for list rendering and action controls.

- [ ] **Step 6: Commit**

```bash
git add src/app/'(private)'/dashboard/tags/page.tsx src/components/tags-management.tsx src/components/app-sidebar.tsx src/components/__tests__/tags-management.test.tsx
git commit -m "feat(tags): add dedicated tags management page"
```

---

### Task 7: Add delete preview count and confirmation flow wiring

**Files:**
- Modify: `src/actions/manageCategories.ts`
- Modify: `src/components/category-actions-menu.tsx`
- Modify: `src/components/tags-management.tsx`
- Test: `src/components/__tests__/tags-management.test.tsx`

- [ ] **Step 1: Write failing test for delete confirmation usage count**

```tsx
it("shows usage count before deleting a tag", async () => {
  mockDeletePreview({ usageCount: 12 })
  render(<CategoryActionsMenu categoryId="cat-1" categoryName="React" />)

  fireEvent.click(screen.getByRole("button", { name: /category actions/i }))
  fireEvent.click(screen.getByText("Delete"))

  expect(await screen.findByText(/used in 12 links/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/components/__tests__/tags-management.test.tsx -t "usage count before deleting"`  
Expected: FAIL because preview endpoint is not wired.

- [ ] **Step 3: Implement preview + confirm calls**

```ts
export async function getCategoryDeletePreview(input: { categoryId: string }) {
  const session = await requireSession()
  await assertOwnership(session.user.id, input.categoryId)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(linkCategories)
    .where(eq(linkCategories.categoryId, input.categoryId))

  return { ok: true as const, usageCount: Number(count) }
}
```

```tsx
<DialogDescription>
  This tag is used in {preview?.usageCount ?? 0} links. This action cannot be undone.
</DialogDescription>
```

- [ ] **Step 4: Run tests**

Run: `bun run test src/components/__tests__/tags-management.test.tsx`  
Expected: PASS for delete preview and confirm UI state.

- [ ] **Step 5: Commit**

```bash
git add src/actions/manageCategories.ts src/components/category-actions-menu.tsx src/components/tags-management.tsx src/components/__tests__/tags-management.test.tsx
git commit -m "feat(tags): add delete confirmation with usage preview"
```

---

### Task 8: End-to-end verification and cleanup

**Files:**
- Modify: any touched files from prior tasks only if lint/test fixes needed.

- [ ] **Step 1: Run full test suite**

Run: `bun run test`  
Expected: PASS across existing and new tests.

- [ ] **Step 2: Run lint**

Run: `bun run lint`  
Expected: PASS with no new lint errors.

- [ ] **Step 3: Manual functional smoke check**

Run: `bun run dev`  
Expected checks:
- `/dashboard` sidebar rows show per-tag action menu
- rename updates immediately after action
- delete shows usage count and removes filter row after confirm
- `/dashboard/tags` lists tags alphabetically with usage counts

- [ ] **Step 4: Final commit (if cleanup changes were required)**

```bash
git add <resolved-files>
git commit -m "chore(tags): finalize tag management CRUD polish"
```

---

## Self-Review Checklist

### 1) Spec coverage

- Hybrid entry points (sidebar + `/dashboard/tags`) -> Tasks 5 and 6.
- Rename + delete only in per-tag dropdown -> Tasks 5 and 7.
- Delete confirmation with usage count -> Task 7.
- Alphabetical ordering -> Tasks 2 and 3 (queries + `getCategories`).
- Case-insensitive uniqueness and normalized create/rename -> Tasks 1, 3, and 4.
- Data integrity during delete -> Task 3 (`deleteCategory` associations then category).
- Testing focus for actions and UI -> Tasks 1 through 8.

No uncovered spec requirements remain.

### 2) Placeholder scan

- No `TODO`/`TBD` placeholders.
- Each task includes concrete file paths, commands, and expected outcomes.

### 3) Type consistency

- Category naming conventions are consistent: `categoryId`, `name`, `usageCount`.
- Action names are consistent: `createCategory`, `renameCategory`, `deleteCategory`, `getCategoryDeletePreview`.

