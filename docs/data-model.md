# Data Model — Evo MVP
**Data:** 2026-04-13
**Banco:** PostgreSQL via Supabase

---

## Tabelas

### restaurantes
```sql
CREATE TABLE restaurantes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  nome            text NOT NULL,
  logo_url        text,
  tipo            text,                          -- 'delivery' | 'dark_kitchen' | 'lanchonete'
  aceita_entrega  boolean NOT NULL DEFAULT true,
  aceita_retirada boolean NOT NULL DEFAULT true,
  taxa_entrega    numeric(10,2) NOT NULL DEFAULT 0,
  ativo           boolean NOT NULL DEFAULT true,
  criado_em       timestamptz NOT NULL DEFAULT now()
);
```

### restaurant_users
Liga um usuário Supabase Auth ao seu restaurante.
```sql
CREATE TABLE restaurant_users (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurante_id  uuid NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, restaurante_id)
);
```

### categorias
```sql
CREATE TABLE categorias (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id  uuid NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  nome            text NOT NULL,
  ordem           integer NOT NULL DEFAULT 0,
  ativo           boolean NOT NULL DEFAULT true
);
```

### produtos
```sql
CREATE TABLE produtos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id  uuid NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  categoria_id    uuid NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
  nome            text NOT NULL,
  descricao       text,
  preco           numeric(10,2) NOT NULL,
  foto_url        text,
  disponivel      boolean NOT NULL DEFAULT true,
  ordem           integer NOT NULL DEFAULT 0
);
```

### pedidos
```sql
CREATE TYPE status_pedido AS ENUM (
  'pending',           -- criado, pagamento ainda não gerado
  'waiting_payment',   -- PIX gerado, aguardando pagamento
  'paid',              -- pagamento confirmado
  'preparing',         -- restaurante em preparo
  'ready',             -- pronto para retirada OU saiu para entrega
  'delivered',         -- concluído / entregue
  'cancelled',         -- cancelado manualmente
  'expired'            -- PIX expirou sem pagamento (15 min)
);

CREATE TABLE pedidos (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id       uuid NOT NULL REFERENCES restaurantes(id) ON DELETE RESTRICT,
  order_number         serial NOT NULL,          -- número legível exibido ao cliente (ex: #42)
  status               status_pedido NOT NULL DEFAULT 'pending',
  modalidade           text NOT NULL,            -- 'entrega' | 'retirada'

  -- dados do cliente (guest)
  cliente_nome         text NOT NULL,
  cliente_telefone     text NOT NULL,  -- salvo sempre normalizado: somente dígitos (ex: "11999990000")

  -- endereço (apenas se modalidade = 'entrega')
  endereco_rua         text,
  endereco_numero      text,
  endereco_bairro      text,
  endereco_complemento text,

  -- valores
  subtotal             numeric(10,2) NOT NULL,
  taxa_entrega         numeric(10,2) NOT NULL DEFAULT 0,
  total                numeric(10,2) NOT NULL,

  criado_em            timestamptz NOT NULL DEFAULT now(),
  atualizado_em        timestamptz NOT NULL DEFAULT now()
);
```

### pagamentos
```sql
CREATE TABLE pagamentos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id    uuid NOT NULL REFERENCES pedidos(id) ON DELETE RESTRICT,
  provider     text NOT NULL DEFAULT 'mercado_pago',
  status       text NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'failed'
  external_id  text,                             -- payment_id do Mercado Pago
  qr_code      text,                             -- copia-e-cola PIX
  qr_code_base64 text,                           -- QR Code em base64
  expira_em    timestamptz,
  criado_em    timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
```

### itens_pedido
```sql
CREATE TABLE itens_pedido (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id       uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id      uuid NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  nome_snapshot   text NOT NULL,       -- nome do produto no momento do pedido
  preco_snapshot  numeric(10,2) NOT NULL, -- preço no momento do pedido
  quantidade      integer NOT NULL CHECK (quantidade > 0),
  subtotal        numeric(10,2) NOT NULL
);
```

---

## Índices

