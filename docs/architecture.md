# Architecture

**Versão:** 1.0
**Data:** 2026-04-13
**Status:** Aprovado para MVP

---

## 1. Visão Geral

O sistema é um SaaS multi-tenant para restaurantes (delivery, dark kitchens, lanchonetes) que expoe duas superficies distintas: um cardapio digital publico por restaurante e um painel administrativo privado para o operador.

A arquitetura segue o modelo de monolito modular hospedado em Vercel, com Supabase como camada de dados, auth e realtime. A separacao para NestJS é um ponto de escala futuro previsto, nao um requisito do MVP.

---

## 2. Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTES                             │
│                                                             │
│  [Cliente Final - Mobile]    [Operador - Desktop/Tablet]    │
│         Browser                      Browser                │
└──────────────────┬──────────────────────┬───────────────────┘
                   │                      │
                   ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (CDN + Edge)                       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Next.js Application                     │   │
│  │                                                      │   │
│  │  ┌─────────────────┐  ┌──────────────────────────┐  │   │
│  │  │  App Router      │  │   API Routes (/api/*)    │  │   │
│  │  │                 │  │                          │  │   │
│  │  │  /[slug]        │  │  /api/orders             │  │   │
│  │  │  /[slug]/cart   │  │  /api/products           │  │   │
│  │  │  /[slug]/track  │  │  /api/restaurants        │  │   │
│  │  │  /dashboard/*   │  │  /api/payments           │  │   │
│  │  │  /auth/*        │  │  /api/webhooks           │  │   │
│  │  └─────────────────┘  └──────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────┐    ┌─────────────────────────────────┐
│   SUPABASE           │    │   PAYMENT GATEWAY               │
│                      │    │   (Asaas ou Mercado Pago)        │
│  ┌────────────────┐  │    │                                 │
│  │  PostgreSQL    │  │    │  - Geração de cobrança PIX      │
│  │  (dados)       │  │    │  - QR Code / Copia-e-cola       │
│  └────────────────┘  │    │  - Webhook de confirmação        │
│  ┌────────────────┐  │    └─────────────────────────────────┘
│  │  Auth          │  │
│  │  (JWT/sessions)│  │
│  └────────────────┘  │
│  ┌────────────────┐  │
│  │  Realtime      │  │
│  │  (Postgres     │  │
│  │   Changes)     │  │
│  └────────────────┘  │
│  ┌────────────────┐  │
│  │  Storage       │  │
│  │  (logos,       │  │
│  │   fotos prod.) │  │
│  └────────────────┘  │
└──────────────────────┘
```

---

## 3. Topologia de Rotas

### Superficie Publica (sem autenticacao)

| Rota | Descricao |
|------|-----------|
| `/:slug` | Cardapio digital do restaurante |
| `/pedido/[id]` | Acompanhamento de pedido pelo cliente (identificação por número + telefone) |

### Superficie Privada (requer autenticacao Supabase)

| Rota | Descricao |
|------|-----------|
| `/login` | Login do operador (sem cadastro público no MVP) |
| `/painel` | Painel de pedidos em tempo real (polling 5s) |
| `/painel/cardapio` | Gestao de categorias e produtos |
| `/painel/configuracoes` | Dados do restaurante, slug, logo, modalidades |

### API Routes (backend interno)

Prefixo: `/api/v1/`

Organizadas por dominio: `restaurants`, `categories`, `products`, `orders`, `payments`, `webhooks`.

---

## 4. Decisoes Arquiteturais

### 4.1 Next.js como monolito inicial

**Decisao:** usar Next.js API Routes como backend no MVP em vez de NestJS separado.

**Justificativa:**
- Reduz overhead de infraestrutura (um deploy unico na Vercel)
- Time de 2 pessoas nao comporta manter dois repositorios e dois pipelines
- API Routes sao suficientes para o volume do MVP (20-100 pedidos/dia por restaurante)
- Migracao para NestJS e viavel com contratos de API estabilizados neste documento

**Risco aceito:** acoplamento entre frontend e backend. Mitigado pela separacao clara de dominios dentro de `/api/v1/` e pela disciplina de nao importar codigo de frontend em API routes.

### 4.2 Supabase como BaaS

**Decisao:** Supabase concentra banco, auth, storage e realtime.

**Justificativa:**
- Custo dentro do orcamento (R$200-500/mês): plano Pro (~$25/mes) cobre o MVP
- Elimina necessidade de Redis para sessoes e de servico separado de websockets
- Row Level Security (RLS) do PostgreSQL resolve isolamento multi-tenant nativamente
- Supabase Storage resolve upload de imagens sem S3 adicional

**Risco aceito:** vendor lock-in em Supabase Auth e Realtime. Mitigado por: (a) toda logica de negocio fica nas API Routes, nao diretamente no Supabase; (b) o banco e PostgreSQL padrao, exportavel.

### 4.3 Multi-tenancy por Row Level Security

**Decisao:** isolamento de dados entre restaurantes via RLS do PostgreSQL, nao schemas separados.

**Justificativa:**
- Schemas separados por tenant escalam mal em Supabase no plano Pro
- RLS e nativo, auditavel e suficiente para o volume do MVP
- Todas as tabelas de tenant possuem `restaurant_id` e policies que validam via JWT claim

**Implementacao:** o JWT do Supabase Auth carrega `restaurant_id` como claim customizado (`app_metadata.restaurant_id`). As policies RLS verificam este claim em todas as operacoes.

### 4.4 Gateway de pagamento — Mercado Pago (MVP)

**Decisao:** usar Mercado Pago como gateway PIX no MVP. Interface `PaymentGateway` abstrai a implementação para facilitar troca futura.

**Justificativa:** acesso imediato disponível; prioridade de velocidade de execução. Suporte a múltiplos gateways (Asaas, etc.) avaliado em V1+.

**Interface definida em:** `src/lib/payment/gateway.interface.ts`
**Implementação MVP:** `src/lib/payment/mercadopago.adapter.ts`

### 4.5 Polling controlado como estratégia principal de atualização

**Decisao:** MVP usa polling HTTP controlado em vez de Supabase Realtime ou WebSocket.

- **Painel operacional:** polling a cada **5 segundos** via `setInterval` no cliente
- **Tracking do cliente:** polling a cada **10 segundos**, encerrado quando pedido atinge status final

**Justificativa:**
- Simples, sem estado de conexão persistente para gerenciar
- Zero risco de falha silenciosa de WebSocket em redes móveis e tablets
- Volume do MVP (20–100 pedidos/dia) não justifica complexidade de Realtime
- Supabase Realtime entra em V1, quando a escala validar a necessidade

**Risco aceito:** latência de até 5–10s na exibição de novos pedidos. Aceitável para o contexto de delivery.

---

## 5. Fluxo de Dados — Pedido Completo

```
Cliente (browser)
     │
     │ 1. GET /[slug]  →  Next.js SSG/ISR
     │    Renderiza cardapio com dados do restaurante e produtos
     │
     │ 2. Monta carrinho (estado local — localStorage ou Context)
     │
     │ 3. POST /api/v1/orders
     │    Body: itens, dados do cliente, tipo de entrega
     │    ← Retorna: orderId, status "pending_payment"
     │
     │ 4. POST /api/v1/payments
     │    Body: orderId, metodo "pix"
     │    → API Route chama PaymentGateway.createCharge()
     │    ← Retorna: pix_qr_code, pix_copy_paste, expiry
     │
     │ 5. Cliente exibe QR Code, aguarda pagamento
     │
     │ 6. Gateway chama POST /api/v1/webhooks/payment
     │    Body: charge_id, status "paid"
     │    → API Route valida assinatura HMAC
     │    → Atualiza Payment.status = "paid"
     │    → Atualiza Order.status = "confirmed"
     │
     │ 7. Painel do restaurante detecta novo pedido no próximo ciclo
     │    de polling (intervalo de 5s) → exibe pedido na fila
     │
     │ 8. Operador atualiza status (em_preparo → saiu_para_entrega → concluido)
     │    PATCH /api/admin/pedidos/:id/status
     │
     │ 9. Cliente em /pedido/[id]
     │    Polling a cada 10s → detecta mudança de status e exibe atualização
```

---

## 6. Autenticacao e Autorizacao — Fluxo Detalhado

### 6.1 Visão geral das camadas

```
REQUISIÇÃO
    │
    ├─► Middleware Next.js          → bloqueia /painel/* sem sessão válida
    │
    ├─► API Route (server-side)     → valida JWT + extrai restaurante_id
    │
    └─► Supabase (banco)            → RLS rejeita query se restaurante_id errado
```

Três camadas independentes. Se uma falhar, as outras segurem.

---

### 6.2 Como o restaurante_id chega até o banco

**Problema central:** o JWT do Supabase Auth carrega `user.id` (UUID do usuário), mas precisamos do `restaurante_id` para filtrar dados. Há duas formas — usamos a mais simples para o MVP.

**Solução MVP:** tabela `restaurant_users` linkando usuário ao restaurante.

```sql
-- Tabela de vínculo criada no seed para o restaurante piloto
CREATE TABLE restaurant_users (
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurante_id uuid REFERENCES restaurantes(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, restaurante_id)
);
```

Na API Route, após autenticar:

```typescript
// src/lib/auth/get-restaurante-id.ts
export async function getRestauranteId(supabase: SupabaseClient): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data } = await supabase
    .from('restaurant_users')
    .select('restaurante_id')
    .eq('user_id', user.id)
    .single()

  if (!data) throw new Error('Restaurante não encontrado')
  return data.restaurante_id
}
```

> **Por que não `app_metadata`?** Requer service role para escrever. A tabela `restaurant_users` é mais simples, auditável e extensível para multi-usuário em V1.

---

### 6.3 RLS — políticas por tabela

O RLS usa a função helper abaixo para evitar repetição:

```sql
-- Função helper: retorna restaurante_id do usuário autenticado
CREATE OR REPLACE FUNCTION meu_restaurante_id()
RETURNS uuid AS $$
  SELECT restaurante_id FROM restaurant_users WHERE user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

Políticas aplicadas em todas as tabelas operacionais:

```sql
-- pedidos: restaurante vê apenas seus pedidos
CREATE POLICY "acesso_proprio_restaurante" ON pedidos
  FOR ALL USING (restaurante_id = meu_restaurante_id());

-- produtos: idem
CREATE POLICY "acesso_proprio_restaurante" ON produtos
  FOR ALL USING (restaurante_id = meu_restaurante_id());

-- categorias: idem
CREATE POLICY "acesso_proprio_restaurante" ON categorias
  FOR ALL USING (restaurante_id = meu_restaurante_id());
```

> **Resultado:** mesmo que uma API Route tenha bug e não filtre por `restaurante_id`, o banco rejeita a query automaticamente.

---

### 6.4 Middleware Next.js — guarda das rotas admin

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* get/set/remove helpers */ } }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redireciona para login se não autenticado
  if (!user && request.nextUrl.pathname.startsWith('/painel')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/painel/:path*', '/api/admin/:path*']
}
```

---

### 6.5 Service Role — quando e somente quando usar

O `SUPABASE_SERVICE_ROLE_KEY` **bypassa RLS completamente**. Por isso é restrito a dois casos no MVP:

| Uso | Motivo | Arquivo |
|-----|--------|---------|
| Webhook do Mercado Pago | Não há usuário autenticado; precisamos atualizar o pedido | `api/webhooks/mercadopago/route.ts` |
| Seed do restaurante piloto | Criação manual dos dados iniciais | `supabase/seed.sql` |

```typescript
// Exemplo: cliente admin (service role) usado APENAS no webhook
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // nunca exposto no cliente
)

