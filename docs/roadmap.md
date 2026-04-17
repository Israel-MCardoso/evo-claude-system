# Roadmap — Evo MVP
**Data:** 2026-04-13
**Horizonte:** MVP em 30–45 dias
**Time:** 2 pessoas com suporte de IA

---

## Épicos do MVP

| # | Épico | Módulo | Sprint |
|---|-------|--------|--------|
| E1 | Fundação do projeto | Setup + DB + Auth | 01 |
| E2 | Cardápio digital | Admin + Público | 01 |
| E3 | Fluxo de pedido | Carrinho + Checkout | 02 |
| E4 | Pagamento PIX | Mercado Pago + Webhook | 02 |
| E5 | Painel operacional | Dashboard + Status | 03 |
| E6 | Tracking do cliente | /pedido/[id] + Polling | 03 |
| E7 | Estabilização | Erros + Estados + Deploy | 03 |

---

## Sprint 01 — Fundação + Cardápio
**Dias:** 1–10
**Entregável:** Restaurante configurado com cardápio público no ar

| Tarefa | Épico | Depende de |
|--------|-------|-----------|
| Setup Next.js + Supabase + Vercel | E1 | — |
| Migrations: todas as tabelas + RLS + seed | E1 | Setup |
| Login /login + middleware auth guard | E1 | Migrations |
| /painel/configuracoes — dados do restaurante | E2 | Login |
| API: GET/PATCH /api/admin/restaurante | E2 | Migrations |
| /painel/cardapio — CRUD categorias | E2 | Login |
| /painel/cardapio — CRUD produtos + upload foto | E2 | CRUD categorias |
| API: cardápio admin (categorias + produtos) | E2 | Migrations |
| /:slug — cardápio público + ISR | E2 | API cardápio |
| revalidatePath em todas as mutações | E2 | /:slug |

**Critério de pronto do Sprint 01:**
- [ ] Restaurante faz login e acessa o painel
- [ ] Cria categoria e produto com foto
- [ ] Cardápio aparece em `/:slug` sem login
- [ ] Editar produto → cardápio público atualiza imediatamente

---

## Sprint 02 — Pedido + Pagamento
**Dias:** 11–22
**Entregável:** Cliente faz pedido completo e paga via PIX

| Tarefa | Épico | Depende de |
|--------|-------|-----------|
| Carrinho (estado em memória/sessionStorage) | E3 | /:slug |
| Modal de produto + adicionar ao carrinho | E3 | Carrinho |
| Drawer do carrinho com total | E3 | Carrinho |
| /checkout — tela única (dados + modalidade) | E3 | Drawer |
| Validações do checkout client-side + server-side | E3 | /checkout |
| API: POST /api/pedidos (cria pedido + PIX) | E4 | Migrations + MP |
| Integração Mercado Pago (gerar PIX) | E4 | Conta MP ativa |
| /pedido/[id]/pagar — tela QR Code + countdown | E4 | POST pedidos |
| API: POST /api/webhooks/mercadopago (idempotente) | E4 | Tabela pagamentos |
| Polling fallback no cliente (10s) | E4 | GET status |
| Expiração: marcar pedido como `expired` (15 min) | E4 | POST pedidos |

**Critério de pronto do Sprint 02:**
- [ ] Cliente navega pelo cardápio, adiciona itens, faz checkout
- [ ] PIX gerado em < 3s após confirmar pedido
- [ ] Pagamento aprovado → pedido muda para `paid` automaticamente
- [ ] PIX não pago em 15 min → pedido muda para `expired`
- [ ] Webhook idempotente: evento duplicado não gera atualização dupla

---

## Sprint 03 — Painel + Tracking + Estabilização
**Dias:** 23–35
**Entregável:** MVP completo — restaurante opera e cliente acompanha pedido

| Tarefa | Épico | Depende de |
|--------|-------|-----------|
| /painel — lista de pedidos + polling 5s | E5 | POST pedidos |
| Card de pedido com detalhes e ações | E5 | /painel |
| PATCH /api/admin/pedidos/[id]/status | E5 | Migrations |
| Transições de status por modalidade | E5 | PATCH status |
| /pedido/[id] — tracking + polling 10s | E6 | GET status |
| Validação telefone normalizado no tracking | E6 | GET status |
| Barra de progresso de status (UX) | E6 | /pedido/[id] |
| Estados vazios em todas as telas | E7 | Todas as telas |
| Tratamento de erros e mensagens amigáveis | E7 | Todas as telas |
| Onboarding 4 passos (banner primeira sessão) | E7 | /painel |
| Testes com restaurante piloto real | E7 | Fluxo completo |
| Deploy produção + domínio customizado | E7 | Testes |

**Critério de pronto do Sprint 03 (= critério do MVP):**
- [ ] Fluxo completo funciona de ponta a ponta em produção
- [ ] Painel recebe novos pedidos sem ação manual (polling 5s)
- [ ] Restaurante avança status com 1–2 toques
- [ ] Cliente acompanha pedido em /pedido/[id] sem login
- [ ] Estados vazios e erros tratados em todas as telas críticas
- [ ] Restaurante piloto usa o sistema por 1 dia sem relatar bugs críticos

---

## Dependências externas (resolver antes de Sprint 02)

| Dependência | Ação | Responsável |
|-------------|------|-------------|
| Conta Mercado Pago com PIX habilitado | Criar conta + habilitar PIX Dinâmico | Time |
| URL de webhook configurada no MP | Configurar após deploy no Vercel | Dev |
| Supabase projeto criado (free tier) | Criar projeto + guardar keys | Dev |
| Vercel projeto criado + env vars | Configurar antes do Sprint 01 | Dev |

---

## Pós-MVP — V1 (referência)

Não entra no roadmap atual. Priorizar apenas após critérios de avanço do MVP:
> 3 restaurantes em produção + < 5% de erro por 2 semanas

| Feature | Justificativa |
|---------|--------------|
| Cadastro self-service + onboarding guiado | Escalar aquisição sem operação manual |
| Supabase Realtime no painel | Latência zero para operações de alto volume |
| Toggle de disponibilidade de produto | Necessidade real no dia a dia |
| Cancelamento de pedido com motivo | Controle operacional básico |
| Resumo financeiro básico (dia/semana) | Valor percebido → retenção |
| Billing in-app + planos | Monetização automatizada |
