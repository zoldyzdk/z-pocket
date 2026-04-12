# Tag names: lowercase canonical form and data migration

## Context

Tags are stored as `categories.name`. The app already matches existing tags case-insensitively when attaching categories to links (`lower(name)` vs a normalized key in `addLink`, `updateLink`, and `manageCategories`). New rows still persist whatever casing the user typed (e.g. `"Ai"`), which is inconsistent with a single canonical display form and can leave historical duplicate rows that differ only by case.

## Goals

- Every **new or updated** tag name is stored as **trimmed, lowercase** ASCII-style text using the same rule everywhere (`String.prototype.trim()` then `toLowerCase()` in JavaScript).
- **Existing** data is **migrated once**: case-only duplicates per user are **merged**, then all names are lowercased.
- The link modal `TagInput` shows and submits lowercase chips so the UI matches persisted data.

## Non-goals

- Locale-aware case folding (e.g. Turkish `"I"` / `"i"` rules); standard JavaScript `toLowerCase()` is sufficient.
- Adding a database unique constraint on `(user_id, lower(name))` in this change (optional follow-up).
- Renaming UX changes on the Tags page beyond inheriting the normalizer.

## Approved approach

**Single shared normalizer** (`normalizeCategoryName` lowercases after trim) plus a **one-time data migration** that merges duplicates and lowercases all `categories.name` values.

## Application behavior

### `src/lib/categories.ts`

- **`normalizeCategoryName`:** return `input.trim().toLowerCase()`.
- **`normalizeCategoryKey`:** equivalent to normalizing the name for comparison; implement as `normalizeCategoryName(input)` or keep explicit `trim` + `toLowerCase()` so it stays obviously correct if `normalizeCategoryName` ever gains more rules.

All server paths that already import these helpers (`addLink`, `updateLink`, `createCategory`, `renameCategory`) pick up lowercase storage without parallel one-off logic.

### `src/components/ui/tag-input.tsx`

When a tag is added (keyboard submit, create row, or selecting a suggestion), push the **trimmed, lowercased** string into the controlled `value` array so chips and form submission match the database.

## Data migration (one-time per environment)

**Preconditions:** SQLite; `link_categories` has **no** unique constraint on `(link_id, category_id)`, so repointing merge losers to a keeper can create duplicate junction rows and those must be removed.

**Algorithm:**

1. For each `user_id`, group `categories` rows by `lower(trim(name))` where the group has more than one `id`.
2. **Keeper:** the category row whose `id` is **lexicographically smallest** (deterministic, no dependency on `created_at` being non-null).
3. For each non-keeper `id` in the group: `UPDATE link_categories SET category_id = <keeper_id> WHERE category_id = <loser_id>`.
4. **Deduplicate** `link_categories`: delete duplicate rows for the same `(link_id, category_id)`, keeping one row per pair (e.g. retain the minimum `rowid` per group).
5. `DELETE FROM categories WHERE id` is any merged-away loser id.
6. `UPDATE categories SET name = lower(trim(name))` for all remaining rows (idempotent for already-lowercase names).

**Delivery:** Implement as a versioned SQL migration, a one-off TypeScript script using the app `db` client, or the project’s established pattern for data migrations. The implementation plan will choose the concrete mechanism and verify it against a copy of production-shaped data if available.

## Testing

- Update `src/lib/__tests__/categories.test.ts` expectations (e.g. trimmed input yields lowercase).
- Extend or add server-action tests so that when a **new** category is created from the link flow, the inserted `name` is lowercase.
- Migration: automated test with a temporary SQLite database containing intentional case duplicates, or a documented manual verification checklist if automation is impractical.

## Rollout

- Deploy application changes and run the migration in each environment (local, staging, production) once.
- Order: running the migration after the new normalizer ships is acceptable (old duplicate rows remain until merged). Running the migration before shipping is also safe because lookups are already case-insensitive.