// Usado somente após validar assinatura HMAC do Mercado Pago
await supabaseAdmin
  .from('pedidos')
  .update({ status: 'pago', mp_payment_id: paymentId })
  .eq('mp_payment_id', paymentId)
```

> **Regra:** `supabaseAdmin` nunca é instanciado fora de API Routes. Nunca é importado em componentes React. Nunca usa `NEXT_PUBLIC_`.

---

### 6.6 Rotas públicas (sem auth)

Essas rotas usam o cliente anon do Supabase e dependem de RLS permissivo ou ausente para leitura pública:

| Rota | O que acessa |
|------|-------------|
| `GET /api/restaurantes/[slug]` | Dados públicos do restaurante + cardápio |
| `POST /api/pedidos` | Cria pedido (sem auth, restaurante_id vem do slug) |
| `POST /api/pagamentos` | Gera cobrança PIX vinculada ao pedido |
| `GET /api/pedidos/[id]/status` | Polling de status (valida telefone) |
| `POST /api/webhooks/mercadopago` | Callback de pagamento (valida HMAC) |

```sql
-- Política de leitura pública para cardápio
CREATE POLICY "leitura_publica_produtos" ON produtos
  FOR SELECT USING (disponivel = true);

CREATE POLICY "leitura_publica_restaurantes" ON restaurantes
  FOR SELECT USING (ativo = true);
