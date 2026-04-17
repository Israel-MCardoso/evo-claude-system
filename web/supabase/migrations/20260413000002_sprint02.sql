-- =============================================================================
-- Sprint 02 — Tabelas de pedido: pedidos, itens_pedido, pagamentos
-- =============================================================================
-- Executar APÓS 20260413000001_sprint01.sql
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Enum de status do pedido
-- ---------------------------------------------------------------------------

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


-- ---------------------------------------------------------------------------
-- Tabela: pedidos
-- ---------------------------------------------------------------------------

CREATE TABLE pedidos (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id       uuid NOT NULL REFERENCES restaurantes(id) ON DELETE RESTRICT,
  order_number         serial NOT NULL,
  status               status_pedido NOT NULL DEFAULT 'pending',
  modalidade           text NOT NULL CHECK (modalidade IN ('entrega', 'retirada')),

  -- dados do cliente (guest checkout)
  cliente_nome         text NOT NULL,
  cliente_telefone     text NOT NULL,  -- somente dígitos, normalizado no insert

  -- endereço (obrigatório se modalidade = 'entrega')
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


-- ---------------------------------------------------------------------------
-- Tabela: itens_pedido
-- ---------------------------------------------------------------------------

CREATE TABLE itens_pedido (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id       uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id      uuid NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  nome_snapshot   text NOT NULL,
  preco_snapshot  numeric(10,2) NOT NULL,
  quantidade      integer NOT NULL CHECK (quantidade > 0),
  subtotal        numeric(10,2) NOT NULL
);


-- ---------------------------------------------------------------------------
-- Tabela: pagamentos
-- ---------------------------------------------------------------------------

CREATE TABLE pagamentos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id       uuid NOT NULL REFERENCES pedidos(id) ON DELETE RESTRICT,
  provider        text NOT NULL DEFAULT 'mercado_pago',
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'failed')),
  external_id     text,
  qr_code         text,
  qr_code_base64  text,
  expira_em       timestamptz,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_pedidos_restaurante_status
  ON pedidos(restaurante_id, status, criado_em DESC);

CREATE INDEX idx_pedidos_tracking
  ON pedidos(id, cliente_telefone);

CREATE INDEX idx_pagamentos_pedido
  ON pagamentos(pedido_id);

CREATE INDEX idx_pagamentos_external
  ON pagamentos(external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX idx_itens_pedido_pedido
  ON itens_pedido(pedido_id);


-- ---------------------------------------------------------------------------
-- Trigger: atualiza atualizado_em automaticamente
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pedidos_atualizado_em
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER pagamentos_atualizado_em
  BEFORE UPDATE ON pagamentos
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();


-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE pedidos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos   ENABLE ROW LEVEL SECURITY;

-- Admin: acessa apenas pedidos do próprio restaurante
CREATE POLICY "admin_pedidos"
  ON pedidos FOR ALL
  USING (restaurante_id = meu_restaurante_id());

-- Admin: acessa itens dos pedidos do próprio restaurante
CREATE POLICY "admin_itens"
  ON itens_pedido FOR ALL
  USING (
    pedido_id IN (
      SELECT id FROM pedidos WHERE restaurante_id = meu_restaurante_id()
    )
  );

-- Admin: acessa pagamentos dos pedidos do próprio restaurante
CREATE POLICY "admin_pagamentos"
  ON pagamentos FOR ALL
  USING (
    pedido_id IN (
      SELECT id FROM pedidos WHERE restaurante_id = meu_restaurante_id()
    )
  );

-- Nota: INSERT em pedidos/pagamentos via guest checkout usa service role
-- (anon key não tem permissão de escrita — operações de criação passam pela API route)
