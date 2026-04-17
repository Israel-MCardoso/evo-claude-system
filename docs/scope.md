# Scope — Evo SaaS para Restaurantes
**Versão:** 1.0
**Data:** 2026-04-13
**Status:** Aprovado
**Baseado em:** docs/discovery-notes.md + docs/product-prd.md

---

## Princípio de Priorização

> **Entregar o fluxo completo de valor antes de adicionar features.**

O critério central é: **o produto funciona sem esta feature?**
Se sim, ela fica fora do MVP. Complexidade só entra quando o core está validado.

---

## MVP — O que será construído primeiro
**Prazo:** 30 a 45 dias
**Objetivo:** Fluxo completo de pedido funcionando em produção com restaurante piloto real.

O MVP precisa responder uma pergunta: *"Um restaurante consegue receber pedidos organizados e pagamentos via PIX, sem depender de WhatsApp ou iFood?"*

### Módulo 1 — Acesso e Configuração do Restaurante

> **Decisão de escopo:** No MVP, não será implementado um sistema completo de autenticação. O foco é na operação do restaurante, não na gestão de conta. O acesso será simples e direto.

| Feature | Descrição | Critério de Conclusão |
|---------|-----------|----------------------|
| Login simples (email + senha) | Autenticação mínima via Supabase Auth — sem fluxo de cadastro público | Restaurante acessa o painel com credenciais criadas manualmente ou via seed |
| Sessão persistente | Sessão mantida sem necessidade de relogin frequente | Sessão válida por no mínimo 7 dias |
| Configuração do restaurante | Formulário com nome, logo, tipo, modalidades aceitas (entrega/retirada) | Dados salvos e refletidos no cardápio público |
| Geração de slug | URL pública gerada a partir do nome do restaurante | Slug único, acessível em `/:slug`, exibido no painel |

> **Nota:** Cadastro self-service, recuperação de senha e onboarding guiado são features de V1. No MVP, o restaurante piloto pode ser criado diretamente via painel admin ou seed no banco.

### Módulo 2 — Cardápio Digital

| Feature | Descrição | Critério de Conclusão |
|---------|-----------|----------------------|
| Gerenciamento de categorias | Criar, editar, excluir categorias | CRUD funcional no painel admin |
| Gerenciamento de produtos | Criar produto com nome, descrição, preço, foto, categoria | CRUD funcional, upload de imagem via Supabase Storage |
| Página pública do cardápio | Rota `/:slug` acessível sem login | Carrega < 2s, responsiva, sem autenticação |
| Agrupamento por categoria | Produtos exibidos agrupados por categoria | Layout correto em mobile e desktop |

### Módulo 3 — Fluxo de Pedido (Cliente)

| Feature | Descrição | Critério de Conclusão |
|---------|-----------|----------------------|
| Carrinho de compras | Adicionar/remover itens, controle de quantidade, subtotal | Persiste na sessão, subtotal correto |
| Checkout — dados do cliente | Nome, telefone obrigatórios | Validação client-side e server-side |
| Checkout — modalidade | Entrega (com endereço) ou Retirada | Endereço condicional ao tipo escolhido |
| Revisão do pedido | Tela de confirmação antes de finalizar | Exibe itens, total, modalidade, dados |
| Finalização do pedido | Pedido criado no banco com status "aguardando_pagamento" | Sem pedido duplicado por duplo clique |

### Módulo 4 — Pagamento PIX (Mercado Pago)

> **Decisão de escopo:** O pedido é criado no banco **antes** do pagamento, com status `aguardando_pagamento`. O pagamento é gerado em seguida e vinculado ao pedido por ID. Webhook como caminho principal; polling como fallback obrigatório.

| Feature | Descrição | Critério de Conclusão |
|---------|-----------|----------------------|
| Criação do pedido antes do pagamento | Pedido inserido no banco com status `aguardando_pagamento` ao finalizar checkout | Pedido existe antes de qualquer chamada ao gateway |
| Geração de cobrança PIX vinculada | Chamada à API Mercado Pago com referência ao `pedido_id` | QR Code gerado em < 3 segundos; `payment_id` salvo no pedido |
| Exibição do QR Code | QR Code + chave copia-e-cola na tela do cliente | Funciona corretamente no mobile |
| Webhook de confirmação (caminho principal) | Endpoint `/api/webhooks/mercadopago` recebe callback e atualiza status do pedido para `pago` | Status atualiza automaticamente em < 30s após pagamento |
| Polling de fallback (segurança) | Se webhook não chegar em X segundos, o cliente consulta o status do pedido periodicamente | Pedido confirmado mesmo sem webhook — tolerância a falhas |
| Expiração de cobrança | Pedido expira se não pago em 15 minutos | Cobrança cancelada no gateway; pedido marcado como `expirado` |
| Página de aguardando pagamento | Cliente vê countdown, QR Code e instrução copia-e-cola | UX clara; polling ativo enquanto aguarda confirmação |

