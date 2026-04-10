# Tag Management CRUD Design (V1)

## Context

The product currently models tags as `categories` and already uses them in:

- link create/edit via `TagInput`
- dashboard filtering via sidebar category items
- storage through `categories` and `link_categories`

This design defines a V1 management experience for tag CRUD with quick actions in the sidebar and a dedicated management page.

## Goals

- Provide complete CRUD for tags with low friction.
- Keep current data model (`categories`) and avoid schema expansion for V1.
- Support fast inline management from the sidebar.
- Provide a scalable full management view for users with many tags.
- Preserve data integrity when renaming/deleting tags.

## Non-Goals (V1)

- Tag colors/icons
- Tag merge
- Manual drag-and-drop ordering
- Bulk operations

## Product Decisions (Approved)

- Pattern: Hybrid approach (sidebar quick actions + dedicated tags page)
- Sidebar per-tag menu actions: Rename, Delete
- Delete behavior: show usage count and confirm, then remove from all links
- Ordering: alphabetical (A-Z)

## Information Architecture

### Entry Points

1. **Sidebar (`/dashboard`)**
   - Each tag row has a kebab dropdown with `Rename` and `Delete`.
   - Maintains current behavior of clicking tag name to toggle filter.

2. **Tags page (`/dashboard/tags`)**
   - Dedicated management screen for full visibility and explicit CRUD.
   - Shows tag name, usage count, and actions.
   - Includes a `New Tag` action.

### Single Source of Truth

- All mutations happen through server actions.
- UI updates rely on server revalidation to keep sidebar, tags page, and link forms consistent.

## Data Model and Query Design

### Existing Tables Reused

- `categories` (tag entity)
- `link_categories` (link-to-tag mapping)

No new tables required in V1.

### Read Query

Add/extend query to return tag list with usage count:

- `categoryId`
- `name`
- `usageCount` (count of related `link_categories` rows, optionally constrained to active links when needed by view)

Sort in SQL by `name ASC` to enforce alphabetical behavior everywhere.

## Server Action Contracts

### `createCategory`

**Input**
- `{ name: string }`

**Rules**
- Authenticated user required.
- Trim whitespace.
- Reject empty names.
- Enforce case-insensitive uniqueness per user.

**Effects**
- Insert into `categories`.
- Revalidate relevant dashboard/tag paths.

### `renameCategory`

**Input**
- `{ categoryId: string, newName: string }`

**Rules**
- Authenticated user required.
- Category must belong to user.
- `newName` trimmed, non-empty, case-insensitive unique for that user.

**Effects**
- Update `categories.name`.
- Keep existing `categoryId` and mappings (no remap needed).
- Revalidate relevant paths.

### `deleteCategory`

**Preview**
- Fetch usage count for confirmation text before destructive action.

**Confirm Input**
- `{ categoryId: string }`

**Rules**
- Authenticated user required.
- Category ownership required.

**Effects**
- Delete related rows in `link_categories`.
- Delete row in `categories`.
- Return summary payload, e.g. `{ deleted: true, detachedLinks: number }`.
- Revalidate relevant paths.

## UI/UX Design

### Sidebar

- Keep current category selection UX.
- Add per-row menu trigger on each tag line.
- Menu:
  - Rename -> opens compact dialog with prefilled name.
  - Delete -> opens confirmation dialog including usage count.

### Tags Page

- Route: `/dashboard/tags`
- Layout:
  - Header: page title + `New Tag` button
  - List/table columns:
    - Tag name
    - Usage count
    - Actions (`Rename`, `Delete`)
- Same validation and action semantics as sidebar menus.

### Link Modal Integration

- Keep existing `TagInput` create-on-type behavior.
- Normalize creation logic with trim + case-insensitive matching to avoid duplicate names with different casing.

## Validation and Error Handling

- Reject empty names after trimming.
- Case-insensitive duplicate detection with explicit conflict message (`Tag already exists.`).
- Unauthorized or non-owned target returns safe generic error.
- Pending state on action buttons while mutation runs.
- Success and failure toasts for all mutations.

## Consistency and Concurrency

- Delete confirmation usage count is informative; actual delete path remains safe even if count changes before confirmation.
- Deletion flow should remove associations and category atomically to avoid partial data state.
- Revalidation is the source of truth for post-mutation UI.

## Testing Strategy (MVP)

### Server action tests

- `createCategory`:
  - trims name
  - blocks empty names
  - blocks case-insensitive duplicates
- `renameCategory`:
  - enforces ownership
  - blocks case-insensitive duplicates
  - updates valid name
- `deleteCategory`:
  - removes mappings in `link_categories`
  - removes category
  - returns detached count

### UI tests

- Sidebar tag row shows action menu.
- Rename dialog prefilled and submits successfully.
- Delete confirmation displays usage count and executes removal.
- Alphabetical ordering is respected in sidebar and tags page.

## Rollout Notes

- This is a backward-compatible enhancement using existing tables.
- Existing links and category filters remain functional.
- V1 can ship without search/bulk features on tags page.

## Future Extensions (Post-V1)

- Tag search on tags page
- Tag color/icon metadata
- Merge tags
- Bulk delete/rename
- Manual ordering
