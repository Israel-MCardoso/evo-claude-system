# Sprint 01 — Fundação + Cardápio
**Período:** Dias 1–10
**Objetivo:** Cardápio público no ar o mais rápido possível. Admin e auth evoluem depois.
**Épicos cobertos:** E1 (Fundação), E2 (Cardápio)

---

## Princípio deste sprint

> **Público primeiro.** Validar que `/:slug` funciona antes de construir o admin.
> A sequência reduz risco: se algo travar no admin ou auth, o core já está no ar.

---

## Ordem de execução

```
Dia 1    T01  Setup do projeto
Dia 1-2  T02  Schema básico + seed
Dia 2    T03  Clientes Supabase
Dia 2-3  T04  API pública: GET /api/restaurantes/[slug]
Dia 3-4  T05  Cardápio público /:slug  ← entregável mínimo validado aqui
─────────────────────────────────────────────────────
Dia 4-5  T06  API admin: categorias + produtos (sem auth ainda)
Dia 5-7  T07  Tela admin: cardápio (CRUD)
Dia 7-8  T08  Login + auth guard
Dia 8-9  T09  Página de configurações do restaurante
Dia 9    T10  Upload de imagens (logo + foto de produto)
Dia 9-10 T11  Layout do painel + banner onboarding
Dia 10   T12  Ajustes, testes e deploy estável
```

---

## Tarefas

### T01 — Setup do projeto
**Dias:** 1 | **Depende de:** —

