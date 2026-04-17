# Product Requirements Document (PRD)
**Produto:** SaaS para Restaurantes — Plataforma de Pedidos e Gestão Operacional
**Versão:** 1.0
**Data:** 2026-04-13
**Status:** Aprovado para desenvolvimento MVP
**Responsável:** Product Manager

---

## 1. Visão do Produto

### 1.1 Declaração de Visão

Construir a plataforma mais simples e eficiente para restaurantes de pequeno e médio porte centralizarem seus pedidos, cardápio digital e pagamentos em um único sistema acessível pelo browser, eliminando a dependência de ferramentas fragmentadas como WhatsApp, iFood e papel.

### 1.2 Problema Central

Restaurantes de delivery, dark kitchens e lanchonetes operam hoje com múltiplas ferramentas desconectadas. Esse fracionamento gera:

- Pedidos perdidos ou duplicados por falta de centralização
- Erros operacionais por comunicação manual entre atendimento e cozinha
- Ausência de visibilidade financeira em tempo real
- Experiência ruim para o cliente final, reduzindo conversão e fidelização
- Alto custo operacional por ineficiência de processo

### 1.3 Solução Proposta

Uma plataforma SaaS B2B com interface web responsiva que oferece ao restaurante:

- Cardápio digital próprio acessível pelo cliente via link
- Sistema de pedidos online com fluxo de checkout completo
- Painel de gestão de pedidos em tempo real para a equipe operacional
- Pagamento integrado via PIX com confirmação automática

### 1.4 Diferencial Estratégico

Não compete com iFood no modelo de marketplace. Oferece ao restaurante independência de canal, zero comissão por pedido, e controle total da operação — com uma curva de aprendizado mínima.

---

## 2. Usuários e Personas

### Persona 1 — Dono do Restaurante (Admin)

**Nome representativo:** Carlos, 38 anos
**Perfil:** Proprietário de lanchonete ou dark kitchen com 20 a 100 pedidos/dia. Sem equipe de TI. Usa WhatsApp para pedidos e iFood como canal principal.

**Dores:**
- Paga comissão alta para marketplaces
- Não tem controle centralizado dos pedidos
- Depende de processos manuais e informais
- Não sabe quanto lucrou ao final do dia

**Objetivos com o produto:**
- Ter um cardápio digital próprio compartilhável
- Receber pedidos organizados sem depender de terceiros
- Confirmar pagamentos sem ligar para o cliente
- Visualizar o movimento do dia de forma simples

**Frequência de uso:** Configuração inicial (baixa) + acompanhamento diário (alta)
**Dispositivo principal:** Desktop/notebook para administração

---

### Persona 2 — Equipe Operacional (Cozinha / Atendimento)

**Nome representativo:** Ana, 25 anos
**Perfil:** Atendente ou cozinheiro em restaurante de delivery. Usa tablet ou celular no trabalho. Não tem familiaridade técnica avançada.

**Dores:**
- Recebe pedidos por diferentes canais ao mesmo tempo
- Perde pedidos por falta de organização
- Não sabe qual status comunicar para o cliente

**Objetivos com o produto:**
- Ver todos os pedidos em um único lugar
- Atualizar status de forma rápida e simples
- Ter clareza sobre o que está em fila, em preparo e concluído

**Frequência de uso:** Alta, durante toda a operação
**Dispositivo principal:** Tablet ou celular no balcão/cozinha

---

### Persona 3 — Cliente Final

**Nome representativo:** Julia, 29 anos
**Perfil:** Consumidora frequente de delivery. Usa celular para fazer pedidos. Valoriza experiência rápida e clara.

**Dores:**
- Processos de pedido demorados ou confusos
- Falta de confirmação ou acompanhamento do pedido
- Desconfiança em pagar sem clareza do processo

**Objetivos com o produto:**
- Fazer pedido em menos de 3 minutos
- Pagar com PIX de forma segura e rápida
- Acompanhar o status do pedido sem precisar ligar

**Frequência de uso:** Por pedido realizado
**Dispositivo principal:** Celular

