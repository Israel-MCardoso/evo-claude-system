# UX Flows — Evo SaaS para Restaurantes
**Versão:** 1.0
**Data:** 2026-04-13
**Status:** Aprovado para MVP
**Responsável:** Frontend Architect
**Baseado em:** docs/product-prd.md + docs/scope.md

---

## 1. MAPA DE TELAS

### Superfície Pública (cliente final — sem login)

```
/:slug                          → Cardápio digital do restaurante
/:slug → [carrinho flutuante]   → Carrinho lateral/modal (sem rota própria)
/pedido/[id]                    → Tela de acompanhamento do pedido
/pedido/[id]/pagar              → Tela de pagamento PIX (QR Code)
```

### Superfície Admin (restaurante — autenticado)

```
/login                          → Login do operador
/painel                         → Painel de pedidos (dashboard principal)
/painel/cardapio                → Gestão de categorias e produtos
/painel/configuracoes           → Dados do restaurante, slug, logo, modalidades
```

---

### Diagrama completo de telas

```
┌─────────────────────────────────────────────────────────┐
│                   SUPERFÍCIE PÚBLICA                    │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  /:slug — CARDÁPIO                               │   │
│  │                                                  │   │
│  │  Header: logo + nome do restaurante              │   │
│  │  Nav sticky: categorias (scroll horizontal)      │   │
│  │  Seções: categoria > lista de produtos           │   │
│  │  Cada produto: foto, nome, descrição, preço      │   │
│  │  Botão flutuante: carrinho (ícone + contador)    │   │
│  └───────────────────────┬──────────────────────────┘   │
│                          │ toca produto                  │
│  ┌───────────────────────▼──────────────────────────┐   │
│  │  MODAL — DETALHE DO PRODUTO                      │   │
│  │  foto grande, nome, descrição, preço             │   │
│  │  controle de quantidade                          │   │
│  │  botão "Adicionar ao carrinho"                   │   │
│  └───────────────────────┬──────────────────────────┘   │
│                          │ abre carrinho                 │
│  ┌───────────────────────▼──────────────────────────┐   │
│  │  DRAWER — CARRINHO                               │   │
│  │  lista de itens + quantidades + subtotais        │   │
│  │  total geral                                     │   │
│  │  botão "Fazer pedido"                            │   │
│  └───────────────────────┬──────────────────────────┘   │
│                          │                               │
│  ┌───────────────────────▼──────────────────────────┐   │
│  │  CHECKOUT — PASSO 1: DADOS                       │   │
│  │  nome, telefone                                  │   │
│  │  entrega ou retirada (toggle)                    │   │
│  │  endereço (condicional — só se entrega)          │   │
│  └───────────────────────┬──────────────────────────┘   │
│                          │                               │
│  ┌───────────────────────▼──────────────────────────┐   │
│  │  CHECKOUT — PASSO 2: REVISÃO                     │   │
│  │  resumo do pedido (itens, total, modalidade)     │   │
│  │  dados do cliente                                │   │
│  │  botão "Confirmar e pagar"                       │   │
│  └───────────────────────┬──────────────────────────┘   │
│                          │                               │
│  ┌───────────────────────▼──────────────────────────┐   │
│  │  /pedido/[id]/pagar — PAGAMENTO PIX              │   │
│  │  QR Code centralizado                            │   │
│  │  chave copia-e-cola                              │   │
│  │  countdown 15 minutos                            │   │
│  │  instrução clara: "Pague e aguarde"              │   │
│  └───────────────────────┬──────────────────────────┘   │
│                          │ pagamento confirmado          │
│  ┌───────────────────────▼──────────────────────────┐   │
│  │  /pedido/[id] — ACOMPANHAMENTO                   │   │
│  │  nome do restaurante                             │   │
│  │  barra de progresso de status                    │   │
│  │  status em linguagem amigável                    │   │
│  │  resumo do pedido (itens, total)                 │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    SUPERFÍCIE ADMIN                     │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  /login                                          │   │
│  │  email + senha                                   │   │
│  │  botão "Entrar"                                  │   │
│  └───────────────────────┬──────────────────────────┘   │
│                          │ autenticado                   │
│  ┌───────────────────────▼──────────────────────────┐   │
│  │  /painel — PEDIDOS (dashboard)                   │   │
│  │  colunas por status (ou lista filtrada)          │   │
│  │  card de pedido: número, itens, cliente          │   │
│  │  botão de avançar status                         │   │
│  │  polling automático a cada 5s                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  /painel/cardapio                                │   │
│  │  lista de categorias                             │   │
│  │  produtos por categoria                          │   │
│  │  ações: criar, editar, excluir                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  /painel/configuracoes                           │   │
│  │  nome, logo, tipo, modalidades                   │   │
│  │  link público do cardápio                        │   │
│  │  copiar link / visualizar cardápio               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 2. FLUXOS PRINCIPAIS

### FLUXO 1 — Pedido do Cliente (fluxo crítico)

**Persona:** Julia (cliente final, celular)
**Objetivo:** fazer pedido e pagar via PIX em menos de 3 minutos

> **Decisão de UX:** checkout em tela única. Dados + modalidade + resumo na mesma tela. Sem tela de revisão separada — o resumo está visível enquanto o cliente preenche os dados.

```
TELA: Cardápio /:slug
─────────────────────────────────────────────────
  ① Cliente acessa o link (WhatsApp, redes sociais)
  ② Vê logo, nome do restaurante e produtos imediatamente
  ③ Navega pelas categorias (nav sticky horizontal)
  ④ Toca em um produto → modal com foto, nome, preço
  ⑤ Ajusta quantidade → "Adicionar"
  ⑥ Botão flutuante do carrinho aparece com contador e total

    [repete ④→⑤ para mais itens]

  ⑦ Toca no carrinho flutuante → abre drawer com itens + total
  ⑧ Toca "Fazer pedido"