- [ ] Criar repositório Next.js 14 com App Router + TypeScript
- [ ] Configurar Tailwind CSS
- [ ] Criar projeto no Supabase (free tier) e guardar keys
- [ ] Criar projeto na Vercel e conectar ao repositório
- [ ] Configurar variáveis de ambiente:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_APP_URL`
- [ ] Estrutura de pastas conforme `docs/architecture.md`
- [ ] Deploy inicial respondendo na Vercel (página em branco ok)

**Pronto quando:** `npm run dev` sem erros, Vercel respondendo

---

### T02 — Schema básico + seed
**Dias:** 1–2 | **Depende de:** T01

Schema restrito ao necessário para o Sprint 01. Apenas as tabelas que serão efetivamente usadas neste sprint.

> **Alinhamento:** "schema completo no dia 1" significa o schema do Sprint 01 — não o schema total do MVP. Tabelas de pedidos, pagamentos e itens_pedido serão criadas nos sprints correspondentes.

- [ ] Migration: `restaurantes`
- [ ] Migration: `categorias`
- [ ] Migration: `produtos`
- [ ] Migration: `restaurant_users` (necessária para auth no T08)
- [ ] Índices: `idx_restaurantes_slug`, `idx_produtos_categoria`
- [ ] RLS: políticas de **leitura pública** (restaurantes ativos, produtos disponíveis, categorias ativas)
- [ ] RLS: função helper `meu_restaurante_id()` + políticas admin (prontas para T08)
- [ ] `supabase/seed.sql` com dados do restaurante piloto:
  - 1 restaurante com slug definido
  - 3 categorias
  - 5–8 produtos (sem fotos ainda — `foto_url: null`)

**Pronto quando:** seed aplicado, dados visíveis no Supabase dashboard

---

### T03 — Clientes Supabase
**Dias:** 2 | **Depende de:** T01

- [ ] `src/lib/supabase/server.ts` — `createServerClient` com cookies
- [ ] `src/lib/supabase/browser.ts` — `createBrowserClient`
- [ ] `src/lib/supabase/admin.ts` — service role (reservado para webhook)

**Pronto quando:** imports sem erro de tipo

---

### T04 — API pública: cardápio
**Dias:** 2–3 | **Depende de:** T02, T03

- [ ] `GET /api/restaurantes/[slug]`
  - Retorna restaurante + categorias ativas + produtos disponíveis agrupados
  - 404 se restaurante não existir ou estiver inativo
  - Sem autenticação

**Response esperado:**
```json
{
  "id": "uuid",
  "slug": "restaurante-piloto",
  "nome": "Restaurante Piloto",
  "logo_url": null,
  "aceita_entrega": true,
  "aceita_retirada": true,
  "taxa_entrega": 5.00,
  "categorias": [
    {
      "id": "uuid",
      "nome": "Lanches",
      "ordem": 0,
      "produtos": [
        { "id": "uuid", "nome": "X-Burguer", "preco": 22.90, "foto_url": null }
      ]
    }
  ]
}
```

**Pronto quando:** `curl /api/restaurantes/restaurante-piloto` retorna dados corretos sem autenticação

---

### T05 — Cardápio público `/:slug`
**Dias:** 3–4 | **Depende de:** T04

**Este é o entregável mínimo do sprint.** Com T05 concluído, o produto tem valor demonstrável.

- [ ] `app/(public)/[slug]/page.tsx` com `export const revalidate = 60`
- [ ] Header: logo (placeholder se null) + nome do restaurante
- [ ] Nav sticky horizontal: tabs de categorias com scroll suave para cada seção
- [ ] Lista de produtos por categoria: foto (placeholder se null), nome, preço
- [ ] Modal ao clicar no produto: foto maior, descrição, quantidade, botão "Adicionar" (sem carrinho ainda — botão desabilitado/placeholder)
- [ ] Estado vazio: "Cardápio em atualização" se sem produtos
- [ ] 404 para slug inexistente
- [ ] Responsivo: mobile 375px prioritário, desktop funcional

**Pronto quando:**
- [ ] `[APP_URL]/restaurante-piloto` abre sem login
- [ ] Categorias e produtos aparecem agrupados
- [ ] Nav sticky funciona em mobile
- [ ] Carrega em < 2s

> **Marco:** a partir daqui o link pode ser compartilhado para validação visual com o restaurante piloto.

---

### T06 — API admin: categorias + produtos
**Dias:** 4–5 | **Depende de:** T02, T03

> **Alinhamento:** rotas admin são implementadas sem auth apenas como estratégia de desenvolvimento local. Auth é aplicada obrigatoriamente na T08, antes do sprint ser considerado concluído. Nenhuma rota admin vai para produção sem proteção.

Usar `restaurante_id` fixo do seed para testar localmente durante o desenvolvimento.

- [ ] `GET /api/admin/cardapio` — categorias + produtos (incluindo indisponíveis)
- [ ] `POST /api/admin/categorias`
- [ ] `PATCH /api/admin/categorias/[id]`
- [ ] `DELETE /api/admin/categorias/[id]` — 409 se tiver produtos
- [ ] `POST /api/admin/produtos`
- [ ] `PATCH /api/admin/produtos/[id]`
- [ ] `DELETE /api/admin/produtos/[id]`
- [ ] Chamar `revalidatePath('/[slug]')` em toda mutação
- [ ] Validação com Zod nos bodies de entrada

**Pronto quando:** CRUD funcional via Postman/curl; editar produto → cardápio público atualiza

---

### T07 — Tela admin: gestão do cardápio
**Dias:** 5–7 | **Depende de:** T06

- [ ] `/painel/cardapio` — lista de categorias com produtos aninhados
- [ ] Formulário inline ou modal para criar/editar categoria
- [ ] Formulário inline ou modal para criar/editar produto
  - Campos: nome, descrição, preço, categoria, disponível
  - Campo foto: aceita URL manualmente por ora (upload entra na T10)
- [ ] Botão excluir com confirmação (sem modal separado — confirm inline)
- [ ] Estado vazio: "Nenhuma categoria ainda. Crie a primeira."
- [ ] Toast de feedback em todas as ações (sucesso/erro)

**Pronto quando:** operador cria categoria → adiciona produto → vê no cardápio público

---

### T08 — Login + auth guard
**Dias:** 7–8 | **Depende de:** T07

- [ ] Migration: `restaurant_users` (se ainda não criada no T02)
- [ ] Seed: vincular usuário Supabase Auth ao restaurante piloto
- [ ] Página `/login` — formulário email + senha
- [ ] `supabase.auth.signInWithPassword` + redirect para `/painel`
- [ ] Mensagem de erro para credenciais inválidas
- [ ] `middleware.ts` protege `/painel/*` e `/api/admin/*`
- [ ] Redirect para `/login` se não autenticado
- [ ] Helper `get-restaurante-id.ts` — extrai `restaurante_id` do usuário
- [ ] Aplicar `getRestauranteId` em todas as rotas admin (T06)
- [ ] Botão de logout no painel

**Pronto quando:**       
- [ ] Acesso a `/painel` sem sessão → redirect para `/login`
- [ ] Login com credenciais erradas → mensagem de erro
- [ ] Login correto → acesso ao painel
- [ ] API admin sem sessão → 401

---

### T09 — Configurações do restaurante
**Dias:** 8–9 | **Depende de:** T08

- [ ] `GET /api/admin/restaurante`
- [ ] `PATCH /api/admin/restaurante` — nome, modalidades, taxa de entrega (logo_url via URL por ora)
- [ ] `/painel/configuracoes` — formulário com os campos acima
- [ ] Exibir link público: `[APP_URL]/[slug]`
- [ ] Botão "Copiar link" (clipboard API)
- [ ] Botão "Ver cardápio" (abre nova aba)
- [ ] `revalidatePath('/${slug}')` no PATCH

**Pronto quando:** salvar altera os dados; toast confirma; link copiado

---

### T10 — Upload de imagens
**Dias:** 9 | **Depende de:** T08

- [ ] Bucket `produtos` no Supabase Storage (público, leitura aberta)
- [ ] Bucket `logos` no Supabase Storage (público, leitura aberta)
- [ ] Helper `src/lib/storage/upload.ts` — upload e retorna URL pública
- [ ] Validação server-side: MIME type (JPG/PNG) + tamanho (max 2MB)
- [ ] Componente `<ImageUpload>` com preview imediato
- [ ] Integrar no formulário de produto (T07) e na página de configurações (T09)

**Pronto quando:** upload de JPG/PNG funciona; arquivo > 2MB ou formato inválido retorna erro amigável

---

### T11 — Layout do painel + onboarding
**Dias:** 9–10 | **Depende de:** T08

- [ ] `app/(admin)/painel/layout.tsx` com sidebar (desktop) e bottom nav (mobile/tablet)
- [ ] Links: Pedidos (placeholder), Cardápio, Configurações
- [ ] Link ativo destacado visualmente
- [ ] Nome do restaurante no header
- [ ] Banner de onboarding: exibido se restaurante tem 0 produtos
  - Texto: "Seu cardápio está vazio. Configure antes de receber pedidos."
  - CTA: "Ir para cardápio"
  - Some quando houver ≥ 1 produto ativo

**Pronto quando:** navegação entre seções funciona; banner aparece para restaurante sem produtos

---

### T12 — Testes + ajustes + deploy estável
**Dias:** 10 | **Depende de:** T01–T11

- [ ] Testar fluxo completo em mobile (375px) e tablet (768px)
- [ ] Testar RLS: usuário A não acessa dados do usuário B
- [ ] Testar leitura pública sem autenticação
- [ ] Testar `revalidatePath`: editar produto → confirmar atualização no cardápio
- [ ] Verificar sem `console.error` não tratados no browser
- [ ] Confirmar deploy na Vercel estável (sem cold start > 3s)
- [ ] Compartilhar link `/:slug` com restaurante piloto para feedback visual

---

## Definição de Pronto — Sprint 01

- [ ] Cardápio público `/:slug` funciona sem login
- [ ] Editar produto no admin → atualização imediata no público
- [ ] Login protege o painel corretamente
- [ ] **Todas as rotas `/api/admin/*` retornam 401 sem sessão válida** — nenhuma rota admin acessível sem auth em produção
- [ ] CRUD de categorias e produtos funcional
- [ ] Upload de foto funcionando
- [ ] Deploy estável na Vercel
- [ ] Sem erros críticos no console

---

## Riscos

| Risco | Prob. | Mitigação |
|-------|-------|-----------|
| RLS bloqueando leitura pública | Média | Testar com usuário anônimo logo no T05 |
| revalidatePath não funcionando no preview | Baixa | Testar em produção real no T06 |
| CORS no Supabase Storage | Média | Testar upload no T10 antes de integrar ao formulário |
| Auth guard quebrando rotas já funcionais | Baixa | Aplicar auth apenas após CRUD testado (T08 vem depois de T07) |
