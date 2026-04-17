-- =============================================================================
-- Delivery fee production-grade fields + hybrid zones
-- =============================================================================

ALTER TABLE restaurantes
  ADD COLUMN IF NOT EXISTS max_distance_km numeric(10,2) NOT NULL DEFAULT 8.00,
  ADD COLUMN IF NOT EXISTS minimum_fee numeric(10,2) NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS free_delivery_threshold numeric(10,2),
  ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'distance_only'
    CHECK (delivery_mode IN ('distance_only', 'zone_only', 'hybrid')),
  ADD COLUMN IF NOT EXISTS fallback_distance_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fallback_max_distance_km numeric(10,2);

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS distance_km numeric(10,2),
  ADD COLUMN IF NOT EXISTS estimated_delivery_minutes integer,
  ADD COLUMN IF NOT EXISTS endereco_cidade text,
  ADD COLUMN IF NOT EXISTS endereco_cep text,
  ADD COLUMN IF NOT EXISTS pricing_mode text CHECK (pricing_mode IN ('zone', 'distance')),
  ADD COLUMN IF NOT EXISTS zone_name text;

CREATE TABLE IF NOT EXISTS delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('bairro', 'cep_prefixo', 'faixa_manual')),
  match_value text NOT NULL,
  fee numeric(10,2) NOT NULL CHECK (fee >= 0),
  estimated_delivery_minutes integer NOT NULL CHECK (estimated_delivery_minutes > 0),
  active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0 CHECK (priority >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_zones_restaurant_priority
  ON delivery_zones(restaurant_id, active, priority, created_at);

ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'delivery_zones'
      AND policyname = 'admin_delivery_zones'
  ) THEN
    CREATE POLICY "admin_delivery_zones"
      ON delivery_zones FOR ALL
      USING (restaurant_id = meu_restaurante_id())
      WITH CHECK (restaurant_id = meu_restaurante_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'delivery_zones_atualizado_em'
  ) THEN
    CREATE TRIGGER delivery_zones_atualizado_em
      BEFORE UPDATE ON delivery_zones
      FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
  END IF;
END $$;
