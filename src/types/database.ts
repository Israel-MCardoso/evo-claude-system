// Tipos gerados manualmente do schema — Sprint 01
// Quando o projeto Supabase estiver configurado, substituir por:
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type StatusPedido =
  | 'pending'
  | 'waiting_payment'
  | 'paid'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled'
  | 'expired'

export type StatusPagamento = 'pending' | 'approved' | 'failed'

export type TipoRestaurante = 'delivery' | 'dark_kitchen' | 'lanchonete'

export type ModalidadePedido = 'entrega' | 'retirada'
export type DeliveryMode = 'distance_only' | 'zone_only' | 'hybrid'
export type DeliveryPricingMode = 'zone' | 'distance'

// ---------------------------------------------------------------------------
// Tabelas — Sprint 01
// ---------------------------------------------------------------------------

export interface Restaurante {
  id: string
  slug: string
  nome: string
  logo_url: string | null
  tipo: TipoRestaurante | null
  aceita_entrega: boolean
  aceita_retirada: boolean
  taxa_entrega: number
  // taxa dinâmica por distância (Sprint 03)
  latitude: number | null
  longitude: number | null
  taxa_base_entrega: number
  taxa_por_km: number
  max_distance_km: number
  minimum_fee: number
  free_delivery_threshold: number | null
  delivery_mode: DeliveryMode
  fallback_distance_enabled: boolean
  fallback_max_distance_km: number | null
  ativo: boolean
  criado_em: string
}

export interface DeliveryZone {
  id: string
  restaurant_id: string
  name: string
  type: 'bairro' | 'cep_prefixo' | 'faixa_manual'
  match_value: string
  fee: number
  estimated_delivery_minutes: number
  active: boolean
  priority: number
  created_at: string
  updated_at: string
}

export interface RestaurantUser {
  user_id: string
  restaurante_id: string
}

export interface Categoria {
  id: string
  restaurante_id: string
  nome: string
  ordem: number
  ativo: boolean
}

export interface Produto {
  id: string
  restaurante_id: string
  categoria_id: string
  nome: string
  descricao: string | null
  preco: number
  foto_url: string | null
  disponivel: boolean
  ordem: number
}

// ---------------------------------------------------------------------------
// Tabelas — Sprint 02
// ---------------------------------------------------------------------------

export interface Pedido {
  id: string
  restaurante_id: string
  order_number: number
  status: StatusPedido
  modalidade: ModalidadePedido
  cliente_nome: string
  cliente_telefone: string
  endereco_rua: string | null
  endereco_numero: string | null
  endereco_bairro: string | null
  endereco_cidade: string | null
  endereco_cep: string | null
  endereco_complemento: string | null
  subtotal: number
  taxa_entrega: number
  pricing_mode: DeliveryPricingMode | null
  zone_name: string | null
  distance_km: number | null
  estimated_delivery_minutes: number | null
  total: number
  criado_em: string
  atualizado_em: string
}

export interface Pagamento {
  id: string
  pedido_id: string
  provider: string
  status: StatusPagamento
  external_id: string | null
  qr_code: string | null
  qr_code_base64: string | null
  expira_em: string | null
  criado_em: string
  atualizado_em: string
}

export interface ItemPedido {
  id: string
  pedido_id: string
  produto_id: string
  nome_snapshot: string
  preco_snapshot: number
  quantidade: number
  subtotal: number
}

// ---------------------------------------------------------------------------
// Database — interface principal para o cliente Supabase tipado
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      restaurantes: {
        Row: Restaurante
        Insert: Omit<Restaurante, 'id' | 'criado_em'> & { id?: string; criado_em?: string }
        Update: Partial<Omit<Restaurante, 'id'>>
        Relationships: []
      }
      restaurant_users: {
        Row: RestaurantUser
        Insert: RestaurantUser
        Update: Partial<RestaurantUser>
        Relationships: []
      }
      categorias: {
        Row: Categoria
        Insert: Omit<Categoria, 'id'> & { id?: string }
        Update: Partial<Omit<Categoria, 'id'>>
        Relationships: []
      }
      delivery_zones: {
        Row: DeliveryZone
        Insert: Omit<DeliveryZone, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<DeliveryZone, 'id' | 'restaurant_id'>>
        Relationships: []
      }
      produtos: {
        Row: Produto
        Insert: Omit<Produto, 'id'> & { id?: string }
        Update: Partial<Omit<Produto, 'id'>>
        Relationships: []
      }
      pedidos: {
        Row: Pedido
        Insert: Omit<Pedido, 'id' | 'order_number' | 'criado_em' | 'atualizado_em'> & {
          id?: string
          order_number?: number
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<Pedido, 'id' | 'order_number'>>
        Relationships: []
      }
      pagamentos: {
        Row: Pagamento
        Insert: Omit<Pagamento, 'id' | 'criado_em' | 'atualizado_em'> & {
          id?: string
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<Pagamento, 'id'>>
        Relationships: []
      }
      itens_pedido: {
        Row: ItemPedido
        Insert: Omit<ItemPedido, 'id'> & { id?: string }
        Update: Partial<Omit<ItemPedido, 'id'>>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      meu_restaurante_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      status_pedido: StatusPedido
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