---

## 3. Objetivos de Negócio e Métricas de Sucesso

### 3.1 Objetivos Estratégicos (Ano 1)

| Objetivo | Meta |
|----------|------|
| Validar product-market fit | Primeiros 5 restaurantes pagantes ativos em 60 dias pós-lançamento MVP |
| Escalar base de clientes | 50 a 100 restaurantes ativos no ano 1 |
| Gerar receita recorrente | MRR de R$4.000 a R$8.000/mês ao final do ano 1 |
| Manter retenção saudável | Churn mensal abaixo de 5% |
| Validar usabilidade | Taxa de conclusão do fluxo de pedido pelo cliente final acima de 70% |

### 3.2 Métricas de Produto (KPIs)

**Aquisição:**
- Número de restaurantes cadastrados por mês
- Taxa de conversão trial → pagante

**Ativação:**
- Tempo até o primeiro pedido recebido pelo restaurante
- Taxa de restaurantes que configuram cardápio completo em menos de 24h

**Engajamento:**
- Pedidos processados por restaurante por semana
- Taxa de atualização de status pelo restaurante (indica uso ativo do painel)

**Receita:**
- MRR (Monthly Recurring Revenue)
- Ticket médio por restaurante
- Churn rate mensal

**Produto:**
- Taxa de abandono de carrinho no fluxo de pedido
- Tempo médio do fluxo cliente (cardápio até finalização)
- Taxa de pagamentos PIX confirmados automaticamente

---

## 4. Funcionalidades por Prioridade

### Must Have (MVP — obrigatório para lançar)

| ID | Funcionalidade | Descrição |
|----|---------------|-----------|
| MH-01 | Cardápio Digital | Página pública do restaurante com categorias, produtos, foto, descrição e preço |
| MH-02 | Carrinho de Compras | Adição e remoção de itens, controle de quantidade, exibição de subtotal |
| MH-03 | Checkout de Pedido | Formulário com dados do cliente, escolha de entrega ou retirada, endereço condicionado ao tipo |
| MH-04 | Pagamento via PIX | Geração de QR Code PIX, exibição de chave, confirmação automática via webhook |
| MH-05 | Painel de Pedidos (restaurante) | Visualização em tempo real de todos os pedidos com status, dados do cliente e itens |
| MH-06 | Atualização de Status | Transição manual de status pelo restaurante: Recebido, Em Preparo, Saiu para Entrega, Concluído |
| MH-07 | Acompanhamento de Pedido (cliente) | Página de rastreamento com status atualizado em tempo real |
| MH-08 | Cadastro e Login do Restaurante | Autenticação por email/senha via Supabase Auth |
| MH-09 | Configuração Inicial do Restaurante | Cadastro de nome, logo, categorias de produtos e itens do cardápio |
| MH-10 | Link Público do Cardápio | URL única por restaurante para compartilhamento via WhatsApp, redes sociais, etc. |

### Should Have (V1 — importante, mas não bloqueia o MVP)

| ID | Funcionalidade | Descrição |
|----|---------------|-----------|
| SH-01 | Histórico de Pedidos | Listagem de pedidos anteriores com filtros por data e status |
| SH-02 | Resumo Financeiro Básico | Total de pedidos e valor recebido no dia/semana/mês |
| SH-03 | Notificação Sonora de Novo Pedido | Alerta sonoro no painel do restaurante ao receber pedido |
| SH-04 | Disponibilidade de Itens | Marcar produto como indisponível sem excluir do cardápio |
| SH-05 | Personalização do Cardápio | Ordenação de categorias, destaque de produtos, banner do restaurante |
| SH-06 | Cancelamento de Pedido | Fluxo para restaurante cancelar pedido com motivo |
| SH-07 | Google Login | Autenticação simplificada via Google OAuth |

### Nice to Have (Backlog Futuro)

