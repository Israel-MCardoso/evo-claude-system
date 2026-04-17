'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  applyAddressSuggestion,
  fetchAddressSuggestions,
  hasCriticalAddressChanges,
  initialAddressAutocompleteState,
  shouldFetchAddressSuggestions,
  type AddressSuggestion,
} from '@/features/checkout/address-autocomplete'

interface UseAddressAutocompleteInput {
  addressQuery: string
  currentAddress: {
    rua: string
    bairro: string
    cidade: string
    cep: string
  }
  onApplySuggestion: (values: {
    rua: string
    bairro: string
    cidade: string
    cep: string
  }) => void
}

export function useAddressAutocomplete({
  addressQuery,
  currentAddress,
  onApplySuggestion,
}: UseAddressAutocompleteInput) {
  const [state, setState] = useState(initialAddressAutocompleteState)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!shouldFetchAddressSuggestions(addressQuery)) {
      setState((current) => ({
        ...current,
        suggestions: [],
        isLoadingSuggestions: false,
        suggestionsError: null,
      }))
      setHighlightedIndex(-1)
      return
    }

    const controller = new AbortController()
    const currentRequestId = ++requestIdRef.current

    setState((current) => ({
      ...current,
      isLoadingSuggestions: true,
      suggestionsError: null,
    }))

    const timer = window.setTimeout(async () => {
      try {
        const suggestions = await fetchAddressSuggestions(addressQuery, controller.signal)
        if (currentRequestId !== requestIdRef.current) {
          return
        }

        setState((current) => ({
          ...current,
          suggestions,
          isLoadingSuggestions: false,
          suggestionsError: null,
        }))
        setHighlightedIndex(suggestions.length > 0 ? 0 : -1)
      } catch (error) {
        if (controller.signal.aborted || currentRequestId !== requestIdRef.current) {
          return
        }

        setState((current) => ({
          ...current,
          suggestions: [],
          isLoadingSuggestions: false,
          suggestionsError:
            error instanceof Error
              ? error.message
              : 'Não foi possível buscar sugestões agora',
        }))
        setHighlightedIndex(-1)
      }
    }, 350)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [addressQuery])

  useEffect(() => {
    if (!hasCriticalAddressChanges(state.selectedSuggestion, currentAddress)) {
      return
    }

    setState((current) => ({
      ...current,
      selectedSuggestion: null,
    }))
  }, [currentAddress, state.selectedSuggestion])

  const canShowSuggestions = useMemo(
    () =>
      shouldFetchAddressSuggestions(addressQuery) &&
      (state.suggestions.length > 0 ||
        state.isLoadingSuggestions ||
        state.suggestionsError !== null),
    [addressQuery, state.isLoadingSuggestions, state.suggestions.length, state.suggestionsError]
  )

  function selectSuggestion(suggestion: AddressSuggestion) {
    onApplySuggestion(applyAddressSuggestion(suggestion))
    setState({
      suggestions: [],
      isLoadingSuggestions: false,
      suggestionsError: null,
      selectedSuggestion: suggestion,
    })
    setHighlightedIndex(-1)
    console.info('[delivery][autocomplete][client] suggestion_selected', {
      suggestion_id: suggestion.id,
      label: suggestion.label,
    })
  }

  function closeSuggestions() {
    setState((current) => ({
      ...current,
      suggestions: [],
    }))
    setHighlightedIndex(-1)
  }

  function moveHighlight(direction: 'next' | 'prev') {
    if (state.suggestions.length === 0) {
      return
    }

    setHighlightedIndex((current) => {
      if (direction === 'next') {
        return current >= state.suggestions.length - 1 ? 0 : current + 1
      }

      return current <= 0 ? state.suggestions.length - 1 : current - 1
    })
  }

  function selectHighlightedSuggestion() {
    if (highlightedIndex < 0 || highlightedIndex >= state.suggestions.length) {
      return
    }

    selectSuggestion(state.suggestions[highlightedIndex])
  }

  return {
    ...state,
    canShowSuggestions,
    highlightedIndex,
    selectSuggestion,
    closeSuggestions,
    moveHighlight,
    selectHighlightedSuggestion,
  }
}
