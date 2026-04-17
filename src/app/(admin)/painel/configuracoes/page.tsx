'use client'

import { type ReactNode, useEffect, useMemo, useState } from 'react'

type Tipo = 'delivery' | 'dark_kitchen' | 'lanchonete' | null
type DeliveryMode = 'distance_only' | 'zone_only' | 'hybrid'
type DeliveryZoneType = 'bairro' | 'cep_prefixo' | 'faixa_manual'

interface Restaurante {
  id: string
  slug: string
  nome: string
  logo_url: string | null
  tipo: Tipo
  aceita_entrega: boolean
  aceita_retirada: boolean
  taxa_entrega: number
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
}

interface DeliveryZone {
  id: string
  restaurant_id: string
  name: string
  type: DeliveryZoneType
  match_value: string
  fee: number
  estimated_delivery_minutes: number
  active: boolean
  priority: number
}

interface FormConfig {
  nome: string
  logo_url: string
  tipo: string
  aceita_entrega: boolean
  aceita_retirada: boolean
  taxa_entrega: string
  endereco_restaurante: string
  numero_restaurante: string
  bairro_restaurante: string
  cidade_restaurante: string
  estado_restaurante: string
  taxa_base_entrega: string
  taxa_por_km: string
  max_distance_km: string
  minimum_fee: string
  free_delivery_threshold: string
  delivery_mode: DeliveryMode
  fallback_distance_enabled: boolean
  fallback_max_distance_km: string
}

interface ZoneForm {
  name: string
  type: DeliveryZoneType
  match_value: string
  fee: string
  estimated_delivery_minutes: string
  active: boolean
  priority: string
}

const TIPO_LABEL: Record<string, string> = {
  delivery: 'Delivery',
  dark_kitchen: 'Dark Kitchen',
  lanchonete: 'Lanchonete',
}

const DELIVERY_MODE_LABEL: Record<DeliveryMode, string> = {
  distance_only: 'Somente distância',
  zone_only: 'Somente zonas',
  hybrid: 'Híbrido',
}

const ZONE_TYPE_LABEL: Record<DeliveryZoneType, string> = {
  bairro: 'Bairro',
  cep_prefixo: 'Prefixo de CEP',
  faixa_manual: 'Faixa manual',
}

function initialZoneForm(): ZoneForm {
  return {
    name: '',
    type: 'bairro',
    match_value: '',
    fee: '',
    estimated_delivery_minutes: '35',
    active: true,
    priority: '0',
  }
}