TELA: Checkout (tela única)
─────────────────────────────────────────────────
  ⑨  Resumo dos itens visível no topo (colapsável)
  ⑩  Nome e telefone
  ⑪  Toggle: [Entrega] ou [Retirada]
       → Se Entrega: campos de endereço aparecem inline
       → Se Retirada: sem campos extras
  ⑫  Total visível o tempo todo
  ⑬  Botão "Pagar com PIX — R$XX,XX"
       → Sistema cria pedido + gera cobrança PIX
       → Redireciona para pagamento

TELA: Pagamento PIX /pedido/[id]/pagar
─────────────────────────────────────────────────
  ⑭  QR Code centralizado + valor + nome do restaurante
  ⑮  Chave copia-e-cola com botão "Copiar"
  ⑯  Instrução: "1. Abra seu banco  2. Pague  3. Aguarde"
  ⑰  Countdown: "Expira em 14:XX"
  ⑱  Polling detecta pagamento → transição automática

TELA: Acompanhamento /pedido/[id]
─────────────────────────────────────────────────
  ⑲  "Pagamento confirmado ✓" em destaque
  ⑳  Barra de progresso: Pago → Em preparo → A caminho → Entregue
  ㉑  Status atualiza automaticamente (polling 10s)
  ㉒  Quando concluído: mensagem de encerramento
```

**Tempo alvo:** < 3 minutos do início ao pagamento confirmado
**Telas no fluxo:** 4 (cardápio → checkout → pagamento → tracking)

---

### FLUXO 2 — Gestão de Pedidos pelo Restaurante

**Persona:** Ana (operadora, tablet na cozinha)
**Objetivo:** ver novos pedidos e atualizar status sem esforço

```
TELA: /painel
─────────────────────────────────────────────────
  ① Ana está logada, painel aberto no tablet
  ② Novo pedido chega (polling 5s) → card aparece na coluna "Novos"
  ③ Card exibe: número do pedido, itens, total, modalidade, nome do cliente
  ④ Ana toca no card → expande para ver detalhes completos
  ⑤ Toca "Iniciar preparo" → status muda para "Em preparo"
      → Card move para coluna "Em preparo"

    [tempo de preparo]

  ⑥ Pedido pronto:
      → Se ENTREGA: toca "Saiu para entrega" → card move para "A caminho"
      → Se RETIRADA: toca "Pronto para retirada" → card move para "Pronto"

  ⑦ Entregador confirma entrega / cliente retira:
      → Toca "Concluído" → card some da tela operacional
```

**Princípio de UX:** cada pedido exige no máximo 2 toques para avançar do início ao fim.

---

### FLUXO 3 — Configuração do Restaurante (Admin)

**Persona:** Carlos (dono do restaurante, primeira vez)
**Objetivo:** configurar o restaurante e o cardápio antes de receber o primeiro pedido

```
TELA: /login
─────────────────────────────────────────────────
  ① Carlos recebe credenciais (geradas manualmente no MVP)
  ② Entra com email + senha
  ③ Redireciona para /painel