| ID | Funcionalidade | Descrição |
|----|---------------|-----------|
| NH-01 | Integração WhatsApp | Notificações de pedido e status via WhatsApp Business API |
| NH-02 | Impressora Térmica | Impressão automática de comanda ao receber pedido |
| NH-03 | Controle de Estoque | Gestão de ingredientes e baixa automática por pedido |
| NH-04 | Relatórios Avançados | DRE, ticket médio, produtos mais vendidos, análise de pico |
| NH-05 | Múltiplas Filiais | Gestão centralizada de mais de um ponto de venda |
| NH-06 | App Mobile Nativo | iOS e Android com notificações push nativas |
| NH-07 | Integração iFood | Recebimento de pedidos do iFood no painel |
| NH-08 | Nota Fiscal | Emissão automatizada de NFC-e ou NF-e |
| NH-09 | Planos e Billing | Gestão de assinaturas, upgrade/downgrade, portal do cliente |
| NH-10 | PWA | Instalação progressiva via browser com funcionamento offline parcial |
| NH-11 | Cupons e Promoções | Criação de cupons de desconto e campanhas |
| NH-12 | Avaliações de Pedidos | Feedback do cliente após conclusão do pedido |

---

## 5. Fluxos Principais Detalhados

### Fluxo 1 — Pedido pelo Cliente Final

```
[1] Cliente acessa link público do cardápio (ex: plataforma.com/restaurante-x)
     |
[2] Visualiza categorias e produtos (foto, nome, descrição, preço)
     |
[3] Adiciona itens ao carrinho
     |
[4] Acessa o carrinho → revisa itens → avança para checkout
     |
[5] Preenche dados pessoais: nome, telefone
     |
[6] Escolhe modalidade:
     ├── Entrega → preenche endereço completo (rua, número, bairro, complemento)
     └── Retirada → sem endereço
     |
[7] Revisa resumo do pedido e total
     |
[8] Seleciona pagamento PIX
     |
[9] Sistema gera cobrança PIX via gateway e exibe QR Code + chave copia-e-cola
     |
[10] Cliente realiza pagamento no app bancário
     |
[11] Gateway confirma via webhook → sistema atualiza pedido para "Pago"
     |
[12] Cliente é redirecionado para página de acompanhamento do pedido
     |
[13] Cliente acompanha status em tempo real até "Concluído"
```

### Fluxo 2 — Gestão de Pedido pelo Restaurante

```
[1] Restaurante está logado no painel administrativo
     |
[2] Novo pedido chega → exibido em tempo real na fila com status "Recebido"
     |
[3] Equipe visualiza detalhes: itens, dados do cliente, modalidade, endereço
     |
[4] Restaurante atualiza status para "Em Preparo"
     |
[5] Pedido de entrega: atualiza para "Saiu para Entrega"
     Pedido de retirada: atualiza direto para "Pronto para Retirada"
     |
[6] Após entrega/retirada confirmada: atualiza para "Concluído"
     |
[7] Pedido move para seção de histórico
```

### Fluxo 3 — Configuração Inicial do Restaurante

```
[1] Fundador/dono acessa plataforma e cria conta (email + senha)
     |
[2] Preenche dados do restaurante: nome, tipo, telefone, endereço
     |
[3] Faz upload de logo
     |
[4] Cria categorias do cardápio (ex: Lanches, Bebidas, Sobremesas)
     |
[5] Adiciona produtos em cada categoria: nome, descrição, preço, foto
     |
[6] Configura modalidades disponíveis (entrega, retirada ou ambas)
     |
[7] Link público é gerado automaticamente
     |
[8] Restaurante compartilha link e começa a receber pedidos
```

---

## 6. Critérios de Aceite por Funcionalidade

### MH-01 — Cardápio Digital
- [ ] Página carrega em menos de 2 segundos em conexão 4G
- [ ] Exibe categorias com produtos agrupados corretamente
- [ ] Imagens são otimizadas e não quebram o layout em mobile
- [ ] Produtos indisponíveis não aparecem no cardápio (ou aparecem desabilitados)
- [ ] URL é única e acessível sem login

