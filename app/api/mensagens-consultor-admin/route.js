import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const { consultor_id, autor_tipo, autor_id, autor_nome, mensagem } = body

    if (!consultor_id || !autor_tipo || !autor_id || !mensagem) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.from('mensagens_consultor_admin').insert([{
      consultor_id,
      autor_tipo,
      autor_id,
      autor_nome,
      mensagem
    }]).select('*').single()

    if (error) {
      console.error('Erro ao inserir mensagem:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Erro inesperado na API de mensagens:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