```

---

## 7. Tracking Guest — Segurança do /pedido/[id]

### 7.1 Por que UUID v4 já é proteção suficiente

IDs de pedido são **UUID v4** gerados pelo Supabase (padrão). Um UUID v4 tem 122 bits de aleatoriedade — aproximadamente 5 × 10^36 valores possíveis. Adivinhar um ID válido por força bruta é computacionalmente inviável.

> Não é necessário token separado. O UUID do pedido **é** o token.

### 7.2 Validação por telefone como segunda camada

Mesmo com UUID, exigimos o telefone cadastrado no checkout para retornar dados. Isso protege contra cenários onde o link vaza (ex: screenshot compartilhado).

```typescript
// GET /api/pedidos/[id]/status
// Body: { telefone: string }

export async function POST(req: Request, { params }) {
  const { telefone } = await req.json()

  // Busca com os dois filtros simultaneamente
  // Se telefone errado: retorna null → mesmo erro de "não encontrado"
  const { data: pedido } = await supabase
    .from('pedidos')
    .select('id, numero, status, cliente_nome, itens_pedido(*), total, modalidade, restaurante:restaurantes(nome)')
    .eq('id', params.id)
    .eq('cliente_telefone', telefone)  // segundo fator
    .single()

  if (!pedido) {
    // IMPORTANTE: mesma resposta para "não existe" e "telefone errado"
    // Não revela qual condição falhou — evita info leakage
    return NextResponse.json(
      { error: 'Pedido não encontrado' },
      { status: 404 }
    )
  }

  // Retorna apenas campos necessários para o tracking
  // Nunca retorna: endereço completo, campos internos, mp_payment_id
  return NextResponse.json({
    numero: pedido.numero,
    status: pedido.status,
    cliente_nome: pedido.cliente_nome,
    itens: pedido.itens_pedido,
    total: pedido.total,
    modalidade: pedido.modalidade,
    restaurante_nome: pedido.restaurante.nome,
  })
}
```

### 7.3 Rate limiting no endpoint de tracking

Para bloquear tentativas sistemáticas de combinar UUID + telefone:

```typescript
// Vercel Edge middleware — rate limit simples por IP
// max 20 requests/minuto no endpoint de tracking

