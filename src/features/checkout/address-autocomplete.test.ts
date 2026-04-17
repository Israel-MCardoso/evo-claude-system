import assert from 'node:assert/strict'
import {
  applyAddressSuggestion,
  hasCriticalAddressChanges,
  isValidBrazilianCep,
  shouldFetchAddressSuggestions,
  type AddressSuggestion,
} from './address-autocomplete'

async function run() {
  const suggestion: AddressSuggestion = {
    id: '1',
    label: 'Rua Vergueiro, Liberdade, São Paulo, 01504-000',
    rua: 'Rua Vergueiro',
    bairro: 'Liberdade',
    cidade: 'São Paulo',
    cep: '01504-000',
  }

  assert.equal(shouldFetchAddressSuggestions('ab'), false)
  assert.equal(shouldFetchAddressSuggestions('abc'), true)

  assert.equal(isValidBrazilianCep(''), true)
  assert.equal(isValidBrazilianCep('01504-000'), true)
  assert.equal(isValidBrazilianCep('1504000'), false)

  assert.deepEqual(applyAddressSuggestion(suggestion), {
    rua: 'Rua Vergueiro',
    bairro: 'Liberdade',
    cidade: 'São Paulo',
    cep: '01504-000',
  })

  assert.equal(
    hasCriticalAddressChanges(suggestion, {
      rua: 'Rua Vergueiro',
      bairro: 'Liberdade',
      cidade: 'São Paulo',
      cep: '01504-000',
    }),
    false
  )

  assert.equal(
    hasCriticalAddressChanges(suggestion, {
      rua: 'Rua Vergueiro',
      bairro: 'Aclimação',
      cidade: 'São Paulo',
      cep: '01504-000',
    }),
    true
  )
}

run()
  .then(() => {
    console.log('address autocomplete tests passed')
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
