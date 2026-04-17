-- =============================================================================
-- Taxa de entrega dinâmica por distância
-- Adiciona localização do restaurante e parâmetros de cálculo
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Idempotente: seguro para rodar mais de uma vez (ADD COLUMN IF NOT EXISTS)
-- =============================================================================

ALTER TABLE restaurantes
  -- Coordenadas do restaurante (base de cálculo da distância)
  -- Nullable: restaurantes sem coordenadas usam taxa_entrega como fallback
  ADD COLUMN IF NOT EXISTS latitude          numeric(10,7),
  ADD COLUMN IF NOT EXISTS longitude         numeric(10,7),

  -- Taxa mínima cobrada independente da distância (ex: R$ 3,00)
  -- Aplicada mesmo para pedidos muito próximos
  ADD COLUMN IF NOT EXISTS taxa_base_entrega numeric(10,2) NOT NULL DEFAULT 3.00,

  -- Valor adicional por km rodado (ex: R$ 1,50/km)
  -- Combinado com taxa_base: total = base + (km × por_km), arredondado para cima
  ADD COLUMN IF NOT EXISTS taxa_por_km       numeric(10,2) NOT NULL DEFAULT 1.50;
