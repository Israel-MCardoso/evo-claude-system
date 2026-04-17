-- =============================================================================
-- Sprint 01 — Schema base: restaurantes, categorias, produtos, restaurant_users
-- =============================================================================
-- Escopo: apenas tabelas necessárias para o cardápio público.
-- Tabelas de pedidos/pagamentos são Sprint 02.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

CREATE TABLE restaurantes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  nome            text NOT NULL,
  logo_url        text,
  tipo            text CHECK (tipo IN ('delivery', 'dark_kitchen', 'lanchonete')),
  aceita_entrega  boolean NOT NULL DEFAULT true,
  aceita_retirada boolean NOT NULL DEFAULT true,
  taxa_entrega    numeric(10,2) NOT NULL DEFAULT 0,
  ativo           boolean NOT NULL DEFAULT true,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE restaurant_users (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurante_id  uuid NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, restaurante_id)
);

CREATE TABLE categorias (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id  uuid NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  nome            text NOT NULL,
  ordem           integer NOT NULL DEFAULT 0,
  ativo           boolean NOT NULL DEFAULT true
);

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


-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------

-- Cardápio público: busca por slug
CREATE INDEX idx_restaurantes_slug ON restaurantes(slug);

-- Cardápio admin: listar produtos por categoria
CREATE INDEX idx_produtos_categoria ON produtos(categoria_id, disponivel, ordem);

-- Cardápio admin: listar categorias por restaurante
CREATE INDEX idx_categorias_restaurante ON categorias(restaurante_id, ativo, ordem);

-- Controle de acesso: lookup user → restaurante
CREATE INDEX idx_restaurant_users_user ON restaurant_users(user_id);


-- ---------------------------------------------------------------------------
-- RLS — Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE restaurantes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias      ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos        ENABLE ROW LEVEL SECURITY;


-- Função helper: retorna restaurante_id do usuário autenticado
-- Evita repetição nas policies e permanece estável ao trocar a implementação
CREATE OR REPLACE FUNCTION meu_restaurante_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT restaurante_id
  FROM restaurant_users
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;


-- Restaurantes: leitura pública (cardápio)
CREATE POLICY "publico_restaurantes"
  ON restaurantes FOR SELECT
  USING (ativo = true);

-- Restaurantes: admin acessa apenas o próprio
CREATE POLICY "admin_restaurante"
  ON restaurantes FOR ALL
  USING (id = meu_restaurante_id());


-- Restaurant_users: usuário vê apenas seu próprio vínculo
CREATE POLICY "proprio_restaurant_user"
  ON restaurant_users FOR ALL
  USING (user_id = auth.uid());


-- Categorias: leitura pública (ativas)
CREATE POLICY "publico_categorias"
  ON categorias FOR SELECT
  USING (ativo = true);

-- Categorias: admin acessa apenas as do próprio restaurante
CREATE POLICY "admin_categorias"
  ON categorias FOR ALL
  USING (restaurante_id = meu_restaurante_id());


-- Produtos: leitura pública (disponíveis)
CREATE POLICY "publico_produtos"
  ON produtos FOR SELECT
  USING (disponivel = true);

-- Produtos: admin acessa apenas os do próprio restaurante
CREATE POLICY "admin_produtos"
  ON produtos FOR ALL
  USING (restaurante_id = meu_restaurante_id());
