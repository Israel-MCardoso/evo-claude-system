# API Contracts — Evo MVP
**Data:** 2026-04-13
**Base URL:** `/api`

---

## Formato padrão de erro

Toda resposta de erro segue este formato:
```json
{ "error": "mensagem legível para o desenvolvedor" }
```

Códigos usados: `400` (input inválido), `401` (não autenticado), `403` (sem permissão), `404` (não encontrado), `409` (conflito), `500` (erro interno).

---

## Autenticação

- **Rotas públicas:** sem header de autenticação.
- **Rotas admin (`/api/admin/*`):** requerem cookie de sessão Supabase (`sb-access-token`), validado via `supabase.auth.getUser()`.
- **Webhook Mercado Pago:** validação por assinatura HMAC no header `x-signature`.

---

## ROTAS PÚBLICAS

---

### GET `/api/restaurantes/[slug]`
Retorna dados públicos do restaurante com cardápio completo.

**Response 200**
```json
{
  "id": "uuid",
  "slug": "seu-restaurante",
  "nome": "Seu Restaurante",
  "logo_url": "https://...",
  "aceita_entrega": true,
  "aceita_retirada": true,
  "taxa_entrega": 5.00,
  "categorias": [
    {
      "id": "uuid",
      "nome": "Lanches",
      "ordem": 0,
      "produtos": [
        {
          "id": "uuid",
          "nome": "X-Burguer",
          "descricao": "Pão, carne, queijo",
          "preco": 22.90,
          "foto_url": "https://..."
        }
      ]
    }
  ]
}
```

**Erros**
- `404` — restaurante não encontrado ou inativo

---

### POST `/api/pedidos`
Cria o pedido e gera a cobrança PIX em uma única chamada.

O backend executa em sequência:
1. Valida os dados e produtos
2. Cria o pedido com status `pending`
3. Chama a API do Mercado Pago para gerar o PIX
4. Salva o pagamento na tabela `pagamentos`
5. Atualiza o pedido para `waiting_payment`
6. Retorna o pedido + QR Code em uma resposta só

O cliente não precisa fazer duas chamadas.

**Request**
```json
{
  "restaurante_id": "uuid",
  "modalidade": "entrega",
  "cliente_nome": "Julia Silva",
  "cliente_telefone": "11999990000",
  "endereco_rua": "Rua das Flores",
  "endereco_numero": "123",
  "endereco_bairro": "Centro",
  "endereco_complemento": "Apto 4",
  "itens": [
    { "produto_id": "uuid", "quantidade": 2 },
    { "produto_id": "uuid", "quantidade": 1 }
  ]
}
```

Obrigatórios: `restaurante_id`, `modalidade`, `cliente_nome`, `cliente_telefone`, `itens` (≥ 1).
Endereço obrigatório se `modalidade = "entrega"`.

**Response 201**
```json
{
  "id": "uuid",
  "order_number": 42,
  "status": "waiting_payment",
  "total": 68.70,
  "taxa_entrega": 5.00,
  "pagamento": {
    "qr_code": "00020126...",
    "qr_code_base64": "iVBORw0KGgo...",
    "expira_em": "2026-04-13T15:30:00Z"
  }
}
```

**Erros**
- `400` — campos obrigatórios ausentes, itens vazio, endereço ausente para entrega
- `404` — restaurante não encontrado, produto não encontrado
- `409` — produto indisponível
- `500` — falha ao gerar PIX no Mercado Pago (pedido salvo, pagamento não gerado)

---

### GET `/api/pedidos/[id]/status?telefone=[fone]`
Retorna status atual do pedido para o cliente. Usado no polling do tracking (a cada 10s).
Validação por par `id + telefone` — sem login.

**Query params**
- `telefone` — obrigatório. Antes de comparar, ambos os lados são normalizados: remove tudo que não é dígito (`/\D/g, ''`). Isso garante que `(11) 99999-0000`, `11999990000` e `+5511999990000` sejam equivalentes.