TELA: /painel (primeira vez — cardápio vazio)
─────────────────────────────────────────────────
  ④ Vê estado vazio com call-to-action:
     "Seu cardápio está vazio. Configure antes de compartilhar o link."
  ⑤ Botão "Configurar cardápio" → vai para /painel/cardapio

TELA: /painel/cardapio
─────────────────────────────────────────────────
  ⑥ Toca "Nova categoria" → nomeia (ex: "Lanches")
  ⑦ Dentro da categoria, toca "Novo produto"
  ⑧ Preenche: nome, descrição, preço, foto (upload)
  ⑨ Salva → produto aparece na lista
     → Cardápio público atualizado via revalidatePath

    [repete ⑥→⑨ para todas as categorias e produtos]

TELA: /painel/configuracoes
─────────────────────────────────────────────────
  ⑩ Preenche/confirma: nome, logo, modalidades aceitas
  ⑪ Vê o link público gerado: "seu-restaurante.evo.app/[slug]"
  ⑫ Toca "Copiar link" → compartilha no WhatsApp/Instagram
  ⑬ Toca "Visualizar cardápio" → abre em nova aba para confirmar
```

**Tempo alvo:** configuração completa em menos de 15 minutos.

---

## 3. ESTADOS VAZIOS

Estados vazios são oportunidades de guiar o usuário — nunca telas em branco sem direção.

### Painel de pedidos — sem pedidos ativos

```
┌─────────────────────────────────────────┐
│                                         │
│         🛎️                              │
│                                         │
│   Nenhum pedido ainda                   │
│                                         │
│   Seu cardápio está no ar e pronto      │
│   para receber pedidos.                 │
│                                         │
│   [Compartilhar link do cardápio]       │
│                                         │
└─────────────────────────────────────────┘
```

> CTA direto: copiar e compartilhar o link. Transforma estado vazio em ação de crescimento.

---

### Cardápio público — restaurante sem produtos

```
┌─────────────────────────────────────────┐
│                                         │
│    [logo do restaurante]                │
│    Nome do Restaurante                  │
│                                         │
│    😕                                   │
│                                         │
│    Cardápio em atualização              │
│    Em breve nossos produtos             │
│    estarão disponíveis.                 │
│                                         │
└─────────────────────────────────────────┘
```

> Não expõe erro técnico. Passa percepção de atualização proposital.

---

### Gestão de cardápio — sem categorias

```
┌─────────────────────────────────────────┐
│                                         │
│         🍽️                              │
│                                         │
│   Seu cardápio está vazio               │
│                                         │
│   Comece criando uma categoria          │
│   (ex: Lanches, Bebidas, Sobremesas)    │
│                                         │
│   [+ Criar primeira categoria]          │
│                                         │
└─────────────────────────────────────────┘
```

---

### Categoria sem produtos

```
┌─────────────────────────────────────────┐
│  📂 Lanches                             │
│                                         │
│   Nenhum produto nesta categoria.       │
│   [+ Adicionar produto]                 │
│                                         │
└─────────────────────────────────────────┘
```

---

## 4. ESTADOS DE ERRO

Princípio: **erros devem explicar o que houve e dizer o que fazer a seguir.** Nunca mostrar stack trace, código HTTP ou mensagem técnica para o usuário final.

### 4.1 Erros no fluxo do cliente

| Situação | Mensagem exibida | Ação oferecida |
|----------|-----------------|----------------|
| Carrinho vazio ao avançar checkout | "Seu carrinho está vazio. Adicione pelo menos um item." | Fechar drawer, voltar ao cardápio |
| Campo obrigatório não preenchido | "Preencha [campo] para continuar." | Foco no campo com erro (highlight vermelho) |
| Erro ao criar pedido (API falha) | "Não foi possível fazer seu pedido. Tente novamente." | Botão "Tentar novamente" (mesmos dados) |
| QR Code PIX não gerado (MP falha) | "Não conseguimos gerar o PIX. Aguarde 10 segundos e tente novamente." | Botão "Gerar novo PIX" |
| PIX expirado (15 minutos) | "O tempo para pagamento expirou. Faça um novo pedido." | Botão "Voltar ao cardápio" |
| Restaurante não encontrado (slug inválido) | "Restaurante não encontrado. Verifique o link." | Sem CTA — página limpa |
| Pedido não encontrado no tracking | "Pedido não encontrado. Verifique o número e o telefone." | Campos para tentar novamente |

### 4.2 Erros no painel admin

| Situação | Mensagem exibida | Ação oferecida |
|----------|-----------------|----------------|
| Falha ao atualizar status | "Erro ao atualizar. Tente novamente." | Toast com botão "Tentar novamente" |
| Falha ao salvar produto | "Não foi possível salvar o produto. Verifique os campos." | Highlight nos campos com problema |
| Upload de imagem muito grande (>2MB) | "Imagem muito grande. Máximo: 2MB." | Campo de upload com instrução |
| Upload de formato inválido | "Formato inválido. Use JPG ou PNG." | Idem |
| Sessão expirada | "Sua sessão expirou. Faça login novamente." | Redirect automático para /login |
| Polling com erro de conexão | Indicador discreto: "⚠ Conexão instável" | Retry automático; sem bloquear tela |

### 4.3 Princípio de tratamento de erros

```
ERRO OCORRE
    │
    ├─► Logar no console (developer)
    ├─► Exibir mensagem amigável (usuário)
    ├─► Oferecer ação recuperável (sempre que possível)
    └─► Nunca bloquear a tela inteira para erros recuperáveis
