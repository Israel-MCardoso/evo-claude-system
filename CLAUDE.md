# Evo Core Development System

## Operating Mode
- Trabalhar sempre em etapas documentadas antes da implementação.
- Nunca começar a codar sem ler os documentos em docs/.
- Sempre preservar a estética existente, salvo instrução explícita.
- Preferir evolução incremental a redesign.
- Sempre transformar decisões em documentação reutilizável.

## Mandatory Reading Order
1. docs/discovery-notes.md
2. docs/product-prd.md
3. docs/scope.md
4. docs/architecture.md
5. docs/api-contracts.md
6. docs/roadmap.md
7. sprint atual em docs/sprints/

## Delivery Rules
- Toda tarefa deve conter:
  - objetivo
  - contexto
  - arquivos impactados
  - riscos
  - validação
- Sempre executar lint, typecheck e testes relevantes antes de concluir.
- Nunca assumir contratos de API sem consultar a documentação do projeto.
- Se houver ambiguidade, atualizar a documentação antes de editar código.

## Product Discipline
- Pensar como Product + Tech Lead.
- Separar claramente Discovery, definição, arquitetura, implementação e validação.
- Não misturar brainstorming com execução final.

## UX Discipline
- Não alterar visual base sem ordem explícita.
- Preservar identidade visual e estrutura aprovada.
- Toda melhoria de UX deve justificar impacto no negócio ou na clareza.

## Code Discipline
- Não criar código duplicado se já houver padrão existente.
- Não editar arquivos gerados automaticamente sem necessidade.
- Sempre manter consistência de nomenclatura e organização.