### MH-02 — Carrinho de Compras
- [ ] Adição de item incrementa quantidade corretamente
- [ ] Remoção de item decrementa ou remove do carrinho
- [ ] Subtotal é calculado corretamente a cada alteração
- [ ] Carrinho persiste durante a sessão do usuário (sem perder ao navegar no cardápio)
- [ ] Carrinho vazio bloqueia avanço para checkout

### MH-03 — Checkout de Pedido
- [ ] Campos obrigatórios são validados antes de avançar
- [ ] Endereço é exigido somente se modalidade for "Entrega"
- [ ] Usuário pode revisar pedido antes de confirmar
- [ ] Sistema não cria pedido duplicado em caso de duplo clique

### MH-04 — Pagamento via PIX
- [ ] QR Code é gerado em menos de 3 segundos após confirmação do pedido
- [ ] Chave PIX copia-e-cola funciona corretamente
- [ ] Webhook do gateway atualiza status do pedido automaticamente
- [ ] Em caso de pagamento não confirmado em X minutos, pedido expira
- [ ] PIX pago não pode ser reutilizado para outro pedido

### MH-05 — Painel de Pedidos
- [ ] Novo pedido aparece em tempo real sem necessidade de recarregar a página
- [ ] Pedidos exibem: número, horário, itens, total, dados do cliente, modalidade
- [ ] Pedidos são ordenados do mais recente para o mais antigo por padrão
- [ ] Painel é utilizável em tablet (tela mínima de 768px)

### MH-06 — Atualização de Status
- [ ] Transições de status seguem a sequência lógica definida
- [ ] Atualização reflete no painel do restaurante e na página do cliente em tempo real
- [ ] Não é possível voltar para status anterior (exceto cancelamento)
- [ ] Cada mudança de status registra horário

### MH-07 — Acompanhamento de Pedido (cliente)
- [ ] Página acessível via link único do pedido sem necessidade de login
- [ ] Status atualiza sem recarregar a página (realtime)
- [ ] Exibe nome do restaurante, itens do pedido, total e status atual
- [ ] Funciona corretamente em mobile

### MH-08 — Cadastro e Login do Restaurante
- [ ] Cadastro com email e senha funciona e envia email de confirmação
- [ ] Login com credenciais válidas redireciona para o painel
- [ ] Senha incorreta exibe mensagem de erro sem revelar qual campo está errado
- [ ] Sessão persiste por pelo menos 7 dias sem relogin

### MH-09 — Configuração do Restaurante
- [ ] Upload de logo aceita JPG e PNG, máximo 2MB
- [ ] Categorias podem ser criadas, editadas e excluídas
- [ ] Produtos podem ser criados com todos os campos obrigatórios
- [ ] Alterações no cardápio refletem no link público imediatamente

### MH-10 — Link Público do Cardápio
- [ ] URL segue padrão legível (ex: /r/nome-do-restaurante ou hash curto)
- [ ] Link funciona sem autenticação
- [ ] Link correto é exibido no painel do restaurante para fácil compartilhamento

---

## 7. Fora do Escopo (MVP)

Os itens abaixo foram explicitamente excluídos do MVP para manter foco e prazo. Qualquer solicitação de inclusão deve passar por revisão de escopo formal.

| Item | Motivo da Exclusão |
|------|-------------------|
| Integração iFood | Alta complexidade técnica e operacional. Não valida o núcleo do produto. |
| Controle financeiro avançado (DRE, relatórios) | Requer dados históricos e modelagem complexa. Valor agregado apenas após adoção. |
| Controle de estoque completo | Complexidade alta, varia muito por tipo de restaurante. Pós-PMF. |
| Múltiplas filiais | Demanda arquitetura multi-tenant adicional. Escopo de V2+. |
| App mobile nativo (iOS/Android) | Web responsivo resolve o MVP. App nativo exige equipe e custo maiores. |
| Integração WhatsApp | Dependente de aprovação de API Business. Pode ser feature de retenção pós-MVP. |
| Impressora térmica | Hardware-specific. Necessário apenas após validação operacional. |
| Nota fiscal (NFC-e/NF-e) | Regulatório e técnico. Importante a longo prazo, não bloqueia validação. |
| PWA / offline | Complexidade desnecessária no MVP. Web responsivo é suficiente. |
| Cupons e promoções | Feature de growth. Não é necessária para validar o core. |
| Login social (Google) | Conveniente, não crítico para B2B. Supabase Auth email/senha é suficiente. |
| Billing e gestão de planos in-app | No MVP, cobrança pode ser manual ou via link externo. |

