"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialAddressAutocompleteState = void 0;
exports.shouldFetchAddressSuggestions = shouldFetchAddressSuggestions;
exports.applyAddressSuggestion = applyAddressSuggestion;
exports.isValidBrazilianCep = isValidBrazilianCep;
exports.hasCriticalAddressChanges = hasCriticalAddressChanges;
exports.fetchAddressSuggestions = fetchAddressSuggestions;
exports.initialAddressAutocompleteState = {
    suggestions: [],
    isLoadingSuggestions: false,
    suggestionsError: null,
    selectedSuggestion: null,
};
function shouldFetchAddressSuggestions(query) {
    return query.trim().length >= 3;
}
function applyAddressSuggestion(suggestion) {
    return {
        rua: suggestion.rua,
        bairro: suggestion.bairro,
        cidade: suggestion.cidade,
        cep: suggestion.cep ?? '',
    };
}
function isValidBrazilianCep(value) {
    const digits = value.replace(/\D/g, '');
    return digits.length === 0 || digits.length === 8;
}
function hasCriticalAddressChanges(selectedSuggestion, currentAddress) {
    if (!selectedSuggestion) {
        return false;
    }
    return (selectedSuggestion.rua !== currentAddress.rua ||
        selectedSuggestion.bairro !== currentAddress.bairro ||
        selectedSuggestion.cidade !== currentAddress.cidade ||
        (selectedSuggestion.cep ?? '') !== currentAddress.cep);
}
async function fetchAddressSuggestions(query, signal) {
    const response = await fetch(`/api/entrega/autocomplete?q=${encodeURIComponent(query.trim())}`, {
        method: 'GET',
        signal,
        cache: 'no-store',
    });
    const data = (await response.json());
    if (!response.ok) {
        throw new Error(data.error ?? 'Não foi possível buscar sugestões agora');
    }
    return data.suggestions ?? [];
}
