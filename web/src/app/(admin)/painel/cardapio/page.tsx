'use client'

// T07 — Gestão de categorias e produtos
// Bloco 3: + criar produto dentro da categoria

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatarPreco } from '@/lib/utils/format'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface ProdutoAdmin {
  id: string
  nome: string
  descricao: string | null
  preco: number
  foto_url: string | null
  disponivel: boolean
  ordem: number
  categoria_id: string
}

interface CategoriaAdmin {
  id: string
  nome: string
  ordem: number
  ativo: boolean
  produtos: ProdutoAdmin[]
}

interface FormCategoria {
  nome: string
  ordem: string
  ativo: boolean
}

interface FormProduto {
  nome: string
  descricao: string
  preco: string
  disponivel: boolean
  ordem: string
  foto_url: string
}

const FORM_CATEGORIA_VAZIO: FormCategoria = { nome: '', ordem: '0', ativo: true }
const FORM_PRODUTO_VAZIO: FormProduto = {
  nome: '',
  descricao: '',
  preco: '',
  disponivel: true,
  ordem: '0',
  foto_url: '',
}

// ---------------------------------------------------------------------------
// Subcomponente: formulário de categoria
// ---------------------------------------------------------------------------

function FormularioCategoria({
  titulo,
  inicial,
  enviando,
  erro,
  onSubmit,
  onCancelar,
}: {
  titulo: string
  inicial: FormCategoria
  enviando: boolean
  erro: string
  onSubmit: (dados: FormCategoria) => void
  onCancelar: () => void
}) {
  const [form, setForm] = useState<FormCategoria>(inicial)

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} noValidate className="space-y-3">
      <p className="text-sm font-semibold text-gray-700">{titulo}</p>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
        <input
          type="text"
          value={form.nome}
          onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          placeholder="Ex: Lanches, Bebidas..."
          autoFocus
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ordem</label>
          <input
            type="number"
            min={0}
            value={form.ordem}
            onChange={(e) => setForm((f) => ({ ...f, ordem: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
              className="w-4 h-4 accent-gray-900"
            />
            <span className="text-sm text-gray-700">Ativa</span>
          </label>
        </div>
      </div>

      {erro && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancelar}
          className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={enviando}
          className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60">
          {enviando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Subcomponente: formulário de produto
// ---------------------------------------------------------------------------

function FormularioProduto({
  titulo,
  inicial,
  enviando,
  erro,
  onSubmit,
  onCancelar,
}: {
  titulo: string
  inicial: FormProduto
  enviando: boolean
  erro: string
  onSubmit: (dados: FormProduto) => void
  onCancelar: () => void
}) {
  const [form, setForm] = useState<FormProduto>(inicial)
  const [fazendoUpload, setFazendoUpload] = useState(false)
  const [erroUpload, setErroUpload] = useState('')
  const [previewLocal, setPreviewLocal] = useState('')
  const blobUrlRef = useRef('')

  // Revoga blob URL ao desmontar para não vazar memória
  useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current) }, [])

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview imediato antes do upload completar
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    const blob = URL.createObjectURL(file)
    blobUrlRef.current = blob
    setPreviewLocal(blob)
    setErroUpload('')
    setFazendoUpload(true)

    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload/produto-foto', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setErroUpload(data.error ?? 'Erro ao enviar imagem.')
        setPreviewLocal('')
        return
      }

      setForm((f) => ({ ...f, foto_url: data.url }))
    } catch {
      setErroUpload('Erro de conexão. Tente novamente.')
      setPreviewLocal('')
    } finally {
      setFazendoUpload(false)
    }
  }

  const fotoAtual = previewLocal || form.foto_url

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} noValidate className="space-y-3">
      <p className="text-sm font-semibold text-gray-700">{titulo}</p>

      {/* Nome */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
        <input
          type="text"
          value={form.nome}
          onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          placeholder="Ex: X-Burguer"
          autoFocus
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Descrição <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          value={form.descricao}
          onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
          placeholder="Ingredientes, observações..."
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </div>

      {/* Preço + Ordem */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Preço (R$)</label>
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={form.preco}
            onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))}
            placeholder="0,00"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ordem</label>
          <input
            type="number"
            min={0}
            value={form.ordem}
            onChange={(e) => setForm((f) => ({ ...f, ordem: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      {/* Foto — upload com preview */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Foto <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <div className="flex items-center gap-3">
          {/* Thumbnail / placeholder */}
          <div className="relative w-14 h-14 rounded-lg bg-gray-100 shrink-0 overflow-hidden flex items-center justify-center">
            {fotoAtual ? (
              <img src={fotoAtual} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
            {fazendoUpload && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Controles */}
          <div>
            <label className={`inline-flex items-center px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg transition-colors ${fazendoUpload ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}>
              {fazendoUpload ? 'Enviando...' : fotoAtual ? 'Alterar foto' : 'Adicionar foto'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={fazendoUpload}
                onChange={handleFoto}
              />
            </label>
            {fotoAtual && !fazendoUpload && (
              <button
                type="button"
                onClick={() => { setPreviewLocal(''); setForm((f) => ({ ...f, foto_url: '' })) }}
                className="ml-2 text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                Remover
              </button>
            )}
            {erroUpload && (
              <p className="text-xs text-red-600 mt-1">{erroUpload}</p>
            )}
          </div>
        </div>
      </div>

      {/* Disponível */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={form.disponivel}
            onChange={(e) => setForm((f) => ({ ...f, disponivel: e.target.checked }))}
            className="w-4 h-4 accent-gray-900"
          />
          <span className="text-sm text-gray-700">Disponível no cardápio</span>
        </label>
      </div>

      {erro && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancelar}
          className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={enviando || fazendoUpload}
          className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60">
          {enviando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function CardapioAdminPage() {
  const [categorias, setCategorias] = useState<CategoriaAdmin[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  // Categoria: criar
  const [criandoCategoria, setCriandoCategoria] = useState(false)
  const [enviandoCriacao, setEnviandoCriacao] = useState(false)
  const [erroCriacao, setErroCriacao] = useState('')

  // Categoria: editar
  const [editandoCategoria, setEditandoCategoria] = useState<string | null>(null)
  const [enviandoEdicaoCategoria, setEnviandoEdicaoCategoria] = useState(false)
  const [erroEdicaoCategoria, setErroEdicaoCategoria] = useState('')

  // Categoria: excluir
  const [confirmandoExclusaoCategoria, setConfirmandoExclusaoCategoria] = useState<string | null>(null)
  const [excluindoCategoria, setExcluindoCategoria] = useState(false)
  const [errosExclusaoCategoria, setErrosExclusaoCategoria] = useState<Record<string, string>>({})

  // Produto: criar
  const [criandoProdutoEmCategoria, setCriandoProdutoEmCategoria] = useState<string | null>(null)
  const [enviandoCriacaoProduto, setEnviandoCriacaoProduto] = useState(false)
  const [erroCriacaoProduto, setErroCriacaoProduto] = useState('')

  // Produto: editar
  const [editandoProduto, setEditandoProduto] = useState<string | null>(null)
  const [enviandoEdicaoProduto, setEnviandoEdicaoProduto] = useState(false)
  const [erroEdicaoProduto, setErroEdicaoProduto] = useState('')

  // Produto: excluir
  const [confirmandoExclusaoProduto, setConfirmandoExclusaoProduto] = useState<string | null>(null)
  const [excluindoProduto, setExcluindoProduto] = useState(false)
  const [errosExclusaoProduto, setErrosExclusaoProduto] = useState<Record<string, string>>({})

  // Produto: toggle disponibilidade
  const [toglandoDisponibilidade, setToglandoDisponibilidade] = useState<string | null>(null)
  const [errosToggle, setErrosToggle] = useState<Record<string, string>>({})

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  const fetchCardapio = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cardapio')
      if (!res.ok) { setErro('Erro ao carregar cardápio.'); return }
      const data = await res.json()
      setCategorias(data.categorias ?? [])
      setErro('')
    } catch {
      setErro('Erro de conexão.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { fetchCardapio() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fecha tudo que estiver aberto
  function fecharTudo() {
    setCriandoCategoria(false)
    setEditandoCategoria(null)
    setConfirmandoExclusaoCategoria(null)
    setCriandoProdutoEmCategoria(null)
    setEditandoProduto(null)
    setConfirmandoExclusaoProduto(null)
  }

  // -------------------------------------------------------------------------
  // Criar categoria
  // -------------------------------------------------------------------------

  function abrirCriacao() {
    fecharTudo()
    setErroCriacao('')
    setCriandoCategoria(true)
  }

  async function handleCriarCategoria(form: FormCategoria) {
    if (!form.nome.trim()) { setErroCriacao('Nome obrigatório'); return }
    setEnviandoCriacao(true)
    setErroCriacao('')
    try {
      const res = await fetch('/api/admin/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome.trim(), ordem: parseInt(form.ordem) || 0, ativo: form.ativo }),
      })
      const data = await res.json()
      if (!res.ok) { setErroCriacao(data.error ?? 'Erro ao criar categoria'); return }
      setCriandoCategoria(false)
      await fetchCardapio()
    } catch {
      setErroCriacao('Erro de conexão. Tente novamente.')
    } finally {
      setEnviandoCriacao(false)
    }
  }

  // -------------------------------------------------------------------------
  // Editar categoria
  // -------------------------------------------------------------------------

  function abrirEdicaoCategoria(cat: CategoriaAdmin) {
    fecharTudo()
    setErroEdicaoCategoria('')
    setEditandoCategoria(cat.id)
  }

  async function handleEditarCategoria(id: string, form: FormCategoria) {
    if (!form.nome.trim()) { setErroEdicaoCategoria('Nome obrigatório'); return }
    setEnviandoEdicaoCategoria(true)
    setErroEdicaoCategoria('')
    try {
      const res = await fetch(`/api/admin/categorias/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome.trim(), ordem: parseInt(form.ordem) || 0, ativo: form.ativo }),
      })
      const data = await res.json()
      if (!res.ok) { setErroEdicaoCategoria(data.error ?? 'Erro ao atualizar categoria'); return }
      setEditandoCategoria(null)
      await fetchCardapio()
    } catch {
      setErroEdicaoCategoria('Erro de conexão. Tente novamente.')
    } finally {
      setEnviandoEdicaoCategoria(false)
    }
  }

  // -------------------------------------------------------------------------
  // Excluir categoria
  // -------------------------------------------------------------------------

  function pedirConfirmacaoExclusaoCategoria(id: string) {
    fecharTudo()
    setErrosExclusaoCategoria((prev) => { const n = { ...prev }; delete n[id]; return n })
    setConfirmandoExclusaoCategoria(id)
  }

  async function handleExcluirCategoria(id: string) {
    setExcluindoCategoria(true)
    try {
      const res = await fetch(`/api/admin/categorias/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrosExclusaoCategoria((prev) => ({ ...prev, [id]: data.error ?? 'Erro ao excluir categoria' }))
        setConfirmandoExclusaoCategoria(null)
        return
      }
      setConfirmandoExclusaoCategoria(null)
      await fetchCardapio()
    } catch {
      setErrosExclusaoCategoria((prev) => ({ ...prev, [id]: 'Erro de conexão.' }))
      setConfirmandoExclusaoCategoria(null)
    } finally {
      setExcluindoCategoria(false)
    }
  }

  // -------------------------------------------------------------------------
  // Criar produto
  // -------------------------------------------------------------------------

  function abrirCriacaoProduto(categoriaId: string) {
    fecharTudo()
    setErroCriacaoProduto('')
    setCriandoProdutoEmCategoria(categoriaId)
  }

  async function handleCriarProduto(categoriaId: string, form: FormProduto) {
    if (!form.nome.trim()) { setErroCriacaoProduto('Nome obrigatório'); return }
    const preco = parseFloat(form.preco)
    if (!preco || preco <= 0) { setErroCriacaoProduto('Informe um preço válido'); return }

    setEnviandoCriacaoProduto(true)
    setErroCriacaoProduto('')

    try {
      const res = await fetch('/api/admin/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || null,
          preco,
          categoria_id: categoriaId,
          disponivel: form.disponivel,
          ordem: parseInt(form.ordem) || 0,
          foto_url: form.foto_url.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) { setErroCriacaoProduto(data.error ?? 'Erro ao criar produto'); return }

      setCriandoProdutoEmCategoria(null)
      await fetchCardapio()
    } catch {
      setErroCriacaoProduto('Erro de conexão. Tente novamente.')
    } finally {
      setEnviandoCriacaoProduto(false)
    }
  }

  // -------------------------------------------------------------------------
  // Toggle disponibilidade do produto
  // -------------------------------------------------------------------------

  async function handleToggleDisponibilidade(prod: ProdutoAdmin) {
    setToglandoDisponibilidade(prod.id)
    setErrosToggle((prev) => { const n = { ...prev }; delete n[prod.id]; return n })
    try {
      const res = await fetch(`/api/admin/produtos/${prod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disponivel: !prod.disponivel }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrosToggle((prev) => ({ ...prev, [prod.id]: data.error ?? 'Erro ao atualizar' }))
        return
      }
      await fetchCardapio()
    } catch {
      setErrosToggle((prev) => ({ ...prev, [prod.id]: 'Erro de conexão.' }))
    } finally {
      setToglandoDisponibilidade(null)
    }
  }

  // -------------------------------------------------------------------------
  // Editar produto
  // -------------------------------------------------------------------------

  function abrirEdicaoProduto(prod: ProdutoAdmin) {
    fecharTudo()
    setErroEdicaoProduto('')
    setEditandoProduto(prod.id)
  }

  async function handleEditarProduto(id: string, form: FormProduto) {
    if (!form.nome.trim()) { setErroEdicaoProduto('Nome obrigatório'); return }
    const preco = parseFloat(form.preco)
    if (!preco || preco <= 0) { setErroEdicaoProduto('Informe um preço válido'); return }

    setEnviandoEdicaoProduto(true)
    setErroEdicaoProduto('')

    try {
      const res = await fetch(`/api/admin/produtos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || null,
          preco,
          disponivel: form.disponivel,
          ordem: parseInt(form.ordem) || 0,
          foto_url: form.foto_url.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErroEdicaoProduto(data.error ?? 'Erro ao atualizar produto'); return }
      setEditandoProduto(null)
      await fetchCardapio()
    } catch {
      setErroEdicaoProduto('Erro de conexão. Tente novamente.')
    } finally {
      setEnviandoEdicaoProduto(false)
    }
  }

  // -------------------------------------------------------------------------
  // Excluir produto
  // -------------------------------------------------------------------------

  function pedirConfirmacaoExclusaoProduto(id: string) {
    fecharTudo()
    setErrosExclusaoProduto((prev) => { const n = { ...prev }; delete n[id]; return n })
    setConfirmandoExclusaoProduto(id)
  }

  async function handleExcluirProduto(id: string) {
    setExcluindoProduto(true)
    try {
      const res = await fetch(`/api/admin/produtos/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrosExclusaoProduto((prev) => ({ ...prev, [id]: data.error ?? 'Erro ao excluir produto' }))
        setConfirmandoExclusaoProduto(null)
        return
      }
      setConfirmandoExclusaoProduto(null)
      await fetchCardapio()
    } catch {
      setErrosExclusaoProduto((prev) => ({ ...prev, [id]: 'Erro de conexão.' }))
      setConfirmandoExclusaoProduto(null)
    } finally {
      setExcluindoProduto(false)
    }
  }

  // -------------------------------------------------------------------------
  // Estados de tela
  // -------------------------------------------------------------------------

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Carregando cardápio...</p>
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{erro}</p>
      </div>
    )
  }

  const algoAberto =
    criandoCategoria ||
    editandoCategoria !== null ||
    confirmandoExclusaoCategoria !== null ||
    criandoProdutoEmCategoria !== null ||
    editandoProduto !== null ||
    confirmandoExclusaoProduto !== null

  // -------------------------------------------------------------------------
  // Render principal
  // -------------------------------------------------------------------------

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-semibold text-gray-900">Cardápio</h1>
        <button
          onClick={abrirCriacao}
          disabled={criandoCategoria}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nova categoria
        </button>
      </div>

      {/* Formulário nova categoria */}
      {criandoCategoria && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <FormularioCategoria
            titulo="Nova categoria"
            inicial={FORM_CATEGORIA_VAZIO}
            enviando={enviandoCriacao}
            erro={erroCriacao}
            onSubmit={handleCriarCategoria}
            onCancelar={() => { setCriandoCategoria(false); setErroCriacao('') }}
          />
        </div>
      )}

      {/* Estado vazio */}
      {categorias.length === 0 && !criandoCategoria && (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2" />
            </svg>
          </div>
          <p className="font-medium text-gray-700 mb-1">Nenhuma categoria ainda</p>
          <p className="text-sm text-gray-400 mb-4">Crie a primeira categoria para começar</p>
          <button onClick={abrirCriacao} className="text-sm font-medium text-gray-900 underline underline-offset-2">
            Criar categoria
          </button>
        </div>
      )}

      {/* Lista de categorias */}
      <div className="space-y-6">
        {categorias.map((cat) => {
          const estaEditandoCat       = editandoCategoria === cat.id
          const estaConfirmandoExcCat = confirmandoExclusaoCategoria === cat.id
          const erroExcCat            = errosExclusaoCategoria[cat.id]
          const criandoProdutoAqui    = criandoProdutoEmCategoria === cat.id

          return (
            <section key={cat.id}>

              {/* Edição inline da categoria */}
              {estaEditandoCat ? (
                <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-4 mb-2">
                  <FormularioCategoria
                    titulo={`Editando: ${cat.nome}`}
                    inicial={{ nome: cat.nome, ordem: String(cat.ordem), ativo: cat.ativo }}
                    enviando={enviandoEdicaoCategoria}
                    erro={erroEdicaoCategoria}
                    onSubmit={(form) => handleEditarCategoria(cat.id, form)}
                    onCancelar={() => { setEditandoCategoria(null); setErroEdicaoCategoria('') }}
                  />
                </div>
              ) : (
                /* Header normal */
                <div className="flex items-center gap-2 mb-2 px-1">
                  <h2 className="font-semibold text-gray-900 text-sm">{cat.nome}</h2>
                  {!cat.ativo && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 uppercase tracking-wide">
                      inativa
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {cat.produtos.length} {cat.produtos.length === 1 ? 'produto' : 'produtos'}
                  </span>

                  {!estaConfirmandoExcCat && (
                    <div className="ml-auto flex items-center gap-1">
                      <button onClick={() => abrirEdicaoCategoria(cat)} disabled={algoAberto}
                        className="px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-40">
                        Editar
                      </button>
                      <button onClick={() => pedirConfirmacaoExclusaoCategoria(cat.id)} disabled={algoAberto}
                        className="px-2 py-1 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-40">
                        Excluir
                      </button>
                    </div>
                  )}

                  {estaConfirmandoExcCat && (
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-gray-600">Excluir categoria?</span>
                      <button onClick={() => handleExcluirCategoria(cat.id)} disabled={excluindoCategoria}
                        className="px-2 py-1 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors disabled:opacity-60">
                        {excluindoCategoria ? '...' : 'Confirmar'}
                      </button>
                      <button onClick={() => setConfirmandoExclusaoCategoria(null)} disabled={excluindoCategoria}
                        className="px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Erro de exclusão de categoria */}
              {erroExcCat && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-2 flex items-center justify-between">
                  {erroExcCat}
                  <button onClick={() => setErrosExclusaoCategoria((p) => { const n = { ...p }; delete n[cat.id]; return n })}
                    className="ml-2 text-red-400 hover:text-red-600">×</button>
                </p>
              )}

              {/* Card de produtos */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                {/* Lista */}
                {cat.produtos.length > 0 && (
                  <ul className="divide-y divide-gray-100">
                    {cat.produtos.map((prod) => {
                      const estaEditandoProd       = editandoProduto === prod.id
                      const estaConfirmandoExcProd = confirmandoExclusaoProduto === prod.id
                      const erroExcProd            = errosExclusaoProduto[prod.id]

                      // Formulário de edição inline (expande o <li>)
                      if (estaEditandoProd) {
                        return (
                          <li key={prod.id} className="p-4 bg-blue-50/50">
                            <FormularioProduto
                              titulo={`Editando: ${prod.nome}`}
                              inicial={{
                                nome:       prod.nome,
                                descricao:  prod.descricao  ?? '',
                                preco:      String(prod.preco),
                                disponivel: prod.disponivel,
                                ordem:      String(prod.ordem),
                                foto_url:   prod.foto_url   ?? '',
                              }}
                              enviando={enviandoEdicaoProduto}
                              erro={erroEdicaoProduto}
                              onSubmit={(form) => handleEditarProduto(prod.id, form)}
                              onCancelar={() => { setEditandoProduto(null); setErroEdicaoProduto('') }}
                            />
                          </li>
                        )
                      }

                      // Confirmação de exclusão inline
                      if (estaConfirmandoExcProd) {
                        return (
                          <li key={prod.id} className="px-4 py-3 flex items-center justify-between gap-2 bg-red-50/50">
                            <span className="text-sm text-gray-700 truncate">{prod.nome}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-gray-500">Excluir?</span>
                              <button onClick={() => handleExcluirProduto(prod.id)} disabled={excluindoProduto}
                                className="px-2 py-1 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors disabled:opacity-60">
                                {excluindoProduto ? '...' : 'Confirmar'}
                              </button>
                              <button onClick={() => setConfirmandoExclusaoProduto(null)} disabled={excluindoProduto}
                                className="px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                                Cancelar
                              </button>
                            </div>
                          </li>
                        )
                      }

                      // View normal
                      const toggling = toglandoDisponibilidade === prod.id
                      const erroToggle = errosToggle[prod.id]

                      return (
                        <li key={prod.id}>
                          {/* Linha principal */}
                          <div className="flex items-center gap-3 px-4 py-3">
                            {prod.foto_url ? (
                              <img src={prod.foto_url} alt={prod.nome} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${!prod.disponivel ? 'text-gray-400' : 'text-gray-900'}`}>
                                {prod.nome}
                              </p>
                              <p className="text-xs text-gray-500">{formatarPreco(prod.preco)}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Badge clicável — toggle de disponibilidade */}
                              <button
                                onClick={() => handleToggleDisponibilidade(prod)}
                                disabled={toggling}
                                title={prod.disponivel ? 'Clique para desativar' : 'Clique para ativar'}
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-opacity ${
                                  toggling ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:opacity-75'
                                } ${
                                  prod.disponivel ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                                }`}
                              >
                                {toggling ? '...' : prod.disponivel ? 'disponível' : 'indisponível'}
                              </button>
                              <button onClick={() => abrirEdicaoProduto(prod)} disabled={algoAberto}
                                className="px-1.5 py-1 text-xs font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-30"
                                aria-label="Editar produto">
                                Editar
                              </button>
                              <button onClick={() => pedirConfirmacaoExclusaoProduto(prod.id)} disabled={algoAberto}
                                className="px-1.5 py-1 text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30"
                                aria-label="Excluir produto">
                                Excluir
                              </button>
                            </div>
                          </div>
                          {/* Erros inline (exclusão ou toggle) */}
                          {(erroExcProd || erroToggle) && (
                            <div className="flex items-center justify-between px-4 pb-2 gap-2">
                              <p className="text-xs text-red-600">{erroExcProd ?? erroToggle}</p>
                              <button
                                onClick={() => {
                                  if (erroExcProd) setErrosExclusaoProduto((p) => { const n = { ...p }; delete n[prod.id]; return n })
                                  if (erroToggle) setErrosToggle((p) => { const n = { ...p }; delete n[prod.id]; return n })
                                }}
                                className="text-xs text-red-400 hover:text-red-600 shrink-0">×
                              </button>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/* Formulário de novo produto (inline, dentro do card) */}
                {criandoProdutoAqui ? (
                  <div className={`p-4 ${cat.produtos.length > 0 ? 'border-t border-gray-100' : ''}`}>
                    <FormularioProduto
                      titulo="Novo produto"
                      inicial={FORM_PRODUTO_VAZIO}
                      enviando={enviandoCriacaoProduto}
                      erro={erroCriacaoProduto}
                      onSubmit={(form) => handleCriarProduto(cat.id, form)}
                      onCancelar={() => { setCriandoProdutoEmCategoria(null); setErroCriacaoProduto('') }}
                    />
                  </div>
                ) : (
                  /* Botão adicionar produto */
                  <button
                    onClick={() => abrirCriacaoProduto(cat.id)}
                    disabled={algoAberto}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-3 text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 border-t border-dashed border-gray-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Adicionar produto
                  </button>
                )}
              </div>

            </section>
          )
        })}
      </div>
    </div>
  )
}