```

---

## 5. ESTADOS DE CARREGAMENTO

| Contexto | Comportamento |
|----------|--------------|
| Cardápio carregando (SSR/ISR) | Skeleton loader nos cards de produto |
| Modal de produto abrindo | Fade-in rápido (< 200ms) |
| Adicionando item ao carrinho | Micro-animação no ícone do carrinho (+1 com bounce) |
| Finalizando pedido (POST) | Botão "Confirmar" → estado de loading com spinner; desabilita para evitar duplo clique |
| Gerando PIX (chamada MP) | Spinner centralizado com texto "Gerando seu PIX..." |
| Polling de status (cliente) | Indicador discreto de atualização (sem bloquear conteúdo) |
| Polling do painel (admin) | Indicador de última atualização: "Atualizado há X segundos" |
| Salvando produto no admin | Botão "Salvar" → loading; feedback de sucesso em toast |

---

## 6. ONBOARDING DO RESTAURANTE

Onboarding mínimo — 4 passos essenciais para chegar ao link ativo. Sem tour, sem wizard, sem passos opcionais.

### Sequência da primeira vez (4 passos)

```
PASSO 1 — Nome do restaurante
  Campo único: "Qual o nome do seu restaurante?"
  → Gera slug automaticamente (editável)
        ↓
PASSO 2 — Primeiro produto
  Formulário direto: nome, preço, categoria (texto livre)
  Foto opcional — não bloqueia o avanço
        ↓
PASSO 3 — Tipo de entrega
  Toggle simples: [Entrega] [Retirada] [Ambos]
        ↓
PASSO 4 — Link pronto
  "Seu cardápio está no ar:"
  [evo.app/seu-restaurante]  [Copiar link]
  → Fim. Pode começar a receber pedidos.
