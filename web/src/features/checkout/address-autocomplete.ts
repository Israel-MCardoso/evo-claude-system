export interface AddressSuggestion {
  id: string
  label: string
  rua: string
  bairro: string
  cidade: string
  cep: string | null
}

export interface AddressAutocompleteState {
  suggestions: AddressSuggestion[]
  isLoadingSuggestions: boolean
  suggestionsError: string | null
  selectedSuggestion: AddressSuggestion | null
}

export const initialAddressAutocompleteState: AddressAutocompleteState = {
  suggestions: [],
  isLoadingSuggestions: false,
  suggestionsError: null,
  selectedSuggestion: null,
}

export function shouldFetchAddressSuggestions(query: string): boolean {
  return query.trim().length >= 3
}

export function applyAddressSuggestion(suggestion: AddressSuggestion) {
  return {
    rua: suggestion.rua,
    bairro: suggestion.bairro,
    cidade: suggestion.cidade,
    cep: suggestion.cep ?? '',
  }
}

export function isValidBrazilianCep(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return digits.length === 0 || digits.length === 8
}

export function hasCriticalAddressChanges(
  selectedSuggestion: AddressSuggestion | null,
  currentAddress: { rua: string; bairro: string; cidade: string; cep: string }
): boolean {
  if (!selectedSuggestion) {
    return false
  }

  return (
    selectedSuggestion.rua !== currentAddress.rua ||
    selectedSuggestion.bairro !== currentAddress.bairro ||
    selectedSuggestion.cidade !== currentAddress.cidade ||
    (selectedSuggestion.cep ?? '') !== currentAddress.cep
  )
}

export async function fetchAddressSuggestions(
  query: string,
  signal?: AbortSignal
): Promise<AddressSuggestion[]> {
  const response = await fetch(
    `/api/entrega/autocomplete?q=${encodeURIComponent(query.trim())}`,
    {
      method: 'GET',
      signal,
      cache: 'no-store',
    }
  )

  const data = (await response.json()) as {
    suggestions?: AddressSuggestion[]
    error?: string
  }

  if (!response.ok) {
    throw new Error(data.error ?? 'Não foi possível buscar sugestões agora')
  }

  return data.suggestions ?? []
}