function parseRequiredNumber(value: string): number | null {
  const normalized = value.trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseOptionalNumber(value: string): number | null {
  const normalized = value.trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function toFormConfig(data: Restaurante): FormConfig {
  return {
    nome: data.nome,
    logo_url: data.logo_url ?? '',
    tipo: data.tipo ?? '',
    aceita_entrega: data.aceita_entrega,
    aceita_retirada: data.aceita_retirada,
    taxa_entrega: String(data.taxa_entrega),
    endereco_restaurante: '',
    numero_restaurante: '',
    bairro_restaurante: '',
    cidade_restaurante: '',
    estado_restaurante: '',
    taxa_base_entrega: String(data.taxa_base_entrega),
    taxa_por_km: String(data.taxa_por_km),
    max_distance_km: String(data.max_distance_km),
    minimum_fee: String(data.minimum_fee),
    free_delivery_threshold: data.free_delivery_threshold != null ? String(data.free_delivery_threshold) : '',
    delivery_mode: data.delivery_mode,
    fallback_distance_enabled: data.fallback_distance_enabled,
    fallback_max_distance_km: data.fallback_max_distance_km != null ? String(data.fallback_max_distance_km) : '',
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

export default function ConfiguracoesPage() {
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null)
  const [form, setForm] = useState<FormConfig | null>(null)
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [zoneForm, setZoneForm] = useState<ZoneForm>(initialZoneForm())
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvandoZona, setSalvandoZona] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    Promise.all([fetch('/api/admin/restaurante'), fetch('/api/admin/delivery-zones')])
      .then(async ([r1, r2]) => {
        const data1 = await r1.json()
        const data2 = await r2.json()
        if (!r1.ok) throw new Error(data1.error ?? 'Erro ao carregar configurações.')
        if (!r2.ok) throw new Error(data2.error ?? 'Erro ao carregar zonas.')
        setRestaurante(data1)
        setForm(toFormConfig(data1))
        setZones((data2.zones ?? []) as DeliveryZone[])
      })
      .catch((error) => setErro(error instanceof Error ? error.message : 'Erro ao carregar configurações.'))
      .finally(() => setCarregando(false))
  }, [])

  const fallbackVisible = useMemo(() => form?.delivery_mode === 'hybrid', [form?.delivery_mode])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setErro('')
    setSucesso(false)

    if (!form.nome.trim()) {
      setErro('Informe o nome do restaurante.')
      return
    }

    const taxaEntrega = parseRequiredNumber(form.taxa_entrega)
    const taxaBaseEntrega = parseRequiredNumber(form.taxa_base_entrega)
    const taxaPorKm = parseRequiredNumber(form.taxa_por_km)
    const maxDistanceKm = parseRequiredNumber(form.max_distance_km)
    const minimumFee = parseRequiredNumber(form.minimum_fee)
    const freeDeliveryThreshold = parseOptionalNumber(form.free_delivery_threshold)
    const fallbackMaxDistanceKm = parseOptionalNumber(form.fallback_max_distance_km)

    if (taxaEntrega === null || taxaEntrega < 0) {
      setErro('Informe uma taxa padrão válida.')
      return
    }

    if (freeDeliveryThreshold !== null && freeDeliveryThreshold < 0) {
      setErro('O limiar de frete grátis não pode ser negativo.')
      return
    }

    if (form.aceita_entrega && form.delivery_mode !== 'zone_only') {
      if (taxaBaseEntrega === null || taxaBaseEntrega < 0) {
        setErro('Informe uma taxa base válida.')
        return
      }

      if (taxaPorKm === null || taxaPorKm < 0) {
        setErro('Informe uma taxa por km válida.')
        return
      }

      if (maxDistanceKm === null || maxDistanceKm <= 0) {
        setErro('Informe um raio máximo maior que zero.')
        return
      }

      if (minimumFee === null || minimumFee < 0) {
        setErro('Informe uma taxa mínima válida.')
        return
      }
    }

    if (
      form.aceita_entrega &&
      form.delivery_mode === 'hybrid' &&
      form.fallback_distance_enabled &&
      (fallbackMaxDistanceKm === null || fallbackMaxDistanceKm <= 0)
    ) {
      setErro('Informe um raio máximo válido para o fallback por distância.')
      return
    }

    const restaurantAddress = [
      form.endereco_restaurante.trim(),
      form.numero_restaurante.trim(),
      form.bairro_restaurante.trim(),
    ]

    if (restaurantAddress.some(Boolean) && !restaurantAddress.every(Boolean)) {
      setErro('Preencha rua, número e bairro do restaurante para atualizar a localização.')
      return
    }

    setSalvando(true)

    const payload = {
      nome: form.nome.trim(),
      logo_url: form.logo_url.trim() || null,
      tipo: form.tipo || null,
      aceita_entrega: form.aceita_entrega,
      aceita_retirada: form.aceita_retirada,
      taxa_entrega: taxaEntrega,
      endereco_restaurante: form.endereco_restaurante.trim() || undefined,
      numero_restaurante: form.numero_restaurante.trim() || undefined,
      bairro_restaurante: form.bairro_restaurante.trim() || undefined,
      cidade_restaurante: form.cidade_restaurante.trim() || undefined,
      estado_restaurante: form.estado_restaurante.trim() || undefined,
      taxa_base_entrega: taxaBaseEntrega,
      taxa_por_km: taxaPorKm,
      max_distance_km: maxDistanceKm,
      minimum_fee: minimumFee,
      free_delivery_threshold: freeDeliveryThreshold,
      delivery_mode: form.delivery_mode,
      fallback_distance_enabled: form.fallback_distance_enabled,
      fallback_max_distance_km: fallbackMaxDistanceKm,
    }

    try {
      const response = await fetch('/api/admin/restaurante', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        setErro(data.error ?? 'Erro ao salvar configurações')
        return
      }
      setRestaurante(data)
      setForm(toFormConfig(data))
      setSucesso(true)
      setTimeout(() => setSucesso(false), 3000)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  function startEditingZone(zone: DeliveryZone) {
    setEditingZoneId(zone.id)
    setZoneForm({
      name: zone.name,
      type: zone.type,
      match_value: zone.match_value,
      fee: String(zone.fee),
      estimated_delivery_minutes: String(zone.estimated_delivery_minutes),
      active: zone.active,
      priority: String(zone.priority),
    })
  }

  function resetZoneForm() {
    setEditingZoneId(null)
    setZoneForm(initialZoneForm())
  }

  async function saveZone() {
    setErro('')
    if (!zoneForm.name.trim()) {
      setErro('Informe o nome da zona.')
      return
    }

    if (!zoneForm.match_value.trim()) {
      setErro('Informe a regra da zona.')
      return
    }

    const fee = parseRequiredNumber(zoneForm.fee)
    const estimatedDeliveryMinutes = parseRequiredNumber(zoneForm.estimated_delivery_minutes)
    const priority = parseRequiredNumber(zoneForm.priority)

    if (fee === null || fee < 0) {
      setErro('Informe uma taxa válida para a zona.')
      return
    }

    if (estimatedDeliveryMinutes === null || estimatedDeliveryMinutes <= 0) {
      setErro('Informe um prazo válido para a zona.')
      return
    }

    if (priority === null || priority < 0 || !Number.isInteger(priority)) {
      setErro('Informe uma prioridade inteira igual ou maior que zero.')
      return
    }

    setSalvandoZona(true)
    try {
      const endpoint = editingZoneId ? `/api/admin/delivery-zones/${editingZoneId}` : '/api/admin/delivery-zones'
      const response = await fetch(endpoint, {
        method: editingZoneId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: zoneForm.name.trim(),
          type: zoneForm.type,
          match_value: zoneForm.match_value.trim(),
          fee,
          estimated_delivery_minutes: estimatedDeliveryMinutes,
          active: zoneForm.active,
          priority,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setErro(data.error ?? 'Erro ao salvar zona')
        return
      }
      setZones((current) => {
        const next = editingZoneId
          ? current.map((zone) => (zone.id === editingZoneId ? data : zone))
          : [...current, data]
        return next.sort((left, right) => left.priority - right.priority)
      })
      resetZoneForm()
    } catch {
      setErro('Erro ao salvar zona.')
    } finally {
      setSalvandoZona(false)
    }
  }

  async function toggleZone(zone: DeliveryZone) {
    try {
      const response = await fetch(`/api/admin/delivery-zones/${zone.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !zone.active }),
      })
      const data = await response.json()
      if (!response.ok) {
        setErro(data.error ?? 'Erro ao atualizar zona.')
        return
      }
      setZones((current) => current.map((item) => (item.id === zone.id ? data : item)))
    } catch {
      setErro('Erro ao atualizar zona.')
    }
  }

  if (carregando) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-center"><div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" /><p className="text-sm text-gray-500">Carregando configurações...</p></div></div>
  }

  if (!form || !restaurante) {
    return <div className="flex items-center justify-center min-h-[60vh] px-4"><p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{erro || 'Erro ao carregar configurações.'}</p></div>
  }

  const linkPublico = typeof window !== 'undefined' ? `${window.location.origin}/${restaurante.slug}` : `/${restaurante.slug}`

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="font-semibold text-gray-900 mb-6">Configurações</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <p className="text-xs font-medium text-gray-500 mb-1">Link do cardápio público</p>
        <div className="flex items-center gap-2">
          <p className="flex-1 text-sm text-gray-700 font-mono truncate">{linkPublico}</p>
          <button type="button" onClick={() => navigator.clipboard.writeText(linkPublico)} className="shrink-0 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">Copiar</button>
          <a href={`/${restaurante.slug}`} target="_blank" rel="noopener noreferrer" className="shrink-0 px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">Ver</a>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Section title="Identidade">
          <Field label="Nome do restaurante"><input type="text" value={form.nome} onChange={(e) => setForm((c) => c && ({ ...c, nome: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" /></Field>
          <Field label="URL do logo"><input type="text" value={form.logo_url} onChange={(e) => setForm((c) => c && ({ ...c, logo_url: e.target.value }))} placeholder="https://..." className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" /></Field>
          <Field label="Tipo">
            <select value={form.tipo} onChange={(e) => setForm((c) => c && ({ ...c, tipo: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900 bg-white">
              <option value="">Não especificado</option>
              {Object.entries(TIPO_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
        </Section>

        <Section title="Modalidades">
          <label className="flex items-center justify-between cursor-pointer"><div><p className="text-sm font-medium text-gray-700">Entrega</p><p className="text-xs text-gray-400">Aceitar pedidos para entrega</p></div><input type="checkbox" checked={form.aceita_entrega} onChange={(e) => setForm((c) => c && ({ ...c, aceita_entrega: e.target.checked }))} className="w-4 h-4 accent-gray-900" /></label>
          <label className="flex items-center justify-between cursor-pointer"><div><p className="text-sm font-medium text-gray-700">Retirada</p><p className="text-xs text-gray-400">Aceitar pedidos para retirada no local</p></div><input type="checkbox" checked={form.aceita_retirada} onChange={(e) => setForm((c) => c && ({ ...c, aceita_retirada: e.target.checked }))} className="w-4 h-4 accent-gray-900" /></label>
        </Section>

        {form.aceita_entrega && (
          <Section title="Motor de Entrega">
            <Field label="Modo de entrega">
              <select value={form.delivery_mode} onChange={(e) => setForm((c) => c && ({ ...c, delivery_mode: e.target.value as DeliveryMode }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                {Object.entries(DELIVERY_MODE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Rua"><input type="text" value={form.endereco_restaurante} onChange={(e) => setForm((c) => c && ({ ...c, endereco_restaurante: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" /></Field>
              <Field label="Número"><input type="text" value={form.numero_restaurante} onChange={(e) => setForm((c) => c && ({ ...c, numero_restaurante: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Bairro"><input type="text" value={form.bairro_restaurante} onChange={(e) => setForm((c) => c && ({ ...c, bairro_restaurante: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" /></Field>
              <Field label="Cidade"><input type="text" value={form.cidade_restaurante} onChange={(e) => setForm((c) => c && ({ ...c, cidade_restaurante: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" /></Field>
              <Field label="UF"><input type="text" value={form.estado_restaurante} onChange={(e) => setForm((c) => c && ({ ...c, estado_restaurante: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Taxa base (R$)"><input type="number" min={0} step={0.5} value={form.taxa_base_entrega} onChange={(e) => setForm((c) => c && ({ ...c, taxa_base_entrega: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" /></Field>
              <Field label="Taxa por km (R$)"><input type="number" min={0} step={0.5} value={form.taxa_por_km} onChange={(e) => setForm((c) => c && ({ ...c, taxa_por_km: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Raio máximo (km)"><input type="number" min={0.1} step={0.1} value={form.max_distance_km} onChange={(e) => setForm((c) => c && ({ ...c, max_distance_km: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" /></Field>
              <Field label="Taxa mínima (R$)"><input type="number" min={0} step={0.5} value={form.minimum_fee} onChange={(e) => setForm((c) => c && ({ ...c, minimum_fee: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" /></Field>
              <Field label="Frete grátis"><input type="number" min={0} step={1} value={form.free_delivery_threshold} onChange={(e) => setForm((c) => c && ({ ...c, free_delivery_threshold: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" /></Field>
            </div>

            {fallbackVisible && (
              <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <label className="flex items-center justify-between cursor-pointer"><div><p className="text-sm font-medium text-gray-700">Fallback por distância</p><p className="text-xs text-gray-400">Se nenhuma zona casar, tenta distância.</p></div><input type="checkbox" checked={form.fallback_distance_enabled} onChange={(e) => setForm((c) => c && ({ ...c, fallback_distance_enabled: e.target.checked }))} className="w-4 h-4 accent-gray-900" /></label>
                <Field label="Raio máximo do fallback"><input type="number" min={0.1} step={0.1} value={form.fallback_max_distance_km} onChange={(e) => setForm((c) => c && ({ ...c, fallback_max_distance_km: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" /></Field>
              </div>
            )}
          </Section>
        )}

        {form.aceita_entrega && (
          <Section title="Zonas de Entrega">
            <div className="space-y-3 rounded-xl border border-gray-100 p-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome"><input type="text" value={zoneForm.name} onChange={(e) => setZoneForm((c) => ({ ...c, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" /></Field>
                <Field label="Tipo"><select value={zoneForm.type} onChange={(e) => setZoneForm((c) => ({ ...c, type: e.target.value as DeliveryZoneType }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900 bg-white">{Object.entries(ZONE_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
              </div>
              <Field label="Regra"><input type="text" value={zoneForm.match_value} onChange={(e) => setZoneForm((c) => ({ ...c, match_value: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Taxa (R$)"><input type="number" min={0} step={0.5} value={zoneForm.fee} onChange={(e) => setZoneForm((c) => ({ ...c, fee: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" /></Field>
                <Field label="Prazo (min)"><input type="number" min={1} step={1} value={zoneForm.estimated_delivery_minutes} onChange={(e) => setZoneForm((c) => ({ ...c, estimated_delivery_minutes: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" /></Field>
                <Field label="Prioridade"><input type="number" min={0} step={1} value={zoneForm.priority} onChange={(e) => setZoneForm((c) => ({ ...c, priority: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900" /></Field>
              </div>
              <label className="flex items-center justify-between cursor-pointer"><div><p className="text-sm font-medium text-gray-700">Zona ativa</p><p className="text-xs text-gray-400">Zonas inativas não entram no cálculo.</p></div><input type="checkbox" checked={zoneForm.active} onChange={(e) => setZoneForm((c) => ({ ...c, active: e.target.checked }))} className="w-4 h-4 accent-gray-900" /></label>
              <div className="flex gap-2">
                <button type="button" onClick={saveZone} disabled={salvandoZona} className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-all disabled:opacity-60">{salvandoZona ? 'Salvando...' : editingZoneId ? 'Salvar zona' : 'Criar zona'}</button>
                {editingZoneId && <button type="button" onClick={resetZoneForm} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50">Cancelar</button>}
              </div>
            </div>

            <div className="space-y-3">
              {zones.length === 0 ? <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">Nenhuma zona cadastrada ainda.</p> : zones.map((zone) => (
                <div key={zone.id} className="rounded-xl border border-gray-100 p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{zone.name}</p>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{ZONE_TYPE_LABEL[zone.type]}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${zone.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{zone.active ? 'Ativa' : 'Inativa'}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Regra: <span className="font-medium">{zone.match_value}</span></p>
                    <p className="text-xs text-gray-400 mt-1">Taxa R$ {zone.fee.toFixed(2).replace('.', ',')} · Prazo {zone.estimated_delivery_minutes} min · Prioridade {zone.priority}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button type="button" onClick={() => startEditingZone(zone)} className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">Editar</button>
                    <button type="button" onClick={() => toggleZone(zone)} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors">{zone.active ? 'Desativar' : 'Ativar'}</button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {erro && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{erro}</p>}
        {sucesso && <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">Configurações salvas com sucesso.</p>}

        <button type="submit" disabled={salvando} className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed">{salvando ? 'Salvando...' : 'Salvar configurações'}</button>
      </form>
    </div>
  )
}