```sql
-- cardápio público: busca por slug
CREATE INDEX idx_restaurantes_slug ON restaurantes(slug);

-- painel admin: pedidos ativos por restaurante
CREATE INDEX idx_pedidos_restaurante_status
  ON pedidos(restaurante_id, status, criado_em DESC);

-- tracking: busca por id + telefone
CREATE INDEX idx_pedidos_tracking
  ON pedidos(id, cliente_telefone);

-- pagamentos: busca por pedido e por external_id (webhook)
CREATE INDEX idx_pagamentos_pedido ON pagamentos(pedido_id);
CREATE INDEX idx_pagamentos_external ON pagamentos(external_id);

-- cardápio: produtos disponíveis por categoria
CREATE INDEX idx_produtos_categoria
  ON produtos(categoria_id, disponivel, ordem);
```

---

## RLS

```sql
-- Helper: retorna o restaurante_id do usuário autenticado
CREATE OR REPLACE FUNCTION meu_restaurante_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT restaurante_id FROM restaurant_users WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Restaurante acessa apenas seus próprios dados
ALTER TABLE restaurantes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias    ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido  ENABLE ROW LEVEL SECURITY;

-- Leitura pública do cardápio (restaurantes ativos)
CREATE POLICY "publico_restaurantes" ON restaurantes
  FOR SELECT USING (ativo = true);

-- Leitura pública de produtos disponíveis
CREATE POLICY "publico_produtos" ON produtos
  FOR SELECT USING (disponivel = true);

-- Leitura pública de categorias ativas
CREATE POLICY "publico_categorias" ON categorias
  FOR SELECT USING (ativo = true);

-- Admin: acesso total ao próprio restaurante
CREATE POLICY "admin_restaurante" ON restaurantes
  FOR ALL USING (id = meu_restaurante_id());

CREATE POLICY "admin_categorias" ON categorias
  FOR ALL USING (restaurante_id = meu_restaurante_id());

CREATE POLICY "admin_produtos" ON produtos
  FOR ALL USING (restaurante_id = meu_restaurante_id());

CREATE POLICY "admin_pedidos" ON pedidos
  FOR ALL USING (restaurante_id = meu_restaurante_id());

CREATE POLICY "admin_itens" ON itens_pedido
  FOR ALL USING (
    pedido_id IN (
      SELECT id FROM pedidos WHERE restaurante_id = meu_restaurante_id()
    )
  );

ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_pagamentos" ON pagamentos
  FOR ALL USING (
    pedido_id IN (
      SELECT id FROM pedidos WHERE restaurante_id = meu_restaurante_id()
    )
  );
```

---

## Seed (restaurante piloto)

```sql
-- 1. Criar usuário no Supabase Auth (via dashboard ou CLI)
-- 2. Inserir restaurante
INSERT INTO restaurantes (id, slug, nome, aceita_entrega, aceita_retirada)
VALUES ('...uuid...', 'restaurante-piloto', 'Restaurante Piloto', true, true);

-- 3. Linkar usuário ao restaurante
INSERT INTO restaurant_users (user_id, restaurante_id)
VALUES ('...auth_user_uuid...', '...restaurante_uuid...');
```

---

## Estados canônicos do pedido

```
pending → waiting_payment → paid → preparing → ready → delivered
                                                      → cancelled
```

Status `waiting_payment` é definido pelo backend ao gerar o PIX.
Status `paid` é definido pelo webhook do Mercado Pago (ou polling de fallback).
Status `ready` cobre os dois casos: entrega (saiu para entrega) e retirada (pronto para retirada) — distinguidos pela `modalidade` do pedido.

Transições válidas (pelo restaurante via PATCH admin):

| De | Para |
|----|------|
| `paid` | `preparing` |
| `preparing` | `ready` |
| `ready` | `delivered` |
| `paid` / `preparing` / `ready` | `cancelled` |

Transições automáticas (pelo sistema):

| Evento | De | Para |
|--------|----|------|
| PIX gerado | `pending` | `waiting_payment` |
| Webhook approved | `waiting_payment` | `paid` |
| PIX expirado (15 min) | `waiting_payment` | `expired` |

Status do `pagamentos.status`:

| Valor | Significado |
|-------|-------------|
| `pending` | PIX gerado, aguardando pagamento |
| `approved` | Pagamento confirmado pelo Mercado Pago |
| `failed` | Falha ou expiração do pagamento |