### Módulo 5 — Painel Operacional do Restaurante

> **Decisão de escopo:** No MVP, o painel usará **polling controlado** (intervalo fixo de 5–10 segundos) para buscar novos pedidos e atualizações de status. WebSocket e Supabase Realtime são reservados para V1, quando a escala justificar a complexidade.

| Feature | Descrição | Critério de Conclusão |
|---------|-----------|----------------------|
| Lista de pedidos via polling | Painel recarrega pedidos automaticamente a cada 5–10 segundos | Novos pedidos aparecem sem ação manual; latência aceitável para operação |
| Card de pedido | Número, horário, itens, total, modalidade, dados do cliente | Legível em tablet (768px+) |
| Atualização de status | Botão para avançar status na sequência definida | Status salvo no banco e refletido no polling seguinte |
| Separação visual por status | Pedidos organizados por coluna ou seção por status | Fácil de operar sem treinamento |

### Módulo 6 — Acompanhamento de Pedido (Cliente)

> **Decisão de escopo:** Rota definida como `/pedido/[id]`. Acesso sem login — identificação por número do pedido + telefone informado no checkout. Atualização via polling simples (a cada 10 segundos).

| Feature | Descrição | Critério de Conclusão |
|---------|-----------|----------------------|
| Página de rastreamento | Rota `/pedido/[id]` — acessível sem login, sem conta | Exibe nome do restaurante, itens, total e status atual |
| Identificação por número + telefone | Acesso validado pelo par `pedido_id` + `telefone` do checkout | Sem token de autenticação; sem necessidade de conta |
| Polling de status | Status consultado a cada 10 segundos via API | Atualização visível sem ação do usuário; sem WebSocket |
| Exibição do status atual | Status em linguagem amigável com indicador visual de progresso | Funciona bem em mobile sem recarregar a página manualmente |

---

### Sequência de status dos pedidos

```
aguardando_pagamento → pago → em_preparo → saiu_para_entrega* → concluido
                                                    ↓
                                         pronto_para_retirada* → concluido

* condicionado à modalidade do pedido
```

---

### O que o MVP NÃO inclui (decisão intencional)

| Item | Motivo |
|------|--------|
| Histórico de pedidos no painel | Não é necessário para validar o fluxo core |
| Resumo financeiro | Pode ser visto manualmente no MVP |
| Notificação sonora | Desejável, mas não bloqueia operação |
| Cancelamento de pedido | Pode ser feito manualmente no início |
| Disponibilidade de item (toggle) | Dono pode excluir ou editar preço como workaround |
| Google Login | Email/senha é suficiente para B2B |
| Billing e cobrança in-app | Cobrança manual ou via link externo no MVP |
| Multi-usuário por restaurante | Um login único por restaurante no MVP |

---

## V1 — Pós-validação do MVP
**Prazo estimado:** 30 a 60 dias após MVP em produção
**Objetivo:** Tornar o produto retentivo, completar gaps operacionais e iniciar monetização automatizada.

### Módulo de Operação

| Feature | Justificativa |
|---------|--------------|
| Disponibilidade de produtos (toggle on/off) | Necessidade real em operações diárias — item esgotado |
| Cancelamento de pedido com motivo | Controle operacional básico |
| Notificação sonora de novo pedido | Reduz pedidos perdidos por falta de atenção no painel |
| Pausa de recebimento de pedidos | Restaurante fecha ou fica sem capacidade temporariamente |

### Módulo de Histórico e Dados

| Feature | Justificativa |
|---------|--------------|
| Histórico de pedidos com filtros | Acesso a pedidos passados — necessidade de suporte ao cliente |
| Resumo financeiro básico (dia/semana/mês) | Primeira camada de visibilidade financeira |
| Exportação básica (CSV) | Para gestão manual do restaurante |

### Módulo de Cardápio

| Feature | Justificativa |
|---------|--------------|
| Ordenação de categorias e produtos | Controle editorial do cardápio |
| Banner do restaurante | Identidade visual do cardápio para o cliente |
| Produto em destaque | Aumenta conversão dos itens mais rentáveis |

