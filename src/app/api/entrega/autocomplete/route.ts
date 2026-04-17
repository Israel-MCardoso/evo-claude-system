import { NextResponse } from 'next/server'
import { searchAddressSuggestions } from '@/server/geolocation/addressAutocompleteProvider'

export async function GET(request: Request) {
  const startedAt = Date.now()
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() ?? ''

  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    const suggestions = await searchAddressSuggestions(query)
    console.info('[delivery][autocomplete][api] completed', {
      query,
      count: suggestions.length,
      duration_ms: Date.now() - startedAt,
    })
    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('[delivery][autocomplete][api] failed', {
      query,
      duration_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'unknown_error',
    })
    return NextResponse.json(
      { suggestions: [], error: 'Não foi possível buscar sugestões agora' },
      { status: 500 }
    )
  }
}
