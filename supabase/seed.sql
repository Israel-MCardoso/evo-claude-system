-- =============================================================================
-- Seed — Restaurante Piloto
-- =============================================================================
-- Executar APÓS aplicar a migration 20260413000001_sprint01.sql
-- Executar APÓS criar o usuário admin no Supabase Auth (dashboard ou CLI)
--
-- Variáveis a substituir antes de executar:
--   :auth_user_uuid  → UUID do usuário criado no Supabase Auth
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Restaurante piloto
-- ---------------------------------------------------------------------------

INSERT INTO restaurantes (
  id,
  slug,
  nome,
  tipo,
  aceita_entrega,
  aceita_retirada,
  taxa_entrega,
  ativo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'restaurante-piloto',
  'Restaurante Piloto',
  'delivery',
  true,
  true,
  5.00,
  true
);


-- ---------------------------------------------------------------------------
-- 2. Vínculo usuário → restaurante
--    Substituir :auth_user_uuid pelo UUID real do usuário no Supabase Auth
-- ---------------------------------------------------------------------------

-- INSERT INTO restaurant_users (user_id, restaurante_id)
-- VALUES (
--   ':auth_user_uuid',
--   'a0000000-0000-0000-0000-000000000001'
-- );


-- ---------------------------------------------------------------------------
-- 3. Categorias
-- ---------------------------------------------------------------------------

INSERT INTO categorias (id, restaurante_id, nome, ordem, ativo) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Lanches',   0, true),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Bebidas',   1, true),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Sobremesas', 2, true);


-- ---------------------------------------------------------------------------
-- 4. Produtos
-- ---------------------------------------------------------------------------

INSERT INTO produtos (id, restaurante_id, categoria_id, nome, descricao, preco, disponivel, ordem) VALUES
  -- Lanches
  (
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'X-Burguer',
    'Pão brioche, hambúrguer 180g, queijo, alface e tomate',
    22.90,
    true,
    0
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'X-Bacon',
    'Pão brioche, hambúrguer 180g, bacon crocante, queijo e molho especial',
    27.90,
    true,
    1
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'X-Frango',
    'Pão brioche, frango grelhado, queijo, alface e maionese',
    24.90,
    true,
    2
  ),

  -- Bebidas
  (
    'c0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'Coca-Cola Lata',
    '350ml',
    6.00,
    true,
    0
  ),
  (
    'c0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'Suco de Laranja',
    'Natural, 400ml',
    9.00,
    true,
    1
  ),
  (
    'c0000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'Água Mineral',
    '500ml sem gás',
    4.00,
    true,
    2
  ),

  -- Sobremesas
  (
    'c0000000-0000-0000-0000-000000000007',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000003',
    'Brownie',
    'Brownie de chocolate com nozes',
    12.00,
    true,
    0
  ),
  (
    'c0000000-0000-0000-0000-000000000008',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000003',
    'Sorvete 2 bolas',
    'Escolha 2 sabores: chocolate, baunilha ou morango',
    10.00,
    true,
    1
  );
