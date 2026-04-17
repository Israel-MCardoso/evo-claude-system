// Utilitários de formatação usados em toda a aplicação

/**
 * Formata valor numérico como moeda brasileira (R$ XX,XX)
 */
export function formatarPreco(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/**
 * Normaliza telefone: remove tudo que não for dígito
 * Ex: "(11) 99999-0000" → "11999990000"
 */
export function normalizarTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '')
}
