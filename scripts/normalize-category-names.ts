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