**Normalização aplicada no backend:**
```typescript
const normalizar = (tel: string) => tel.replace(/\D/g, '')

const pedido = await supabase
  .from('pedidos')
  .select('...')
  .eq('id', params.id)
  .eq('cliente_telefone', normalizar(telefone))   // salvo já normalizado no checkout
  .single()
```

> **Convenção:** telefone é sempre salvo normalizado (somente dígitos) no `POST /api/pedidos`. A comparação no tracking usa a mesma forma, eliminando ambiguidade de formato.

**Response 200**
```json
{
  "order_number": 42,
  "status": "preparing",
  "modalidade": "entrega",
  "cliente_nome": "Julia Silva",
  "total": 68.70,
  "restaurante_nome": "Seu Restaurante",
  "itens": [
    { "nome": "X-Burguer", "quantidade": 2, "subtotal": 45.80 }
  ]
}
```

**Erros**
- `400` — `telefone` ausente na query
- `404` — pedido não encontrado ou telefone não confere (mesmo erro para os dois casos — evita info leakage)

---

### POST `/api/webhooks/mercadopago`
Recebe notificação de pagamento confirmado do Mercado Pago.

**Headers esperados**
```
x-signature: ts=...,v1=...
x-request-id: uuid
```

**Request (enviado pelo Mercado Pago)**
```json
{
  "action": "payment.updated",
  "data": { "id": "mp_payment_id" }
}
```

**Processamento interno**
1. Validar assinatura HMAC — rejeitar silenciosamente se inválida (retorna `200` mesmo assim)
2. Buscar `pagamentos` pelo `external_id` recebido
3. **Checar idempotência:** se `pagamentos.status` já for `approved`, retornar `200` sem processar novamente
4. Consultar status do pagamento na API do Mercado Pago
5. Se `approved`: atualizar `pagamentos.status = 'approved'` e `pedidos.status = 'paid'` via service role
6. Retornar `200` imediatamente (independente do resultado — evitar reenvio do Mercado Pago)

**Garantia de idempotência:**
```typescript
// Antes de atualizar, verificar se já foi processado
const pagamento = await supabaseAdmin
  .from('pagamentos')
  .select('id, status')
  .eq('external_id', mpPaymentId)
  .single()

if (pagamento?.status === 'approved') {
  return NextResponse.json({ received: true }) // já processado, ignorar
}
```

**Response 200**
```json
{ "received": true }
```

> Retorna sempre `200`. Erros de processamento são logados internamente. O Mercado Pago não deve reenviar o webhook desnecessariamente.

---

## ROTAS ADMIN (requerem autenticação)

---

### GET `/api/admin/pedidos`
Lista pedidos ativos do restaurante autenticado. Usado pelo polling do painel (a cada 5s).

**Query params (opcionais)**
- `status` — filtrar por status (ex: `?status=paid,preparing`)

**Response 200**
```json
[
  {
    "id": "uuid",
    "order_number": 42,
    "status": "preparing",
    "modalidade": "entrega",
    "cliente_nome": "Julia Silva",
    "cliente_telefone": "11999990000",
    "endereco_rua": "Rua das Flores",
    "endereco_numero": "123",
    "endereco_bairro": "Centro",
    "total": 68.70,
    "criado_em": "2026-04-13T15:00:00Z",
    "itens": [
      { "nome": "X-Burguer", "quantidade": 2, "subtotal": 45.80 }
    ]
  }
]
```

> Retorna apenas pedidos com status operacional ativo (exclui `delivered`, `cancelled`, `expired`).

**Erros**
- `401` — não autenticado

---

### PATCH `/api/admin/pedidos/[id]/status`
Avança o status do pedido. Apenas transições válidas são aceitas (ver data-model.md).

Valores aceitos: `preparing`, `ready`, `delivered`, `cancelled`.

**Request**
```json
{ "status": "preparing" }
```

**Response 200**
```json
{ "id": "uuid", "order_number": 42, "status": "preparing" }
```