import { ipAddress } from '@vercel/edge'

// No middleware.ts, antes de processar:
const ip = ipAddress(request) || 'unknown'
const key = `tracking:${ip}`
// Incrementa contador no Vercel KV ou em header de rate limit nativo
```

> **Para MVP sem Vercel KV:** o volume é tão baixo que podemos aceitar sem rate limiting explícito na v0. UUID v4 torna brute force inviável de qualquer forma. Rate limiting entra em V1.

### 7.4 O que o endpoint NUNCA retorna

| Campo | Motivo |
|-------|--------|
| `cliente_telefone` | PII — já foi validado, não precisa ser retornado |
| `endereco_*` | PII — relevante apenas para o restaurante |
| `mp_payment_id` | Dado interno de pagamento |
| `mp_qr_code` | Já expirou ou foi usado |
| `restaurante_id` | UUID interno sem valor para o cliente |

---

## 8. Cardápio ISR — Invalidação On-Demand

### 8.1 Problema com ISR puro (revalidate: 60)

Se o restaurante editar um produto e a página demorar até 60s para atualizar, o operador pode achar que o sistema está com bug. Para MVP com restaurante piloto, isso é inaceitável como comportamento padrão.

### 8.2 Solução: revalidatePath nas mutações do cardápio

Toda API Route que modifica cardápio chama `revalidatePath` antes de retornar resposta:

```typescript
// api/admin/produtos/route.ts — criação de produto
import { revalidatePath } from 'next/cache'

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const restauranteId = await getRestauranteId(supabase)

  // ... insere produto no banco ...

  // Busca slug do restaurante para invalidar a rota correta
  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('slug')
    .eq('id', restauranteId)
    .single()

  // Invalida o cache da página pública imediatamente
  revalidatePath(`/${restaurante.slug}`)

  return NextResponse.json({ success: true })
}
```

**Onde chamar `revalidatePath`:**

| Operação | Invalida |
|----------|---------|
| Criar produto | `/${slug}` |
| Editar produto (nome, preço, foto) | `/${slug}` |
| Excluir produto | `/${slug}` |
| Criar/editar/excluir categoria | `/${slug}` |
| Atualizar dados do restaurante (nome, logo) | `/${slug}` |

### 8.3 ISR 60s como rede de segurança

O `revalidate: 60` permanece na página do cardápio como **fallback passivo** — garante que mesmo se alguma mutação esquecer de chamar `revalidatePath`, a página se atualiza em no máximo 1 minuto.

```typescript
// app/(public)/[slug]/page.tsx
export const revalidate = 60  // fallback de segurança

