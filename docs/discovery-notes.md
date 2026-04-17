# Discovery Notes
**Data:** 2026-04-13
**Produto:** SaaS para Restaurantes
**Status:** Completo

---

## BLOCO 1 — VISÃO

### O que é o produto?
SaaS para restaurantes que centraliza pedidos, cardápio digital, pagamentos e gestão básica em uma única plataforma simples e integrada.

### Problema que resolve
Restaurantes utilizam várias ferramentas separadas (WhatsApp, iFood, sistemas internos, papel), gerando:
- Desorganização
- Erros nos pedidos
- Falta de controle financeiro
- Perda de dinheiro

### Quem sente o problema
- Donos de restaurantes
- Gerentes
- Equipes operacionais (atendimento/cozinha)

### Resultado esperado
**Para o restaurante:**
- Controle total da operação em um único sistema
- Pedidos organizados e automatizados
- Redução no tempo de atendimento
- Menos erros
- Melhora no controle financeiro
- Aumento de lucro

**Para o cliente final:**
- Experiência mais rápida
- Pedidos mais claros
- Menos fricção na compra

### Referências
**Funcionais:**
- iFood (fluxo de pedidos)
- BeeFood (modelo de sistema próprio)
- Cardápios digitais modernos

**Visuais:**
- Stripe (clareza e organização)
- Apple (simplicidade e experiência)
- Sites modernos com UX limpa e foco em conversão

**Diferencial:** não copiar, mas criar solução mais simples, integrada e eficiente.

---

## BLOCO 2 — FUNCIONALIDADES

### Top 3 funcionalidades (por prioridade)

**1. Sistema de Pedidos Online (core do produto)**
- Cardápio digital
- Carrinho
- Finalização de pedido
- Escolha entre entrega ou retirada

**2. Gestão de Pedidos em Tempo Real**
- Painel para o restaurante acompanhar pedidos
- Atualização de status: recebido → em preparo → saiu para entrega → concluído
- Organização da fila de pedidos

**3. Pagamento Integrado (PIX)**
- Geração de pagamento via PIX
- Confirmação de pagamento
- Vínculo do pagamento com o pedido

### O que o produto NÃO vai fazer (MVP)
- Não integra com iFood
- Sem controle financeiro avançado (DRE, relatórios complexos)
- Sem sistema de estoque completo
- Sem múltiplas filiais ou gestão de rede
- Sem app mobile nativo (web responsivo apenas)

### Fluxo crítico — Fluxo de Pedido

```
1. Cliente acessa o cardápio
2. Seleciona produtos
3. Adiciona ao carrinho
4. Informa dados (nome, telefone, endereço se entrega)
5. Escolhe entrega ou retirada
6. Escolhe forma de pagamento (PIX)
7. Finaliza pedido
8. Restaurante recebe o pedido em tempo real
9. Restaurante atualiza status
10. Cliente acompanha o pedido
```

**Fluxos secundários importantes:**
- Configuração inicial do restaurante (cadastro + cardápio)
- Atualização de status do pedido pelo restaurante

---

## BLOCO 3 — MONETIZAÇÃO

### Modelo de receita
- **Modelo principal:** Assinatura mensal (SaaS B2B)
- **Futuro:** Comissão por pedido + taxas em serviços adicionais

### Quem paga
- Dono do restaurante (B2B com impacto B2B2C)
- Foco inicial: restaurantes pequenos e médios sem sistema próprio

### Estrutura de preços

**MVP (plano único para facilitar entrada):**
- R$49 a R$99/mês

**Evolução futura (planos):**
| Plano | Preço | Diferencial |
|-------|-------|-------------|
| Básico | R$49/mês | volume menor, funcionalidades core |
| Pro | R$99/mês | mais volume, funcionalidades extras |
| Premium | R$149/mês | volume alto, suporte diferenciado |

### Projeção inicial
- Meta ano 1: 50 a 100 restaurantes ativos
- Ticket médio: ~R$79/mês
- Receita estimada: R$4.000 a R$8.000/mês
- Foco: validação + aquisição + retenção (não lucro imediato)

---

## BLOCO 4 — TÉCNICO

### Stack definida

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| Frontend | Next.js + React + TypeScript | moderno, escalável, ótimo para admin + cardápio |
| Backend | Next.js API Routes (MVP) → NestJS (escala) | sinergia com frontend, TypeScript |
| Banco | PostgreSQL via Supabase | banco + auth + storage + realtime integrados |
| Deploy | Vercel (frontend) | simples, rápido, gratuito no início |

### Dispositivos
- Celular: cliente faz pedidos
- Desktop/notebook: administração do restaurante
- Tablet: cozinha/balcão via browser

### PWA
- Não obrigatório no MVP
- Evolução futura, desde que web seja bem responsivo

### Integrações externas

| Integração | MVP | Futuro |
|-----------|-----|--------|
| PIX Gateway | Asaas ou Mercado Pago (a definir) | — |
| Auth | Email/senha (Supabase Auth) | Google Login |
| Tempo real | Supabase Realtime ou polling | WebSocket dedicado |
| WhatsApp | Não | Sim |
| Impressora térmica | Não | Sim |

**Critério para gateway PIX:** melhor equilíbrio entre simplicidade de integração e operação comercial.

### Greenfield
Projeto começa do zero. Sem legado.

---

## BLOCO 5 — CONTEXTO

### Perfil do restaurante piloto
- **Tipos:** delivery, dark kitchens, lanchonetes
- **Motivo:** operação direta, alto volume, maior necessidade de organização
- **Volume:** 20 a 100 pedidos/dia
- **Validação:** restaurantes do network local + parceiros assim que MVP estiver pronto

### Prazo
- **MVP funcional:** 30 a 45 dias
- Sem data fixa de lançamento público
- Foco: validar rapidamente → colocar em uso real → iterar

### Time
- 2 pessoas (fundadores)
  - 1 focado em produto/negócio
  - 1 focado em desenvolvimento
- Ambos utilizam IA como suporte para acelerar desenvolvimento

### Orçamento de infra
- R$200 a R$500/mês no MVP
- Prioridade: Supabase + Vercel + gateway acessível

### LGPD
- Sem implementação completa no MVP
- Boas práticas básicas desde o início:
  - Proteção de dados
  - Sem exposição de informações sensíveis
  - Estrutura preparada para evolução

### Nota fiscal
- Fora do escopo do MVP

### Restrições gerais
- Sistema simples (baixa curva de aprendizado)
- Sem instalação (web puro)
- Funciona bem em celular e tablet
- Foco em performance e estabilidade mesmo com infra simples