**Erros**
- `400` — transição de status inválida
- `403` — pedido não pertence ao restaurante autenticado
- `404` — pedido não encontrado

---

### GET `/api/admin/cardapio`
Retorna cardápio completo do restaurante autenticado (categorias + produtos, incluindo indisponíveis).

**Response 200**
```json
[
  {
    "id": "uuid",
    "nome": "Lanches",
    "ordem": 0,
    "ativo": true,
    "produtos": [
      {
        "id": "uuid",
        "nome": "X-Burguer",
        "descricao": "Pão, carne, queijo",
        "preco": 22.90,
        "foto_url": "https://...",
        "disponivel": true,
        "ordem": 0
      }
    ]
  }
]
```

---

### POST `/api/admin/categorias`
Cria uma categoria.

**Request**
```json
{ "nome": "Lanches", "ordem": 0 }
```

**Response 201**
```json
{ "id": "uuid", "nome": "Lanches", "ordem": 0, "ativo": true }
```

**Erros**
- `400` — `nome` ausente

---

### PATCH `/api/admin/categorias/[id]`
Atualiza nome ou ordem de uma categoria.

**Request** (todos opcionais)
```json
{ "nome": "Lanches Especiais", "ordem": 1, "ativo": false }
```

**Response 200**
```json
{ "id": "uuid", "nome": "Lanches Especiais", "ordem": 1, "ativo": false }
```

---

### DELETE `/api/admin/categorias/[id]`
Remove a categoria. Falha se houver produtos vinculados.

**Response 200**
```json
{ "ok": true }
```

**Erros**
- `409` — categoria possui produtos vinculados

---

### POST `/api/admin/produtos`
Cria um produto.

**Request**
```json
{
  "categoria_id": "uuid",
  "nome": "X-Burguer",
  "descricao": "Pão, carne, queijo",
  "preco": 22.90,
  "foto_url": "https://...",
  "ordem": 0
}
```

Campos obrigatórios: `categoria_id`, `nome`, `preco`.

**Response 201**
```json
{
  "id": "uuid",
  "categoria_id": "uuid",
  "nome": "X-Burguer",
  "preco": 22.90,
  "disponivel": true
}
```

**Erros**
- `400` — campos obrigatórios ausentes, preço inválido
- `404` — categoria não encontrada

---

### PATCH `/api/admin/produtos/[id]`
Atualiza um produto. Todos os campos são opcionais.
Chama `revalidatePath('/${slug}')` após salvar.

**Request**
```json
{
  "nome": "X-Burguer Duplo",
  "preco": 27.90,
  "disponivel": false
}
```

**Response 200**
```json
{ "id": "uuid", "nome": "X-Burguer Duplo", "preco": 27.90, "disponivel": false }
```

---

### DELETE `/api/admin/produtos/[id]`
Remove um produto.
Chama `revalidatePath('/${slug}')` após deletar.

**Response 200**
```json
{ "ok": true }
```

---

### GET `/api/admin/restaurante`
Retorna dados de configuração do restaurante autenticado.

**Response 200**
```json
{
  "id": "uuid",
  "slug": "seu-restaurante",
  "nome": "Seu Restaurante",
  "logo_url": "https://...",
  "tipo": "delivery",
  "aceita_entrega": true,
  "aceita_retirada": true,
  "taxa_entrega": 5.00
}
```

---

### PATCH `/api/admin/restaurante`
Atualiza configurações do restaurante.
Chama `revalidatePath('/${slug}')` após salvar.

**Request** (todos opcionais)
```json
{
  "nome": "Novo Nome",
  "logo_url": "https://...",
  "aceita_entrega": true,
  "aceita_retirada": false,
  "taxa_entrega": 8.00
}
```

**Response 200**
```json
{ "id": "uuid", "slug": "seu-restaurante", "nome": "Novo Nome" }
```

**Erros**
- `409` — slug já em uso (se slug for alterado no futuro)
