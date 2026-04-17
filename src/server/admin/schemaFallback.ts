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
  const columnName = normalizedColumn.includes('.') ? normalizedColumn.split('.').at(-1)! : normalizedColumn
  const text = getErrorText(error)

  return (
    (text.includes(normalizedColumn) && text.includes('does not exist')) ||
    (text.includes(`'${columnName}' column`) && text.includes('schema cache')) ||
    (text.includes(`"${columnName}"`) && text.includes('does not exist'))
  )
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
