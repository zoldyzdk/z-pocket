export function normalizeCategoryName(input: string): string {
  return input.trim()
}

export function normalizeCategoryKey(input: string): string {
  return normalizeCategoryName(input).toLowerCase()
}