### Módulo de Autenticação e Gestão

| Feature | Justificativa |
|---------|--------------|
| Cadastro self-service | Restaurante cria conta sem intervenção manual do time |
| Onboarding guiado | Fluxo passo a passo para configurar cardápio na primeira entrada |
| Recuperação de senha | Necessidade básica de gestão de conta |
| Google Login | Reduz fricção de onboarding |
| Múltiplos usuários por restaurante (básico) | Dono + operador com papéis distintos |
| Supabase Realtime no painel | Substituir polling por realtime após validação da escala |

### Módulo de Monetização

| Feature | Justificativa |
|---------|--------------|
| Planos e billing in-app | Autoatendimento de assinatura — reduz operação manual |
| Portal do cliente (Stripe ou Mercado Pago billing) | Histórico de faturas, gestão do plano |
| Trial de 14 dias | Facilita aquisição sem atrito comercial |

---

## Pós-V1 — Backlog Estratégico
**Objetivo:** Crescimento, diferenciação e expansão do ticket médio.

### Comunicação e Engajamento

| Feature | Justificativa |
|---------|--------------|
| Integração WhatsApp Business | Notificações automáticas de status para o cliente |
| Avaliações de pedidos | Social proof e dados de qualidade |
| Cupons e promoções | Aquisição e fidelização de clientes do restaurante |

### Expansão Operacional

| Feature | Justificativa |
|---------|--------------|
| Impressora térmica (comanda) | Demanda recorrente de operações maiores |
| PWA / instalação no celular | Melhora experiência do painel em tablet |
| Múltiplas filiais | Expansão para redes e franquias |
| Controle de estoque (básico) | Correlação com pedidos — reduz desperdício |

### Inteligência e Relatórios

| Feature | Justificativa |
|---------|--------------|
| Relatórios avançados (ticket médio, produtos mais vendidos) | Dados para decisão do restaurante |
| Dashboard de performance | Retenção via geração de valor recorrente |
| Análise de pico de horário | Planejamento operacional |

### Integrações

| Feature | Justificativa |
|---------|--------------|
| Integração iFood (recebimento de pedidos) | Canal de aquisição relevante para o restaurante |
| Nota fiscal (NFC-e) | Exigência legal para crescimento |
| App mobile nativo (iOS/Android) | Experiência premium para operações maiores |

---

## Fora de Escopo (definitivo)

Os itens abaixo não serão construídos em nenhuma das fases sem revisão formal de escopo e justificativa de negócio.

| Item | Motivo |
|------|--------|
| ERP completo (financeiro, contábil, fiscal) | Fora do posicionamento do produto |
| Marketplace de restaurantes | Competiria com iFood — não é o modelo |
| Gestão de fornecedores | Complexidade desproporcionalmente alta ao valor |
| Módulo de RH | Fora do core de operação de pedidos |
| Sistema de reservas de mesa | Produto diferente — foco em delivery/retirada |
| Chat interno restaurante-cozinha | Ferramentas existentes (WhatsApp) são suficientes |

---

## Mapa Visual de Fases

```
MVP (0-45 dias)
├── Acesso simples (login manual, sem cadastro público)
├── Cardápio Digital (/:slug)
├── Fluxo de Pedido (guest)
├── Pagamento PIX — Mercado Pago (pedido → cobrança → webhook + polling fallback)
├── Painel Operacional (polling 5-10s)
└── Acompanhamento de Pedido (/pedido/[id] — polling 10s, número + telefone)

V1 (45-105 dias)
├── Operação completa (toggle, cancelamento, pausa)
├── Histórico + resumo financeiro
├── Cardápio avançado (ordenação, destaque, banner)
├── Multi-usuário básico
└── Billing in-app + planos

Pós-V1 (105+ dias)
├── WhatsApp + avaliações + cupons
├── Impressora + PWA + multi-filial
├── Relatórios avançados
└── iFood + NF-e + App nativo
```

---

## Critério de Avanço entre Fases

| De | Para | Condição |
|----|------|----------|
| MVP → V1 | V1 | Pelo menos 3 restaurantes usando em produção + fluxo de pedido com < 5% de erro por 2 semanas |
| V1 → Pós-V1 | Pós-V1 | 20+ restaurantes ativos + MRR > R$1.500 + churn < 5% ao mês |

---

*Documento gerado em 2026-04-13. Revisão obrigatória ao início de cada sprint.*