```

**Regra:** nenhum passo é bloqueado por validação não essencial. O restaurante pode completar os 4 passos em menos de 3 minutos e refinar o cardápio depois.

### Banner de boas-vindas (primeira sessão — pós onboarding)

```
┌──────────────────────────────────────────────────────────┐
│  🎉 Seu cardápio está no ar!                             │
│                                                          │
│  evo.app/seu-restaurante        [Copiar link]            │
│                                                          │
│  Compartilhe o link e aguarde seu primeiro pedido.       │
└──────────────────────────────────────────────────────────┘
```

> Banner some assim que o primeiro pedido for recebido.

---

## 7. PONTOS DE ATRITO IDENTIFICADOS

Pontos onde o usuário pode desistir ou ficar confuso — e como mitigar no MVP.

### 7.1 Fluxo do cliente

| Ponto de atrito | Risco | Mitigação |
|----------------|-------|-----------|
| Preenchimento do endereço (entrega) | Alto — formulário longo em mobile | Manter apenas campos essenciais: rua, número, bairro, complemento opcional |
| Geração do QR Code (latência MP) | Médio — cliente espera sem feedback | Spinner imediato + texto "Gerando seu PIX..." durante a chamada |
| Processo de pagar via PIX | Médio — usuário não sabe o que fazer | Instrução passo a passo: "1. Abra seu banco 2. Escaneie o QR Code 3. Confirme o pagamento" |
| Aguardar confirmação do PIX | Médio — incerteza sobre se foi registrado | Mensagem ativa: "Aguardando seu pagamento... isso leva alguns segundos" + spinner |
| Link do tracking não salvo | Baixo — cliente fecha a aba | Exibir claramente na tela de acompanhamento: "Salve este link para acompanhar" |

### 7.2 Painel do restaurante

| Ponto de atrito | Risco | Mitigação |
|----------------|-------|-----------|
| Upload de foto de produto | Médio — arquivo grande ou formato errado | Validação imediata + compressão no client antes do upload (se possível) |
| Atualização de status sem confirmação | Baixo — toque acidental | Botão de status com label claro; sem confirmação modal (fluxo rápido é prioridade) |
| Painel sem indicação visual de novos pedidos | Alto — pedido entra sem o operador perceber | Destaque visual no card novo: badge "NOVO" + borda colorida por alguns segundos |
| Conexão instável no tablet | Médio — operador perde atualização | Indicador de status de conexão + retry automático do polling |

---

## 8. OPORTUNIDADES DE CONVERSÃO (MVP — apenas críticas)

Apenas os momentos de maior impacto com menor esforço de implementação.

### 8.1 Para o restaurante

| Momento | Por que é crítico | O que fazer |
|---------|------------------|-------------|
| Primeiro pedido recebido | Cria memória positiva e comprova que o sistema funciona | Toast: "🎉 Primeiro pedido recebido!" |
| Link copiado | Momento de ativação — restaurante vai divulgar | Mensagem inline: "Compartilhe no WhatsApp agora" |

### 8.2 Para o cliente

| Momento | Por que é crítico | O que fazer |
|---------|------------------|-------------|
| Pagamento confirmado | Alívio — cliente estava em dúvida se funcionou | Destaque visual imediato: "✓ Pagamento confirmado" |
| Pedido concluído | Encerramento positivo da experiência | Mensagem de agradecimento simples e limpa |

### 8.3 No cardápio (estrutural — sem esforço extra)

Três elementos que convertem por design, sem código adicional:

| Elemento | Decisão |
|---------|---------|
| Preço sempre visível no card | Nunca esconder preço atrás de clique |
| Botão flutuante do carrinho com total | Mantém intenção de compra ativa em mobile |
| Nav de categorias sticky no topo | Facilita descoberta sem scroll longo |

---

## 9. PRINCÍPIOS DE UX DO PRODUTO

Guiam todas as decisões de interface — especialmente quando há dúvida.

| Princípio | Aplicação prática |
|-----------|-----------------|
| **Simples antes de completo** | Se a feature adiciona uma tela ou campo a mais, questionar se é necessária agora |
| **Feedback imediato** | Toda ação do usuário deve ter resposta visual em < 200ms |
| **Erros recuperáveis** | Nunca deixar o usuário preso — sempre oferecer saída |
| **Mobile first** | Toda tela projetada primeiro para 375px; desktop é expansão |
| **Zero jargão técnico** | Status "em_preparo" aparece como "Em preparo 🍳" para o cliente |
| **Confiança no pagamento** | Tela de PIX deve transmitir segurança — logo do restaurante, valor claro, instruções |
| **Painel operacional = eficiência** | O operador deve conseguir processar um pedido com 2 toques |

---

## 10. CONVENÇÕES DE STATUS — LINGUAGEM DE INTERFACE

Tradução dos status internos para linguagem amigável por persona.

| Status interno | Exibição para o cliente | Exibição no painel admin |
|---------------|------------------------|--------------------------|
| `aguardando_pagamento` | "Aguardando seu pagamento" ⏳ | "Aguardando pagamento" |
| `pago` | "Pagamento confirmado ✓" | "Pago — iniciar preparo" |
| `em_preparo` | "Seu pedido está sendo preparado 🍳" | "Em preparo" |
| `pronto_para_retirada` | "Pronto! Venha buscar seu pedido 🛍️" | "Pronto para retirada" |
| `saiu_para_entrega` | "Seu pedido saiu para entrega 🛵" | "Saiu para entrega" |
| `concluido` | "Pedido entregue! Bom apetite 🎉" | "Concluído" |
| `expirado` | "O tempo de pagamento expirou. Faça um novo pedido." | "Expirado" |
| `cancelado` | "Pedido cancelado. Entre em contato com o restaurante." | "Cancelado" |

---

*Documento gerado em 2026-04-13. Revisão obrigatória antes da implementação de cada tela.*