---

## 8. Riscos e Dependências

### 8.1 Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Webhook do gateway PIX com falhas ou atraso | Média | Alto | Implementar polling de fallback e fila de reprocessamento |
| Supabase Realtime com instabilidade em pico | Baixa | Alto | Testar carga antes do lançamento; ter fallback de polling |
| Gateway PIX não aprovado a tempo (conta comercial) | Média | Alto | Iniciar processo de abertura de conta Mercado Pago/MP com antecedência |
| Performance do cardápio em mobile em conexões lentas | Média | Médio | Otimizar imagens, usar lazy loading, testar em 3G |

### 8.2 Riscos de Produto

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Restaurante não consegue configurar cardápio sozinho | Média | Alto | Onboarding guiado + suporte por WhatsApp no lançamento |
| Cliente final abandona no fluxo de pagamento PIX | Média | Alto | UX clara com instruções passo a passo, countdown do QR Code |
| Churn precoce por falta de funcionalidades | Média | Médio | Coletar feedback ativo nas primeiras semanas e priorizar V1 |
| Fluxo de pedido confuso em mobile | Baixa | Alto | Testes com usuários reais antes do lançamento |

### 8.3 Dependências Externas

| Dependência | Risco | Ação |
|-------------|-------|------|
| Gateway PIX (Mercado Pago ou Mercado Pago) | Aprovação de conta e habilitação de webhook | Iniciar abertura de conta na semana 1 |
| Supabase | Plano gratuito pode ter limites de conexões | Monitorar e ter plano de upgrade previsto |
| Vercel | Limite de execução em plano free | Avaliar limites de serverless functions |
| Supabase Auth | Dependência total para autenticação | Documentar fallback manual se necessário |

### 8.4 Dependências Internas

- Cardápio do restaurante piloto precisa ser cadastrado antes do primeiro teste real
- Definição final do gateway PIX (Mercado Pago vs Mercado Pago) deve ocorrer na semana 1 do desenvolvimento
- Design das telas críticas (cardápio, checkout, painel) deve estar aprovado antes de codificar

---

## 9. Premissas

- O restaurante tem acesso à internet durante a operação
- O cliente final tem acesso ao aplicativo bancário para pagamento PIX
- O time de 2 pessoas consegue manter o prazo de 30-45 dias com uso intensivo de IA
- O plano inicial de R$49-99/mês será praticado como plano único no MVP (sem diferenciação de planos)
- Conformidade básica com LGPD será implementada (sem dados sensíveis expostos), mas política completa e DPO ficam para V1

---

## 10. Decisões de Produto Registradas

| # | Decisão | Escolha | Motivo |
|---|---------|---------|--------|
| 1 | Modelo de acesso do cliente final | **Guest (sem conta)** | Reduz fricção, aumenta conversão. Dados obrigatórios: nome, telefone, endereço (se entrega). Acompanhamento por número do pedido + telefone. |
| 2 | URL do cardápio | **`/[slug-do-restaurante]`** (ex: `/seu-restaurante`) | Multi-tenant SaaS, fácil compartilhamento, padrão de mercado. |
| 3 | Gateway PIX | **Mercado Pago** | Acesso imediato disponível, menor fricção para validação inicial, prioridade de velocidade de execução. Suporte a múltiplos gateways (incluindo Mercado Pago) avaliado no futuro. |

---

*Documento gerado em 2026-04-13. Decisões registradas em 2026-04-13. Deve ser revisado ao início de cada sprint e atualizado a cada mudança de escopo.*
