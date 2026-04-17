"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const address_autocomplete_1 = require("./address-autocomplete");
async function run() {
    const suggestion = {
        id: '1',
        label: 'Rua Vergueiro, Liberdade, São Paulo, 01504-000',
        rua: 'Rua Vergueiro',
        bairro: 'Liberdade',
        cidade: 'São Paulo',
        cep: '01504-000',
    };
    strict_1.default.equal((0, address_autocomplete_1.shouldFetchAddressSuggestions)('ab'), false);
    strict_1.default.equal((0, address_autocomplete_1.shouldFetchAddressSuggestions)('abc'), true);
    strict_1.default.equal((0, address_autocomplete_1.isValidBrazilianCep)(''), true);
    strict_1.default.equal((0, address_autocomplete_1.isValidBrazilianCep)('01504-000'), true);
    strict_1.default.equal((0, address_autocomplete_1.isValidBrazilianCep)('1504000'), false);
    strict_1.default.deepEqual((0, address_autocomplete_1.applyAddressSuggestion)(suggestion), {
        rua: 'Rua Vergueiro',
        bairro: 'Liberdade',
        cidade: 'São Paulo',
        cep: '01504-000',
    });
    strict_1.default.equal((0, address_autocomplete_1.hasCriticalAddressChanges)(suggestion, {
        rua: 'Rua Vergueiro',
        bairro: 'Liberdade',
        cidade: 'São Paulo',
        cep: '01504-000',
    }), false);
    strict_1.default.equal((0, address_autocomplete_1.hasCriticalAddressChanges)(suggestion, {
        rua: 'Rua Vergueiro',
        bairro: 'Aclimação',
        cidade: 'São Paulo',
        cep: '01504-000',
    }), true);
}
run()
    .then(() => {
    console.log('address autocomplete tests passed');
})
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
