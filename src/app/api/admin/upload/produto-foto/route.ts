// POST /api/admin/upload/produto-foto
// Recebe FormData com campo `file`, faz upload para Supabase Storage
// Path: produto-fotos/{restaurante_id}/{uuid}.{ext}
// Retorna { url: string } com URL pública da imagem
// Requer autenticação (middleware.ts)

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRestauranteId } from '@/lib/auth/get-restaurante-id'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

const EXT_POR_TIPO: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  let restauranteId: string
  try {
    restauranteId = await getRestauranteId(supabase)
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }

  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Campo "file" obrigatório' }, { status: 400 })
  }

  if (!(file.type in EXT_POR_TIPO)) {
    return NextResponse.json(
      { error: 'Tipo não permitido. Use JPEG, PNG ou WebP.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'Arquivo muito grande. Máximo: 5 MB.' },
      { status: 400 }
    )
  }

  const ext  = EXT_POR_TIPO[file.type]
  const path = `${restauranteId}/${crypto.randomUUID()}.${ext}`
  const body = new Uint8Array(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('produto-fotos')
    .upload(path, body, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[POST /api/admin/upload/produto-foto] erro:', uploadError)
    return NextResponse.json({ error: 'Erro ao salvar imagem. Tente novamente.' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('produto-fotos')
    .getPublicUrl(path)

  return NextResponse.json({ url: publicUrl }, { status: 201 })
}
