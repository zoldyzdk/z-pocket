export function normalizeCategoryName(input: string): string {
  return input.trim().toLowerCase()
}

export function normalizeCategoryKey(input: string): string {
  return normalizeCategoryName(input)
}