export default async function CardapioPage({ params }) {
  const dados = await getCardapio(params.slug)
  // ...
}
```

### 8.4 Fluxo completo de atualização

```
Operador edita produto no painel
        │
        ▼
PATCH /api/admin/produtos/[id]
        │
        ├─► Atualiza banco (Supabase)
        │
        └─► revalidatePath('/${slug}')
                │
                ▼
        Vercel descarta cache da rota /${slug}
                │
                ▼
        Próxima visita ao cardápio:
        Next.js gera nova versão estática
        (dados frescos do banco)
                │
                ▼
        Cardápio atualizado em < 1s após salvar
```

> **Custo:** `revalidatePath` é uma chamada interna ao Vercel sem custo adicional. Funciona no free tier.

---

## 9. Seguranca — Resumo por Vetor

| Vetor | Controle | Detalhe |
|-------|----------|---------|
| Acesso cruzado entre tenants | RLS + validação na API Route | Ver seção 6.3 |
| Enumeração de pedidos (tracking) | UUID v4 + validação de telefone | Ver seção 7.2 |
| Info leakage no tracking | Mesma resposta 404 para "não existe" e "telefone errado" | Ver seção 7.2 |
| Webhook spoofing | Validação de assinatura HMAC-SHA256 (Mercado Pago) | Ver seção 6.5 |
| Service role exposto | `SUPABASE_SERVICE_ROLE_KEY` nunca em `NEXT_PUBLIC_*` | Ver seção 6.5 |
| Injeção SQL | Supabase JS SDK usa queries parametrizadas | Sem SQL dinâmico manual |
| Upload malicioso | Supabase Storage: max 2MB, validação de MIME type server-side | — |
| HTTPS | Enforced pela Vercel em todos os ambientes | — |
| Sessão admin | Cookie httpOnly gerenciado pelo `@supabase/ssr` | — |

**LGPD — boas práticas básicas no MVP:**
- Dados do cliente: nome, telefone, endereço — coletados apenas no pedido
- Telefone não retornado no endpoint de tracking (seção 7.4)
- Sem tracking de comportamento de navegação
- Sem CPF ou dados financeiros armazenados
- Retenção: pedidos e pagamentos por 12 meses, anonimizáveis depois

---

## 8. Estrategia de Deploy

### Ambientes

| Ambiente | Trigger | URL |
|----------|---------|-----|
| Preview | PR aberto | `https://[branch].vercel.app` |
| Production | Merge em `main` | `https://[dominio-customizado]` |

### Variaveis de Ambiente por Contexto

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # apenas server-side

# Payment Gateway — Mercado Pago (MVP)
MERCADOPAGO_ACCESS_TOKEN         # server-side only
MERCADOPAGO_WEBHOOK_SECRET       # validação HMAC do callback

