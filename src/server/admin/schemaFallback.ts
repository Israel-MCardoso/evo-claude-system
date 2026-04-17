interface QueryLikeError {
  message?: string
  details?: string
  code?: string
}

function getErrorText(error: QueryLikeError | null | undefined): string {
  return `${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase()
}

export function isMissingColumnError(error: QueryLikeError | null | undefined, column: string): boolean {
  const normalizedColumn = column.toLowerCase()
  return getErrorText(error).includes(normalizedColumn) && getErrorText(error).includes('does not exist')
}

export function isMissingTableError(error: QueryLikeError | null | undefined, table: string): boolean {
  const normalizedTable = table.toLowerCase()
  const text = getErrorText(error)
  return (
    text.includes(`table 'public.${normalizedTable}'`) ||
    text.includes(`relation "${normalizedTable}" does not exist`) ||
    text.includes(`relation 'public.${normalizedTable}' does not exist`)
  )
}