# App
NEXT_PUBLIC_APP_URL
```

### Supabase Migrations

Migrations versionadas em `supabase/migrations/`. Aplicadas via `supabase db push` no CI antes do deploy de producao.

### Cache e Invalidação do Cardápio

A rota `/:slug` usa ISR com `revalidate: 60` como **fallback passivo**. A invalidação ativa ocorre via `revalidatePath('/${slug}')` chamado em toda mutação do cardápio (criar/editar/excluir produto ou categoria). Isso garante que o operador veja o cardápio atualizado imediatamente após salvar — sem esperar 60s. Ver seção 8 para detalhes completos.

---

## 9. Pontos de Escala Futura

| Ponto | Situacao MVP | Caminho de Escala |
|-------|-------------|-------------------|
| Backend | Next.js API Routes | Extrair para NestJS com mesmos contratos de API |
| Banco | Supabase Pro (shared) | Supabase Dedicated ou instancia propria |
| Realtime | Polling 5–10s | Supabase Realtime ou SSE (V1) |
| Pagamentos | Mercado Pago PIX | Interface genérica permite múltiplos gateways (Asaas, etc.) |
| Autenticacao | Email/senha | Adicionar OAuth (Google) sem alterar fluxo existente |
| Cardapio | ISR 60s | On-demand revalidation via `revalidateTag` |
| Impressao | Fora do MVP | Servico de impressao termica via WebUSB ou servidor local |
| WhatsApp | Fora do MVP | Integracao via Evolution API ou Twilio |
| Multi-filial | Fora do MVP | Adicionar `branch_id` nas tabelas relevantes |

---

## 10. Estrutura de Diretorios

```
/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── [slug]/
│   │   │   │   └── page.tsx          # cardápio digital público
│   │   │   └── pedido/
│   │   │       └── [id]/
│   │   │           └── page.tsx      # tracking do pedido (guest)
│   │   ├── (admin)/
│   │   │   └── painel/
│   │   │       ├── layout.tsx        # auth guard
│   │   │       ├── page.tsx          # painel de pedidos (polling 5s)
│   │   │       ├── cardapio/
│   │   │       │   └── page.tsx      # gestão de categorias e produtos
│   │   │       └── configuracoes/
│   │   │           └── page.tsx      # dados do restaurante
│   │   ├── login/
│   │   │   └── page.tsx              # login email+senha (sem cadastro público)
│   │   └── api/
│   │       ├── pedidos/
│   │       │   ├── route.ts          # POST: criar pedido
│   │       │   └── [id]/
│   │       │       ├── route.ts      # GET: buscar pedido (valida telefone)
│   │       │       └── status/
│   │       │           └── route.ts  # GET: polling de status (cliente)
│   │       ├── pagamentos/
│   │       │   └── route.ts          # POST: gerar cobrança PIX
│   │       ├── webhooks/
│   │       │   └── mercadopago/
│   │       │       └── route.ts      # POST: callback de pagamento
│   │       ├── restaurantes/
│   │       │   └── [slug]/
│   │       │       └── route.ts      # GET: cardápio público
│   │       └── admin/
│   │           ├── pedidos/
│   │           │   ├── route.ts      # GET: listar pedidos (autenticado)
│   │           │   └── [id]/
│   │           │       └── status/
│   │           │           └── route.ts  # PATCH: atualizar status
│   │           └── produtos/
│   │               └── route.ts      # GET, POST, PUT, DELETE
│   ├── lib/
│   │   ├── supabase/                 # clientes server e browser
│   │   ├── payment/
│   │   │   ├── gateway.interface.ts  # interface agnóstica de gateway
│   │   │   └── mercadopago.adapter.ts # implementação MVP
│   │   └── auth/                     # helpers de sessão
│   ├── components/
│   │   ├── cardapio/                 # componentes do cardápio público
│   │   ├── painel/                   # componentes do painel admin
│   │   └── ui/                       # design system base
│   ├── hooks/
│   │   ├── usePedidosPolling.ts      # polling do painel (5s)
│   │   └── useStatusPedido.ts        # polling do tracking (10s)
│   └── types/                        # tipos TypeScript globais
├── supabase/
│   ├── migrations/
│   └── seed.sql                      # seed do restaurante piloto
└── public/
```
